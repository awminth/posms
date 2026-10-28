import { getPool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { newId, num } from '../utils/helpers.js';
import { mapTransfer } from '../utils/mappers.js';
import { allocateFifo, insertLot } from './stockLotService.js';

async function fetchTransfer(id: string) {
  const [rows] = await getPool().query(
    `SELECT st.*, sti.product_id, sti.quantity_requested AS quantity, p.name AS product_name,
            u.full_name AS requested_by_name
     FROM stock_transfers st
     LEFT JOIN stock_transfer_items sti ON sti.transfer_id = st.id
     LEFT JOIN products p ON p.id = sti.product_id
     LEFT JOIN users u ON u.id = st.requested_by
     WHERE st.id = ?
     LIMIT 1`,
    [id]
  );
  if (!(rows as any[]).length) throw new AppError('Transfer not found', 404);
  return mapTransfer((rows as any[])[0]);
}

export async function listTransfers() {
  const [rows] = await getPool().query(
    `SELECT st.*, sti.product_id, sti.quantity_requested AS quantity, p.name AS product_name,
            COALESCE(u.full_name, st.requested_by) AS requested_by_name
     FROM stock_transfers st
     LEFT JOIN stock_transfer_items sti ON sti.transfer_id = st.id
     LEFT JOIN products p ON p.id = sti.product_id
     LEFT JOIN users u ON u.id = st.requested_by
     ORDER BY st.created_at DESC`
  );
  return (rows as any[]).map(mapTransfer);
}

export async function createTransfer(payload: {
  sourceBranchId: string;
  destBranchId: string;
  productId: string;
  quantity: number;
  requestedBy: string;
  notes?: string;
  status?: string;
}) {
  const pool = getPool();
  const conn = await pool.getConnection();
  const id = newId('trf');
  const transferNumber = `TRF-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO stock_transfers (id, transfer_number, source_branch_id, destination_branch_id, status, requested_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        transferNumber,
        payload.sourceBranchId,
        payload.destBranchId,
        payload.status || 'IN_TRANSIT',
        payload.requestedBy,
        payload.notes || null,
      ]
    );
    const [prod] = await conn.query(`SELECT cost_price FROM products WHERE id = ?`, [payload.productId]);
    await conn.query(
      `INSERT INTO stock_transfer_items (id, transfer_id, product_id, quantity_requested, quantity_shipped, quantity_received, unit_cost)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      [
        newId('sti'),
        id,
        payload.productId,
        num(payload.quantity),
        num(payload.quantity),
        num((prod as any[])[0]?.cost_price),
      ]
    );
    await conn.query(
      `UPDATE branch_stocks SET quantity_on_hand = GREATEST(0, quantity_on_hand - ?)
       WHERE branch_id = ? AND product_id = ?`,
      [num(payload.quantity), payload.sourceBranchId, payload.productId]
    );
    try {
      // Deduct FIFO lots from source (cost/sell preserved via transfer item for receive)
      await allocateFifo(conn, payload.sourceBranchId, payload.productId, num(payload.quantity));
    } catch {
      /* optional */
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return fetchTransfer(id);
}

export async function receiveTransfer(id: string, receivedBy?: string) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const transfer = await fetchTransfer(id);
    if (transfer.status === 'RECEIVED') {
      await conn.rollback();
      return transfer;
    }

    const [items] = await conn.query(`SELECT * FROM stock_transfer_items WHERE transfer_id = ?`, [id]);
    for (const item of items as any[]) {
      const qty = num(item.quantity_shipped || item.quantity_requested);
      const [existing] = await conn.query(
        `SELECT id FROM branch_stocks WHERE branch_id = ? AND product_id = ?`,
        [transfer.destBranchId, item.product_id]
      );
      if ((existing as any[]).length) {
        await conn.query(
          `UPDATE branch_stocks SET quantity_on_hand = quantity_on_hand + ? WHERE branch_id = ? AND product_id = ?`,
          [qty, transfer.destBranchId, item.product_id]
        );
      } else {
        await conn.query(
          `INSERT INTO branch_stocks (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location)
           VALUES (?, ?, ?, ?, 10, 50, 'Default Storage')`,
          [newId('bs'), transfer.destBranchId, item.product_id, qty]
        );
      }
      try {
        const [prodRows] = await conn.query(
          `SELECT cost_price, selling_price FROM products WHERE id = ?`,
          [item.product_id]
        );
        const p = (prodRows as any[])[0];
        await insertLot(conn, {
          branchId: transfer.destBranchId,
          productId: item.product_id,
          quantity: qty,
          unitCost: num(item.unit_cost) || num(p?.cost_price),
          landedUnitCost: num(item.unit_cost) || num(p?.cost_price),
          sellingPrice: num(p?.selling_price),
          notes: `Transfer ${id}`,
        });
      } catch {
        /* optional */
      }
      await conn.query(
        `UPDATE stock_transfer_items SET quantity_received = ? WHERE id = ?`,
        [qty, item.id]
      );
    }

    await conn.query(
      `UPDATE stock_transfers SET status = 'RECEIVED', received_by = ?, received_at = NOW() WHERE id = ?`,
      [receivedBy || null, id]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return fetchTransfer(id);
}

export async function distributeStock(payload: {
  productId: string;
  sourceBranchId?: string;
  distributions: { destBranchId: string; quantity: number }[];
  notes?: string;
  requestedBy: string;
}) {
  let source = payload.sourceBranchId;
  if (!source) {
    try {
      const [wh] = await getPool().query(`SELECT id FROM branches WHERE type = 'WAREHOUSE' LIMIT 1`);
      source = (wh as any[])[0]?.id || 'b-04';
    } catch {
      source = 'b-04';
    }
  }
  const results = [];
  for (const dist of payload.distributions) {
    if (!dist.quantity || dist.quantity <= 0) continue;
    const trf = await createTransfer({
      sourceBranchId: source,
      destBranchId: dist.destBranchId,
      productId: payload.productId,
      quantity: dist.quantity,
      requestedBy: payload.requestedBy,
      notes: payload.notes || 'Central Warehouse Distribution',
      status: 'IN_TRANSIT',
    });
    const received = await receiveTransfer(trf.id, payload.requestedBy);
    results.push(received);
  }
  return results;
}
