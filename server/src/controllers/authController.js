const db = require('../config/db');

// List active staff members (for login selection & management)
const getStaffList = async (req, res) => {
  try {
    const result = await db.query(
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
    res.json({ success: true, data: result.rows });
  } catch (err) {
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
