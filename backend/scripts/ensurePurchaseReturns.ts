import { getPool } from '../config/db.js';

const c = getPool();

await c.query(`
CREATE TABLE IF NOT EXISTS purchase_returns (
  id VARCHAR(36) PRIMARY KEY,
  return_number VARCHAR(50) NOT NULL UNIQUE,
  purchase_id VARCHAR(36) NOT NULL,
  purchase_number VARCHAR(50) NOT NULL,
  supplier_id VARCHAR(36) NOT NULL,
  supplier_name VARCHAR(150) NOT NULL,
  branch_id VARCHAR(36) NOT NULL,
  total_refund_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  settlement_method VARCHAR(30) NOT NULL DEFAULT 'REDUCE_CREDIT',
  reason VARCHAR(80) NOT NULL DEFAULT 'Damaged / Wrong item',
  notes TEXT,
  stock_deducted TINYINT(1) DEFAULT 1,
  created_by VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_purchase (purchase_id),
  INDEX idx_pr_supplier (supplier_id),
  INDEX idx_pr_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);

await c.query(`
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id VARCHAR(36) PRIMARY KEY,
  return_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity_returned INT NOT NULL,
  unit_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  landed_unit_cost DECIMAL(14,4) NOT NULL DEFAULT 0,
  refund_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  INDEX idx_pri_return (return_id),
  INDEX idx_pri_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`);

console.log('purchase_returns tables ready');
process.exit(0);
