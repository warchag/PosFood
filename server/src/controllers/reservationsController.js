const db = require('../config/db');

// Get all reservations with table & zone details
const getReservations = async (req, res) => {
  const { date, status, search } = req.query;

  try {
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // Filter by date
    if (date && date !== 'all') {
      whereClauses.push(`r.reservation_date = $${paramIndex}`);
      params.push(date);
      paramIndex++;
    }

    // Filter by status
    if (status && status !== 'all') {
      whereClauses.push(`r.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Filter by keyword search (customer_name, phone, table_number)
    if (search && search.trim()) {
      whereClauses.push(`(
        r.customer_name ILIKE $${paramIndex} OR 
        r.customer_phone ILIKE $${paramIndex} OR 
        t.table_number ILIKE $${paramIndex}
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        r.id,
        r.table_id,
        r.customer_name,
        r.customer_phone,
        r.guest_count,
        to_char(r.reservation_date, 'YYYY-MM-DD') as reservation_date,
        to_char(r.reservation_time, 'HH24:MI') as reservation_time,
        r.status,
        r.special_requests,
        r.staff_id,
        r.staff_name,
        r.checked_in_at,
        r.created_at,
        r.updated_at,
        t.table_number,
        t.capacity as table_capacity,
        t.shape as table_shape,
        t.status as current_table_status,
        z.id as zone_id,
        z.name as zone_name
      FROM reservations r
      LEFT JOIN restaurant_tables t ON r.table_id = t.id
      LEFT JOIN zones z ON t.zone_id = z.id
      ${whereSql}
      ORDER BY r.reservation_date DESC, r.reservation_time ASC, r.id DESC
    `;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get single reservation by ID
const getReservationById = async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT 
        r.*,
        to_char(r.reservation_date, 'YYYY-MM-DD') as reservation_date,
        to_char(r.reservation_time, 'HH24:MI') as reservation_time,
        t.table_number,
        t.capacity as table_capacity,
        t.status as current_table_status,
        z.name as zone_name
      FROM reservations r
      LEFT JOIN restaurant_tables t ON r.table_id = t.id
      LEFT JOIN zones z ON t.zone_id = z.id
      WHERE r.id = $1
    `;
    const result = await db.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create a new reservation
const createReservation = async (req, res, io) => {
  const {
    table_id,
    customer_name,
    customer_phone,
    guest_count,
    reservation_date,
    reservation_time,
    special_requests,
    staff_id,
    staff_name
  } = req.body;

  if (!customer_name || !customer_phone || !reservation_date || !reservation_time) {
    return res.status(400).json({ 
      success: false, 
      error: 'กรุณากรอกชื่อลูกค้า, เบอร์โทรศัพท์, วันที่ และเวลาที่จองให้ครบถ้วน' 
    });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into reservations
    const insertRes = await client.query(
      `INSERT INTO reservations 
       (table_id, customer_name, customer_phone, guest_count, reservation_date, reservation_time, special_requests, staff_id, staff_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')
       RETURNING *`,
      [
        table_id || null,
        customer_name.trim(),
        customer_phone.trim(),
        guest_count || 2,
        reservation_date,
        reservation_time,
        special_requests || null,
        staff_id || null,
        staff_name || null
      ]
    );

    const newReservation = insertRes.rows[0];

    // 2. If table_id is specified and table is available, mark table status as 'reserved'
    if (table_id) {
      const tableCheck = await client.query('SELECT * FROM restaurant_tables WHERE id = $1 FOR UPDATE', [table_id]);
      if (tableCheck.rows.length > 0) {
        const table = tableCheck.rows[0];
        // If table is available, reserve it
        if (table.status === 'available') {
          await client.query(
            `UPDATE restaurant_tables 
             SET status = 'reserved', current_reservation_id = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [newReservation.id, `จองโดย ${customer_name} (${reservation_time})`, table_id]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Fetch full details with table and zone info for socket broadcasting
    const fullRes = await db.query(`
      SELECT 
        r.id,
        r.table_id,
        r.customer_name,
        r.customer_phone,
        r.guest_count,
        to_char(r.reservation_date, 'YYYY-MM-DD') as reservation_date,
        to_char(r.reservation_time, 'HH24:MI') as reservation_time,
        r.status,
        r.special_requests,
        r.staff_name,
        r.created_at,
        t.table_number,
        z.name as zone_name
      FROM reservations r
      LEFT JOIN restaurant_tables t ON r.table_id = t.id
      LEFT JOIN zones z ON t.zone_id = z.id
      WHERE r.id = $1
    `, [newReservation.id]);

    const createdData = fullRes.rows[0] || newReservation;

    if (io) {
      io.emit('reservation:created', createdData);
      io.emit('table:updated', { table_id });
      io.emit('tables:batch_updated');
    }

    res.status(201).json({ success: true, data: createdData });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating reservation:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Update an existing reservation
const updateReservation = async (req, res, io) => {
  const { id } = req.params;
  const {
    table_id,
    customer_name,
    customer_phone,
    guest_count,
    reservation_date,
    reservation_time,
    special_requests,
    status
  } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const prevRes = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [id]);
    if (prevRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    const prev = prevRes.rows[0];
    const prevTableId = prev.table_id;
    const newTableId = table_id !== undefined ? table_id : prevTableId;

    // If table has changed, free old table if it was reserved by this
    if (prevTableId && prevTableId !== newTableId) {
      await client.query(
        `UPDATE restaurant_tables 
         SET status = 'available', current_reservation_id = NULL, notes = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND current_reservation_id = $2`,
        [prevTableId, id]
      );
    }

    // Update reservation record
    const updateRes = await client.query(
      `UPDATE reservations
       SET table_id = $1,
           customer_name = COALESCE($2, customer_name),
           customer_phone = COALESCE($3, customer_phone),
           guest_count = COALESCE($4, guest_count),
           reservation_date = COALESCE($5, reservation_date),
           reservation_time = COALESCE($6, reservation_time),
           special_requests = COALESCE($7, special_requests),
           status = COALESCE($8, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        newTableId || null,
        customer_name,
        customer_phone,
        guest_count,
        reservation_date,
        reservation_time,
        special_requests,
        status,
        id
      ]
    );

    const updated = updateRes.rows[0];

    // If assigned to a new table and status is confirmed, reserve that table
    if (newTableId && updated.status === 'confirmed') {
      const tCheck = await client.query('SELECT * FROM restaurant_tables WHERE id = $1', [newTableId]);
      if (tCheck.rows[0] && tCheck.rows[0].status === 'available') {
        await client.query(
          `UPDATE restaurant_tables 
           SET status = 'reserved', current_reservation_id = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [id, `จองโดย ${updated.customer_name}`, newTableId]
        );
      }
    }

    await client.query('COMMIT');

    if (io) {
      io.emit('reservation:updated', updated);
      io.emit('tables:batch_updated');
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating reservation:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Check-in customer from reservation into table (Seats guests & opens table)
const checkInReservation = async (req, res, io) => {
  const { id } = req.params;
  const { guest_count, notes, staff_id, staff_name } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get reservation
    const resResult = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [id]);
    if (resResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'ไม่พบรายการจอง' });
    }

    const reservation = resResult.rows[0];
    if (reservation.status === 'checked_in') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'รายการจองนี้ได้เช็คอินเข้าโต๊ะไปแล้ว' });
    }
    if (reservation.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'รายการจองนี้ถูกยกเลิกแล้ว ไม่สามารถเช็คอินได้' });
    }

    const tableId = reservation.table_id;
    if (!tableId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'รายการจองนี้ยังไม่ได้ระบุโต๊ะ กรุณาระบุโต๊ะก่อนเช็คอิน' });
    }

    // 2. Check table
    const tableRes = await client.query('SELECT * FROM restaurant_tables WHERE id = $1 FOR UPDATE', [tableId]);
    if (tableRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'ไม่พบโต๊ะที่ระบุ' });
    }

    const table = tableRes.rows[0];
    // If table is already occupied by someone else
    if (table.status === 'occupied' || table.status === 'ordered' || table.status === 'billing') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        error: `โต๊ะ ${table.table_number} มีลูกค้าท่านอื่นกำลังใช้งานอยู่ กรุณาย้ายโต๊ะให้ลูกค้าที่จองก่อนเช็คอิน` 
      });
    }

    // 3. Create new active order
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const sessionPin = Math.floor(1000 + Math.random() * 9000).toString();
    const guestTotal = guest_count || reservation.guest_count || 2;
    const finalNotes = notes || reservation.special_requests || `ลูกค้าจอง: ${reservation.customer_name}`;

    const orderRes = await client.query(
      `INSERT INTO orders 
       (order_number, table_id, status, guest_count, notes, staff_id, staff_name, table_pin)
       VALUES ($1, $2, 'active', $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        orderNumber, 
        tableId, 
        guestTotal, 
        finalNotes, 
        staff_id || reservation.staff_id || null, 
        staff_name || reservation.staff_name || 'พนักงาน',
        sessionPin
      ]
    );

    const newOrder = orderRes.rows[0];

    // 4. Update table to occupied
    const updatedTableRes = await client.query(
      `UPDATE restaurant_tables
       SET status = 'occupied',
           guest_count = $1,
           current_order_id = $2,
           current_pin = $3,
           current_reservation_id = NULL,
           notes = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [guestTotal, newOrder.id, sessionPin, finalNotes, tableId]
    );

    // 5. Update reservation to checked_in
    const updatedRes = await client.query(
      `UPDATE reservations
       SET status = 'checked_in',
           checked_in_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');

    const resultData = {
      reservation: updatedRes.rows[0],
      table: updatedTableRes.rows[0],
      order: newOrder
    };

    if (io) {
      io.emit('reservation:checked_in', resultData);
      io.emit('table:opened', { table: updatedTableRes.rows[0], order: newOrder });
      io.emit('tables:batch_updated');
    }

    res.json({ success: true, message: 'เช็คอินลูกค้าเข้าโต๊ะเรียบร้อยแล้ว', data: resultData });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error checking in reservation:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Cancel reservation
const cancelReservation = async (req, res, io) => {
  const { id } = req.params;
  const { reason } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const resResult = await client.query('SELECT * FROM reservations WHERE id = $1 FOR UPDATE', [id]);
    if (resResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'ไม่พบรายการจอง' });
    }

    const reservation = resResult.rows[0];

    // Update reservation status to cancelled
    const updateRes = await client.query(
      `UPDATE reservations
       SET status = 'cancelled',
           special_requests = CASE 
             WHEN $2::text IS NOT NULL AND $2::text != '' 
             THEN COALESCE(special_requests, '') || ' [เหตุผลยกเลิก: ' || $2 || ']'
             ELSE special_requests 
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, reason || '']
    );

    // If a table is currently reserved for this reservation, free it
    if (reservation.table_id) {
      await client.query(
        `UPDATE restaurant_tables 
         SET status = 'available', current_reservation_id = NULL, notes = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND current_reservation_id = $2`,
        [reservation.table_id, id]
      );
    }

    await client.query('COMMIT');

    if (io) {
      io.emit('reservation:cancelled', { id: parseInt(id, 10), reservation: updateRes.rows[0] });
      io.emit('tables:batch_updated');
    }

    res.json({ success: true, message: 'ยกเลิกการจองเรียบร้อยแล้ว', data: updateRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error cancelling reservation:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getReservations,
  getReservationById,
  createReservation,
  updateReservation,
  checkInReservation,
  cancelReservation
};
