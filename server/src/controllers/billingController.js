const db = require('../config/db');
const { recalculateOrder } = require('./ordersController');

// Mark table as billing requested
const requestBill = async (req, res, io) => {
  const { tableId } = req.body;
  try {
    const result = await db.query(
      `UPDATE restaurant_tables 
       SET status = 'billing', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [tableId]
    );
    if (io) io.emit('table:status_changed', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update discounts, service charge, or tax before payment
const updateBillSettings = async (req, res) => {
  const { orderId } = req.params;
  const { discount_type, discount_value, service_charge_rate, vat_rate } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE orders 
       SET 
         discount_type = COALESCE($1, discount_type),
         discount_value = COALESCE($2, discount_value),
         service_charge_rate = COALESCE($3, service_charge_rate),
         vat_rate = COALESCE($4, vat_rate),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [discount_type, discount_value, service_charge_rate, vat_rate, orderId]
    );

    const updated = await recalculateOrder(client, orderId);
    await client.query('COMMIT');

    res.json({ success: true, data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Process Checkout & Payment
const processPayment = async (req, res, io) => {
  const { 
    order_id, 
    payment_method, // 'cash', 'promptpay', 'credit_card'
    amount_received, 
    change_amount, 
    transaction_ref,
    cashier_id,
    cashier_name 
  } = req.body;

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get order
    const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [order_id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const order = orderRes.rows[0];
    const totalBilled = parseFloat(order.total_amount);

    // 2. Insert payment with cashier attribution
    const paymentRes = await client.query(
      `INSERT INTO payments 
       (order_id, payment_method, total_billed, amount_received, change_amount, transaction_ref, payment_status, cashier_id, cashier_name)
       VALUES ($1, $2, $3, $4, $5, $6, 'success', $7, $8)
       RETURNING *`,
      [
        order_id,
        payment_method,
        totalBilled,
        amount_received || totalBilled,
        change_amount || 0.00,
        transaction_ref || `REF-${Date.now()}`,
        cashier_id || null,
        cashier_name || null
      ]
    );

    const payment = paymentRes.rows[0];

    // 3. Mark order as completed
    await client.query(
      `UPDATE orders 
       SET status = 'completed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [order_id]
    );

    // 4. Reset table status to available
    const tableRes = await client.query(
      `UPDATE restaurant_tables 
       SET status = 'available', current_order_id = NULL, guest_count = 0, notes = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      [order.table_id]
    );

    await client.query('COMMIT');

    // Notify all connected clients via websocket
    if (io) {
      io.emit('table:freed', tableRes.rows[0]);
      io.emit('payment:completed', { order_id, table_id: order.table_id, payment });
    }

    res.json({
      success: true,
      message: 'Payment completed successfully',
      data: {
        payment,
        order,
        table: tableRes.rows[0]
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// Get Receipt Data for thermal printing or digital view
const getReceipt = async (req, res) => {
  const { orderId } = req.params;
  try {
    const orderRes = await db.query(
      `SELECT o.*, t.table_number, z.name as zone_name
       FROM orders o
       JOIN restaurant_tables t ON o.table_id = t.id
       LEFT JOIN zones z ON t.zone_id = z.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const itemsRes = await db.query(
      `SELECT * FROM order_items WHERE order_id = $1 AND status != 'cancelled'`,
      [orderId]
    );

    const paymentRes = await db.query(
      `SELECT * FROM payments WHERE order_id = $1 ORDER BY paid_at DESC LIMIT 1`,
      [orderId]
    );

    const settingsRes = await db.query('SELECT setting_key, setting_value FROM restaurant_settings');
    const settings = {};
    settingsRes.rows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    res.json({
      success: true,
      data: {
        order: orderRes.rows[0],
        items: itemsRes.rows,
        payment: paymentRes.rows[0] || null,
        storeInfo: settings
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Daily Sales Report & Analytics
const getDailyReport = async (req, res) => {
  try {
    // 1. Today's summary
    const summaryRes = await db.query(`
      SELECT 
        COUNT(id) as total_bills,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(vat_amount), 0) as total_vat,
        COALESCE(SUM(service_charge_amount), 0) as total_service_charge,
        COALESCE(SUM(guest_count), 0) as total_guests
      FROM orders
      WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE
    `);

    // 2. Payment methods breakdown
    const paymentBreakdownRes = await db.query(`
      SELECT 
        payment_method,
        COUNT(id) as transaction_count,
        COALESCE(SUM(total_billed), 0) as amount
      FROM payments
      WHERE DATE(paid_at) = CURRENT_DATE
      GROUP BY payment_method
    `);

    // 3. Top selling dishes today
    const topDishesRes = await db.query(`
      SELECT 
        oi.item_name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total_price) as total_sales
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'completed' AND DATE(o.created_at) = CURRENT_DATE
      GROUP BY oi.item_name
      ORDER BY quantity_sold DESC
      LIMIT 6
    `);

    // 4. Recent completed orders
    const recentBillsRes = await db.query(`
      SELECT 
        o.id,
        o.order_number,
        t.table_number,
        o.total_amount,
        o.closed_at,
        o.staff_name,
        p.payment_method,
        p.cashier_name
      FROM orders o
      JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.status = 'completed'
      ORDER BY o.closed_at DESC
      LIMIT 10
    `);

    // 5. Staff sales performance breakdown
    const staffSalesRes = await db.query(`
      SELECT 
        COALESCE(o.staff_name, 'พนักงานทั่วไป') as staff_name,
        COUNT(o.id) as bills_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM orders o
      WHERE o.status = 'completed' AND DATE(o.created_at) = CURRENT_DATE
      GROUP BY o.staff_name
      ORDER BY total_sales DESC
    `);

    res.json({
      success: true,
      data: {
        summary: summaryRes.rows[0],
        paymentBreakdown: paymentBreakdownRes.rows,
        topDishes: topDishesRes.rows,
        recentBills: recentBillsRes.rows,
        staffSales: staffSalesRes.rows
      }
    });
  } catch (err) {
    console.error('Error fetching report:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  requestBill,
  updateBillSettings,
  processPayment,
  getReceipt,
  getDailyReport
};
