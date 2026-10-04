const db = require('../config/db');

// Helper to guarantee staff table and seed data exist
const ensureStaffTableAndDefaults = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        nickname VARCHAR(50),
        role VARCHAR(30) DEFAULT 'waiter',
        pin_code VARCHAR(10) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
      );
    `);

    // Ensure columns on orders & payments exist
    await db.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_id INT REFERENCES staff(id) ON DELETE SET NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS staff_name VARCHAR(150);
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS cashier_id INT REFERENCES staff(id) ON DELETE SET NULL;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(150);
    `);

    // Check count
    const countRes = await db.query('SELECT COUNT(*) FROM staff');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      console.log('🌱 Auto-seeding default staff members on Railway...');
      await db.query(`
        INSERT INTO staff (name, nickname, role, pin_code, is_active) VALUES
        ('สมศักดิ์ ผู้จัดการร้าน', 'ผจก. สมศักดิ์', 'admin', '1111', TRUE),
        ('วิภาดา แคชเชียร์หลัก', 'น้องวิ', 'cashier', '2222', TRUE),
        ('สมชาย พนักงานบริการ', 'น้องชาย', 'waiter', '3333', TRUE),
        ('สุดารัตน์ พนักงานบริการ', 'น้องดาว', 'waiter', '4444', TRUE);
      `);
    }
  } catch (e) {
    console.error('Error auto-seeding staff:', e.message);
  }
};

// List active staff members (for login selection & management)
const getStaffList = async (req, res) => {
  try {
    let result = await db.query(
      `SELECT id, name, nickname, role, is_active, created_at, last_login_at
       FROM staff
       WHERE is_active = TRUE
       ORDER BY 
         CASE role 
           WHEN 'admin' THEN 1 
           WHEN 'cashier' THEN 2 
           WHEN 'waiter' THEN 3 
           ELSE 4 
         END, id ASC`
    );

    if (result.rows.length === 0) {
      await ensureStaffTableAndDefaults();
      result = await db.query(
        `SELECT id, name, nickname, role, is_active, created_at, last_login_at
         FROM staff
         WHERE is_active = TRUE
         ORDER BY id ASC`
      );
    }

    res.json({ success: true, data: result.rows });
  } catch (err) {
    // If relation does not exist, create and seed immediately
    if (err.message && err.message.includes('does not exist')) {
      await ensureStaffTableAndDefaults();
      try {
        const retryResult = await db.query(
          `SELECT id, name, nickname, role, is_active, created_at, last_login_at
           FROM staff
           WHERE is_active = TRUE
           ORDER BY id ASC`
        );
        return res.json({ success: true, data: retryResult.rows });
      } catch (retryErr) {
        return res.status(500).json({ success: false, error: retryErr.message });
      }
    }
    console.error('Error fetching staff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Verify PIN and login
const loginWithPin = async (req, res, io) => {
  const staff_id = req.body.staff_id || req.body.staffId;
  const pin_code = req.body.pin_code || req.body.pin;

  if (!pin_code) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกรหัส PIN 4 หลัก' });
  }

  try {
    let query = 'SELECT id, name, nickname, role, is_active FROM staff WHERE pin_code = $1 AND is_active = TRUE';
    let params = [pin_code];

    if (staff_id) {
      query += ' AND id = $2';
      params.push(staff_id);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'รหัส PIN ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าใช้งาน' });
    }

    const staff = result.rows[0];

    // Update last login
    await db.query('UPDATE staff SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [staff.id]);

    if (io) {
      io.emit('staff:login', { staff_id: staff.id, name: staff.name, role: staff.role });
    }

    res.json({
      success: true,
      message: `ยินดีต้อนรับคุณ ${staff.nickname || staff.name}`,
      data: staff
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create new staff member
const createStaff = async (req, res, io) => {
  const { name, nickname, role, pin_code } = req.body;

  if (!name || !pin_code || pin_code.length < 4) {
    return res.status(400).json({ success: false, error: 'กรุณากรอกชื่อและรหัส PIN อย่างน้อย 4 หลัก' });
  }

  try {
    const result = await db.query(
      `INSERT INTO staff (name, nickname, role, pin_code)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, nickname, role, is_active, created_at`,
      [name, nickname || null, role || 'waiter', pin_code]
    );

    if (io) io.emit('staff:updated');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating staff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update staff
const updateStaff = async (req, res, io) => {
  const { id } = req.params;
  const { name, nickname, role, pin_code, is_active } = req.body;

  try {
    let query = `
      UPDATE staff
      SET name = COALESCE($1, name),
          nickname = COALESCE($2, nickname),
          role = COALESCE($3, role),
          is_active = COALESCE($4, is_active)
    `;
    const params = [name, nickname, role, is_active];

    if (pin_code && pin_code.length >= 4) {
      query += `, pin_code = $${params.length + 1}`;
      params.push(pin_code);
    }

    query += ` WHERE id = $${params.length + 1} RETURNING id, name, nickname, role, is_active`;
    params.push(id);

    const result = await db.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    if (io) io.emit('staff:updated');
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating staff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Deactivate staff
const deleteStaff = async (req, res, io) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE staff SET is_active = FALSE WHERE id = $1 RETURNING id, name',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }
    if (io) io.emit('staff:updated');
    res.json({ success: true, message: 'ลบข้อมูลพนักงานเรียบร้อย' });
  } catch (err) {
    console.error('Error deleting staff:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getStaffList,
  loginWithPin,
  createStaff,
  updateStaff,
  deleteStaff
};
