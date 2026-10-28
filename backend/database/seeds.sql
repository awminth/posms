-- =============================================================================
-- OmniPOS Enterprise Multi-Branch Seed Data
-- Dialect: MySQL 5.7+ / 8+
-- =============================================================================

USE mt_posms;

-- Branches
INSERT INTO branches (id, code, name, type, address, city, state_or_division, phone, email, tax_rate, currency) VALUES
('b-01', 'BR-YGN-01', 'Downtown Flagship Branch', 'RETAIL', 'No. 124, Sule Pagoda Road, Kyauktada Tsp', 'Yangon', 'Yangon Region', '+95 9 790 112233', 'flagship@omnipos.com', 5.0, 'MMK'),
('b-02', 'BR-YGN-02', 'Hledan Center Branch', 'RETAIL', 'Corner of Pyay Rd & Hledan Rd, Kamayut Tsp', 'Yangon', 'Yangon Region', '+95 9 790 223344', 'hledan@omnipos.com', 5.0, 'MMK'),
('b-03', 'BR-MDY-01', 'Mandalay 78th Street Branch', 'RETAIL', '78th St, Between 30th & 31st St, Chanayethazan', 'Mandalay', 'Mandalay Region', '+95 9 790 334455', 'mandalay@omnipos.com', 5.0, 'MMK'),
('b-04', 'BR-WH-01', 'Central Logistics Warehouse', 'WAREHOUSE', 'Mingaladon Industrial Zone, Mingaladon Tsp', 'Yangon', 'Yangon Region', '+95 9 790 445566', 'warehouse@omnipos.com', 0.0, 'MMK')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Users
INSERT INTO users (id, branch_id, username, full_name, email, password_hash, pin_code, role) VALUES
('u-01', NULL, 'superadmin', 'Aung Min Thant', 'admin@omnipos.com', '$2b$12$...', '1234', 'SUPER_ADMIN'),
('u-02', 'b-01', 'manager_downtown', 'Khin Myat Noe', 'khin@omnipos.com', '$2b$12$...', '5678', 'BRANCH_MANAGER'),
('u-03', 'b-01', 'cashier_thiri', 'Thiri Kyaw', 'thiri@omnipos.com', '$2b$12$...', '1111', 'CASHIER'),
('u-04', 'b-02', 'cashier_minmin', 'Min Min Oo', 'minmin@omnipos.com', '$2b$12$...', '2222', 'CASHIER'),
('u-05', 'b-03', 'manager_mdy', 'Zaw Lin Htet', 'zawlin@omnipos.com', '$2b$12$...', '3333', 'BRANCH_MANAGER')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- Categories
INSERT INTO categories (id, name, slug, icon, color_code, display_order) VALUES
('cat-01', 'ကော်ဖီနှင့် သောက်စရာ', 'drinks', 'Coffee', '#8B5CF6', 1),
('cat-02', 'မုန့်နှင့် ပေါင်', 'bakery', 'Croissant', '#F59E0B', 2),
('cat-03', 'အစားအစာ', 'food', 'Utensils', '#EF4444', 3),
('cat-04', 'သရေစာ', 'snacks', 'Cookie', '#10B981', 4),
('cat-05', 'အရောင်းပစ္စည်း', 'merchandise', 'ShoppingBag', '#3B82F6', 5)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Products (Myanmar retail names)
INSERT INTO products (id, category_id, sku, barcode, name, description, cost_price, selling_price, unit) VALUES
('p-01', 'cat-01', 'DRK-ESP-01', '8850123001', 'ကာရမ်မယ် မက်ချီယာတို (ရေခဲ)', 'အက်စ်ပရက်ဆို၊ ဗန်နီလာ၊ ကာရမ်မယ်', 2200, 4800, 'ခွက်'),
('p-02', 'cat-01', 'DRK-LAT-02', '8850123002', 'စပိန် လတ်တေး', 'အက်စ်ပရက်ဆို + နို့ချို / နို့လတ်', 2000, 4500, 'ခွက်'),
('p-03', 'cat-01', 'DRK-MAT-03', '8850123003', 'မက်ချာ လတ်တေး', 'ဂျပန် မက်ချာ လတ်တေး', 2500, 5200, 'ခွက်'),
('p-04', 'cat-01', 'DRK-AME-04', '8850123004', 'အမေရိကာနို (ပူ/ရေခဲ)', 'အာရာဘီကာ အက်စ်ပရက်ဆို နှစ်ချက်', 1400, 3500, 'ခွက်'),
('p-05', 'cat-02', 'BAK-CRO-01', '8850123005', 'ထောပတ် ခရောဆွန်', 'ထောပတ် ခရောဆွန် အစိမ်းအလွှာ', 1500, 3200, 'ခု'),
('p-06', 'cat-02', 'BAK-CHO-02', '8850123006', 'ချောကလက် ပေါင်', 'ချောကလက် ထည့်ထားသော ပေါင်', 1800, 3800, 'ခု'),
('p-07', 'cat-02', 'BAK-CHK-03', '8850123007', 'ဘာ့စ်ခ် ချိစ်ကိတ်', 'စပိန်ပုံစံ ချိစ်ကိတ် အချပ်', 2800, 6000, 'ချပ်'),
('p-08', 'cat-03', 'FOD-SAN-01', '8850123008', 'ကြက်သား ပန်နီနီ', 'မီးခိုးကြက်သား + ပက်စတို ပန်နီနီ', 3200, 6800, 'ခု'),
('p-09', 'cat-03', 'FOD-SAL-02', '8850123009', 'ထောပတ်သီး ကွီနိုအာ ပန်းကန်', 'ထောပတ်သီး၊ ကွီနိုအာ၊ ဟင်းသီးဟင်းရွက်', 3500, 7500, 'ပန်းကန်'),
('p-10', 'cat-04', 'SNK-CHX-01', '8850123010', 'ထရက်ဖယ် ချစ်ပ်', 'ထရက်ဖယ် + ပါမီဆန် အာလူးချစ်ပ်', 1600, 3500, 'ထုပ်'),
('p-11', 'cat-05', 'MER-TUM-01', '8850123011', 'သာမို ခွက် ၅၀၀ml', 'သံမဏိ နှစ်လွှာ သာမိုခွက်', 8500, 18500, 'ခု')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), unit=VALUES(unit), cost_price=VALUES(cost_price), selling_price=VALUES(selling_price);

-- Branch Stocks (verifiable: WH / Downtown / Hledan / Mandalay)
INSERT INTO branch_stocks (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location) VALUES
-- Downtown Flagship (b-01)
('bs-01-01', 'b-01', 'p-01', 40, 20, 100, 'Beverage Bar A'),
('bs-01-02', 'b-01', 'p-02', 35, 15, 80, 'Beverage Bar A'),
('bs-01-03', 'b-01', 'p-03', 25, 10, 50, 'Beverage Bar B'),
('bs-01-04', 'b-01', 'p-04', 50, 25, 120, 'Beverage Bar A'),
('bs-01-05', 'b-01', 'p-05', 20, 10, 40, 'Bakery Display 1'),
('bs-01-06', 'b-01', 'p-06', 18, 10, 30, 'Bakery Display 1'),
('bs-01-07', 'b-01', 'p-07', 10, 10, 20, 'Chiller Showcase'),
('bs-01-08', 'b-01', 'p-08', 15, 8, 25, 'Kitchen Refrigerator'),
('bs-01-09', 'b-01', 'p-09', 15, 6, 20, 'Kitchen Refrigerator'),
('bs-01-10', 'b-01', 'p-10', 30, 15, 50, 'Retail Shelf 1'),
('bs-01-11', 'b-01', 'p-11', 12, 5, 30, 'Merch Stand 2'),
-- Hledan (b-02)
('bs-02-01', 'b-02', 'p-01', 30, 15, 60, 'Beverage Bar A'),
('bs-02-02', 'b-02', 'p-02', 28, 15, 60, 'Beverage Bar A'),
('bs-02-03', 'b-02', 'p-03', 20, 10, 40, 'Beverage Bar B'),
('bs-02-04', 'b-02', 'p-04', 40, 20, 80, 'Beverage Bar A'),
('bs-02-05', 'b-02', 'p-05', 15, 10, 30, 'Bakery Display 1'),
('bs-02-06', 'b-02', 'p-06', 12, 10, 25, 'Bakery Display 1'),
('bs-02-07', 'b-02', 'p-07', 8, 8, 15, 'Chiller Showcase'),
('bs-02-08', 'b-02', 'p-08', 10, 8, 20, 'Kitchen Refrigerator'),
('bs-02-09', 'b-02', 'p-09', 10, 6, 15, 'Kitchen Refrigerator'),
('bs-02-10', 'b-02', 'p-10', 25, 15, 40, 'Retail Shelf 1'),
('bs-02-11', 'b-02', 'p-11', 8, 5, 20, 'Merch Stand 1'),
-- Mandalay (b-03)
('bs-03-01', 'b-03', 'p-01', 25, 15, 50, 'Beverage Bar A'),
('bs-03-02', 'b-03', 'p-02', 20, 15, 50, 'Beverage Bar A'),
('bs-03-03', 'b-03', 'p-03', 15, 10, 30, 'Beverage Bar B'),
('bs-03-04', 'b-03', 'p-04', 35, 20, 60, 'Beverage Bar A'),
('bs-03-05', 'b-03', 'p-05', 12, 10, 25, 'Bakery Display 1'),
('bs-03-06', 'b-03', 'p-06', 10, 8, 20, 'Bakery Display 1'),
('bs-03-07', 'b-03', 'p-07', 6, 5, 12, 'Chiller Showcase'),
('bs-03-08', 'b-03', 'p-08', 8, 5, 15, 'Kitchen Refrigerator'),
('bs-03-09', 'b-03', 'p-09', 8, 5, 15, 'Kitchen Refrigerator'),
('bs-03-10', 'b-03', 'p-10', 20, 10, 35, 'Retail Shelf 1'),
('bs-03-11', 'b-03', 'p-11', 6, 4, 15, 'Merch Stand 1'),
-- Main Store / Warehouse (b-04)
('bs-04-01', 'b-04', 'p-01', 200, 50, 250, 'Warehouse Bay A'),
('bs-04-02', 'b-04', 'p-02', 180, 40, 220, 'Warehouse Bay A'),
('bs-04-03', 'b-04', 'p-03', 120, 30, 150, 'Warehouse Bay A'),
('bs-04-04', 'b-04', 'p-04', 220, 50, 280, 'Warehouse Bay A'),
('bs-04-05', 'b-04', 'p-05', 80, 20, 100, 'Warehouse Bay B'),
('bs-04-06', 'b-04', 'p-06', 70, 20, 90, 'Warehouse Bay B'),
('bs-04-07', 'b-04', 'p-07', 40, 15, 60, 'Warehouse Bay B'),
('bs-04-08', 'b-04', 'p-08', 50, 15, 70, 'Warehouse Bay C'),
('bs-04-09', 'b-04', 'p-09', 60, 15, 80, 'Warehouse Bay C'),
('bs-04-10', 'b-04', 'p-10', 100, 25, 120, 'Warehouse Bay C'),
('bs-04-11', 'b-04', 'p-11', 40, 10, 50, 'Warehouse Bay D')
ON DUPLICATE KEY UPDATE quantity_on_hand=VALUES(quantity_on_hand);

-- Registers
INSERT INTO registers (id, branch_id, name, terminal_code, is_active) VALUES
('reg-01', 'b-01', 'Terminal 1 - Counter', 'POS-YGN-01-T1', TRUE),
('reg-02', 'b-01', 'Terminal 2 - Express', 'POS-YGN-01-T2', TRUE),
('reg-03', 'b-02', 'Terminal 1 - Main', 'POS-YGN-02-T1', TRUE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Shifts
INSERT INTO shifts (id, branch_id, register_id, cashier_id, opening_float, expected_cash, actual_cash, difference, total_sales_amount, total_orders_count, status) VALUES
('sh-01', 'b-01', 'reg-01', 'u-03', 100000, 450000, 450000, 0, 350000, 18, 'OPEN'),
('sh-02', 'b-02', 'reg-03', 'u-04', 100000, 380000, 380000, 0, 280000, 14, 'OPEN')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- Customers
INSERT INTO customers (id, name, phone, email, loyalty_tier, loyalty_points, total_spent, total_visits) VALUES
('c-01', 'U Thant Zin', '09450012345', 'thantzin@gmail.com', 'GOLD', 340, 425000, 28),
('c-02', 'Daw Aye Aye Myint', '09250067890', 'ayeayemyint@gmail.com', 'VIP', 890, 1280000, 54),
('c-03', 'Ko Sai Nay Lin', '09790033445', 'sainaylin@gmail.com', 'SILVER', 150, 185000, 14),
('c-04', 'Ma Su Hlaing Win', '09970055667', 'suhlaing@gmail.com', 'REGULAR', 40, 48000, 5)
ON DUPLICATE KEY UPDATE loyalty_tier=VALUES(loyalty_tier);

-- Operating Expenses (P&L Ledger Seeds)
INSERT INTO operating_expenses (id, expense_number, branch_id, category, title, amount, payment_method, date, recorded_by, notes) VALUES
('exp-01', 'EXP-202609-001', 'b-01', 'RENT', 'Downtown Flagship Monthly Commercial Lease', 850000, 'CREDIT_CARD', '2026-09-01', 'Admin U Ye Lin', 'Monthly store rental payment for September'),
('exp-02', 'EXP-202609-002', 'b-01', 'SALARIES', 'Downtown Branch Staff Payroll (Mid-month)', 650000, 'KBZ_PAY', '2026-09-15', 'Daw Thiri Kyaw', 'Bi-weekly payroll for 3 shifts staff'),
('exp-03', 'EXP-202609-003', 'b-01', 'UTILITIES', 'Electricity & Backup Diesel Generator Fuel', 280000, 'CASH', '2026-09-18', 'Daw Thiri Kyaw', 'YESC bill & 15kVA standby generator fuel'),
('exp-04', 'EXP-202609-004', 'b-01', 'PACKAGING', 'Thermal Paper Rolls (80mm) & Eco Bags', 75000, 'CASH', '2026-09-20', 'Khin Lay', '2 boxes 80mm thermal rolls & kraft bags'),
('exp-05', 'EXP-202609-005', 'b-02', 'RENT', 'Hledan Center Retail Space Rental', 550000, 'KBZ_PAY', '2026-09-01', 'Admin U Ye Lin', 'Retail unit lease September')
ON DUPLICATE KEY UPDATE amount=VALUES(amount);
