-- Extensions for OmniPOS (MySQL 5.7+) — no FKs to avoid engine/charset mismatches
USE mt_posms;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'credit_limit'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE customers ADD COLUMN credit_limit DECIMAL(14,2) DEFAULT 300000.00, ADD COLUMN current_credit DECIMAL(14,2) DEFAULT 0.00',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'permissions'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN permissions JSON NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shifts' AND COLUMN_NAME = 'cash_sales'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE shifts ADD COLUMN cash_sales DECIMAL(12,2) DEFAULT 0.00, ADD COLUMN mobile_sales DECIMAL(12,2) DEFAULT 0.00, ADD COLUMN card_sales DECIMAL(12,2) DEFAULT 0.00',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'credit_status'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN credit_status VARCHAR(20) NULL, ADD COLUMN credit_paid_amount DECIMAL(12,2) DEFAULT 0.00, ADD COLUMN credit_due_date DATE NULL, ADD COLUMN returned_amount DECIMAL(12,2) DEFAULT 0.00',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(100),
  address TEXT,
  category VARCHAR(50) DEFAULT 'General',
  total_purchased DECIMAL(14,2) DEFAULT 0.00,
  total_paid DECIMAL(14,2) DEFAULT 0.00,
  balance_payable DECIMAL(14,2) DEFAULT 0.00,
  payment_terms_days INT DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_bills (
  id VARCHAR(36) PRIMARY KEY,
  bill_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id VARCHAR(36) NOT NULL,
  supplier_name VARCHAR(150) NOT NULL,
  branch_id VARCHAR(36) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) DEFAULT 0.00,
  balance_due DECIMAL(14,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'UNPAID',
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  notes TEXT,
  items_summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sb_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_payments (
  id VARCHAR(36) PRIMARY KEY,
  payment_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id VARCHAR(36) NOT NULL,
  supplier_name VARCHAR(150) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  reference_no VARCHAR(100),
  bank_name VARCHAR(100),
  paid_date DATE NOT NULL,
  paid_by VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sp_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sale_returns (
  id VARCHAR(36) PRIMARY KEY,
  return_number VARCHAR(50) NOT NULL UNIQUE,
  original_order_id VARCHAR(36) NULL,
  original_order_number VARCHAR(40) NULL,
  branch_id VARCHAR(36) NOT NULL,
  cashier_name VARCHAR(100) NOT NULL,
  customer_id VARCHAR(36) NULL,
  customer_name VARCHAR(100) NULL,
  total_refund_amount DECIMAL(12,2) NOT NULL,
  refund_method VARCHAR(30) NOT NULL,
  reason VARCHAR(50) NOT NULL,
  notes TEXT,
  restocked_to_inventory TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sr_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sale_return_items (
  id VARCHAR(36) PRIMARY KEY,
  return_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  sku VARCHAR(50),
  unit VARCHAR(20),
  unit_price DECIMAL(12,2) NOT NULL,
  quantity_returned INT NOT NULL,
  refund_amount DECIMAL(12,2) NOT NULL,
  item_condition VARCHAR(20) DEFAULT 'GOOD',
  INDEX idx_sri_return (return_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_units (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO product_units (id, name, display_order) VALUES
('unit-pcs','pcs',1),
('unit-pack','pack',2),
('unit-box','box',3),
('unit-cup','cup',4),
('unit-slice','slice',5),
('unit-bowl','bowl',6),
('unit-sachets','sachets',7)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================
-- Purchases ledger (supplier-linked GRN / stock inward)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases (
  id VARCHAR(36) PRIMARY KEY,
  purchase_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id VARCHAR(36) NOT NULL,
  supplier_name VARCHAR(150) NOT NULL,
  dest_branch_id VARCHAR(36) NOT NULL,
  purchase_date DATE NOT NULL,
  items_subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  shipping_cost DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  credit_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  payment_type VARCHAR(30) NOT NULL DEFAULT 'CREDIT_BILL',
  supplier_bill_id VARCHAR(36) NULL,
  received_by VARCHAR(100) NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pur_supplier (supplier_id),
  INDEX idx_pur_date (purchase_date),
  INDEX idx_pur_branch (dest_branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_items (
  id VARCHAR(36) PRIMARY KEY,
  purchase_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL,
  unit_cost DECIMAL(14,4) NOT NULL,
  shipping_allocated DECIMAL(14,4) NOT NULL DEFAULT 0.00,
  landed_unit_cost DECIMAL(14,4) NOT NULL,
  line_total DECIMAL(14,2) NOT NULL,
  INDEX idx_pi_purchase (purchase_id),
  INDEX idx_pi_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Period opening stock value for inventory-method COGS
CREATE TABLE IF NOT EXISTS inventory_period_balances (
  id VARCHAR(36) PRIMARY KEY,
  period_label VARCHAR(60) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NULL,
  opening_stock_value DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_by VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_period_start (period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Other income (for Net Profit = GP + Other Income - OpEx)
CREATE TABLE IF NOT EXISTS other_income (
  id VARCHAR(36) PRIMARY KEY,
  income_number VARCHAR(50) NOT NULL UNIQUE,
  branch_id VARCHAR(36) NULL,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(50) DEFAULT 'OTHER',
  amount DECIMAL(14,2) NOT NULL,
  income_date DATE NOT NULL,
  notes TEXT,
  created_by VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_oi_date (income_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Link supplier bills back to purchases when column missing
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_bills' AND COLUMN_NAME = 'purchase_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE supplier_bills ADD COLUMN purchase_id VARCHAR(36) NULL, ADD INDEX idx_sb_purchase (purchase_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Persist multi-tier packaging / unit scheme on products
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'packaging_config'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN packaging_config JSON NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Purchase returns (supplier goods return / credit note)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- FIFO stock lots (same SKU, different buy/sell prices per batch)
-- ============================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_items' AND COLUMN_NAME = 'selling_price'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE purchase_items ADD COLUMN selling_price DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER line_total',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'stock_lot_id'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE order_items ADD COLUMN stock_lot_id VARCHAR(36) NULL AFTER product_id, ADD INDEX idx_oi_lot (stock_lot_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
