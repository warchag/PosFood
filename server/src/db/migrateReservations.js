const db = require('../config/db');

async function migrateReservations() {
  const client = await db.pool.connect();
  try {
    console.log('🔄 Running reservations migration...');
    await client.query('BEGIN');

    // 1. Create reservations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
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
        checked_in_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add current_reservation_id to restaurant_tables
    await client.query(`
      ALTER TABLE restaurant_tables 
      ADD COLUMN IF NOT EXISTS current_reservation_id INT REFERENCES reservations(id) ON DELETE SET NULL;
    `);

    // 3. Add indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
      CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
      CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id);
    `);

    // 4. Seed sample reservations if empty
    const checkCount = await client.query('SELECT COUNT(*) FROM reservations');
    if (parseInt(checkCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding initial sample reservations...');
      
      // Get available tables
      const tablesRes = await client.query(`
        SELECT id, table_number FROM restaurant_tables 
        WHERE status = 'available' 
        ORDER BY id ASC LIMIT 2
      `);

      if (tablesRes.rows.length >= 1) {
        const table1 = tablesRes.rows[0];
        const res1 = await client.query(`
          INSERT INTO reservations 
          (table_id, customer_name, customer_phone, guest_count, reservation_date, reservation_time, status, special_requests, staff_name)
          VALUES 
          ($1, 'คุณณภัทร วัฒนกุล', '089-123-4567', 4, CURRENT_DATE, '18:30:00', 'confirmed', 'ฉลองวันเกิด ขอเตรียมจานเค้ก', 'ผจก. สมศักดิ์')
          RETURNING id
        `, [table1.id]);

        // Mark table1 as reserved
        await client.query(`
          UPDATE restaurant_tables 
          SET status = 'reserved', current_reservation_id = $1 
          WHERE id = $2
        `, [res1.rows[0].id, table1.id]);
      }

      if (tablesRes.rows.length >= 2) {
        const table2 = tablesRes.rows[1];
        await client.query(`
          INSERT INTO reservations 
          (table_id, customer_name, customer_phone, guest_count, reservation_date, reservation_time, status, special_requests, staff_name)
          VALUES 
          ($1, 'คุณพิมพ์ชนก สุขสวัสดิ์', '081-987-6543', 2, CURRENT_DATE, '19:45:00', 'confirmed', 'ขอมุมสงบ ริมกระจก', 'น้องวิ')
        `, [table2.id]);
      }

      // Add a past or checked-in sample reservation
      await client.query(`
        INSERT INTO reservations 
        (table_id, customer_name, customer_phone, guest_count, reservation_date, reservation_time, status, special_requests, staff_name, checked_in_at)
        VALUES 
        (NULL, 'คุณอานนท์ รัตนโสภณ', '086-456-7890', 6, CURRENT_DATE, '12:00:00', 'checked_in', 'รับประทานอาหารกลางวันบริษัท', 'น้องชาย', CURRENT_TIMESTAMP - INTERVAL '3 hours')
      `);
    }

    await client.query('COMMIT');
    console.log('✅ Reservations migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Reservations migration failed:', err);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateReservations().then(() => process.exit(0));
}

module.exports = migrateReservations;
