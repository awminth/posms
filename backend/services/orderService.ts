import { getPool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { newId, num, formatDateTime } from '../utils/helpers.js';
import { mapCustomer } from '../utils/mappers.js';
import { allocateFifo, restoreLotQty } from './stockLotService.js';

function mapOrderRow(row: any, items: any[] = [], payments: any[] = [], customer?: any) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    branchId: row.branch_id,
    registerName: row.register_name || 'Terminal',
    cashierName: row.cashier_name || '',
    customer: customer ? mapCustomer(customer) : undefined,
    items: items.map((it) => ({
      product: {
        id: it.product_id,
        categoryId: '',
        sku: it.sku,
        barcode: '',
        name: it.product_name,
        description: '',
        costPrice: num(it.cost_price),
        sellingPrice: num(it.unit_price),
        unit: 'pcs',
        imageUrl: '',
      },
      quantity: num(it.quantity),
      unitPrice: num(it.unit_price),
      discount: num(it.discount_amount),
      stockLotId: it.stock_lot_id || undefined,
    })),
    subtotal: num(row.subtotal),
    discountAmount: num(row.discount_amount),
    discountType: row.discount_type || 'FIXED',
    taxAmount: num(row.tax_amount),
    grandTotal: num(row.grand_total),
    payments: payments.map((p) => ({
      method: p.payment_method,
      amount: num(p.amount),
      amountTendered: num(p.amount_tendered),
      changeGiven: num(p.change_given),
      transactionRef: p.transaction_ref || undefined,
    })),
    orderStatus: row.order_status,
    createdAt: row.created_at ? formatDateTime(row.created_at) : '',
    notes: row.notes || undefined,
    creditDueDate: row.credit_due_date ? String(row.credit_due_date).slice(0, 10) : undefined,
    creditStatus: row.credit_status || undefined,
    creditPaidAmount: num(row.credit_paid_amount),
    returnedAmount: num(row.returned_amount),
    isReturned: num(row.returned_amount) > 0,
  };
}

export async function listOrders(branchId?: string) {
  const pool = getPool();
  const sql = branchId
    ? `SELECT o.*, u.full_name AS cashier_name, r.name AS register_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.cashier_id
       LEFT JOIN registers r ON r.id = o.register_id
       WHERE o.branch_id = ? AND o.order_status <> 'VOIDED'
       ORDER BY o.created_at DESC LIMIT 200`
    : `SELECT o.*, u.full_name AS cashier_name, r.name AS register_name
       FROM orders o
       LEFT JOIN users u ON u.id = o.cashier_id
       LEFT JOIN registers r ON r.id = o.register_id
       WHERE o.order_status <> 'VOIDED'
       ORDER BY o.created_at DESC LIMIT 200`;
  const [rows] = branchId ? await pool.query(sql, [branchId]) : await pool.query(sql);
  const orders = [];
  for (const row of rows as any[]) {
    const [items] = await pool.query(`SELECT * FROM order_items WHERE order_id = ?`, [row.id]);
    const [payments] = await pool.query(`SELECT * FROM payments WHERE order_id = ?`, [row.id]);
    let customer;
    if (row.customer_id) {
      const [crows] = await pool.query(`SELECT * FROM customers WHERE id = ?`, [row.customer_id]);
      customer = (crows as any[])[0];
    }
    orders.push(mapOrderRow(row, items as any[], payments as any[], customer));
  }
  return orders;
}

export async function createOrder(payload: any) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const branchId = payload.branchId;
    const cashierId = payload.cashierId;
    if (!branchId || !cashierId) throw new AppError('branchId and cashierId required');
    if (!payload.items?.length) throw new AppError('Order items required');

    let registerId = payload.registerId;
    if (!registerId) {
      const [regs] = await conn.query(
        `SELECT id FROM registers WHERE branch_id = ? AND is_active = TRUE LIMIT 1`,
        [branchId]
      );
      registerId = (regs as any[])[0]?.id;
      if (!registerId) {
        registerId = newId('reg');
        await conn.query(
          `INSERT INTO registers (id, branch_id, name, terminal_code, is_active) VALUES (?, ?, 'Main Terminal', ?, TRUE)`,
          [registerId, branchId, `POS-${branchId}-T1`]
        );
      }
    }

    let shiftId = payload.shiftId;
    if (!shiftId) {
      const [shifts] = await conn.query(
        `SELECT id FROM shifts WHERE branch_id = ? AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`,
        [branchId]
      );
      shiftId = (shifts as any[])[0]?.id;
      if (!shiftId) {
        shiftId = newId('sh');
        await conn.query(
          `INSERT INTO shifts (id, branch_id, register_id, cashier_id, opening_float, expected_cash, status, cash_sales, mobile_sales, card_sales)
           VALUES (?, ?, ?, ?, 0, 0, 'OPEN', 0, 0, 0)`,
          [shiftId, branchId, registerId, cashierId]
        );
      }
    }

    const orderId = newId('ord');
    const orderNumber =
      payload.orderNumber ||
      `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;

    const payments = payload.payments || [];
    const creditPayment = payments.find((p: any) => p.method === 'CREDIT');
    const creditAmount = creditPayment ? num(creditPayment.amount) : 0;

    await conn.query(
      `INSERT INTO orders (
        id, order_number, branch_id, register_id, shift_id, cashier_id, customer_id,
        subtotal, discount_amount, discount_type, tax_amount, grand_total,
        payment_status, order_status, notes, credit_status, credit_paid_amount, credit_due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'FIXED', ?, ?, 'PAID', 'COMPLETED', ?, ?, 0, ?)`,
      [
        orderId,
        orderNumber,
        branchId,
        registerId,
        shiftId,
        cashierId,
        payload.customerId || null,
        num(payload.subtotal),
        num(payload.discountAmount),
        num(payload.taxAmount),
        num(payload.grandTotal),
        payload.notes || null,
        creditAmount > 0 ? 'UNPAID' : null,
        creditAmount > 0 ? creditPayment?.dueDate || null : null,
      ]
    );

    for (const item of payload.items) {
      const qty = num(item.quantity);
      if (qty <= 0) continue;

      // Prefer client lot id; always re-allocate FIFO server-side for accuracy
      let allocations;
      try {
        allocations = await allocateFifo(
          conn,
          branchId,
          item.productId,
          qty,
          item.stockLotId || undefined
        );
      } catch {
        allocations = [
          {
            stockLotId: item.stockLotId || '',
            productId: item.productId,
            quantity: qty,
            unitPrice: num(item.unitPrice),
            costPrice: num(item.costPrice),
          },
        ];
      }

      for (const alloc of allocations) {
        const unitPrice = alloc.stockLotId ? alloc.unitPrice : num(item.unitPrice);
        const costPrice = alloc.stockLotId ? alloc.costPrice : num(item.costPrice);
        const lineDiscShare =
          qty > 0 ? (num(item.discountAmount) * alloc.quantity) / qty : 0;
        await conn.query(
          `INSERT INTO order_items (
            id, order_id, product_id, stock_lot_id, product_name, sku,
            unit_price, cost_price, quantity, discount_amount, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId('oi'),
            orderId,
            item.productId,
            alloc.stockLotId || null,
            item.productName,
            item.sku || '',
            unitPrice,
            costPrice,
            alloc.quantity,
            lineDiscShare,
            unitPrice * alloc.quantity - lineDiscShare,
          ]
        );
      }

      await conn.query(
        `UPDATE branch_stocks SET quantity_on_hand = GREATEST(0, quantity_on_hand - ?)
         WHERE branch_id = ? AND product_id = ?`,
        [qty, branchId, item.productId]
      );
    }

    for (const p of payments) {
      await conn.query(
        `INSERT INTO payments (id, order_id, branch_id, payment_method, amount, amount_tendered, change_given, transaction_ref, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUCCESS')`,
        [
          newId('pay'),
          orderId,
          branchId,
          p.method,
          num(p.amount),
          num(p.amountTendered),
          num(p.changeGiven),
          p.transactionRef || null,
        ]
      );
    }

    const cash = payments.filter((p: any) => p.method === 'CASH').reduce((s: number, p: any) => s + num(p.amount), 0);
    const mobile = payments
      .filter((p: any) => ['KBZ_PAY', 'WAVE_PAY', 'AYAPAY', 'CB_PAY'].includes(p.method))
      .reduce((s: number, p: any) => s + num(p.amount), 0);
    const card = payments
      .filter((p: any) => p.method === 'CREDIT_CARD')
      .reduce((s: number, p: any) => s + num(p.amount), 0);

    await conn.query(
      `UPDATE shifts SET
        expected_cash = expected_cash + ?,
        cash_sales = cash_sales + ?,
        mobile_sales = mobile_sales + ?,
        card_sales = card_sales + ?,
        total_sales_amount = total_sales_amount + ?,
        total_orders_count = total_orders_count + 1
       WHERE id = ?`,
      [cash, cash, mobile, card, num(payload.grandTotal), shiftId]
    );

    if (payload.customerId) {
      const points = Math.floor(num(payload.grandTotal) / 1000);
      await conn.query(
        `UPDATE customers SET
          loyalty_points = loyalty_points + ?,
          total_spent = total_spent + ?,
          total_visits = total_visits + 1,
          current_credit = current_credit + ?
         WHERE id = ?`,
        [points, num(payload.grandTotal), creditAmount, payload.customerId]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const list = await listOrders(payload.branchId);
  const created = list.find((o) => o.orderNumber === (payload.orderNumber || o.orderNumber));
  // Prefer exact fetch
  const [rows] = await getPool().query(
    `SELECT o.*, u.full_name AS cashier_name, r.name AS register_name
     FROM orders o
     LEFT JOIN users u ON u.id = o.cashier_id
     LEFT JOIN registers r ON r.id = o.register_id
     WHERE o.branch_id = ?
     ORDER BY o.created_at DESC LIMIT 1`,
    [payload.branchId]
  );
  const row = (rows as any[])[0];
  const [items] = await getPool().query(`SELECT * FROM order_items WHERE order_id = ?`, [row.id]);
  const [payments] = await getPool().query(`SELECT * FROM payments WHERE order_id = ?`, [row.id]);
  let customer;
  if (row.customer_id) {
    const [crows] = await getPool().query(`SELECT * FROM customers WHERE id = ?`, [row.customer_id]);
    customer = (crows as any[])[0];
  }
  return mapOrderRow(row, items as any[], payments as any[], customer) || created;
}

/** Delete (void) a sale: restock items to branch inventory and reverse shift/customer totals. */
export async function deleteOrder(orderId: string) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT * FROM orders WHERE id = ? FOR UPDATE`,
      [orderId]
    );
    const order = (rows as any[])[0];
    if (!order) throw new AppError('Order not found', 404);
    if (order.order_status === 'VOIDED' || order.order_status === 'DELETED') {
      throw new AppError('Order already deleted', 400);
    }

    const [items] = await conn.query(`SELECT * FROM order_items WHERE order_id = ?`, [orderId]);
    const [payments] = await conn.query(`SELECT * FROM payments WHERE order_id = ?`, [orderId]);

    // Restock every line back into the selling branch + restore lots
    for (const item of items as any[]) {
      await conn.query(
        `UPDATE branch_stocks SET quantity_on_hand = quantity_on_hand + ?
         WHERE branch_id = ? AND product_id = ?`,
        [num(item.quantity), order.branch_id, item.product_id]
      );
      if (item.stock_lot_id) {
        try {
          await restoreLotQty(conn, item.stock_lot_id, num(item.quantity));
        } catch {
          /* ignore if lot missing */
        }
      }
    }

    const payList = payments as any[];
    const cash = payList
      .filter((p) => p.payment_method === 'CASH')
      .reduce((s, p) => s + num(p.amount), 0);
    const mobile = payList
      .filter((p) => ['KBZ_PAY', 'WAVE_PAY', 'AYAPAY', 'CB_PAY'].includes(p.payment_method))
      .reduce((s, p) => s + num(p.amount), 0);
    const card = payList
      .filter((p) => p.payment_method === 'CREDIT_CARD')
      .reduce((s, p) => s + num(p.amount), 0);
    const credit = payList
      .filter((p) => p.payment_method === 'CREDIT')
      .reduce((s, p) => s + num(p.amount), 0);

    if (order.shift_id) {
      await conn.query(
        `UPDATE shifts SET
          expected_cash = GREATEST(0, expected_cash - ?),
          cash_sales = GREATEST(0, cash_sales - ?),
          mobile_sales = GREATEST(0, mobile_sales - ?),
          card_sales = GREATEST(0, card_sales - ?),
          total_sales_amount = GREATEST(0, total_sales_amount - ?),
          total_orders_count = GREATEST(0, total_orders_count - 1)
         WHERE id = ?`,
        [cash, cash, mobile, card, num(order.grand_total), order.shift_id]
      );
    }

    if (order.customer_id) {
      const points = Math.floor(num(order.grand_total) / 1000);
      await conn.query(
        `UPDATE customers SET
          loyalty_points = GREATEST(0, loyalty_points - ?),
          total_spent = GREATEST(0, total_spent - ?),
          total_visits = GREATEST(0, total_visits - 1),
          current_credit = GREATEST(0, current_credit - ?)
         WHERE id = ?`,
        [points, num(order.grand_total), credit, order.customer_id]
      );
    }

    await conn.query(
      `UPDATE orders SET order_status = 'VOIDED', notes = CONCAT(COALESCE(notes, ''), ' [DELETED]')
       WHERE id = ?`,
      [orderId]
    );

    await conn.commit();
    return { id: orderId, orderNumber: order.order_number, restored: true };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
