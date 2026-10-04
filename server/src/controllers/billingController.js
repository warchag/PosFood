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
       SET status = 'available', current_order_id = NULL, current_pin = NULL, current_reservation_id = NULL, guest_count = 0, notes = NULL, updated_at = CURRENT_TIMESTAMP 
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

// Sales Report & Analytics (Supports Daily, Monthly, Custom Range, and Staff Filter)
const getDailyReport = async (req, res) => {
  const { period = 'today', date, month, startDate, endDate, staff } = req.query;

  try {
    let whereClauses = ["o.status = 'completed'"];
    let params = [];
    let paramIndex = 1;
    let filterLabel = 'วันนี้';

    if (period === 'yesterday') {
      whereClauses.push("DATE(o.created_at) = CURRENT_DATE - INTERVAL '1 day'");
      filterLabel = 'เมื่อวานนี้';
    } else if (period === 'month') {
      const targetMonth = month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'
      whereClauses.push(`TO_CHAR(o.created_at, 'YYYY-MM') = $${paramIndex}`);
      params.push(targetMonth);
      paramIndex++;

      const [yr, mo] = targetMonth.split('-');
      const monthNames = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      filterLabel = `ประจำเดือน ${monthNames[parseInt(mo, 10)] || mo} ${parseInt(yr, 10) + 543} (${targetMonth})`;
    } else if (period === 'date' && date) {
      whereClauses.push(`DATE(o.created_at) = $${paramIndex}`);
      params.push(date);
      paramIndex++;
      filterLabel = `ประจำวันที่ ${date}`;
    } else if (period === 'range' && startDate && endDate) {
      whereClauses.push(`DATE(o.created_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
      params.push(startDate, endDate);
      paramIndex += 2;
      filterLabel = `ช่วงวันที่ ${startDate} ถึง ${endDate}`;
    } else if (period === 'all') {
      filterLabel = 'ยอดขายทั้งหมด';
    } else {
      // Default: today
      whereClauses.push("DATE(o.created_at) = CURRENT_DATE");
      filterLabel = `วันนี้ (${new Date().toLocaleDateString('th-TH', { dateStyle: 'medium' })})`;
    }

    // Staff filter (matches order creator or cashier)
    if (staff && staff !== 'all') {
      whereClauses.push(`(o.staff_name = $${paramIndex} OR p.cashier_name = $${paramIndex})`);
      params.push(staff);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Aggregate Summary (Revenue, Subtotal, Discount, Tax, Service Charge, Guests, Bills)
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT o.id) as total_bills,
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        COALESCE(SUM(o.subtotal), 0) as total_subtotal,
        COALESCE(SUM(o.discount_amount), 0) as total_discount,
        COALESCE(SUM(o.vat_amount), 0) as total_vat,
        COALESCE(SUM(o.service_charge_amount), 0) as total_service_charge,
        COALESCE(SUM(o.guest_count), 0) as total_guests
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      ${whereSql}
    `;
    const summaryRes = await db.query(summaryQuery, params);
    const summary = summaryRes.rows[0] || {};
    const totalRev = parseFloat(summary.total_revenue || 0);
    const totalBills = parseInt(summary.total_bills || 0, 10);
    summary.avg_bill = totalBills > 0 ? (totalRev / totalBills).toFixed(2) : '0.00';

    // 2. All Bills with Items Breakdown for Drill-down
    const billsQuery = `
      SELECT 
        o.id,
        o.order_number,
        o.table_id,
        t.table_number,
        z.name as zone_name,
        o.total_amount,
        o.subtotal,
        o.discount_type,
        o.discount_value,
        o.discount_amount,
        o.vat_rate,
        o.vat_amount,
        o.service_charge_rate,
        o.service_charge_amount,
        o.guest_count,
        to_char(o.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
        to_char(o.closed_at, 'YYYY-MM-DD HH24:MI:SS') as closed_at,
        COALESCE(o.staff_name, 'พนักงานทั่วไป') as staff_name,
        COALESCE(p.cashier_name, o.staff_name, 'แคชเชียร์') as cashier_name,
        COALESCE(p.payment_method, 'cash') as payment_method,
        COALESCE(p.amount_received, o.total_amount) as amount_received,
        COALESCE(p.change_amount, 0) as change_amount,
        p.transaction_ref,
        to_char(p.paid_at, 'YYYY-MM-DD HH24:MI:SS') as paid_at,
        COUNT(oi.id) as item_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'name', oi.item_name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'notes', oi.notes
            ) ORDER BY oi.id ASC
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM orders o
      JOIN restaurant_tables t ON o.table_id = t.id
      LEFT JOIN zones z ON t.zone_id = z.id
      LEFT JOIN payments p ON o.id = p.order_id
      LEFT JOIN order_items oi ON o.id = oi.order_id AND oi.status != 'cancelled'
      ${whereSql}
      GROUP BY o.id, t.table_number, z.name, p.id, p.cashier_name, p.payment_method, p.amount_received, p.change_amount, p.transaction_ref, p.paid_at
      ORDER BY o.closed_at DESC, o.id DESC
      LIMIT 500
    `;
    const billsRes = await db.query(billsQuery, params);

    // 3. Payment Methods Breakdown
    const paymentBreakdownQuery = `
      SELECT 
        COALESCE(p.payment_method, 'cash') as payment_method,
        COUNT(p.id) as transaction_count,
        COALESCE(SUM(p.total_billed), 0) as amount
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      ${whereSql}
      GROUP BY p.payment_method
      ORDER BY amount DESC
    `;
    const paymentBreakdownRes = await db.query(paymentBreakdownQuery, params);

    // 4. Top Selling Dishes in this Period
    const topDishesQuery = `
      SELECT 
        oi.item_name,
        SUM(oi.quantity) as quantity_sold,
        SUM(oi.total_price) as total_sales
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN payments p ON o.id = p.order_id
      ${whereSql} AND oi.status != 'cancelled'
      GROUP BY oi.item_name
      ORDER BY quantity_sold DESC, total_sales DESC
      LIMIT 8
    `;
    const topDishesRes = await db.query(topDishesQuery, params);

    // 5. Staff Sales Breakdown
    const staffSalesQuery = `
      SELECT 
        COALESCE(o.staff_name, p.cashier_name, 'พนักงานทั่วไป') as staff_name,
        COUNT(DISTINCT o.id) as bills_count,
        COALESCE(SUM(o.total_amount), 0) as total_sales
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      ${whereSql}
      GROUP BY COALESCE(o.staff_name, p.cashier_name, 'พนักงานทั่วไป')
      ORDER BY total_sales DESC
    `;
    const staffSalesRes = await db.query(staffSalesQuery, params);

    // 6. Daily Sales Trend (Group by day for charts)
    const dailyTrendQuery = `
      SELECT 
        to_char(o.closed_at, 'YYYY-MM-DD') as day,
        to_char(o.closed_at, 'DD/MM') as day_label,
        COUNT(DISTINCT o.id) as bills_count,
        COALESCE(SUM(o.total_amount), 0) as total_amount
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      ${whereSql}
      GROUP BY to_char(o.closed_at, 'YYYY-MM-DD'), to_char(o.closed_at, 'DD/MM')
      ORDER BY day ASC
    `;
    const dailyTrendRes = await db.query(dailyTrendQuery, params);

    // 7. Store Settings for PDF / Official Header
    const settingsRes = await db.query('SELECT setting_key, setting_value FROM restaurant_settings');
    const storeInfo = {};
    settingsRes.rows.forEach(r => {
      storeInfo[r.setting_key] = r.setting_value;
    });

    res.json({
      success: true,
      data: {
        filterInfo: {
          period,
          date: date || new Date().toISOString().slice(0, 10),
          month: month || new Date().toISOString().slice(0, 7),
          startDate,
          endDate,
          staff: staff || 'all',
          label: filterLabel
        },
        summary,
        bills: billsRes.rows,
        recentBills: billsRes.rows.slice(0, 15), // Backwards compatibility
        dailyTrend: dailyTrendRes.rows,
        paymentBreakdown: paymentBreakdownRes.rows,
        topDishes: topDishesRes.rows,
        staffSales: staffSalesRes.rows,
        storeInfo
      }
    });
  } catch (err) {
    console.error('Error fetching sales report:', err);
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
