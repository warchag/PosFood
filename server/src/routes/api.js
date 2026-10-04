const express = require('express');
const router = express.Router();

const tablesController = require('../controllers/tablesController');
const menuController = require('../controllers/menuController');
const ordersController = require('../controllers/ordersController');
const billingController = require('../controllers/billingController');
const settingsController = require('../controllers/settingsController');
const authController = require('../controllers/authController');
const db = require('../config/db');

module.exports = (io) => {
  // --- Auth & Staff Management Routes ---
  router.get('/staff', authController.getStaffList);
  router.post('/auth/login-pin', (req, res) => authController.loginWithPin(req, res, io));
  router.post('/staff', (req, res) => authController.createStaff(req, res, io));
  router.put('/staff/:id', (req, res) => authController.updateStaff(req, res, io));
  router.delete('/staff/:id', (req, res) => authController.deleteStaff(req, res, io));

  // --- Tables Routes ---
  router.get('/tables', tablesController.getTables);
  router.post('/tables', (req, res) => tablesController.createTable(req, res, io));
  router.delete('/tables/:id', (req, res) => tablesController.deleteTable(req, res, io));
  router.put('/tables/:id/layout', (req, res) => tablesController.updateTableLayout(req, res, io));
  router.put('/tables/batch-layout', (req, res) => tablesController.batchUpdateLayout(req, res, io));
  router.post('/tables/:id/open', (req, res) => tablesController.openTable(req, res, io));
  router.post('/tables/:id/cancel', (req, res) => tablesController.cancelTable(req, res, io));
  router.post('/tables/transfer', (req, res) => tablesController.transferTable(req, res, io));

  // --- Zones Routes ---
  router.get('/zones', tablesController.getZones);
  router.post('/zones', (req, res) => tablesController.createZone(req, res, io));
  router.put('/zones/:id', (req, res) => tablesController.updateZone(req, res, io));
  router.delete('/zones/:id', (req, res) => tablesController.deleteZone(req, res, io));

  // --- Categories Routes ---
  router.get('/categories', menuController.getCategories);
  router.post('/categories', (req, res) => menuController.createCategory(req, res, io));
  router.put('/categories/:id', (req, res) => menuController.updateCategory(req, res, io));
  router.delete('/categories/:id', (req, res) => menuController.deleteCategory(req, res, io));

  // --- Menu Items Routes ---
  router.get('/menu-items', menuController.getMenuItems);
  router.post('/menu-items', (req, res) => menuController.createMenuItem(req, res, io));
  router.put('/menu-items/:id', (req, res) => menuController.updateMenuItem(req, res, io));
  router.delete('/menu-items/:id', (req, res) => menuController.deleteMenuItem(req, res, io));
  router.patch('/menu-items/:id/toggle', (req, res) => menuController.toggleAvailability(req, res, io));

  // --- Orders Routes ---
  router.get('/orders/:id', ordersController.getOrder);
  router.post('/orders/items', (req, res) => ordersController.addItems(req, res, io));
  router.patch('/order-items/:itemId/status', (req, res) => ordersController.updateItemStatus(req, res, io));
  router.get('/kitchen/queue', ordersController.getKitchenQueue);

  // --- Customer Mobile QR Ordering Routes ---
  router.post('/customer/order', (req, res) => ordersController.customerOrder(req, res, io));
  router.get('/customer/order-status/:tableIdentifier', ordersController.getCustomerOrderStatus);
  router.post('/customer/call-staff', (req, res) => ordersController.customerCallStaff(req, res, io));

  // --- Billing & Checkout Routes ---
  router.post('/billing/request', (req, res) => billingController.requestBill(req, res, io));
  router.put('/billing/settings/:orderId', billingController.updateBillSettings);
  router.post('/billing/pay', (req, res) => billingController.processPayment(req, res, io));
  router.get('/billing/receipt/:orderId', billingController.getReceipt);
  router.get('/reports/daily', billingController.getDailyReport);

  // --- Restaurant & Receipt Settings Routes ---
  router.get('/settings', settingsController.getSettings);
  router.put('/settings', (req, res) => settingsController.updateSettings(req, res, io));

  // --- Real-time System & Database Status Route ---
  router.get('/system/status', async (req, res) => {
    const startTime = Date.now();
    try {
      const dbRes = await db.query(
        'SELECT inet_server_addr() AS server_ip, inet_server_port() AS server_port, version() AS version, current_database() AS db_name, now() AS db_time'
      );
      const latency = Date.now() - startTime;
      const row = dbRes.rows[0] || {};
      
      const serverPort = parseInt(process.env.PORT || '5001', 10);
      const dbPort = parseInt(process.env.PGPORT || '5432', 10);
      const dbHost = process.env.PGHOST || '127.0.0.1';
      const dbIp = row.server_ip ? String(row.server_ip) : (dbHost === 'localhost' ? '127.0.0.1' : dbHost);
      const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

      res.json({
        success: true,
        status: 'online',
        database: {
          connected: true,
          type: 'PostgreSQL',
          version: 'PostgreSQL 16',
          host: dbHost,
          ip: dbIp,
          port: dbPort,
          database: row.db_name || process.env.PGDATABASE || 'restaurant_pos',
          user: process.env.PGUSER || 'worracag',
          latency_ms: latency,
          pool: {
            total: db.pool.totalCount,
            idle: db.pool.idleCount,
            waiting: db.pool.waitingCount
          }
        },
        server: {
          status: 'online',
          port: serverPort,
          host: '127.0.0.1',
          uptime_seconds: Math.floor(process.uptime()),
          node_version: process.version,
          client_ip: clientIp.replace('::ffff:', '')
        },
        websocket: {
          status: io ? 'connected' : 'disconnected',
          client_count: io ? io.engine?.clientsCount || 0 : 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      const latency = Date.now() - startTime;
      const serverPort = parseInt(process.env.PORT || '5001', 10);
      const dbPort = parseInt(process.env.PGPORT || '5432', 10);
      const dbHost = process.env.PGHOST || '127.0.0.1';

      res.status(500).json({
        success: false,
        status: 'degraded',
        database: {
          connected: false,
          error: err.message,
          host: dbHost,
          ip: dbHost === 'localhost' ? '127.0.0.1' : dbHost,
          port: dbPort,
          database: process.env.PGDATABASE || 'restaurant_pos',
          latency_ms: latency
        },
        server: {
          status: 'online',
          port: serverPort,
          host: '127.0.0.1',
          uptime_seconds: Math.floor(process.uptime())
        },
        websocket: {
          status: io ? 'connected' : 'disconnected'
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
};
