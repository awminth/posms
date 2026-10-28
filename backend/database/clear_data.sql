-- =============================================================================
-- OmniPOS (posMS) - Clean Database Script (Database ရှင်းလင်းရန် SQL)
-- Admin account မှလွဲ၍ ကျန်ရှိသော Demo / Sample Data များအားလုံးကို ရှင်းလင်းပေးမည့် Script
-- (TiDB Cloud တွင် တည်ရှိသော table name အတိအကျများဖြင့် ရေးသားထားပါသည်)
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ၁။ အရောင်းကောင်တာ၊ ဘောက်ချာနှင့် ငွေရှင်းမှတ်တမ်းများ ရှင်းလင်းခြင်း
TRUNCATE TABLE order_items;
TRUNCATE TABLE payments;
TRUNCATE TABLE orders;
TRUNCATE TABLE sale_return_items;
TRUNCATE TABLE sale_returns;
TRUNCATE TABLE shifts;
TRUNCATE TABLE cash_drawer_logs;

-- ၂။ ကုန်ဝယ်ယူမှု (Purchases)၊ ကုန်ဝယ် Return နှင့် Supplier စာရင်းများ ရှင်းလင်းခြင်း
TRUNCATE TABLE purchase_return_items;
TRUNCATE TABLE purchase_returns;
TRUNCATE TABLE purchase_items;
TRUNCATE TABLE purchases;
TRUNCATE TABLE supplier_payments;
TRUNCATE TABLE supplier_bills;
TRUNCATE TABLE suppliers;

-- ၃။ စတော့လက်ကျန် (Stocks)၊ FIFO Stock Lots နှင့် ဆိုင်ခွဲလွှဲပြောင်းမှုများ ရှင်းလင်းခြင်း
TRUNCATE TABLE stock_transfer_items;
TRUNCATE TABLE stock_transfers;
TRUNCATE TABLE stock_lots;
TRUNCATE TABLE branch_stocks;
TRUNCATE TABLE inventory_period_balances;

-- ၄။ ဆိုင်အသုံးစရိတ် (Expenses)၊ အခြားဝင်ငွေနှင့် Audit Logs များ ရှင်းလင်းခြင်း
TRUNCATE TABLE operating_expenses;
TRUNCATE TABLE other_income;
TRUNCATE TABLE audit_logs;

-- ၅။ Customer စာရင်းနှင့် Customer Credit များ ရှင်းလင်းခြင်း
TRUNCATE TABLE customers;

-- ၆။ ကုန်ပစ္စည်းစာရင်း၊ အမျိုးအစားများနှင့် ယူနစ်များ ရှင်းလင်းခြင်း
TRUNCATE TABLE products;
TRUNCATE TABLE categories;
TRUNCATE TABLE product_units;

-- ၇။ ဝန်ထမ်းအကောင့်များ ရှင်းလင်းခြင်း (SUPER_ADMIN မှလွဲ၍ ကျန်အကောင့်အားလုံးကို ဖျက်မည်)
DELETE FROM users WHERE role NOT IN ('SUPER_ADMIN');

-- Super Admin အကောင့်ကို ဆိုင်ခွဲအားလုံး ဝင်ရောက်ခွင့်ရရှိစေရန် branch_id ကို NULL သတ်မှတ်ခြင်း
UPDATE users SET branch_id = NULL WHERE role = 'SUPER_ADMIN';

-- ၈။ ဆိုင်ခွဲများ ရှင်းလင်းခြင်း
-- အကယ်၍ ဆိုင်ခွဲများအားလုံးကို အစမှ ပြန်လည်ဖွင့်လှစ်လိုပါက အောက်ပါ Line ကို အသုံးပြုနိုင်ပါသည်:
-- TRUNCATE TABLE branches;
-- (စနစ်စတင်လည်ပတ်ရန် ပင်မဆိုင်ခွဲ ၁ ခု ချန်ထားပေးခြင်း)
DELETE FROM branches WHERE id NOT IN ('b-01');
UPDATE branches SET 
    code = 'HQ-01', 
    name = 'Main Branch (ပင်မဆိုင်ခွဲ)', 
    type = 'RETAIL', 
    city = 'Yangon', 
    address = 'Downtown', 
    phone = '09-0000000', 
    is_active = TRUE 
WHERE id = 'b-01';

SET FOREIGN_KEY_CHECKS = 1;

-- စစ်ဆေးရန် Query:
SELECT 'Super Admin Account' AS Label, username, role, is_active FROM users;
SELECT 'Remaining Branches' AS Label, id, code, name FROM branches;
