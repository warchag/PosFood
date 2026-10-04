const db = require('../config/db');

// Get categories
const getCategories = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, COUNT(m.id) as item_count
       FROM categories c
       LEFT JOIN menu_items m ON c.id = m.category_id
       GROUP BY c.id
       ORDER BY c.display_order ASC, c.id ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create category
const createCategory = async (req, res, io) => {
  const { name, icon, display_order } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO categories (name, icon, display_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, icon || 'Utensils', display_order || 0]
    );
    if (io) io.emit('category:created', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update category
const updateCategory = async (req, res, io) => {
  const { id } = req.params;
  const { name, icon, display_order } = req.body;
  try {
    const result = await db.query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           icon = COALESCE($2, icon),
           display_order = COALESCE($3, display_order)
       WHERE id = $4
       RETURNING *`,
      [name, icon, display_order, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    if (io) io.emit('category:updated', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete category
const deleteCategory = async (req, res, io) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    if (io) io.emit('category:deleted', { id });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get menu items with category filtering
const getMenuItems = async (req, res) => {
  const { category_id, search, available_only } = req.query;
  try {
    let query = `
      SELECT m.*, c.name as category_name
      FROM menu_items m
      JOIN categories c ON m.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id && category_id !== 'all') {
      params.push(category_id);
      query += ` AND m.category_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (m.name ILIKE $${params.length} OR m.description ILIKE $${params.length})`;
    }

    if (available_only === 'true') {
      query += ` AND m.is_available = TRUE`;
    }

    query += ` ORDER BY m.is_recommended DESC, m.category_id ASC, m.id ASC`;

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Toggle dish availability (In Stock / Out of Stock)
const toggleAvailability = async (req, res, io) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `UPDATE menu_items 
       SET is_available = NOT is_available 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    if (io) io.emit('menu:updated', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create new menu item
const createMenuItem = async (req, res, io) => {
  const { category_id, name, description, price, cost_price, image_url, is_recommended, prep_time_minutes } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO menu_items (category_id, name, description, price, cost_price, image_url, is_recommended, prep_time_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [category_id, name, description || '', price, cost_price || 0, image_url || '', is_recommended || false, prep_time_minutes || 15]
    );
    if (io) io.emit('menu:created', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update menu item
const updateMenuItem = async (req, res, io) => {
  const { id } = req.params;
  const { category_id, name, description, price, cost_price, image_url, is_recommended, is_available, prep_time_minutes } = req.body;
  try {
    const result = await db.query(
      `UPDATE menu_items
       SET category_id = COALESCE($1, category_id),
           name = COALESCE($2, name),
           description = COALESCE($3, description),
           price = COALESCE($4, price),
           cost_price = COALESCE($5, cost_price),
           image_url = COALESCE($6, image_url),
           is_recommended = COALESCE($7, is_recommended),
           is_available = COALESCE($8, is_available),
           prep_time_minutes = COALESCE($9, prep_time_minutes)
       WHERE id = $10
       RETURNING *`,
      [category_id, name, description, price, cost_price, image_url, is_recommended, is_available, prep_time_minutes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    if (io) io.emit('menu:updated', result.rows[0]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete menu item
const deleteMenuItem = async (req, res, io) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    if (io) io.emit('menu:deleted', { id });
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  toggleAvailability,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
};
