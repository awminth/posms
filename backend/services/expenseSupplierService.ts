import { getPool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { newId, num } from '../utils/helpers.js';
import {
  mapExpense,
  mapSupplier,
  mapSupplierBill,
  mapSupplierPayment,
} from '../utils/mappers.js';

export async function listExpenses(branchId?: string) {
  const sql = branchId
    ? `SELECT * FROM operating_expenses WHERE branch_id = ? ORDER BY date DESC`
    : `SELECT * FROM operating_expenses ORDER BY date DESC`;
  const [rows] = branchId ? await getPool().query(sql, [branchId]) : await getPool().query(sql);
  return (rows as any[]).map(mapExpense);
}

export async function createExpense(data: any) {
  const id = newId('exp');
  const expenseNumber =
    data.expenseNumber ||
    `EXP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
  await getPool().query(
    `INSERT INTO operating_expenses (id, expense_number, branch_id, category, title, amount, payment_method, date, recorded_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      expenseNumber,
      data.branchId,
      data.category,
      data.title,
      num(data.amount),
      data.paymentMethod,
      data.date,
      data.recordedBy,
      data.notes || null,
    ]
  );
  const [rows] = await getPool().query(`SELECT * FROM operating_expenses WHERE id = ?`, [id]);
  return mapExpense((rows as any[])[0]);
}

export async function deleteExpense(id: string) {
  await getPool().query(`DELETE FROM operating_expenses WHERE id = ?`, [id]);
}

export async function listSuppliers() {
  const [rows] = await getPool().query(`SELECT * FROM suppliers ORDER BY name ASC`);
  return (rows as any[]).map(mapSupplier);
}

export async function createSupplier(data: any) {
  const id = newId('sup');
  const code =
    data.code ||
    `SUP-${String(data.name || 'SUP').slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-2)}`;
  await getPool().query(
    `INSERT INTO suppliers (id, code, name, contact_person, phone, email, address, category, payment_terms_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      data.name,
      data.contactPerson || null,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.category || 'General',
      data.paymentTermsDays ?? 30,
    ]
  );
  const [rows] = await getPool().query(`SELECT * FROM suppliers WHERE id = ?`, [id]);
  return mapSupplier((rows as any[])[0]);
}

export async function updateSupplier(id: string, data: any) {
  const pool = getPool();
  const [existing] = await pool.query(`SELECT * FROM suppliers WHERE id = ?`, [id]);
  if (!(existing as any[]).length) throw new AppError('Supplier not found', 404);

  const row = (existing as any[])[0];
  const name = data.name != null ? String(data.name).trim() : row.name;
  if (!name) throw new AppError('Supplier name is required', 400);

  await pool.query(
    `UPDATE suppliers SET
      name = ?, contact_person = ?, phone = ?, email = ?, address = ?,
      category = ?, payment_terms_days = ?
     WHERE id = ?`,
    [
      name,
      data.contactPerson != null ? data.contactPerson : row.contact_person,
      data.phone != null ? data.phone : row.phone,
      data.email != null ? data.email : row.email,
      data.address != null ? data.address : row.address,
      data.category != null ? data.category : row.category || 'General',
      data.paymentTermsDays != null ? num(data.paymentTermsDays, 30) : num(row.payment_terms_days, 30),
      id,
    ]
  );

  if (name !== row.name) {
    await pool.query(`UPDATE purchases SET supplier_name = ? WHERE supplier_id = ?`, [name, id]);
    await pool.query(`UPDATE supplier_bills SET supplier_name = ? WHERE supplier_id = ?`, [name, id]);
    await pool.query(`UPDATE supplier_payments SET supplier_name = ? WHERE supplier_id = ?`, [
      name,
      id,
    ]);
  }

  const [rows] = await pool.query(`SELECT * FROM suppliers WHERE id = ?`, [id]);
  return mapSupplier((rows as any[])[0]);
}

export async function listSupplierBills() {
  const [rows] = await getPool().query(`SELECT * FROM supplier_bills ORDER BY bill_date DESC`);
  return (rows as any[]).map(mapSupplierBill);
}

export async function listSupplierPayments() {
  const [rows] = await getPool().query(`SELECT * FROM supplier_payments ORDER BY paid_date DESC`);
  return (rows as any[]).map(mapSupplierPayment);
}

export async function settleSupplierPayment(payload: {
  supplierId: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  bankName?: string;
  notes?: string;
  paidBy: string;
}) {
  const pool = getPool();
  const conn = await pool.getConnection();
  const id = newId('sp');
  const paymentNumber = `PAY-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
  try {
    await conn.beginTransaction();
    const [supRows] = await conn.query(`SELECT * FROM suppliers WHERE id = ? FOR UPDATE`, [
      payload.supplierId,
    ]);
    const supplier = (supRows as any[])[0];
    if (!supplier) throw new AppError('Supplier not found', 404);

    await conn.query(
      `INSERT INTO supplier_payments (id, payment_number, supplier_id, supplier_name, amount, payment_method, reference_no, bank_name, paid_date, paid_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)`,
      [
        id,
        paymentNumber,
        payload.supplierId,
        supplier.name,
        num(payload.amount),
        payload.paymentMethod,
        payload.referenceNo || null,
        payload.bankName || null,
        payload.paidBy,
        payload.notes || null,
      ]
    );

    await conn.query(
      `UPDATE suppliers SET total_paid = total_paid + ?, balance_payable = GREATEST(0, balance_payable - ?) WHERE id = ?`,
      [num(payload.amount), num(payload.amount), payload.supplierId]
    );

    let remaining = num(payload.amount);
    const [bills] = await conn.query(
      `SELECT * FROM supplier_bills WHERE supplier_id = ? AND status <> 'PAID' ORDER BY bill_date ASC FOR UPDATE`,
      [payload.supplierId]
    );
    for (const bill of bills as any[]) {
      if (remaining <= 0) break;
      const toPay = Math.min(num(bill.balance_due), remaining);
      remaining -= toPay;
      const newPaid = num(bill.paid_amount) + toPay;
      const newBal = num(bill.balance_due) - toPay;
      await conn.query(
        `UPDATE supplier_bills SET paid_amount = ?, balance_due = ?, status = ? WHERE id = ?`,
        [newPaid, newBal, newBal <= 0 ? 'PAID' : 'PARTIAL', bill.id]
      );
    }

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  const [rows] = await pool.query(`SELECT * FROM supplier_payments WHERE id = ?`, [id]);
  return mapSupplierPayment((rows as any[])[0]);
}

export async function receiveGrn(payload: {
  supplierId: string;
  supplierName: string;
  destBranchId: string;
  items: any[];
  paymentType: 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL';
  notes?: string;
  receivedBy: string;
  shippingCost?: number;
  paidAmount?: number;
  purchaseDate?: string;
}) {
  // Delegate to purchases ledger (supplier-linked, shipping → landed cost)
  const { createPurchase } = await import('./purchaseService.js');
  return createPurchase({
    supplierId: payload.supplierId,
    supplierName: payload.supplierName,
    destBranchId: payload.destBranchId,
    items: (payload.items || []).map((i: any) => ({
      productId: i.productId,
      productName: i.productName,
      totalBaseUnitsReceived: i.totalBaseUnitsReceived,
      unitCost: i.unitCost,
      totalCost: i.totalCost,
    })),
    shippingCost: payload.shippingCost,
    paidAmount: payload.paidAmount,
    paymentType: payload.paymentType,
    notes: payload.notes,
    receivedBy: payload.receivedBy,
    purchaseDate: payload.purchaseDate,
  });
}
