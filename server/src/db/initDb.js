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
      require('./migrateStaff');
    }
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  }
}

if (require.main === module) {
  initializeDatabase().then(() => process.exit(0));
}

module.exports = initializeDatabase;
