/**
 * Reset purchase-related ledger + stocks, then seed Purchase Vouchers
 * in the current supplier-linked format (shipping → landed cost, paid/credit).
 *
 * Usage: npm run db:seed-purchases
 */
import { getPool, testConnection } from '../config/db.js';
import { createPurchase, upsertOpeningBalance } from '../services/purchaseService.js';

async function clearPurchaseData() {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('DELETE FROM purchase_items');
    await conn.query('DELETE FROM purchases');
    await conn.query('DELETE FROM supplier_payments');
    await conn.query('DELETE FROM supplier_bills');
    // transfer tables (names from schema)
    try {
      await conn.query('DELETE FROM stock_transfer_items');
    } catch {
      /* optional */
    }
    try {
      await conn.query('DELETE FROM stock_transfers');
    } catch {
      /* optional */
    }
    await conn.query('DELETE FROM inventory_period_balances');
    await conn.query('DELETE FROM other_income');
    await conn.query('DELETE FROM branch_stocks');
    await conn.query(
      `UPDATE suppliers SET total_purchased = 0, total_paid = 0, balance_payable = 0`
    );
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    await conn.commit();
    console.log('[seed-purchases] Cleared old purchases, bills, payments, stocks');
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function ensureUnits() {
  const pool = getPool();
  const names = ['pcs', 'pack', 'box', 'carton', 'cup', 'slice', 'bowl', 'sachets'];
  let order = 1;
  for (const name of names) {
    await pool.query(
      `INSERT INTO product_units (id, name, display_order, is_active)
       VALUES (?, ?, ?, TRUE)
       ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = TRUE`,
      [`unit-${name}`, name, order++]
    );
  }
  console.log('[seed-purchases] Ensured product units');
}

async function applyProductPackaging() {
  const pool = getPool();
  const rows: { id: string; unit: string; cfg: object }[] = [
    {
      id: 'p-01',
      unit: 'cup',
      cfg: {
        hasPackagingLevels: true,
        primaryUnit: 'box',
        intermediateUnit: 'pack',
        intermediateMultiplier: 12,
        baseUnit: 'cup',
        baseMultiplier: 1,
      },
    },
    {
      id: 'p-02',
      unit: 'cup',
      cfg: {
        hasPackagingLevels: true,
        primaryUnit: 'box',
        intermediateUnit: 'pack',
        intermediateMultiplier: 12,
        baseUnit: 'cup',
        baseMultiplier: 1,
      },
    },
    {
      id: 'p-04',
      unit: 'cup',
      cfg: {
        hasPackagingLevels: true,
        primaryUnit: 'box',
        intermediateUnit: 'pack',
        intermediateMultiplier: 24,
        baseUnit: 'cup',
        baseMultiplier: 1,
      },
    },
    {
      id: 'p-05',
      unit: 'pcs',
      cfg: {
        hasPackagingLevels: true,
        primaryUnit: 'carton',
        intermediateUnit: 'pack',
        intermediateMultiplier: 10,
        baseUnit: 'pcs',
        baseMultiplier: 6,
      },
    },
    {
      id: 'p-06',
      unit: 'pcs',
      cfg: {
        hasPackagingLevels: true,
        primaryUnit: 'carton',
        intermediateUnit: 'pack',
        intermediateMultiplier: 10,
        baseUnit: 'pcs',
        baseMultiplier: 6,
      },
    },
    {
      id: 'p-10',
      unit: 'pack',
      cfg: {
        hasPackagingLevels: true,
        primaryUnit: 'carton',
        intermediateUnit: 'pack',
        intermediateMultiplier: 20,
        baseUnit: 'pack',
        baseMultiplier: 1,
      },
    },
  ];

  for (const row of rows) {
    await pool.query(`UPDATE products SET packaging_config = ?, unit = ? WHERE id = ?`, [
      JSON.stringify(row.cfg),
      row.unit,
      row.id,
    ]);
  }
  console.log('[seed-purchases] Applied packaging_config on sample products');
}

async function seedVouchers() {
  // Voucher 1 — Bean & Co (coffee), partial pay + shipping
  await createPurchase({
    supplierId: 'sup-01',
    supplierName: 'Bean & Co Roasters',
    destBranchId: 'b-04',
    purchaseDate: '2026-09-05',
    paymentType: 'PARTIAL',
    paidAmount: 800000,
    shippingCost: 45000,
    receivedBy: 'Seed Script',
    notes: 'PO seed — espresso & latte stock inward',
    items: [
      {
        productId: 'p-01',
        productName: 'Iced Caramel Macchiato',
        totalBaseUnitsReceived: 240,
        unitCost: 2100,
      },
      {
        productId: 'p-02',
        productName: 'Signature Spanish Latte',
        totalBaseUnitsReceived: 180,
        unitCost: 1900,
      },
      {
        productId: 'p-04',
        productName: 'Classic Americano (Hot/Iced)',
        totalBaseUnitsReceived: 300,
        unitCost: 1300,
      },
    ],
  });

  // Voucher 2 — Golden Crust (bakery), cash on delivery
  await createPurchase({
    supplierId: 'sup-02',
    supplierName: 'Golden Crust Bakery Supply',
    destBranchId: 'b-04',
    purchaseDate: '2026-09-12',
    paymentType: 'CASH_ON_DELIVERY',
    shippingCost: 25000,
    receivedBy: 'Seed Script',
    notes: 'PO seed — bakery wholesale delivery',
    items: [
      {
        productId: 'p-05',
        productName: 'French Butter Croissant',
        totalBaseUnitsReceived: 120,
        unitCost: 1400,
      },
      {
        productId: 'p-06',
        productName: 'Pain au Chocolat',
        totalBaseUnitsReceived: 90,
        unitCost: 1700,
      },
      {
        productId: 'p-07',
        productName: 'Basque Burnt Cheesecake Slice',
        totalBaseUnitsReceived: 48,
        unitCost: 2600,
      },
    ],
  });

  // Voucher 3 — EcoPack (retail merch), full credit
  await createPurchase({
    supplierId: 'sup-03',
    supplierName: 'EcoPack Myanmar',
    destBranchId: 'b-04',
    purchaseDate: '2026-09-18',
    paymentType: 'CREDIT_BILL',
    shippingCost: 18000,
    receivedBy: 'Seed Script',
    notes: 'PO seed — snacks & tumblers credit bill',
    items: [
      {
        productId: 'p-10',
        productName: 'Truffle & Parmesan Chips',
        totalBaseUnitsReceived: 200,
        unitCost: 1500,
      },
      {
        productId: 'p-11',
        productName: 'Thermal Stainless Steel Tumbler 500ml',
        totalBaseUnitsReceived: 40,
        unitCost: 8000,
      },
    ],
  });

  // Voucher 4 — Bean & Co second receipt (matcha)
  await createPurchase({
    supplierId: 'sup-01',
    supplierName: 'Bean & Co Roasters',
    destBranchId: 'b-04',
    purchaseDate: '2026-09-22',
    paymentType: 'CREDIT_BILL',
    shippingCost: 12000,
    receivedBy: 'Seed Script',
    notes: 'PO seed — matcha restock',
    items: [
      {
        productId: 'p-03',
        productName: 'Ceremonial Uji Matcha Latte',
        totalBaseUnitsReceived: 96,
        unitCost: 2400,
      },
    ],
  });

  console.log('[seed-purchases] Created 4 purchase vouchers → Main Store (b-04)');
}

async function distributeToBranches() {
  const pool = getPool();
  const moves: { productId: string; branchId: string; qty: number }[] = [
    { productId: 'p-01', branchId: 'b-01', qty: 80 },
    { productId: 'p-01', branchId: 'b-02', qty: 40 },
    { productId: 'p-02', branchId: 'b-01', qty: 60 },
    { productId: 'p-02', branchId: 'b-02', qty: 40 },
    { productId: 'p-03', branchId: 'b-01', qty: 30 },
    { productId: 'p-04', branchId: 'b-01', qty: 100 },
    { productId: 'p-04', branchId: 'b-02', qty: 50 },
    { productId: 'p-05', branchId: 'b-01', qty: 40 },
    { productId: 'p-05', branchId: 'b-02', qty: 20 },
    { productId: 'p-06', branchId: 'b-01', qty: 30 },
    { productId: 'p-07', branchId: 'b-01', qty: 16 },
    { productId: 'p-10', branchId: 'b-01', qty: 60 },
    { productId: 'p-10', branchId: 'b-02', qty: 40 },
    { productId: 'p-11', branchId: 'b-01', qty: 12 },
    { productId: 'p-11', branchId: 'b-02', qty: 8 },
    { productId: 'p-08', branchId: 'b-01', qty: 20 },
    { productId: 'p-09', branchId: 'b-01', qty: 15 },
  ];

  // Ensure leftover catalog items have some warehouse stock for demo (food)
  await pool.query(
    `INSERT INTO branch_stocks (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location)
     VALUES (?, 'b-04', 'p-08', 40, 10, 50, 'Warehouse Bay'),
            (?, 'b-04', 'p-09', 30, 10, 40, 'Warehouse Bay')
     ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand)`,
    [`bs-seed-p08`, `bs-seed-p09`]
  );

  for (const m of moves) {
    // deduct from main store
    await pool.query(
      `UPDATE branch_stocks SET quantity_on_hand = GREATEST(0, quantity_on_hand - ?)
       WHERE branch_id = 'b-04' AND product_id = ?`,
      [m.qty, m.productId]
    );
    const id = `bs-seed-${m.branchId}-${m.productId}`;
    await pool.query(
      `INSERT INTO branch_stocks (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location)
       VALUES (?, ?, ?, ?, 10, 50, 'Retail Shelf')
       ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand)`,
      [id, m.branchId, m.productId, m.qty]
    );
  }
  console.log('[seed-purchases] Distributed sample stock Main Store → branches');
}

async function seedOpening() {
  await upsertOpeningBalance({
    periodLabel: 'FY2026 Sep Opening',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
    openingStockValue: 450000,
    notes: 'Seeded opening stock value for inventory-method COGS',
    createdBy: 'Seed Script',
  });
  console.log('[seed-purchases] Opening stock value set');
}

async function main() {
  const ok = await testConnection();
  if (!ok) process.exit(1);

  await clearPurchaseData();
  await ensureUnits();
  await applyProductPackaging();
  await seedVouchers();
  await distributeToBranches();
  await seedOpening();

  const pool = getPool();
  const [sum]: any = await pool.query(
    `SELECT COUNT(*) AS vouchers,
            COALESCE(SUM(total_amount),0) AS total,
            COALESCE(SUM(paid_amount),0) AS paid,
            COALESCE(SUM(credit_amount),0) AS credit,
            COALESCE(SUM(shipping_cost),0) AS shipping
     FROM purchases`
  );
  console.log('[seed-purchases] Summary:', sum[0]);
  console.log('[seed-purchases] Done — refresh the app (bootstrap) to see Purchase Voucher Ledger');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-purchases] Failed:', err.message || err);
  process.exit(1);
});
