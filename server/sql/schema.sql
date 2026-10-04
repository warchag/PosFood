-- Restaurant POS & Floor Plan Database Schema

-- Drop existing tables if re-initializing
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS restaurant_tables CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS restaurant_settings CASCADE;
DROP TABLE IF EXISTS staff CASCADE;

-- Staff Members
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    nickname VARCHAR(50),
    role VARCHAR(30) DEFAULT 'waiter', -- 'admin', 'cashier', 'waiter'
    pin_code VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Zones / Floor sections
CREATE TABLE zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tables with Top-View 2D Coordinates & Dimensions
CREATE TABLE restaurant_tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(20) NOT NULL UNIQUE,
    zone_id INT REFERENCES zones(id) ON DELETE SET NULL,
    shape VARCHAR(20) DEFAULT 'rect', -- 'rect', 'round', 'booth', 'bar'
    x INT DEFAULT 50, -- Top-view X coordinate in px/grid
    y INT DEFAULT 50, -- Top-view Y coordinate in px/grid
    width INT DEFAULT 90,
    height INT DEFAULT 90,
    rotation INT DEFAULT 0,
    capacity INT DEFAULT 4,
    status VARCHAR(30) DEFAULT 'available', -- 'available', 'occupied', 'ordered', 'billing', 'reserved'
    guest_count INT DEFAULT 0,
    current_order_id INT DEFAULT NULL,
    current_pin VARCHAR(10) DEFAULT NULL,
    current_reservation_id INT DEFAULT NULL,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Food Categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) DEFAULT 'Utensils',
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu Items
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) DEFAULT 0,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    is_recommended BOOLEAN DEFAULT FALSE,
    prep_time_minutes INT DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    table_id INT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    guest_count INT DEFAULT 1,
    subtotal NUMERIC(10, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'none', -- 'none', 'fixed', 'percentage'
    discount_value NUMERIC(10, 2) DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    service_charge_rate NUMERIC(5, 2) DEFAULT 0.00, -- e.g. 10.00 for 10%
    service_charge_amount NUMERIC(10, 2) DEFAULT 0.00,
    vat_rate NUMERIC(5, 2) DEFAULT 7.00, -- e.g. 7.00 for 7%
    vat_amount NUMERIC(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
    staff_name VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Order Items (Dishes ordered)
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
    item_name VARCHAR(150) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    total_price NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    status VARCHAR(30) DEFAULT 'pending', -- 'pending', 'cooking', 'served', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments / Receipts
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL, -- 'cash', 'promptpay', 'credit_card'
    total_billed NUMERIC(10, 2) NOT NULL,
    amount_received NUMERIC(10, 2) NOT NULL,
    change_amount NUMERIC(10, 2) DEFAULT 0.00,
    transaction_ref VARCHAR(100),
    payment_status VARCHAR(30) DEFAULT 'success',
    cashier_id INT REFERENCES staff(id) ON DELETE SET NULL,
    cashier_name VARCHAR(150),
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Settings (Store name, Tax ID, PromptPay ID, etc.)
CREATE TABLE restaurant_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL
);

-- Reservations
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    table_id INT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    guest_count INT NOT NULL DEFAULT 2,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'checked_in', 'cancelled', 'no_show'
    special_requests TEXT,
    staff_id INT REFERENCES staff(id) ON DELETE SET NULL,
    staff_name VARCHAR(100),
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Foreign key link back from restaurant_tables to reservations
ALTER TABLE restaurant_tables 
    ADD CONSTRAINT fk_tables_current_reservation 
    FOREIGN KEY (current_reservation_id) 
    REFERENCES reservations(id) 
    ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_tables_zone ON restaurant_tables(zone_id);
CREATE INDEX idx_tables_status ON restaurant_tables(status);
CREATE INDEX idx_menu_category ON menu_items(category_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_table ON reservations(table_id);
