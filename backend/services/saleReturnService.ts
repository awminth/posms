import { getPool } from '../config/db.js';
import { newId, num, formatDateTime } from '../utils/helpers.js';

function mapSaleReturn(row: any, items: any[] = []) {
  return {
    id: row.id,
    returnNumber: row.return_number,
    originalOrderId: row.original_order_id || undefined,
    originalOrderNumber: row.original_order_number || undefined,
    branchId: row.branch_id,
    cashierName: row.cashier_name,
    customerId: row.customer_id || undefined,
    customerName: row.customer_name || undefined,
    items: items.map((it) => ({
      productId: it.product_id,
      productName: it.product_name,
      sku: it.sku || undefined,
      unit: it.unit || undefined,
      unitPrice: num(it.unit_price),
      quantityReturned: num(it.quantity_returned),
      refundAmount: num(it.refund_amount),
      condition: it.item_condition || 'GOOD',
    })),
    totalRefundAmount: num(row.total_refund_amount),
    refundMethod: row.refund_method,
    reason: row.reason,
    notes: row.notes || undefined,
    restockedToInventory: !!row.restocked_to_inventory,
    createdAt: row.created_at ? formatDateTime(row.created_at) : '',
  };
}

export async function listSaleReturns() {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT * FROM sale_returns ORDER BY created_at DESC`);
  const result = [];
  for (const row of rows as any[]) {
    const [items] = await pool.query(`SELECT * FROM sale_return_items WHERE return_id = ?`, [row.id]);
    result.push(mapSaleReturn(row, items as any[]));
  }
  return result;
}

export async function createSaleReturn(data: any) {
  const pool = getPool();
  const conn = await pool.getConnection();
  const id = newId('ret');
  const returnNumber =
    data.returnNumber ||
    `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-3)}`;
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO sale_returns (
        id, return_number, original_order_id, original_order_number, branch_id, cashier_name,
        customer_id, customer_name, total_refund_amount, refund_method, reason, notes, restocked_to_inventory
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        returnNumber,
        data.originalOrderId || null,
        data.originalOrderNumber || null,
        data.branchId,
        data.cashierName,
        data.customerId || null,
        data.customerName || null,
        num(data.totalRefundAmount),
        data.refundMethod,
        data.reason,
        data.notes || null,
        data.restockedToInventory !== false,
      ]
    );

    for (const item of data.items || []) {
      await conn.query(
        `INSERT INTO sale_return_items (id, return_id, product_id, product_name, sku, unit, unit_price, quantity_returned, refund_amount, item_condition)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId('sri'),
          id,
          item.productId,
          item.productName,
          item.sku || null,
          item.unit || null,
          num(item.unitPrice),
          num(item.quantityReturned),
          num(item.refundAmount),
          item.condition || 'GOOD',
        ]
      );

      if (data.restockedToInventory !== false) {
        await conn.query(
          `UPDATE branch_stocks SET quantity_on_hand = quantity_on_hand + ?
           WHERE branch_id = ? AND product_id = ?`,
          [num(item.quantityReturned), data.branchId, item.productId]
        );
      }
    }

    if (data.refundMethod === 'CASH') {
      await conn.query(
        `UPDATE shifts SET
          expected_cash = GREATEST(0, expected_cash - ?),
          cash_sales = GREATEST(0, cash_sales - ?),
          total_sales_amount = GREATEST(0, total_sales_amount - ?)
         WHERE branch_id = ? AND status = 'OPEN'`,
        [num(data.totalRefundAmount), num(data.totalRefundAmount), num(data.totalRefundAmount), data.branchId]
      );
    } else if (data.refundMethod === 'CUSTOMER_CREDIT' && data.customerId) {
      await conn.query(
        `UPDATE customers SET current_credit = GREATEST(0, current_credit - ?) WHERE id = ?`,
        [num(data.totalRefundAmount), data.customerId]
      );
    }

    if (data.originalOrderId) {
      await conn.query(
        `UPDATE orders SET
          returned_amount = COALESCE(returned_amount, 0) + ?,
          order_status = CASE
            WHEN COALESCE(returned_amount, 0) + ? >= grand_total THEN 'RETURNED'
            ELSE 'PARTIALLY_RETURNED'
          END
         WHERE id = ?`,
        [num(data.totalRefundAmount), num(data.totalRefundAmount), data.originalOrderId]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  const [rows] = await pool.query(`SELECT * FROM sale_returns WHERE id = ?`, [id]);
  const [items] = await pool.query(`SELECT * FROM sale_return_items WHERE return_id = ?`, [id]);
  return mapSaleReturn((rows as any[])[0], items as any[]);
}
