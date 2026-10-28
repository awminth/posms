USE mt_posms;

INSERT INTO suppliers (id, code, name, contact_person, phone, email, address, category, total_purchased, total_paid, balance_payable)
VALUES
('sup-01', 'SUP-BEA-01', 'Bean & Co Roasters', 'U Kyaw Zeya', '09420011122', 'orders@beanco.mm', 'Insein Township, Yangon', 'Coffee Beans', 2500000, 1800000, 700000),
('sup-02', 'SUP-BAK-02', 'Golden Crust Bakery Supply', 'Daw Hnin Yu', '09420033344', 'sales@goldencryst.mm', 'Tamwe Township, Yangon', 'Bakery', 980000, 980000, 0),
('sup-03', 'SUP-PAC-03', 'EcoPack Myanmar', 'Ko Aung Soe', '09420055566', 'hello@ecopack.mm', 'Hlaing Tharyar', 'Packaging', 420000, 200000, 220000)
ON DUPLICATE KEY UPDATE name=VALUES(name);

UPDATE customers SET credit_limit = 500000, current_credit = 0 WHERE id IN ('c-01','c-02','c-03','c-04');
UPDATE customers SET credit_limit = 1000000, current_credit = 85000 WHERE id = 'c-02';

-- Ensure warehouse stocks exist for distribution demos
INSERT INTO branch_stocks (id, branch_id, product_id, quantity_on_hand, reorder_level, ideal_stock, shelf_location)
SELECT CONCAT('bs-04-', p.id), 'b-04', p.id, 200, 50, 300, 'Warehouse Bay'
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM branch_stocks bs WHERE bs.branch_id = 'b-04' AND bs.product_id = p.id
);
