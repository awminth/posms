import { getPool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { newId, num } from '../utils/helpers.js';
import { mapShift } from '../utils/mappers.js';

async function fetchShift(id: string) {
  const [rows] = await getPool().query(
    `SELECT s.*, u.full_name AS cashier_name, r.name AS register_name
     FROM shifts s
     LEFT JOIN users u ON u.id = s.cashier_id
     LEFT JOIN registers r ON r.id = s.register_id
     WHERE s.id = ?`,
    [id]
  );
  if (!(rows as any[]).length) throw new AppError('Shift not found', 404);
  return mapShift((rows as any[])[0]);
}

export async function listShifts(branchId?: string) {
  const sql = branchId
    ? `SELECT s.*, u.full_name AS cashier_name, r.name AS register_name
       FROM shifts s
       LEFT JOIN users u ON u.id = s.cashier_id
       LEFT JOIN registers r ON r.id = s.register_id
       WHERE s.branch_id = ?
       ORDER BY s.opened_at DESC`
    : `SELECT s.*, u.full_name AS cashier_name, r.name AS register_name
       FROM shifts s
       LEFT JOIN users u ON u.id = s.cashier_id
       LEFT JOIN registers r ON r.id = s.register_id
       ORDER BY s.opened_at DESC`;
  const [rows] = branchId ? await getPool().query(sql, [branchId]) : await getPool().query(sql);
  return (rows as any[]).map(mapShift);
}

export async function listRegisters(branchId?: string) {
  const sql = branchId
    ? `SELECT * FROM registers WHERE branch_id = ? AND is_active = TRUE`
    : `SELECT * FROM registers WHERE is_active = TRUE`;
  const [rows] = branchId ? await getPool().query(sql, [branchId]) : await getPool().query(sql);
  return (rows as any[]).map((r) => ({
    id: r.id,
    branchId: r.branch_id,
    name: r.name,
    terminalCode: r.terminal_code,
  }));
}

export async function openShift(payload: {
  branchId: string;
  registerId?: string;
  cashierId: string;
  openingFloat: number;
}) {
  const pool = getPool();
  const [open] = await pool.query(
    `SELECT id FROM shifts WHERE branch_id = ? AND status = 'OPEN' LIMIT 1`,
    [payload.branchId]
  );
  if ((open as any[]).length) {
    return fetchShift((open as any[])[0].id);
  }

  let registerId = payload.registerId;
  if (!registerId) {
    const [regs] = await pool.query(
      `SELECT id FROM registers WHERE branch_id = ? AND is_active = TRUE LIMIT 1`,
      [payload.branchId]
    );
    registerId = (regs as any[])[0]?.id;
    if (!registerId) {
      registerId = newId('reg');
      await pool.query(
        `INSERT INTO registers (id, branch_id, name, terminal_code, is_active) VALUES (?, ?, 'Main Cashier Terminal 01', ?, TRUE)`,
        [registerId, payload.branchId, `POS-${payload.branchId}-T1`]
      );
    }
  }

  const id = newId('sh');
  await pool.query(
    `INSERT INTO shifts (id, branch_id, register_id, cashier_id, opening_float, expected_cash, status, cash_sales, mobile_sales, card_sales, total_sales_amount, total_orders_count)
     VALUES (?, ?, ?, ?, ?, ?, 'OPEN', 0, 0, 0, 0, 0)`,
    [id, payload.branchId, registerId, payload.cashierId, num(payload.openingFloat), num(payload.openingFloat)]
  );
  return fetchShift(id);
}

export async function closeShift(id: string, actualCash: number, notes?: string) {
  const shift = await fetchShift(id);
  const difference = num(actualCash) - num(shift.expectedCash);
  await getPool().query(
    `UPDATE shifts SET closed_at = NOW(), actual_cash = ?, difference = ?, status = 'CLOSED', notes = ? WHERE id = ?`,
    [actualCash, difference, notes || null, id]
  );
  return fetchShift(id);
}

export async function cashMovement(
  id: string,
  amount: number,
  type: 'CASH_IN' | 'CASH_OUT',
  reason: string,
  userId?: string
) {
  const pool = getPool();
  const shift = await fetchShift(id);
  const delta = type === 'CASH_IN' ? num(amount) : -num(amount);
  await pool.query(
    `UPDATE shifts SET expected_cash = GREATEST(0, expected_cash + ?) WHERE id = ?`,
    [delta, id]
  );
  await pool.query(
    `INSERT INTO cash_drawer_logs (id, shift_id, branch_id, user_id, action_type, amount, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId('cdl'), id, shift.branchId, userId || 'u-01', type, num(amount), reason || type]
  );
  return fetchShift(id);
}
