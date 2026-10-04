const db = require('../config/db');

// Get all tables with current order summary and zone info
const getTables = async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id,
        t.table_number,
        t.zone_id,
        z.name as zone_name,
        z.display_order as zone_order,
        t.shape,
        t.x,
        t.y,
        t.width,
        t.height,
        t.rotation,
        t.capacity,
        t.status,
        t.guest_count,
        t.current_order_id,
        t.current_pin,
        t.notes,
        o.order_number,
        o.total_amount as current_total,
        o.created_at as seated_at,
        COUNT(oi.id) as item_count
      FROM restaurant_tables t
      LEFT JOIN zones z ON t.zone_id = z.id
      LEFT JOIN orders o ON t.current_order_id = o.id AND o.status = 'active'
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY t.id, z.name, z.display_order, o.order_number, o.total_amount, o.created_at, t.current_pin
      ORDER BY z.display_order ASC, t.table_number ASC
    `;
    const result = await db.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get zones with table counts and table shape breakdowns
const getZones = async (req, res) => {
  try {
    const query = `
      SELECT 
        z.*,
        COUNT(t.id) as table_count,
        COUNT(CASE WHEN t.status != 'available' THEN 1 END) as occupied_count,
        COUNT(CASE WHEN t.shape = 'rect' THEN 1 END) as rect_count,
        COUNT(CASE WHEN t.shape = 'round' THEN 1 END) as round_count,
        COUNT(CASE WHEN t.shape = 'booth' THEN 1 END) as booth_count,
        COUNT(CASE WHEN t.shape = 'bar' THEN 1 END) as bar_count
      FROM zones z
      LEFT JOIN restaurant_tables t ON z.id = t.zone_id
      GROUP BY z.id
      ORDER BY z.display_order ASC, z.id ASC
    `;
    const result = await db.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create new zone
const createZone = async (req, res, io) => {
  const { name, description, display_order } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO zones (name, description, display_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, description || '', display_order || 0]
    );
    if (io) io.emit('zone:created', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update zone
const updateZone = async (req, res, io) => {
  const { id } = req.params;
  const { name, description, display_order } = req.body;
  try {
    const result = await db.query(
      `UPDATE zones
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           display_order = COALESCE($3, display_order)
       WHERE id = $4
       RETURNING *`,
      [name, description, display_order, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }
    if (io) io.emit('zone:updated', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete zone
const deleteZone = async (req, res, io) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM zones WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }
    if (io) io.emit('zone:deleted', { id });
    res.json({ success: true, message: 'Zone deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update top-view table position and dimensions (from drag-and-drop floor plan designer)
const updateTableLayout = async (req, res, io) => {
  const { id } = req.params;
  const { x, y, width, height, rotation, shape } = req.body;
  try {
    const query = `
      UPDATE restaurant_tables 
      SET 
        x = COALESCE($1, x),
        y = COALESCE($2, y),
        width = COALESCE($3, width),
        height = COALESCE($4, height),
        rotation = COALESCE($5, rotation),
        shape = COALESCE($6, shape),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const result = await db.query(query, [x, y, width, height, rotation, shape, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    
    if (io) io.emit('table:layout_updated', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating table layout:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Batch update table layouts
const batchUpdateLayout = async (req, res, io) => {
  const { layouts } = req.body; // array of { id, x, y, width, height, rotation, shape }
  if (!Array.isArray(layouts)) {
    return res.status(400).json({ success: false, error: 'Invalid payload' });
  }
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of layouts) {
      await client.query(
        `UPDATE restaurant_tables 
         SET x = $1, y = $2, width = $3, height = $4, rotation = $5, shape = $6, updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [item.x, item.y, item.width, item.height, item.rotation || 0, item.shape, item.id]
      );
    }
    await client.query('COMMIT');
    
    if (io) io.emit('tables:batch_updated');
    res.json({ success: true, message: 'Floor plan layout saved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error batch updating layout:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Open a table
const openTable = async (req, res, io) => {
  const { id } = req.params;
  const { guest_count, notes, staff_id, staff_name } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check table
    const tableRes = await client.query('SELECT * FROM restaurant_tables WHERE id = $1 FOR UPDATE', [id]);
    if (tableRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const table = tableRes.rows[0];
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const sessionPin = Math.floor(1000 + Math.random() * 9000).toString();

    // Create new order with staff attribution and session PIN
    const orderRes = await client.query(
      `INSERT INTO orders (order_number, table_id, status, guest_count, notes, staff_id, staff_name, table_pin)
       VALUES ($1, $2, 'active', $3, $4, $5, $6, $7)
       RETURNING *`,
      [orderNumber, id, guest_count || 1, notes || null, staff_id || null, staff_name || null, sessionPin]
    );

    const newOrder = orderRes.rows[0];

    // Update table status with current_pin
    const updatedTableRes = await client.query(
      `UPDATE restaurant_tables
       SET status = 'occupied', guest_count = $1, current_order_id = $2, current_pin = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [guest_count || 1, newOrder.id, sessionPin, notes || null, id]
    );

    await client.query('COMMIT');

    const resultData = {
      table: updatedTableRes.rows[0],
      order: newOrder
    };

    if (io) io.emit('table:opened', resultData);
    res.json({ success: true, data: resultData });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error opening table:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Transfer order from one table to another
const transferTable = async (req, res, io) => {
  const { fromTableId, toTableId } = req.body;
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');
    const fromRes = await client.query('SELECT * FROM restaurant_tables WHERE id = $1', [fromTableId]);
    const toRes = await client.query('SELECT * FROM restaurant_tables WHERE id = $1', [toTableId]);

    if (!fromRes.rows[0] || !toRes.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'One or both tables not found' });
    }

    const fromTable = fromRes.rows[0];
    const toTable = toRes.rows[0];

    if (!fromTable.current_order_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Source table has no active order' });
    }

    if (toTable.status !== 'available' && toTable.id !== fromTable.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Destination table is already occupied' });
    }

    // Move order
    await client.query(
      'UPDATE orders SET table_id = $1 WHERE id = $2',
      [toTableId, fromTable.current_order_id]
    );

    // Update target table
    await client.query(
      `UPDATE restaurant_tables 
       SET status = $1, current_order_id = $2, guest_count = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [fromTable.status, fromTable.current_order_id, fromTable.guest_count, toTableId]
    );

    // Free source table
    await client.query(
      `UPDATE restaurant_tables 
       SET status = 'available', current_order_id = NULL, guest_count = 0, notes = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [fromTableId]
    );

    await client.query('COMMIT');

    if (io) io.emit('tables:transferred', { fromTableId, toTableId });
    res.json({ success: true, message: `Transferred successfully from ${fromTable.table_number} to ${toTable.table_number}` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error transferring table:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Add new table to a zone
const createTable = async (req, res, io) => {
  const { table_number, zone_id, shape, x, y, width, height, capacity } = req.body;
  try {
    // Default dimensions based on shape
    let defaultWidth = width || 100;
    let defaultHeight = height || 80;
    if (shape === 'round') {
      defaultWidth = width || 95;
      defaultHeight = height || 95;
    } else if (shape === 'booth') {
      defaultWidth = width || 130;
      defaultHeight = height || 90;
    } else if (shape === 'bar') {
      defaultWidth = width || 70;
      defaultHeight = height || 60;
    }

    const query = `
      INSERT INTO restaurant_tables (table_number, zone_id, shape, x, y, width, height, capacity, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'available')
      RETURNING *
    `;
    const result = await db.query(query, [
      table_number, 
      zone_id || 1, 
      shape || 'rect', 
      x || 60, 
      y || 60, 
      defaultWidth, 
      defaultHeight, 
      capacity || 4
    ]);
    
    if (io) io.emit('table:created', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete table
const deleteTable = async (req, res, io) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM restaurant_tables WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Table not found' });
    }
    if (io) io.emit('table:deleted', { id });
    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Cancel / Free an open table (when customer doesn't order or leaves)
const cancelTable = async (req, res, io) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const tableRes = await client.query('SELECT * FROM restaurant_tables WHERE id = $1 FOR UPDATE', [id]);
    if (tableRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const table = tableRes.rows[0];
    const orderId = table.current_order_id;

    if (orderId) {
      // Check order items
      const itemsRes = await client.query('SELECT COUNT(*) as count FROM order_items WHERE order_id = $1', [orderId]);
      const itemCount = parseInt(itemsRes.rows[0]?.count || 0, 10);

      if (itemCount === 0) {
        // If no items were ordered, cleanly remove the empty order record
        await client.query('DELETE FROM orders WHERE id = $1', [orderId]);
      } else {
        // If items were placed, mark order and items as cancelled
        await client.query(
          "UPDATE orders SET status = 'cancelled', notes = COALESCE(notes || ' | ยกเลิก: ' || $2, 'ยกเลิก: ' || $2), updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [orderId, reason || 'ลูกค้ายกเลิกโต๊ะ/ไม่สั่งอาหาร']
        );
        await client.query(
          "UPDATE order_items SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE order_id = $1",
          [orderId]
        );
        if (io) {
          io.emit('kitchen:order_cancelled', { orderId, tableId: id });
          io.emit('kitchen:item_status_changed', { orderId });
        }
      }
    }

    // Reset table status to 'available' and clear current_pin
    const updatedTableRes = await client.query(
      `UPDATE restaurant_tables
       SET status = 'available', current_order_id = NULL, current_pin = NULL, guest_count = 0, notes = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query('COMMIT');

    const freedTable = updatedTableRes.rows[0];
    if (io) {
      io.emit('table:freed', { tableId: id, table: freedTable });
      io.emit('order:updated', { tableId: id });
    }

    res.json({
      success: true,
      message: `ยกเลิกการเปิดโต๊ะ ${freedTable.table_number} และคืนสถานะโต๊ะว่างเรียบร้อยแล้ว`,
      data: freedTable
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error cancelling table:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getTables,
  getZones,
  createZone,
  updateZone,
  deleteZone,
  updateTableLayout,
  batchUpdateLayout,
  openTable,
  cancelTable,
  transferTable,
  createTable,
  deleteTable
};
