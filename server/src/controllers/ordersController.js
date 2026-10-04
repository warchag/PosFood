const db = require('../config/db');

// Helper to recalculate order totals
const recalculateOrder = async (client, orderId) => {
  // Sum items
  const itemsRes = await client.query(
    `SELECT COALESCE(SUM(total_price), 0) as subtotal 
     FROM order_items 
     WHERE order_id = $1 AND status != 'cancelled'`,
    [orderId]
  );
  const subtotal = parseFloat(itemsRes.rows[0].subtotal);

  // Get current order rates
  const orderRes = await client.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (orderRes.rows.length === 0) return null;
  const order = orderRes.rows[0];

  let discountAmount = 0;
  if (order.discount_type === 'percentage') {
    discountAmount = (subtotal * parseFloat(order.discount_value || 0)) / 100;
  } else if (order.discount_type === 'fixed') {
    discountAmount = Math.min(parseFloat(order.discount_value || 0), subtotal);
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const serviceChargeRate = parseFloat(order.service_charge_rate || 0);
  const serviceChargeAmount = (afterDiscount * serviceChargeRate) / 100;

  const vatRate = parseFloat(order.vat_rate || 7.00);
  const vatAmount = ((afterDiscount + serviceChargeAmount) * vatRate) / 100;

  const totalAmount = afterDiscount + serviceChargeAmount + vatAmount;

  const updatedRes = await client.query(
    `UPDATE orders 
     SET subtotal = $1, 
         discount_amount = $2, 
         service_charge_amount = $3, 
         vat_amount = $4, 
         total_amount = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING *`,
    [subtotal, discountAmount, serviceChargeAmount, vatAmount, totalAmount, orderId]
  );

  return updatedRes.rows[0];
};

// Get order details by table or order ID
const getOrder = async (req, res) => {
  const { id } = req.params; // order id or table id via query
  const { byTable } = req.query;

  try {
    let orderQuery = `
      SELECT o.*, t.table_number, t.shape, z.name as zone_name
      FROM orders o
      JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN zones z ON t.zone_id = z.id
      WHERE 
    `;

    if (byTable === 'true') {
      orderQuery += ` t.id = $1 AND o.status = 'active'`;
    } else {
      orderQuery += ` o.id = $1`;
    }

    const orderRes = await db.query(orderQuery, [id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Active order not found' });
    }

    const order = orderRes.rows[0];

    // Get order items
    const itemsRes = await db.query(
      `SELECT oi.*, m.image_url, m.prep_time_minutes
       FROM order_items oi
       LEFT JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [order.id]
    );

    res.json({
      success: true,
      data: {
        ...order,
        items: itemsRes.rows,
      }
    });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add items to an order (or open table + order together)
const addItems = async (req, res, io) => {
  const { table_id, items, guest_count, notes } = req.body;
  // items: [ { menu_item_id, item_name, unit_price, quantity, notes } ]

  if (!items || items.length === 0) {
    return res.status(400).json({ success: false, error: 'No items provided' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get or create table & order
    const tableRes = await client.query('SELECT * FROM restaurant_tables WHERE id = $1 FOR UPDATE', [table_id]);
    if (tableRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Table not found' });
    }

    const table = tableRes.rows[0];
    let orderId = table.current_order_id;

    if (!orderId || table.status === 'available') {
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      const orderRes = await client.query(
        `INSERT INTO orders (order_number, table_id, status, guest_count, notes, vat_rate, service_charge_rate)
         VALUES ($1, $2, 'active', $3, $4, 7.00, 0.00)
         RETURNING id`,
        [orderNumber, table_id, guest_count || 1, notes || null]
      );
      orderId = orderRes.rows[0].id;
    }

    // 2. Insert items
    for (const item of items) {
      const totalPrice = parseFloat(item.unit_price) * parseInt(item.quantity || 1, 10);
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, item_name, unit_price, quantity, total_price, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [orderId, item.menu_item_id, item.item_name, item.unit_price, item.quantity, totalPrice, item.notes || '']
      );
    }

    // 3. Recalculate
    const updatedOrder = await recalculateOrder(client, orderId);

    // 4. Update table status to 'ordered'
    await client.query(
      `UPDATE restaurant_tables 
       SET status = 'ordered', current_order_id = $1, guest_count = COALESCE($2, guest_count), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [orderId, guest_count || table.guest_count || 1, table_id]
    );

    await client.query('COMMIT');

    // Emit live events
    if (io) {
      io.emit('order:updated', { table_id, order_id: orderId });
      io.emit('kitchen:new_order', { table_number: table.table_number, items });
    }

    res.json({
      success: true,
      message: 'Items added successfully',
      data: updatedOrder
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding items to order:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Update order item status (e.g. from Kitchen Display: pending -> cooking -> served)
const updateItemStatus = async (req, res, io) => {
  const { itemId } = req.params;
  const { status } = req.body; // 'pending', 'cooking', 'served', 'cancelled'

  try {
    const result = await db.query(
      `UPDATE order_items 
       SET status = $1 
       WHERE id = $2 
       RETURNING *`,
      [status, itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order item not found' });
    }

    const updatedItem = result.rows[0];

    // If cancelled, recalculate order totals
    if (status === 'cancelled') {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        await recalculateOrder(client, updatedItem.order_id);
        await client.query('COMMIT');
      } finally {
        client.release();
      }
    }

    if (io) {
      io.emit('kitchen:item_status_changed', updatedItem);
      io.emit('order:updated', { order_id: updatedItem.order_id });
    }

    res.json({ success: true, data: updatedItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Kitchen Display query: get all pending & cooking items across all tables
const getKitchenQueue = async (req, res) => {
  try {
    const query = `
      SELECT 
        oi.id,
        oi.order_id,
        oi.item_name,
        oi.quantity,
        oi.notes,
        oi.status,
        oi.created_at,
        t.table_number,
        z.name as zone_name,
        o.order_number
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN zones z ON t.zone_id = z.id
      WHERE o.status = 'active' AND oi.status IN ('pending', 'cooking')
      ORDER BY oi.created_at ASC
    `;
    const result = await db.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getOrder,
  addItems,
  updateItemStatus,
  getKitchenQueue,
  recalculateOrder
};
