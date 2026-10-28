/**
 * Ensure stock_lots schema + backfill opening lots from branch_stocks.
 * Usage: npx tsx scripts/ensureStockLots.ts
 */
import { getPool } from '../config/db.js';
import { backfillOpeningLots } from '../services/stockLotService.js';

const c = getPool();

await c.query(`
CREATE TABLE IF NOT EXISTS stock_lots (
  id VARCHAR(36) PRIMARY KEY,
  branch_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  purchase_id VARCHAR(36) NULL,
  purchase_item_id VARCHAR(36) NULL,
  quantity_received INT NOT NULL DEFAULT 0,
  quantity_remaining INT NOT NULL DEFAULT 0,
  unit_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  landed_unit_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  selling_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes VARCHAR(200) NULL,
  INDEX idx_lot_branch_product (branch_id, product_id),
  INDEX idx_lot_fifo (branch_id, product_id, received_at),
  INDEX idx_lot_remaining (branch_id, product_id, quantity_remaining),
  INDEX idx_lot_purchase (purchase_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);

const [piCols]: any = await c.query(
  `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_items' AND COLUMN_NAME = 'selling_price'`
);
if (!piCols[0]?.c) {
  await c.query(
    `ALTER TABLE purchase_items ADD COLUMN selling_price DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER line_total`
  );
}

const [oiCols]: any = await c.query(
  `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'stock_lot_id'`
);
if (!oiCols[0]?.c) {
  await c.query(
    `ALTER TABLE order_items ADD COLUMN stock_lot_id VARCHAR(36) NULL AFTER product_id`
  );
  try {
    await c.query(`ALTER TABLE order_items ADD INDEX idx_oi_lot (stock_lot_id)`);
  } catch {
    /* index may exist */
  }
}

// pool connection handled automatically

const created = await backfillOpeningLots();
console.log(`stock_lots ready; backfilled ${created} opening lot(s)`);
