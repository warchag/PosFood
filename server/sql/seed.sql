-- Seed Data for Restaurant POS

-- Insert Zones
INSERT INTO zones (id, name, description, display_order) VALUES
(1, 'โซนห้องอาหารหลัก (Main Dining)', 'ห้องปรับอากาศ บรรยากาศอบอุ่น สบายๆ', 1),
(2, 'โซนระเบียงริมสวน (Garden Terrace)', 'โซน Outdoor ลมธรรมชาติ มองเห็นสวน', 2),
(3, 'โซนเคาน์เตอร์บาร์ & VIP (Bar & VIP)', 'บาร์เครื่องดื่ม และห้อง VIP ส่วนตัว', 3);

-- Reset sequence for zones
SELECT setval('zones_id_seq', (SELECT MAX(id) FROM zones));

-- Insert Tables with Top-View Coordinates (X, Y, Width, Height, Shape, Capacity)
INSERT INTO restaurant_tables (table_number, zone_id, shape, x, y, width, height, capacity, status, guest_count) VALUES
-- Zone 1: Main Dining
('A-01', 1, 'rect', 60, 60, 110, 80, 4, 'available', 0),
('A-02', 1, 'rect', 210, 60, 110, 80, 4, 'available', 0),
('A-03', 1, 'rect', 360, 60, 110, 80, 4, 'occupied', 3),
('A-04', 1, 'round', 60, 190, 95, 95, 2, 'available', 0),
('A-05', 1, 'round', 210, 190, 95, 95, 2, 'ordered', 2),
('A-06', 1, 'round', 360, 190, 95, 95, 2, 'available', 0),
('B-01', 1, 'booth', 60, 330, 130, 90, 6, 'available', 0),
('B-02', 1, 'booth', 220, 330, 130, 90, 6, 'billing', 5),

-- Zone 2: Garden Terrace
('T-01', 2, 'round', 80, 70, 100, 100, 4, 'available', 0),
('T-02', 2, 'round', 240, 70, 100, 100, 4, 'occupied', 4),
('T-03', 2, 'rect', 80, 220, 120, 80, 4, 'available', 0),
('T-04', 2, 'rect', 240, 220, 120, 80, 4, 'available', 0),
('T-05', 2, 'rect', 160, 340, 150, 90, 8, 'available', 0),

-- Zone 3: Bar & VIP
('BAR-1', 3, 'bar', 60, 80, 70, 60, 1, 'available', 0),
('BAR-2', 3, 'bar', 150, 80, 70, 60, 1, 'available', 0),
('BAR-3', 3, 'bar', 240, 80, 70, 60, 1, 'occupied', 1),
('BAR-4', 3, 'bar', 330, 80, 70, 60, 1, 'available', 0),
('VIP-1', 3, 'round', 130, 200, 150, 150, 10, 'reserved', 0);

-- Insert Categories
INSERT INTO categories (id, name, icon, display_order) VALUES
(1, 'อาหารแนะนำพิเศษ', 'Flame', 1),
(2, 'อาหารจานหลัก & ยำ', 'Utensils', 2),
(3, 'ต้ม & แกงร้อน', 'Soup', 3),
(4, 'ข้าว & เส้น', 'Bowl', 4),
(5, 'ของทานเล่น & ทอด', 'Cookie', 5),
(6, 'เครื่องดื่ม & ชา/กาแฟ', 'Coffee', 6),
(7, 'ของหวาน & ไอศกรีม', 'IceCream', 7);

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- Insert Menu Items
INSERT INTO menu_items (category_id, name, description, price, cost_price, image_url, is_available, is_recommended, prep_time_minutes) VALUES
-- อาหารแนะนำ
(1, 'ปลากะพงทอดน้ำปลาพรีเมียม', 'ปลากะพงสดทอดกรอบสีทอง เสิร์ฟพร้อมน้ำยำมะม่วงรสเด็ด', 450.00, 220.00, 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 20),
(1, 'กุ้งแม่น้ำเผาเตาถ่าน (2 ตัว)', 'กุ้งแม่น้ำคัดไซส์ มันเยิ้ม เสิร์ฟพร้อมน้ำจิ้มซีฟู้ดมะนาวสดแท้', 590.00, 320.00, 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 25),
(1, 'เนื้อวากิวออสเตรเลียย่างจิ้มแจ่ว', 'เนื้อวากิวเกรดพรีเมียม นุ่มละมุน พร้อมน้ำจิ้มแจ่วข้าวคั่วหอมกรุ่น', 380.00, 180.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 15),

-- จานหลัก & ยำ
(2, 'ยำวุ้นเส้นโบราณซีฟู้ด', 'กุ้ง หมึก หมูสับ พริกสด มะนาวแท้ รสชาติจัดจ้าน', 180.00, 75.00, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 10),
(2, 'ส้มตำไทยคอหมูย่าง', 'ส้มตำไทยเปรี้ยวหวานกลมกล่อม ท็อปด้วยคอหมูย่างนุ่มฉ่ำ', 160.00, 60.00, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 12),
(2, 'ผัดกะเพราเนื้อสับไข่ดาวกรอบ', 'เนื้อสับคัดพิเศษ ผัดใบกะเพราป่าพริกแห้งเผ็ดร้อนจัดจ้าน', 150.00, 50.00, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 10),

-- ต้ม & แกง
(3, 'ต้มยำกุ้งน้ำข้นมะพร้าวอ่อน', 'ต้มยำกุ้งแม่น้ำเข้มข้น หอมเครื่องสมุนไพรและเนื้อมะพร้าวอ่อน', 280.00, 110.00, 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 15),
(3, 'แกงส้มชะอมกุ้งสด', 'น้ำแกงส้มเข้มข้นรสจัดจ้าน ไข่เจียวชะอมทอดใหม่พร้อมกุ้งสดตัวโต', 250.00, 95.00, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 15),
(3, 'ต้มข่าไก่บ้านเห็ดรวม', 'ต้มข่ากะทิสดหอมละมุน กลมกล่อมลงตัว', 220.00, 80.00, 'https://images.unsplash.com/photo-1604908177453-7462950a6a3b?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 12),

-- ข้าว & เส้น
(4, 'ผัดไทยกุ้งสดเส้นจันท์', 'ผัดไทยสูตรต้นตำรับ เส้นจันท์เหนียวนุ่ม ซอสมะขามเข้มข้น', 160.00, 60.00, 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 12),
(4, 'ข้าวผัดปูก้อนกรรเชียง', 'เนื้อปูก้อนสดแน่น ผัดข้าวเรียงเม็ดสวย หอมกระทะ', 240.00, 100.00, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 10),
(4, 'ข้าวผัดสับปะรดกุ้งสด', 'เสิร์ฟในลูกสับปะรด พร้อมกุนเชียง หมูหยอง และเม็ดมะม่วงหิมพานต์', 220.00, 90.00, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 12),

-- ของทานเล่น
(5, 'ทอดมันกุ้งอัลมอนด์', 'เนื้อกุ้งแน่นเด้ง คลุกเกล็ดอัลมอนด์ทอดกรอบ เสิร์ฟพร้อมน้ำจิ้มบ๊วยเจี่ย', 190.00, 75.00, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 10),
(5, 'ปีกไก่ทอดน้ำปลาเกลือหิมาลายัน', 'ปีกไก่หมักน้ำปลาแท้ ทอดกรอบนอกนุ่มฉ่ำใน', 140.00, 50.00, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 10),
(5, 'เปาะเปี๊ยะทอดไส้ผักรวม', 'เปาะเปี๊ยะทอดกรอบ ไม่อมน้ำมัน น้ำจิ้มหวานสูตรลับ', 110.00, 35.00, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 8),

-- เครื่องดื่ม
(6, 'ชาไทยการันต์เย็นทรงเครื่อง', 'ชาไทยสูตรเข้มข้น หวานมันกำลังดี ท็อปด้วยฟองนมนุ่ม', 75.00, 20.00, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 5),
(6, 'อัญชันมะนาวน้ำผึ้งแท้โซดา', 'สดชื่น คลายร้อน สีสันสวยงาม', 85.00, 25.00, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 5),
(6, 'น้ำแตงโมปั่นคั้นสด', 'แตงโมคัดเกรด ปั่นหวานฉ่ำ ไร้น้ำตาลปรุงแต่ง', 70.00, 18.00, 'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 5),
(6, 'น้ำแร่ออแกนิก (ขวด)', 'น้ำแร่ธรรมชาติเย็นฉ่ำ', 30.00, 10.00, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 2),

-- ของหวาน
(7, 'ข้าวเหนียวมะม่วงน้ำดอกไม้ทอง', 'มะม่วงสุกหอมหวาน ข้าวเหนียวมูนกะทิสด โรยถั่วทองกรอบ', 150.00, 50.00, 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80', TRUE, TRUE, 5),
(7, 'บัวลอยมะพร้าวอ่อนไข่หวาน', 'เม็ดบัวลอยหลากสีจากธรรมชาติ กะทิสดหอมควันเทียน', 85.00, 25.00, 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 8),
(7, 'ไอศกรีมกะทิสดทรงเครื่องโบราณ', 'ไอศกรีมกะทิสดแท้ เสิร์ฟพร้อมข้าวเหนียว ลูกชิด ถั่วลิสงคั่ว', 95.00, 30.00, 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&auto=format&fit=crop&q=80', TRUE, FALSE, 5);

-- Insert Sample Active Orders for Demonstration
-- Sample 1: Table A-05 (Ordered state)
INSERT INTO orders (id, order_number, table_id, status, guest_count, subtotal, discount_type, discount_value, discount_amount, service_charge_rate, service_charge_amount, vat_rate, vat_amount, total_amount) VALUES
(1, 'ORD-20261003-001', 5, 'active', 2, 730.00, 'none', 0, 0, 0, 0, 7.00, 51.10, 781.10);

INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity, total_price, notes, status) VALUES
(1, 1, 'ปลากะพงทอดน้ำปลาพรีเมียม', 450.00, 1, 450.00, 'ขอน้ำยำรสจัด แยกน้ำยำ', 'cooking'),
(1, 7, 'ต้มยำกุ้งน้ำข้นมะพร้าวอ่อน', 280.00, 1, 280.00, 'เผ็ดกลาง', 'pending');

-- Sample 2: Table B-02 (Billing state)
INSERT INTO orders (id, order_number, table_id, status, guest_count, subtotal, discount_type, discount_value, discount_amount, service_charge_rate, service_charge_amount, vat_rate, vat_amount, total_amount) VALUES
(2, 'ORD-20261003-002', 8, 'active', 5, 1420.00, 'percentage', 10, 142.00, 10.00, 127.80, 7.00, 98.41, 1504.21);

INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity, total_price, notes, status) VALUES
(2, 2, 'กุ้งแม่น้ำเผาเตาถ่าน (2 ตัว)', 590.00, 1, 590.00, 'ขอผ่าหลัง ก้ามทุบให้ด้วยครับ', 'served'),
(2, 3, 'เนื้อวากิวออสเตรเลียย่างจิ้มแจ่ว', 380.00, 1, 380.00, 'ย่าง Medium Rare', 'served'),
(2, 10, 'ข้าวผัดปูก้อนกรรเชียง', 240.00, 1, 240.00, 'ไม่ใส่ต้นหอม', 'served'),
(2, 16, 'ชาไทยการันต์เย็นทรงเครื่อง', 75.00, 2, 150.00, 'หวานน้อย 50%', 'served'),
(2, 19, 'ข้าวเหนียวมะม่วงน้ำดอกไม้ทอง', 150.00, 1, 150.00, 'กะทิแยก', 'served');

-- Sample 3: Table A-03 (Occupied state)
INSERT INTO orders (id, order_number, table_id, status, guest_count, subtotal, discount_type, discount_value, discount_amount, service_charge_rate, service_charge_amount, vat_rate, vat_amount, total_amount) VALUES
(3, 'ORD-20261003-003', 3, 'active', 3, 340.00, 'none', 0, 0, 0, 0, 7.00, 23.80, 363.80);

INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity, total_price, notes, status) VALUES
(3, 4, 'ยำวุ้นเส้นโบราณซีฟู้ด', 180.00, 1, 180.00, 'พริก 5 เม็ด', 'served'),
(3, 11, 'ผัดไทยกุ้งสดเส้นจันท์', 160.00, 1, 160.00, 'ไม่ใส่ถั่วงอกดิบ', 'cooking');

-- Update table order references
UPDATE restaurant_tables SET current_order_id = 1 WHERE id = 5;
UPDATE restaurant_tables SET current_order_id = 2 WHERE id = 8;
UPDATE restaurant_tables SET current_order_id = 3 WHERE id = 3;

-- Sample Past Completed Order for Statistics & Reports
INSERT INTO orders (id, order_number, table_id, status, guest_count, subtotal, discount_type, discount_value, discount_amount, service_charge_rate, service_charge_amount, vat_rate, vat_amount, total_amount, created_at, closed_at) VALUES
(4, 'ORD-20261003-000', 1, 'completed', 2, 850.00, 'none', 0, 0, 0, 0, 7.00, 59.50, 909.50, CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour');

INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity, total_price, status, created_at) VALUES
(4, 1, 'ปลากะพงทอดน้ำปลาพรีเมียม', 450.00, 1, 450.00, 'served', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(4, 3, 'เนื้อวากิวออสเตรเลียย่างจิ้มแจ่ว', 380.00, 1, 380.00, 'served', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(4, 18, 'น้ำแร่ออแกนิก (ขวด)', 30.00, 1, 30.00, 'served', CURRENT_TIMESTAMP - INTERVAL '2 hours');

INSERT INTO payments (order_id, payment_method, total_billed, amount_received, change_amount, transaction_ref, paid_at) VALUES
(4, 'promptpay', 909.50, 909.50, 0.00, 'TXN-98471203', CURRENT_TIMESTAMP - INTERVAL '1 hour');

SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));

-- Settings
INSERT INTO restaurant_settings (setting_key, setting_value) VALUES
('restaurant_name', 'Siam Culinary & Bistro'),
('restaurant_address', '88/1 ถ.สุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กทม. 10110'),
('restaurant_phone', '02-765-4321'),
('tax_id', '0105563089123'),
('promptpay_id', '0891234567'),
('vat_rate', '7'),
('service_charge_rate', '10'),
('currency_symbol', '฿');

-- Default Staff Accounts
INSERT INTO staff (id, name, nickname, role, pin_code, is_active) VALUES
(1, 'สมศักดิ์ ผู้จัดการร้าน', 'ผจก. สมศักดิ์', 'admin', '1111', TRUE),
(2, 'วิภาดา แคชเชียร์หลัก', 'น้องวิ', 'cashier', '2222', TRUE),
(3, 'สมชาย พนักงานบริการ', 'น้องชาย', 'waiter', '3333', TRUE),
(4, 'สุดารัตน์ พนักงานบริการ', 'น้องดาว', 'waiter', '4444', TRUE);

SELECT setval('staff_id_seq', (SELECT MAX(id) FROM staff));
