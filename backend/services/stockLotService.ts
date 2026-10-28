import { getPool } from '../config/db.js';
import { newId, num } from '../utils/helpers.js';

export type StockLot = {
  id: string;
  branchId: string;
  productId: string;
  purchaseId?: string;
  purchaseItemId?: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  landedUnitCost: number;
  sellingPrice: number;
  receivedAt: string;
  notes?: string;
};

export function mapStockLot(row: any): StockLot {
  return {
    id: row.id,
    branchId: row.branch_id,
    productId: row.product_id,
    purchaseId: row.purchase_id || undefined,
    purchaseItemId: row.purchase_item_id || undefined,
    quantityReceived: num(row.quantity_received),
    quantityRemaining: num(row.quantity_remaining),
    unitCost: num(row.unit_cost),
    landedUnitCost: num(row.landed_unit_cost),
    sellingPrice: num(row.selling_price),
    receivedAt: row.received_at
      ? new Date(row.received_at).toISOString()
      : new Date().toISOString(),
    notes: row.notes || undefined,
  };
}

export async function listStockLots(opts?: {
  branchId?: string;
  productId?: string;
  remainingOnly?: boolean;
}): Promise<StockLot[]> {
  const pool = getPool();
  const where: string[] = [];
  const params: any[] = [];
  if (opts?.branchId) {
    where.push('branch_id = ?');
    params.push(opts.branchId);
  }
  if (opts?.productId) {
    where.push('product_id = ?');
    params.push(opts.productId);
  }
  if (opts?.remainingOnly) {
    where.push('quantity_remaining > 0');
  }
  const sql = `SELECT * FROM stock_lots ${
    where.length ? `WHERE ${where.join(' AND ')}` : ''
  } ORDER BY received_at ASC, id ASC`;
  try {
    const [rows] = await pool.query(sql, params);
    return (rows as any[]).map(mapStockLot);
  } catch {
    return [];
  }
}

/** Create a lot (caller provides connection for transactions). */
export async function insertLot(
  conn: any,
  data: {
    branchId: string;
    productId: string;
    purchaseId?: string | null;
    purchaseItemId?: string | null;
    quantity: number;
    unitCost: number;
    landedUnitCost: number;
    sellingPrice: number;
    receivedAt?: string | Date;
    notes?: string | null;
  }
): Promise<string> {
  const id = newId('lot');
  const qty = Math.max(0, Math.floor(num(data.quantity)));
  await conn.query(
    `INSERT INTO stock_lots (
      id, branch_id, product_id, purchase_id, purchase_item_id,
      quantity_received, quantity_remaining, unit_cost, landed_unit_cost, selling_price,
      received_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.branchId,
      data.productId,
      data.purchaseId || null,
      data.purchaseItemId || null,
      qty,
      qty,
      num(data.unitCost),
      num(data.landedUnitCost),
      num(data.sellingPrice),
      data.receivedAt || new Date(),
      data.notes || null,
    ]
  );
  return id;
}

export type LotAllocation = {
  stockLotId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
};

/**
 * FIFO allocate qty from lots at branch. Locks rows FOR UPDATE.
 * Does NOT update branch_stocks — caller syncs totals.
 */
export async function allocateFifo(
  conn: any,
  branchId: string,
  productId: string,
  quantity: number,
  preferredLotId?: string
): Promise<LotAllocation[]> {
  const need = Math.max(0, Math.floor(num(quantity)));
  if (need <= 0) return [];

  const [rows] = await conn.query(
    `SELECT * FROM stock_lots
     WHERE branch_id = ? AND product_id = ? AND quantity_remaining > 0
     ORDER BY
       CASE WHEN id = ? THEN 0 ELSE 1 END,
       received_at ASC, id ASC
     FOR UPDATE`,
    [branchId, productId, preferredLotId || '']
  );

  const allocations: LotAllocation[] = [];
  let remaining = need;

  for (const lot of rows as any[]) {
    if (remaining <= 0) break;
    const avail = num(lot.quantity_remaining);
    if (avail <= 0) continue;
    const take = Math.min(avail, remaining);
    await conn.query(
      `UPDATE stock_lots SET quantity_remaining = quantity_remaining - ? WHERE id = ?`,
      [take, lot.id]
    );
    allocations.push({
      stockLotId: lot.id,
      productId,
      quantity: take,
      unitPrice: num(lot.selling_price),
      costPrice: num(lot.landed_unit_cost) || num(lot.unit_cost),
    });
    remaining -= take;
  }

  if (remaining > 0) {
    // Fallback: no lots (legacy stock) — use product prices, no lot id
    const [prodRows] = await conn.query(
      `SELECT cost_price, selling_price FROM products WHERE id = ?`,
      [productId]
    );
    const p = (prodRows as any[])[0];
    allocations.push({
      stockLotId: '',
      productId,
      quantity: remaining,
      unitPrice: num(p?.selling_price),
      costPrice: num(p?.cost_price),
    });
  }

  return allocations;
}

/** Restore qty to a specific lot (void sale / return). */
export async function restoreLotQty(conn: any, stockLotId: string, quantity: number) {
  if (!stockLotId || quantity <= 0) return;
  await conn.query(
    `UPDATE stock_lots SET quantity_remaining = quantity_remaining + ? WHERE id = ?`,
    [Math.floor(num(quantity)), stockLotId]
  );
}

/**
 * Deduct from lots belonging to a purchase (purchase return).
 * Falls back to FIFO at branch if purchase lots insufficient.
 */
export async function deductFromPurchaseLots(
  conn: any,
  branchId: string,
  purchaseId: string,
  productId: string,
  quantity: number
): Promise<void> {
  let remaining = Math.max(0, Math.floor(num(quantity)));
  if (remaining <= 0) return;

  const [rows] = await conn.query(
    `SELECT * FROM stock_lots
     WHERE branch_id = ? AND product_id = ? AND purchase_id = ? AND quantity_remaining > 0
     ORDER BY received_at DESC, id DESC
     FOR UPDATE`,
    [branchId, productId, purchaseId]
  );

  for (const lot of rows as any[]) {
    if (remaining <= 0) break;
    const avail = num(lot.quantity_remaining);
    const take = Math.min(avail, remaining);
    await conn.query(
      `UPDATE stock_lots SET quantity_remaining = quantity_remaining - ? WHERE id = ?`,
      [take, lot.id]
    );
    remaining -= take;
  }

  if (remaining > 0) {
    await allocateFifo(conn, branchId, productId, remaining);
  }
}

/**
 * Move qty FIFO from source branch lots to dest (creates dest lots preserving cost/sell).
 */
export async function transferLotsFifo(
  conn: any,
  sourceBranchId: string,
  destBranchId: string,
  productId: string,
  quantity: number
): Promise<void> {
  const need = Math.max(0, Math.floor(num(quantity)));
  if (need <= 0) return;

  const [rows] = await conn.query(
    `SELECT * FROM stock_lots
     WHERE branch_id = ? AND product_id = ? AND quantity_remaining > 0
     ORDER BY received_at ASC, id ASC
     FOR UPDATE`,
    [sourceBranchId, productId]
  );

  let remaining = need;
  for (const lot of rows as any[]) {
    if (remaining <= 0) break;
    const avail = num(lot.quantity_remaining);
    const take = Math.min(avail, remaining);
    await conn.query(
      `UPDATE stock_lots SET quantity_remaining = quantity_remaining - ? WHERE id = ?`,
      [take, lot.id]
    );
    await insertLot(conn, {
      branchId: destBranchId,
      productId,
      purchaseId: lot.purchase_id,
      purchaseItemId: lot.purchase_item_id,
      quantity: take,
      unitCost: num(lot.unit_cost),
      landedUnitCost: num(lot.landed_unit_cost),
      sellingPrice: num(lot.selling_price),
      receivedAt: lot.received_at,
      notes: `Transfer from ${sourceBranchId}`,
    });
    remaining -= take;
  }
}

/** One-time backfill: opening lot per branch_stock row with no lots yet. */
export async function backfillOpeningLots(): Promise<number> {
  const pool = getPool();
  const conn = await pool.getConnection();
  let created = 0;
  try {
    await conn.beginTransaction();
    const [stocks] = await conn.query(
      `SELECT bs.branch_id, bs.product_id, bs.quantity_on_hand,
              p.cost_price, p.selling_price
       FROM branch_stocks bs
       JOIN products p ON p.id = bs.product_id
       WHERE bs.quantity_on_hand > 0`
    );

    for (const s of stocks as any[]) {
      const [existing] = await conn.query(
        `SELECT COALESCE(SUM(quantity_remaining),0) AS rem
         FROM stock_lots WHERE branch_id = ? AND product_id = ?`,
        [s.branch_id, s.product_id]
      );
      const rem = num((existing as any[])[0]?.rem);
      const gap = num(s.quantity_on_hand) - rem;
      if (gap <= 0) continue;
      await insertLot(conn, {
        branchId: s.branch_id,
        productId: s.product_id,
        quantity: gap,
        unitCost: num(s.cost_price),
        landedUnitCost: num(s.cost_price),
        sellingPrice: num(s.selling_price),
        notes: 'Opening / backfill lot',
      });
      created += 1;
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return created;
}
