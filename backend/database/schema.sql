-- =============================================================================
-- OmniPOS Enterprise Multi-Branch POS System Database Schema
-- Dialect: MySQL 5.7+ / MySQL 8+ / MariaDB
-- Database: mt_posms
-- =============================================================================

CREATE DATABASE IF NOT EXISTS mt_posms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mt_posms;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS operating_expenses;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS cash_drawer_logs;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS registers;
DROP TABLE IF EXISTS stock_transfer_items;
DROP TABLE IF EXISTS stock_transfers;
DROP TABLE IF EXISTS branch_stocks;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS branches;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. BRANCHES (Multi-store management)
-- =============================================================================
CREATE TABLE branches (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) DEFAULT 'RETAIL',
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    state_or_division VARCHAR(50) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(100),
    tax_rate DECIMAL(5, 2) DEFAULT 5.00,
    currency VARCHAR(10) DEFAULT 'MMK',
    receipt_header TEXT,
    receipt_footer TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_branches_code (code),
    INDEX idx_branches_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. USERS & ROLES
-- =============================================================================
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    pin_code VARCHAR(10) NOT NULL,
    role VARCHAR(30) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_branch_id (branch_id),
    INDEX idx_users_role (role),
    CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. PRODUCT CATEGORIES
-- =============================================================================
CREATE TABLE categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'Package',
    color_code VARCHAR(20) DEFAULT '#4F46E5',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. PRODUCTS (Master Catalog across all branches)
-- =============================================================================
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY,
    category_id VARCHAR(36) NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(50) UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) DEFAULT 'pcs',
    image_url TEXT,
    track_stock BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_products_category (category_id),
    INDEX idx_products_sku (sku),
    INDEX idx_products_barcode (barcode),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. BRANCH_STOCKS (Inventory per branch)
-- =============================================================================
CREATE TABLE branch_stocks (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    ideal_stock INT NOT NULL DEFAULT 50,
    shelf_location VARCHAR(50),
    last_counted_at DATETIME NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_branch_product (branch_id, product_id),
    INDEX idx_branch_stocks_branch (branch_id),
    INDEX idx_branch_stocks_product (product_id),
    INDEX idx_branch_stocks_low_stock (branch_id, quantity_on_hand),
    CONSTRAINT fk_stocks_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_stocks_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. STOCK TRANSFERS (Inter-branch transfer)
-- =============================================================================
CREATE TABLE stock_transfers (
    id VARCHAR(36) PRIMARY KEY,
    transfer_number VARCHAR(30) NOT NULL UNIQUE,
    source_branch_id VARCHAR(36) NOT NULL,
    destination_branch_id VARCHAR(36) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING',
    requested_by VARCHAR(36) NULL,
    dispatched_by VARCHAR(36) NULL,
    received_by VARCHAR(36) NULL,
    dispatched_at DATETIME NULL,
    received_at DATETIME NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transfers_source FOREIGN KEY (source_branch_id) REFERENCES branches(id),
    CONSTRAINT fk_transfers_dest FOREIGN KEY (destination_branch_id) REFERENCES branches(id),
    CONSTRAINT fk_transfers_req FOREIGN KEY (requested_by) REFERENCES users(id),
    CONSTRAINT fk_transfers_disp FOREIGN KEY (dispatched_by) REFERENCES users(id),
    CONSTRAINT fk_transfers_recv FOREIGN KEY (received_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_transfer_items (
    id VARCHAR(36) PRIMARY KEY,
    transfer_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    quantity_requested INT NOT NULL,
    quantity_shipped INT DEFAULT 0,
    quantity_received INT DEFAULT 0,
    unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_transfer_items_transfer FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
    CONSTRAINT fk_transfer_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. REGISTERS & SHIFTS (Cashier Drawer & Shift Management)
-- =============================================================================
CREATE TABLE registers (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL,
    terminal_code VARCHAR(30) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_registers_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE shifts (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NOT NULL,
    register_id VARCHAR(36) NOT NULL,
    cashier_id VARCHAR(36) NOT NULL,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    opening_float DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    expected_cash DECIMAL(12, 2) DEFAULT 0.00,
    actual_cash DECIMAL(12, 2) DEFAULT 0.00,
    difference DECIMAL(12, 2) DEFAULT 0.00,
    total_sales_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_orders_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'OPEN',
    notes TEXT,
    CONSTRAINT fk_shifts_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT fk_shifts_register FOREIGN KEY (register_id) REFERENCES registers(id),
    CONSTRAINT fk_shifts_cashier FOREIGN KEY (cashier_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cash_drawer_logs (
    id VARCHAR(36) PRIMARY KEY,
    shift_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    action_type VARCHAR(20) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_drawer_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    CONSTRAINT fk_drawer_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT fk_drawer_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. CUSTOMERS (Loyalty & CRM)
-- =============================================================================
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) UNIQUE,
    email VARCHAR(100),
    loyalty_tier VARCHAR(20) DEFAULT 'REGULAR',
    loyalty_points INT DEFAULT 0,
    total_spent DECIMAL(14, 2) DEFAULT 0.00,
    total_visits INT DEFAULT 0,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customers_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. ORDERS & TRANSACTIONS (Sales)
-- =============================================================================
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    order_number VARCHAR(40) NOT NULL UNIQUE,
    branch_id VARCHAR(36) NOT NULL,
    register_id VARCHAR(36) NOT NULL,
    shift_id VARCHAR(36) NOT NULL,
    cashier_id VARCHAR(36) NOT NULL,
    customer_id VARCHAR(36) NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'FIXED',
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'PAID',
    order_status VARCHAR(20) DEFAULT 'COMPLETED',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_orders_branch_created (branch_id, created_at),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_status (order_status),
    CONSTRAINT fk_orders_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT fk_orders_register FOREIGN KEY (register_id) REFERENCES registers(id),
    CONSTRAINT fk_orders_shift FOREIGN KEY (shift_id) REFERENCES shifts(id),
    CONSTRAINT fk_orders_cashier FOREIGN KEY (cashier_id) REFERENCES users(id),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36) NOT NULL,
    product_name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    quantity INT NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_price DECIMAL(12, 2) NOT NULL,
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_product (product_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. PAYMENTS (Split tender & multi-method)
-- =============================================================================
CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    amount_tendered DECIMAL(12, 2) NOT NULL,
    change_given DECIMAL(12, 2) DEFAULT 0.00,
    transaction_ref VARCHAR(100),
    status VARCHAR(20) DEFAULT 'SUCCESS',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payments_order (order_id),
    INDEX idx_payments_branch (branch_id),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 11. AUDIT LOGS (Security & Compliance)
-- =============================================================================
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    branch_id VARCHAR(36) NULL,
    user_id VARCHAR(36) NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id VARCHAR(36),
    details JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 12. OPERATING EXPENSES (P&L Accounting Ledger)
-- =============================================================================
CREATE TABLE operating_expenses (
    id VARCHAR(36) PRIMARY KEY,
    expense_number VARCHAR(50) UNIQUE NOT NULL,
    branch_id VARCHAR(36) NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    date DATE NOT NULL,
    recorded_by VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expenses_branch (branch_id),
    INDEX idx_expenses_category (category),
    INDEX idx_expenses_date (date),
    CONSTRAINT fk_expenses_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
