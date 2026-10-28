import { getPool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { newId } from '../utils/helpers.js';
import { mapBranch, mapCategory, mapProduct, mapStock } from '../utils/mappers.js';

export async function listBranches() {
  const [rows] = await getPool().query(`SELECT * FROM branches ORDER BY code ASC`);
  return (rows as any[]).map(mapBranch);
}

export async function createBranch(data: any) {
  const id = data.id || newId('b');
  await getPool().query(
    `INSERT INTO branches (id, code, name, type, address, city, state_or_division, phone, email, tax_rate, currency, receipt_header, receipt_footer, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.code,
      data.name,
      data.type || 'RETAIL',
      data.address || '',
      data.city || '',
      data.stateOrDivision || data.city || '',
      data.phone || '',
      data.email || null,
      data.taxRate ?? 5,
      data.currency || 'MMK',
      data.receiptHeader || null,
      data.receiptFooter || null,
      data.isActive !== false,
    ]
  );
  const [rows] = await getPool().query(`SELECT * FROM branches WHERE id = ?`, [id]);
  return mapBranch((rows as any[])[0]);
}

export async function updateBranch(id: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, string> = {
    code: 'code',
    name: 'name',
    type: 'type',
    address: 'address',
    city: 'city',
    phone: 'phone',
    email: 'email',
    taxRate: 'tax_rate',
    currency: 'currency',
    receiptHeader: 'receipt_header',
    receiptFooter: 'receipt_footer',
    isActive: 'is_active',
  };
  for (const [k, col] of Object.entries(map)) {
    if (data[k] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(data[k]);
    }
  }
  if (!fields.length) throw new AppError('No fields to update');
  values.push(id);
  await getPool().query(`UPDATE branches SET ${fields.join(', ')} WHERE id = ?`, values);
  const [rows] = await getPool().query(`SELECT * FROM branches WHERE id = ?`, [id]);
  if (!(rows as any[]).length) throw new AppError('Branch not found', 404);
  return mapBranch((rows as any[])[0]);
}

export async function listCategories() {
  const [rows] = await getPool().query(
    `SELECT * FROM categories WHERE is_active = TRUE ORDER BY display_order ASC`
  );
  return (rows as any[]).map(mapCategory);
}

export async function createCategory(data: any) {
  const id = data.id || newId('cat');
  const slug =
    data.slug ||
    String(data.name || 'category')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') ||
    id;
  await getPool().query(
    `INSERT INTO categories (id, name, slug, icon, color_code, display_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [
      id,
      data.name,
      slug,
      data.icon || 'Package',
      data.color || data.colorCode || '#4F46E5',
      data.displayOrder ?? 99,
    ]
  );
  const [rows] = await getPool().query(`SELECT * FROM categories WHERE id = ?`, [id]);
  return mapCategory((rows as any[])[0]);
}

export async function updateCategory(id: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, string> = {
    name: 'name',
    slug: 'slug',
    icon: 'icon',
    color: 'color_code',
    colorCode: 'color_code',
    displayOrder: 'display_order',
    isActive: 'is_active',
  };
  for (const [k, col] of Object.entries(map)) {
    if (data[k] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(data[k]);
    }
  }
  if (!fields.length) throw new AppError('No fields to update');
  values.push(id);
  await getPool().query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
  const [rows] = await getPool().query(`SELECT * FROM categories WHERE id = ?`, [id]);
  if (!(rows as any[]).length) throw new AppError('Category not found', 404);
  return mapCategory((rows as any[])[0]);
}

export async function deleteCategory(id: string) {
  const [used]: any = await getPool().query(
    `SELECT COUNT(*) AS c FROM products WHERE category_id = ? AND is_active = TRUE`,
    [id]
  );
  if (Number(used[0]?.c) > 0) {
    throw new AppError('Category is used by products — reassign products first', 400);
  }
  await getPool().query(`UPDATE categories SET is_active = FALSE WHERE id = ?`, [id]);
}

export async function listUnits() {
  try {
    const [rows] = await getPool().query(
      `SELECT * FROM product_units WHERE is_active = TRUE ORDER BY display_order ASC, name ASC`
    );
    return (rows as any[]).map((r) => ({
      id: r.id,
      name: r.name,
      displayOrder: Number(r.display_order) || 0,
    }));
  } catch {
    return [
      { id: 'u-pcs', name: 'pcs', displayOrder: 1 },
      { id: 'u-pack', name: 'pack', displayOrder: 2 },
      { id: 'u-box', name: 'box', displayOrder: 3 },
    ];
  }
}

export async function createUnit(data: any) {
  const id = data.id || newId('unit');
  await getPool().query(
    `INSERT INTO product_units (id, name, display_order, is_active) VALUES (?, ?, ?, TRUE)`,
    [id, data.name, data.displayOrder ?? 99]
  );
  return { id, name: data.name, displayOrder: data.displayOrder ?? 99 };
}

export async function deleteUnit(id: string) {
  await getPool().query(`UPDATE product_units SET is_active = FALSE WHERE id = ?`, [id]);
}

export async function listProducts() {
  const [rows] = await getPool().query(
    `SELECT * FROM products WHERE is_active = TRUE ORDER BY name ASC`
  );
  return (rows as any[]).map(mapProduct);
}

export async function createProduct(data: any) {
  const id = data.id || newId('p');
  const pool = getPool();
  const conn = await pool.getConnection();
  const packagingJson = data.packagingConfig ? JSON.stringify(data.packagingConfig) : null;
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO products (id, category_id, sku, barcode, name, description, cost_price, selling_price, unit, image_url, packaging_config, track_stock, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)`,
      [
        id,
        data.categoryId,
        data.sku,
        data.barcode || null,
        data.name,
        data.description || null,
        data.costPrice ?? 0,
        data.sellingPrice ?? 0,
        data.unit || 'pcs',
        data.imageUrl || null,
        packagingJson,
      ]
    );
    const initialStocks: Record<string, number> = data.initialStocks || {};
    for (const [branchId, qty] of Object.entries(initialStocks)) {
      await conn.query(
        `INSERT INTO branch_stocks (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location)
         VALUES (?, ?, ?, ?, 10, 50, 'Standard Shelf')
         ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand)`,
        [newId('bs'), branchId, id, Number(qty) || 0]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  const [rows] = await pool.query(`SELECT * FROM products WHERE id = ?`, [id]);
  return mapProduct((rows as any[])[0]);
}

export async function updateProduct(id: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  const map: Record<string, string> = {
    categoryId: 'category_id',
    sku: 'sku',
    barcode: 'barcode',
    name: 'name',
    description: 'description',
    costPrice: 'cost_price',
    sellingPrice: 'selling_price',
    unit: 'unit',
    imageUrl: 'image_url',
  };
  for (const [k, col] of Object.entries(map)) {
    if (data[k] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(data[k]);
    }
  }
  if (data.packagingConfig !== undefined) {
    fields.push('packaging_config = ?');
    values.push(data.packagingConfig ? JSON.stringify(data.packagingConfig) : null);
  }
  if (!fields.length) throw new AppError('No fields to update');
  values.push(id);
  await getPool().query(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
  const [rows] = await getPool().query(`SELECT * FROM products WHERE id = ?`, [id]);
  if (!(rows as any[]).length) throw new AppError('Product not found', 404);
  return mapProduct((rows as any[])[0]);
}

export async function listStocks(branchId?: string) {
  const sql = branchId
    ? `SELECT * FROM branch_stocks WHERE branch_id = ?`
    : `SELECT * FROM branch_stocks`;
  const [rows] = branchId
    ? await getPool().query(sql, [branchId])
    : await getPool().query(sql);
  return (rows as any[]).map(mapStock);
}

export async function adjustStock(branchId: string, productId: string, quantity: number) {
  const pool = getPool();
  const [existing] = await pool.query(
    `SELECT id FROM branch_stocks WHERE branch_id = ? AND product_id = ?`,
    [branchId, productId]
  );
  if ((existing as any[]).length) {
    await pool.query(
      `UPDATE branch_stocks SET quantity_on_hand = ? WHERE branch_id = ? AND product_id = ?`,
      [Math.max(0, quantity), branchId, productId]
    );
  } else {
    await pool.query(
      `INSERT INTO branch_stocks (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location)
       VALUES (?, ?, ?, ?, 10, 50, 'Default Storage')`,
      [newId('bs'), branchId, productId, Math.max(0, quantity)]
    );
  }
  const [rows] = await pool.query(
    `SELECT * FROM branch_stocks WHERE branch_id = ? AND product_id = ?`,
    [branchId, productId]
  );
  return mapStock((rows as any[])[0]);
}
