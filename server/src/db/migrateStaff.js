const db = require('../config/db');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('🔄 Running staff migration...');
    await client.query('BEGIN');

    // 1. Create staff table
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        nickname VARCHAR(50),
        role VARCHAR(30) NOT NULL DEFAULT 'waiter', -- 'admin', 'cashier', 'waiter'
        pin_code VARCHAR(10) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // 2. Add columns to orders
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_id INT REFERENCES staff(id) ON DELETE SET NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_name VARCHAR(100);
    `);

    // 3. Add columns to payments
    await client.query(`
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS cashier_id INT REFERENCES staff(id) ON DELETE SET NULL;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(100);
    `);

    // 4. Seed default staff if table is empty
    const checkStaff = await client.query('SELECT COUNT(*) FROM staff');
    if (parseInt(checkStaff.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial staff members...');
      await client.query(`
        INSERT INTO staff (name, nickname, role, pin_code) VALUES
        ('สมศักดิ์ ผู้จัดการร้าน', 'ผจก. สมศักดิ์', 'admin', '1111'),
        ('วิภาดา แคชเชียร์หลัก', 'น้องวิ', 'cashier', '2222'),
        ('สมชาย พนักงานบริการ', 'น้องชาย', 'waiter', '3333'),
        ('สุดารัตน์ พนักงานบริการ', 'น้องดาว', 'waiter', '4444')
      `);
    }

    await client.query('COMMIT');
    console.log('✅ Staff migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    if (require.main === module) {
      process.exit(0);
    }
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
