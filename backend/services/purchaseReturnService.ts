import { getPool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { newId, num, formatDateTime } from '../utils/helpers.js';

function mapReturn(row: any, items: any[] = []) {
  return {
    id: row.id,
    returnNumber: row.return_number,
    purchaseId: row.purchase_id,
    purchaseNumber: row.purchase_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    branchId: row.branch_id,
    totalRefundAmount: num(row.total_refund_amount),
    settlementMethod: row.settlement_method,
    reason: row.reason,
    notes: row.notes || undefined,
    stockDeducted: !!row.stock_deducted,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at ? formatDateTime(row.created_at) : '',
    items: items.map((it) => ({
      id: it.id,
      productId: it.product_id,
      productName: it.product_name,
      quantityReturned: num(it.quantity_returned),
      unitCost: num(it.unit_cost),
      landedUnitCost: num(it.landed_unit_cost),
      refundAmount: num(it.refund_amount),
    })),
  };
}

export async function listPurchaseReturns() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM purchase_returns ORDER BY created_at DESC LIMIT 300`
  );
  const result = [];
  for (const row of rows as any[]) {
    const [items] = await pool.query(
      `SELECT * FROM purchase_return_items WHERE return_id = ?`,
      [row.id]
    );
    result.push(mapReturn(row, items as any[]));
  }
  return result;
}

/** Qty already returned per product for a purchase */
async function returnedQtyMap(conn: any, purchaseId: string) {
  const [rows] = await conn.query(
    `SELECT pri.product_id, SUM(pri.quantity_returned) AS qty
     FROM purchase_return_items pri
     INNER JOIN purchase_returns pr ON pr.id = pri.return_id
     WHERE pr.purchase_id = ?
     GROUP BY pri.product_id`,
    [purchaseId]
  );
  const map: Record<string, number> = {};
  for (const r of rows as any[]) {
    map[r.product_id] = num(r.qty);
  }
  return map;
}

/**
 * Purchase return:
 * - Deduct stock from purchase dest branch (usually Main Store)
 * - Reduce supplier AP / bill balance (or record cash refund)
 * - Reduce suppliers.total_purchased
 */
export async function createPurchaseReturn(data: {
  purchaseId: string;
  items: { productId: string; quantityReturned: number }[];
  settlementMethod?: 'REDUCE_CREDIT' | 'CASH_REFUND';
  reason?: string;
  notes?: string;
  stockDeducted?: boolean;
  createdBy?: string;
}) {
  const pool = getPool();
  const conn = await pool.getConnection();
  const id = newId('pret');
  const returnNumber = `PR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;

  try {
    await conn.beginTransaction();

    const [pRows] = await conn.query(`SELECT * FROM purchases WHERE id = ? FOR UPDATE`, [
      data.purchaseId,
    ]);
    const purchase = (pRows as any[])[0];
    if (!purchase) throw new AppError('Purchase voucher not found', 404);

    const [lineRows] = await conn.query(`SELECT * FROM purchase_items WHERE purchase_id = ?`, [
      data.purchaseId,
    ]);
    const lines = lineRows as any[];
    const already = await returnedQtyMap(conn, data.purchaseId);

    const returnLines: {
      productId: string;
      productName: string;
      quantityReturned: number;
      unitCost: number;
      landedUnitCost: number;
      refundAmount: number;
    }[] = [];

    for (const req of data.items || []) {
      const qty = Math.max(0, Math.floor(num(req.quantityReturned)));
      if (qty <= 0 || !req.productId) continue;
      const line = lines.find((l) => l.product_id === req.productId);
      if (!line) throw new AppError(`Item not on purchase: ${req.productId}`, 400);
      const maxReturnable = num(line.quantity) - (already[req.productId] || 0);
      if (qty > maxReturnable) {
        throw new AppError(
          `Cannot return ${qty} of ${line.product_name} — only ${maxReturnable} left to return`,
          400
        );
      }
      const landed = num(line.landed_unit_cost) || num(line.unit_cost);
      returnLines.push({
        productId: line.product_id,
        productName: line.product_name,
        quantityReturned: qty,
        unitCost: num(line.unit_cost),
        landedUnitCost: landed,
        refundAmount: Math.round(qty * landed * 100) / 100,
      });
    }

    if (!returnLines.length) throw new AppError('Select at least one item to return', 400);

    const totalRefund = returnLines.reduce((s, i) => s + i.refundAmount, 0);
    const settlement = data.settlementMethod || 'REDUCE_CREDIT';
    const deductStock = data.stockDeducted !== false;
    const branchId = purchase.dest_branch_id;

    await conn.query(
      `INSERT INTO purchase_returns (
        id, return_number, purchase_id, purchase_number, supplier_id, supplier_name,
        branch_id, total_refund_amount, settlement_method, reason, notes, stock_deducted, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        returnNumber,
        purchase.id,
        purchase.purchase_number,
        purchase.supplier_id,
        purchase.supplier_name,
        branchId,
        totalRefund,
        settlement,
        data.reason || 'Damaged / Wrong item',
        data.notes || null,
        deductStock ? 1 : 0,
        data.createdBy || null,
      ]
    );

    for (const item of returnLines) {
      await conn.query(
        `INSERT INTO purchase_return_items (
          id, return_id, product_id, product_name, quantity_returned,
          unit_cost, landed_unit_cost, refund_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId('pri'),
          id,
          item.productId,
          item.productName,
          item.quantityReturned,
          item.unitCost,
          item.landedUnitCost,
          item.refundAmount,
        ]
      );

      if (deductStock) {
        await conn.query(
          `UPDATE branch_stocks SET quantity_on_hand = GREATEST(0, quantity_on_hand - ?)
           WHERE branch_id = ? AND product_id = ?`,
          [item.quantityReturned, branchId, item.productId]
        );
        try {
          const { deductFromPurchaseLots } = await import('./stockLotService.js');
          await deductFromPurchaseLots(
            conn,
            branchId,
            purchase.id,
            item.productId,
            item.quantityReturned
          );
        } catch {
          /* lots optional */
        }
      }
    }

    // Prefer reducing unpaid credit on the linked bill / supplier AP
    let creditReduce = 0;
    let paidReduce = 0;
    if (settlement === 'CASH_REFUND') {
      paidReduce = totalRefund;
    } else {
      creditReduce = Math.min(totalRefund, num(purchase.credit_amount));
      paidReduce = Math.max(0, totalRefund - creditReduce);
    }

    await conn.query(
      `UPDATE purchases SET
        credit_amount = GREATEST(0, credit_amount - ?),
        paid_amount = GREATEST(0, paid_amount - ?),
        total_amount = GREATEST(0, total_amount - ?),
        items_subtotal = GREATEST(0, items_subtotal - ?)
       WHERE id = ?`,
      [creditReduce, paidReduce, totalRefund, totalRefund, purchase.id]
    );

    if (purchase.supplier_bill_id) {
      await conn.query(
        `UPDATE supplier_bills SET
          total_amount = GREATEST(0, total_amount - ?),
          balance_due = GREATEST(0, balance_due - ?),
          paid_amount = GREATEST(0, paid_amount - ?),
          status = CASE
            WHEN GREATEST(0, balance_due - ?) <= 0 THEN 'PAID'
            WHEN GREATEST(0, paid_amount - ?) > 0 THEN 'PARTIAL'
            ELSE 'UNPAID'
          END
         WHERE id = ?`,
        [
          totalRefund,
          creditReduce,
          paidReduce,
          creditReduce,
          paidReduce,
          purchase.supplier_bill_id,
        ]
      );
    }

    await conn.query(
      `UPDATE suppliers SET
        total_purchased = GREATEST(0, total_purchased - ?),
        total_paid = GREATEST(0, total_paid - ?),
        balance_payable = GREATEST(0, balance_payable - ?)
       WHERE id = ?`,
      [totalRefund, paidReduce, creditReduce, purchase.supplier_id]
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const [rows] = await pool.query(`SELECT * FROM purchase_returns WHERE id = ?`, [id]);
  const [items] = await pool.query(`SELECT * FROM purchase_return_items WHERE return_id = ?`, [id]);
  return mapReturn((rows as any[])[0], items as any[]);
}
