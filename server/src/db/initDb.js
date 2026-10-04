const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function initializeDatabase() {
  console.log('🔄 Checking database tables...');

  try {
    // Check if tables already exist
    const checkRes = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'restaurant_tables'
    `);

    if (checkRes.rows.length === 0) {
      console.log('⚡ Empty database detected. Running schema.sql & seed.sql...');
      
      const schemaSql = fs.readFileSync(path.join(__dirname, '../../sql/schema.sql'), 'utf-8');
      const seedSql = fs.readFileSync(path.join(__dirname, '../../sql/seed.sql'), 'utf-8');

      console.log('Creating database schema...');
      await db.query(schemaSql);
      console.log('Seeding initial data (tables, menu, categories, staff)...');
      await db.query(seedSql);

      console.log('✅ Database initialized and seeded successfully!');
    } else {
      console.log('✅ Database already initialized.');
      // Ensure staff table and attribution columns exist
      const migrate = require('./migrateStaff');
      await migrate();
      // Ensure reservations table and table columns exist
      const migrateReservations = require('./migrateReservations');
      await migrateReservations();
      // Ensure current_pin and table_pin columns exist
      await db.query('ALTER TABLE restaurant_tables ADD COLUMN IF NOT EXISTS current_pin VARCHAR(10)');
      await db.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_pin VARCHAR(10)');
      // Auto-assign 4-digit PIN for any active tables that don't have one yet
      await db.query(`
        UPDATE restaurant_tables 
        SET current_pin = FLOOR(1000 + RANDOM() * 9000)::text 
        WHERE current_pin IS NULL AND status != 'available'
      `);
    }
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  }
}

if (require.main === module) {
  initializeDatabase().then(() => process.exit(0));
}

module.exports = initializeDatabase;
