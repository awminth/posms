import { getPool } from '../config/db.js';
import { newId, num, formatDateTime } from '../utils/helpers.js';
import { insertLot } from './stockLotService.js';

function mapPurchase(row: any) {
  return {
    id: row.id,
    purchaseNumber: row.purchase_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    destBranchId: row.dest_branch_id,
    purchaseDate: row.purchase_date
      ? new Date(row.purchase_date).toISOString().slice(0, 10)
      : null,
    itemsSubtotal: num(row.items_subtotal),
    shippingCost: num(row.shipping_cost),
    totalAmount: num(row.total_amount),
    paidAmount: num(row.paid_amount),
    creditAmount: num(row.credit_amount),
    paymentType: row.payment_type,
    supplierBillId: row.supplier_bill_id,
    receivedBy: row.received_by,
    notes: row.notes,
    createdAt: row.created_at ? formatDateTime(row.created_at) : '',
    items: row.items || [],
  };
}

function mapPurchaseItem(row: any) {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: num(row.quantity),
    unitCost: num(row.unit_cost),
    shippingAllocated: num(row.shipping_allocated),
    landedUnitCost: num(row.landed_unit_cost),
    lineTotal: num(row.line_total),
    sellingPrice: num(row.selling_price),
  };
}

export async function listPurchases() {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT * FROM purchases ORDER BY purchase_date DESC, created_at DESC`);
  const purchases = (rows as any[]).map(mapPurchase);
  if (!purchases.length) return [];

  const [itemRows] = await pool.query(`SELECT * FROM purchase_items`);
  const byPurchase: Record<string, any[]> = {};
  for (const row of itemRows as any[]) {
    const item = mapPurchaseItem(row);
    if (!byPurchase[item.purchaseId]) byPurchase[item.purchaseId] = [];
    byPurchase[item.purchaseId].push(item);
  }
  return purchases.map((p) => ({ ...p, items: byPurchase[p.id] || [] }));
}

/**
 * Confirm a purchase / GRN:
 * - Persist purchases + purchase_items
 * - Landed cost + FIFO stock lot (cost + sell price per batch)
 * - Update product master to latest lot prices (display only)
 */
export async function createPurchase(payload: {
  supplierId: string;
  supplierName: string;
  destBranchId: string;
  items: {
    productId: string;
    productName: string;
    totalBaseUnitsReceived: number;
    unitCost: number;
    totalCost?: number;
    sellingPrice?: number;
  }[];
  shippingCost?: number;
  paidAmount?: number;
  paymentType: 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL';
  notes?: string;
  receivedBy: string;
  purchaseDate?: string;
}) {
  const pool = getPool();
  const conn = await pool.getConnection();

  const items = (payload.items || [])
    .map((i) => {
      const qty = Math.max(0, num(i.totalBaseUnitsReceived));
      const unitCost = num(i.unitCost);
      const lineTotal = i.totalCost != null ? num(i.totalCost) : unitCost * qty;
      const sellingPrice = Math.max(0, num(i.sellingPrice != null ? i.sellingPrice : unitCost));
      return {
        productId: i.productId,
        productName: i.productName,
        quantity: qty,
        unitCost,
        lineTotal,
        sellingPrice,
      };
    })
    .filter((i) => i.quantity > 0 && i.productId);

  if (!items.length) {
    conn.release();
    throw Object.assign(new Error('At least one purchase item is required'), { status: 400 });
  }

  const itemsSubtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const shippingCost = Math.max(0, num(payload.shippingCost));
  const totalAmount = itemsSubtotal + shippingCost;

  let paidAmount =
    payload.paymentType === 'CASH_ON_DELIVERY'
      ? totalAmount
      : Math.max(0, Math.min(totalAmount, num(payload.paidAmount)));
  if (payload.paymentType === 'CREDIT_BILL' && payload.paidAmount == null) paidAmount = 0;
  const creditAmount = Math.max(0, totalAmount - paidAmount);

  const purchaseId = newId('pur');
  const purchaseNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
  const billId = newId('sb');
  const billNumber = `BILL-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const purchaseDate = payload.purchaseDate || new Date().toISOString().slice(0, 10);

  const allocated = items.map((i) => {
    const share = itemsSubtotal > 0 ? i.lineTotal / itemsSubtotal : 1 / items.length;
    const shippingAllocated = shippingCost * share;
    const landedUnitCost =
      i.quantity > 0 ? (i.lineTotal + shippingAllocated) / i.quantity : i.unitCost;
    return { ...i, shippingAllocated, landedUnitCost };
  });

  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO purchases (
        id, purchase_number, supplier_id, supplier_name, dest_branch_id, purchase_date,
        items_subtotal, shipping_cost, total_amount, paid_amount, credit_amount,
        payment_type, supplier_bill_id, received_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseId,
        purchaseNumber,
        payload.supplierId,
        payload.supplierName,
        payload.destBranchId,
        purchaseDate,
        itemsSubtotal,
        shippingCost,
        totalAmount,
        paidAmount,
        creditAmount,
        payload.paymentType,
        billId,
        payload.receivedBy || null,
        payload.notes || null,
      ]
    );

    for (const item of allocated) {
      const itemId = newId('pi');
      await conn.query(
        `INSERT INTO purchase_items (
          id, purchase_id, product_id, product_name, quantity,
          unit_cost, shipping_allocated, landed_unit_cost, line_total, selling_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          purchaseId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitCost,
          item.shippingAllocated,
          item.landedUnitCost,
          item.lineTotal,
          item.sellingPrice,
        ]
      );

      const [existing] = await conn.query(
        `SELECT id FROM branch_stocks WHERE branch_id = ? AND product_id = ?`,
        [payload.destBranchId, item.productId]
      );
      if ((existing as any[]).length) {
        await conn.query(
          `UPDATE branch_stocks SET quantity_on_hand = quantity_on_hand + ? WHERE branch_id = ? AND product_id = ?`,
          [item.quantity, payload.destBranchId, item.productId]
        );
      } else {
        await conn.query(
          `INSERT INTO branch_stocks (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location)
           VALUES (?, ?, ?, ?, 50, 200, 'Warehouse Bay')`,
          [newId('bs'), payload.destBranchId, item.productId, item.quantity]
        );
      }

      await insertLot(conn, {
        branchId: payload.destBranchId,
        productId: item.productId,
        purchaseId,
        purchaseItemId: itemId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        landedUnitCost: item.landedUnitCost,
        sellingPrice: item.sellingPrice,
        receivedAt: `${purchaseDate} 12:00:00`,
      });

      await conn.query(`UPDATE products SET cost_price = ?, selling_price = ? WHERE id = ?`, [
        Math.round(item.landedUnitCost * 100) / 100,
        Math.round(item.sellingPrice * 100) / 100,
        item.productId,
      ]);
    }

    const billStatus = creditAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

    await conn.query(
      `INSERT INTO supplier_bills (
        id, bill_number, supplier_id, supplier_name, branch_id,
        total_amount, paid_amount, balance_due, status, bill_date, due_date, notes, items_summary, purchase_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(?, INTERVAL 30 DAY), ?, ?, ?)`,
      [
        billId,
        billNumber,
        payload.supplierId,
        payload.supplierName,
        payload.destBranchId,
        totalAmount,
        paidAmount,
        creditAmount,
        billStatus,
        purchaseDate,
        purchaseDate,
        payload.notes || `Purchase ${purchaseNumber}`,
        allocated.map((i) => `${i.productName} × ${i.quantity}`).join(', '),
        purchaseId,
      ]
    );

    await conn.query(
      `UPDATE suppliers SET
        total_purchased = total_purchased + ?,
        total_paid = total_paid + ?,
        balance_payable = balance_payable + ?
       WHERE id = ?`,
      [totalAmount, paidAmount, creditAmount, payload.supplierId]
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const [rows] = await pool.query(`SELECT * FROM purchases WHERE id = ?`, [purchaseId]);
  const [itemRows] = await pool.query(`SELECT * FROM purchase_items WHERE purchase_id = ?`, [
    purchaseId,
  ]);
  return {
    ...mapPurchase((rows as any[])[0]),
    items: (itemRows as any[]).map(mapPurchaseItem),
    grnNumber: purchaseNumber,
    id: purchaseId,
  };
}

export async function updatePurchase(
  id: string,
  payload: {
    purchaseDate?: string;
    notes?: string | null;
    receivedBy?: string | null;
    paymentType?: 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL';
    paidAmount?: number;
    shippingCost?: number;
    items?: {
      id: string;
      quantity?: number;
      unitCost?: number;
      sellingPrice?: number;
    }[];
  }
) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT * FROM purchases WHERE id = ? FOR UPDATE`, [id]);
    const purchase = (rows as any[])[0];
    if (!purchase) {
      throw Object.assign(new Error('Purchase not found'), { status: 404 });
    }

    const branchId = purchase.dest_branch_id;
    const oldTotal = num(purchase.total_amount);
    const oldPaid = num(purchase.paid_amount);
    const oldCredit = num(purchase.credit_amount);
    const oldShipping = num(purchase.shipping_cost);

    const [itemRows] = await conn.query(
      `SELECT * FROM purchase_items WHERE purchase_id = ? FOR UPDATE`,
      [id]
    );
    const dbItems = itemRows as any[];
    if (!dbItems.length) {
      throw Object.assign(new Error('Purchase has no line items'), { status: 400 });
    }

    const patchById = new Map((payload.items || []).map((i) => [i.id, i]));
    const shippingCost =
      payload.shippingCost != null ? Math.max(0, num(payload.shippingCost)) : oldShipping;

    type Line = {
      id: string;
      productId: string;
      productName: string;
      oldQty: number;
      quantity: number;
      unitCost: number;
      sellingPrice: number;
      lineTotal: number;
      shippingAllocated: number;
      landedUnitCost: number;
    };

    const lines: Line[] = dbItems.map((row) => {
      const patch = patchById.get(row.id);
      const oldQty = num(row.quantity);
      const quantity =
        patch?.quantity != null ? Math.max(0, Math.floor(num(patch.quantity))) : oldQty;
      const unitCost = patch?.unitCost != null ? Math.max(0, num(patch.unitCost)) : num(row.unit_cost);
      const sellingPrice =
        patch?.sellingPrice != null
          ? Math.max(0, num(patch.sellingPrice))
          : Math.max(0, num(row.selling_price));
      return {
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        oldQty,
        quantity,
        unitCost,
        sellingPrice,
        lineTotal: quantity * unitCost,
        shippingAllocated: 0,
        landedUnitCost: unitCost,
      };
    });

    if (lines.some((l) => l.quantity <= 0)) {
      throw Object.assign(new Error('Each line quantity must be at least 1'), { status: 400 });
    }

    const itemsSubtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    for (const line of lines) {
      const share = itemsSubtotal > 0 ? line.lineTotal / itemsSubtotal : 1 / lines.length;
      line.shippingAllocated = shippingCost * share;
      line.landedUnitCost =
        line.quantity > 0
          ? (line.lineTotal + line.shippingAllocated) / line.quantity
          : line.unitCost;
    }

    const totalAmount = itemsSubtotal + shippingCost;
    const paymentType =
      payload.paymentType ||
      (purchase.payment_type as 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL');

    let paidAmount =
      payload.paidAmount != null ? Math.max(0, num(payload.paidAmount)) : oldPaid;
    if (paymentType === 'CASH_ON_DELIVERY') paidAmount = totalAmount;
    if (paymentType === 'CREDIT_BILL' && payload.paidAmount == null && payload.paymentType) {
      paidAmount = 0;
    }
    paidAmount = Math.max(0, Math.min(totalAmount, paidAmount));
    const creditAmount = Math.max(0, totalAmount - paidAmount);

    const purchaseDate =
      payload.purchaseDate != null
        ? String(payload.purchaseDate).slice(0, 10)
        : purchase.purchase_date
          ? new Date(purchase.purchase_date).toISOString().slice(0, 10)
          : null;
    const notes = payload.notes !== undefined ? payload.notes : purchase.notes;
    const receivedBy =
      payload.receivedBy !== undefined ? payload.receivedBy : purchase.received_by;

    for (const line of lines) {
      const [lotRows] = await conn.query(
        `SELECT * FROM stock_lots WHERE purchase_item_id = ? FOR UPDATE`,
        [line.id]
      );
      let lot = (lotRows as any[])[0];

      if (!lot) {
        const [fallback] = await conn.query(
          `SELECT * FROM stock_lots
           WHERE purchase_id = ? AND product_id = ?
           ORDER BY received_at ASC, id ASC LIMIT 1 FOR UPDATE`,
          [id, line.productId]
        );
        lot = (fallback as any[])[0];
      }

      const qtyDelta = line.quantity - line.oldQty;

      if (lot) {
        const sold = Math.max(0, num(lot.quantity_received) - num(lot.quantity_remaining));
        if (line.quantity < sold) {
          throw Object.assign(
            new Error(
              `${line.productName}: cannot set qty below ${sold} (already sold from this lot)`
            ),
            { status: 400 }
          );
        }
        const newRemaining = line.quantity - sold;
        await conn.query(
          `UPDATE stock_lots SET
            quantity_received = ?, quantity_remaining = ?,
            unit_cost = ?, landed_unit_cost = ?, selling_price = ?
           WHERE id = ?`,
          [
            line.quantity,
            newRemaining,
            line.unitCost,
            Math.round(line.landedUnitCost * 100) / 100,
            line.sellingPrice,
            lot.id,
          ]
        );
      } else if (line.quantity > 0) {
        await insertLot(conn, {
          branchId,
          productId: line.productId,
          purchaseId: id,
          purchaseItemId: line.id,
          quantity: line.quantity,
          unitCost: line.unitCost,
          landedUnitCost: line.landedUnitCost,
          sellingPrice: line.sellingPrice,
          receivedAt: purchaseDate ? `${purchaseDate} 12:00:00` : new Date(),
        });
      }

      if (qtyDelta !== 0) {
        const [stockRows] = await conn.query(
          `SELECT id FROM branch_stocks WHERE branch_id = ? AND product_id = ? FOR UPDATE`,
          [branchId, line.productId]
        );
        if ((stockRows as any[]).length) {
          await conn.query(
            `UPDATE branch_stocks SET quantity_on_hand = GREATEST(0, quantity_on_hand + ?)
             WHERE branch_id = ? AND product_id = ?`,
            [qtyDelta, branchId, line.productId]
          );
        } else if (qtyDelta > 0) {
          await conn.query(
            `INSERT INTO branch_stocks (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location)
             VALUES (?, ?, ?, ?, 50, 200, 'Warehouse Bay')`,
            [newId('bs'), branchId, line.productId, qtyDelta]
          );
        }
      }

      await conn.query(
        `UPDATE purchase_items SET
          quantity = ?, unit_cost = ?, shipping_allocated = ?, landed_unit_cost = ?,
          line_total = ?, selling_price = ?
         WHERE id = ?`,
        [
          line.quantity,
          line.unitCost,
          line.shippingAllocated,
          Math.round(line.landedUnitCost * 100) / 100,
          line.lineTotal,
          line.sellingPrice,
          line.id,
        ]
      );

      await conn.query(`UPDATE products SET cost_price = ?, selling_price = ? WHERE id = ?`, [
        Math.round(line.landedUnitCost * 100) / 100,
        Math.round(line.sellingPrice * 100) / 100,
        line.productId,
      ]);
    }

    await conn.query(
      `UPDATE purchases SET
        purchase_date = ?, notes = ?, received_by = ?,
        items_subtotal = ?, shipping_cost = ?, total_amount = ?,
        payment_type = ?, paid_amount = ?, credit_amount = ?
       WHERE id = ?`,
      [
        purchaseDate,
        notes || null,
        receivedBy || null,
        itemsSubtotal,
        shippingCost,
        totalAmount,
        paymentType,
        paidAmount,
        creditAmount,
        id,
      ]
    );

    const deltaTotal = totalAmount - oldTotal;
    const deltaPaid = paidAmount - oldPaid;
    const deltaCredit = creditAmount - oldCredit;
    if (deltaTotal !== 0 || deltaPaid !== 0 || deltaCredit !== 0) {
      await conn.query(
        `UPDATE suppliers SET
          total_purchased = GREATEST(0, total_purchased + ?),
          total_paid = GREATEST(0, total_paid + ?),
          balance_payable = GREATEST(0, balance_payable + ?)
         WHERE id = ?`,
        [deltaTotal, deltaPaid, deltaCredit, purchase.supplier_id]
      );
    }

    if (purchase.supplier_bill_id) {
      const billStatus =
        creditAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
      await conn.query(
        `UPDATE supplier_bills SET
          total_amount = ?, paid_amount = ?, balance_due = ?, status = ?,
          bill_date = COALESCE(?, bill_date),
          items_summary = ?
         WHERE id = ?`,
        [
          totalAmount,
          paidAmount,
          creditAmount,
          billStatus,
          purchaseDate,
          lines.map((l) => `${l.productName} × ${l.quantity}`).join(', '),
          purchase.supplier_bill_id,
        ]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const [out] = await pool.query(`SELECT * FROM purchases WHERE id = ?`, [id]);
  const [outItems] = await pool.query(`SELECT * FROM purchase_items WHERE purchase_id = ?`, [id]);
  return {
    ...mapPurchase((out as any[])[0]),
    items: (outItems as any[]).map(mapPurchaseItem),
  };
}

export async function purchaseSummary(startDate?: string, endDate?: string) {
  const pool = getPool();
  let sql = `SELECT
      COALESCE(SUM(items_subtotal),0) AS itemsSubtotal,
      COALESCE(SUM(shipping_cost),0) AS shippingCost,
      COALESCE(SUM(total_amount),0) AS totalPurchases,
      COALESCE(SUM(paid_amount),0) AS totalPaid,
      COALESCE(SUM(credit_amount),0) AS totalCredit,
      COUNT(*) AS purchaseCount
     FROM purchases`;
  const params: any[] = [];
  if (startDate && endDate) {
    sql += ` WHERE DATE(purchase_date) >= ? AND DATE(purchase_date) <= ?`;
    params.push(startDate, endDate);
  } else if (startDate) {
    sql += ` WHERE DATE(purchase_date) >= ?`;
    params.push(startDate);
  } else if (endDate) {
    sql += ` WHERE DATE(purchase_date) <= ?`;
    params.push(endDate);
  }
  const [rows]: any = await pool.query(sql, params);
  return {
    itemsSubtotal: num(rows[0]?.itemsSubtotal),
    shippingCost: num(rows[0]?.shippingCost),
    totalPurchases: num(rows[0]?.totalPurchases),
    totalPaid: num(rows[0]?.totalPaid),
    totalCredit: num(rows[0]?.totalCredit),
    purchaseCount: num(rows[0]?.purchaseCount),
  };
}

export async function currentClosingStockValue() {
  const pool = getPool();
  try {
    const [lotRows]: any = await pool.query(
      `SELECT COALESCE(SUM(quantity_remaining * landed_unit_cost), 0) AS value
       FROM stock_lots WHERE quantity_remaining > 0`
    );
    const lotVal = num(lotRows[0]?.value);
    if (lotVal > 0) return lotVal;
  } catch {
    /* stock_lots may not exist yet */
  }
  const [rows]: any = await pool.query(
    `SELECT COALESCE(SUM(bs.quantity_on_hand * p.cost_price), 0) AS value
     FROM branch_stocks bs
     JOIN products p ON p.id = bs.product_id
     WHERE p.is_active = TRUE`
  );
  return num(rows[0]?.value);
}

export async function listOpeningBalances() {
  const [rows] = await getPool().query(
    `SELECT * FROM inventory_period_balances ORDER BY period_start DESC`
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    periodLabel: r.period_label,
    periodStart: r.period_start ? new Date(r.period_start).toISOString().slice(0, 10) : null,
    periodEnd: r.period_end ? new Date(r.period_end).toISOString().slice(0, 10) : null,
    openingStockValue: num(r.opening_stock_value),
    notes: r.notes,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
}

export async function upsertOpeningBalance(data: {
  periodLabel: string;
  periodStart: string;
  periodEnd?: string;
  openingStockValue: number;
  notes?: string;
  createdBy?: string;
}) {
  const id = newId('iob');
  await getPool().query(
    `INSERT INTO inventory_period_balances (id, period_label, period_start, period_end, opening_stock_value, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       period_label = VALUES(period_label),
       period_end = VALUES(period_end),
       opening_stock_value = VALUES(opening_stock_value),
       notes = VALUES(notes)`,
    [
      id,
      data.periodLabel,
      data.periodStart,
      data.periodEnd || null,
      num(data.openingStockValue),
      data.notes || null,
      data.createdBy || null,
    ]
  );
  const list = await listOpeningBalances();
  return list.find((b) => b.periodStart === data.periodStart) || list[0];
}

export async function listOtherIncome() {
  const [rows] = await getPool().query(`SELECT * FROM other_income ORDER BY income_date DESC`);
  return (rows as any[]).map((r) => ({
    id: r.id,
    incomeNumber: r.income_number,
    branchId: r.branch_id,
    title: r.title,
    category: r.category,
    amount: num(r.amount),
    incomeDate: r.income_date ? new Date(r.income_date).toISOString().slice(0, 10) : null,
    notes: r.notes,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
}

export async function createOtherIncome(data: any) {
  const id = newId('oi');
  const incomeNumber =
    data.incomeNumber ||
    `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
  await getPool().query(
    `INSERT INTO other_income (id, income_number, branch_id, title, category, amount, income_date, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      incomeNumber,
      data.branchId || null,
      data.title,
      data.category || 'OTHER',
      num(data.amount),
      data.incomeDate || new Date().toISOString().slice(0, 10),
      data.notes || null,
      data.createdBy || null,
    ]
  );
  const list = await listOtherIncome();
  return list.find((i) => i.id === id);
}
