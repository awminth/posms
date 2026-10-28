import { getPool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { newId, num } from '../utils/helpers.js';
import { mapCustomer } from '../utils/mappers.js';

export async function listCustomers() {
  const [rows] = await getPool().query(`SELECT * FROM customers ORDER BY name ASC`);
  return (rows as any[]).map(mapCustomer);
}

export async function createCustomer(data: any) {
  const id = data.id || newId('c');
  await getPool().query(
    `INSERT INTO customers (id, name, phone, email, loyalty_tier, loyalty_points, total_spent, total_visits, credit_limit, current_credit, address)
     VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, 0, ?)`,
    [
      id,
      data.name,
      data.phone || null,
      data.email || null,
      data.tier || 'REGULAR',
      data.creditLimit ?? 300000,
      data.address || null,
    ]
  );
  const [rows] = await getPool().query(`SELECT * FROM customers WHERE id = ?`, [id]);
  return mapCustomer((rows as any[])[0]);
}

export async function updateCustomer(id: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, string> = {
    name: 'name',
    phone: 'phone',
    email: 'email',
    tier: 'loyalty_tier',
    points: 'loyalty_points',
    totalSpent: 'total_spent',
    visitsCount: 'total_visits',
    creditLimit: 'credit_limit',
    currentCredit: 'current_credit',
    address: 'address',
  };
  for (const [k, col] of Object.entries(map)) {
    if (data[k] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(data[k]);
    }
  }
  if (!fields.length) throw new AppError('No fields to update');
  values.push(id);
  await getPool().query(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values);
  const [rows] = await getPool().query(`SELECT * FROM customers WHERE id = ?`, [id]);
  if (!(rows as any[]).length) throw new AppError('Customer not found', 404);
  return mapCustomer((rows as any[])[0]);
}

export async function settleCustomerCredit(
  customerId: string,
  amount: number,
  paymentMethod: string,
  branchId?: string
) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(`SELECT * FROM customers WHERE id = ? FOR UPDATE`, [customerId]);
    const customer = (rows as any[])[0];
    if (!customer) throw new AppError('Customer not found', 404);

    const newCredit = Math.max(0, num(customer.current_credit) - amount);
    await conn.query(`UPDATE customers SET current_credit = ? WHERE id = ?`, [newCredit, customerId]);

    if (paymentMethod === 'CASH' && branchId) {
      await conn.query(
        `UPDATE shifts SET expected_cash = expected_cash + ?, cash_sales = cash_sales + ?, total_sales_amount = total_sales_amount + ?
         WHERE branch_id = ? AND status = 'OPEN'`,
        [amount, amount, amount, branchId]
      );
    }

    await conn.query(
      `UPDATE orders SET credit_status = 'SETTLED', credit_paid_amount = COALESCE(credit_paid_amount, 0) + ?
       WHERE customer_id = ? AND credit_status = 'UNPAID'`,
      [amount, customerId]
    ).catch(() => undefined);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  const [fresh] = await pool.query(`SELECT * FROM customers WHERE id = ?`, [customerId]);
  return mapCustomer((fresh as any[])[0]);
}
