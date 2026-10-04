const db = require('../config/db');

// Get all restaurant & receipt settings
const getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT setting_key, setting_value FROM restaurant_settings');
    const settings = {
      restaurant_name: 'Siam Culinary & Bistro',
      receipt_header_title: 'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ (ABB)',
      branch_name: 'สำนักงานใหญ่ (Head Office)',
      restaurant_address: '88/1 ถ.สุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กทม. 10110',
      restaurant_phone: '02-765-4321',
      tax_id: '0105563089123',
      receipt_footer: 'ขอบคุณที่ใช้บริการ / Thank you & Please come again',
      vat_rate: '7',
      service_charge_rate: '10',
      currency_symbol: '฿',
      promptpay_id: '0891234567'
    };

    result.rows.forEach(r => {
      settings[r.setting_key] = r.setting_value;
    });

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update restaurant & receipt settings
const updateSettings = async (req, res, io) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings payload' });
    }

    // Upsert each setting key-value pair
    for (const [key, value] of Object.entries(updates)) {
      const valStr = value !== null && value !== undefined ? String(value) : '';
      await db.query(`
        INSERT INTO restaurant_settings (setting_key, setting_value)
        VALUES ($1, $2)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = EXCLUDED.setting_value
      `, [key, valStr]);
    }

    // Fetch the updated full settings
    const result = await db.query('SELECT setting_key, setting_value FROM restaurant_settings');
    const settings = {};
    result.rows.forEach(r => {
      settings[r.setting_key] = r.setting_value;
    });

    if (io) {
      io.emit('settings:updated', settings);
    }

    res.json({ success: true, data: settings, message: 'บันทึกการตั้งค่าร้านค้าและใบเสร็จเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
