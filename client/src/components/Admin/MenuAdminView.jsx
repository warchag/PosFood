import React, { useState } from 'react';
import { usePos } from '../../context/PosContext';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Flame, 
  Clock, 
  Check, 
  X, 
  ImageIcon, 
  Sparkles, 
  Layers, 
  Utensils, 
  DollarSign, 
  ToggleLeft, 
  ToggleRight,
  AlertCircle,
  Receipt,
  Users
} from 'lucide-react';
import { ReceiptSettingsView } from './ReceiptSettingsView';
import { StaffAdminView } from './StaffAdminView';

// Curated high quality presets for delicious food & drink images
const IMAGE_PRESETS = [
  { name: 'ปลากะพงทอดน้ำปลา', url: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=600&auto=format&fit=crop&q=80' },
  { name: 'กุ้งเผาซีฟู้ด', url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&auto=format&fit=crop&q=80' },
  { name: 'สเต๊กเนื้อวากิว / ย่าง', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80' },
  { name: 'ต้มยำกุ้งแม่น้ำ', url: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=600&auto=format&fit=crop&q=80' },
  { name: 'แกงส้ม / ต้มยำ', url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80' },
  { name: 'ผัดไทยกุ้งสด', url: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=600&auto=format&fit=crop&q=80' },
  { name: 'ข้าวผัดปู / กรรเชียงปู', url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80' },
  { name: 'ส้มตำไทย / ยำรวมมิตร', url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80' },
  { name: 'ทอดมันกุ้ง / ของทอด', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80' },
  { name: 'ไก่ทอดกรอบซอสหวาน', url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80' },
  { name: 'สลัดแซลมอน / เฮลตี้', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80' },
  { name: 'ชาไทยเย็นทรงเครื่อง', url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80' },
  { name: 'น้ำผลไม้ปั่น / อิตาเลียนโซดา', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80' },
  { name: 'ข้าวเหนียวมะม่วงกะทิสด', url: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80' },
  { name: 'ไอศกรีมกะทิ / บัวลอย', url: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600&auto=format&fit=crop&q=80' }
];

export const MenuAdminView = () => {
  const { 
    categories, 
    menuItems, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    createMenuItem, 
    updateMenuItem, 
    deleteMenuItem, 
    toggleAvailability 
  } = usePos();

  const [activeAdminTab, setActiveAdminTab] = useState('items'); // 'items' or 'categories'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Modal states
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // null for create
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Form states for Item
  const [itemName, setItemName] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCostPrice, setItemCostPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemImageUrl, setItemImageUrl] = useState('');
  const [itemIsRecommended, setItemIsRecommended] = useState(false);
  const [itemPrepTime, setItemPrepTime] = useState(15);
  const [savingItem, setSavingItem] = useState(false);

  // Form states for Category
  const [catName, setCatName] = useState('');
  const [catDisplayOrder, setCatDisplayOrder] = useState(0);
  const [savingCat, setSavingCat] = useState(false);

  // Open Create Item
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategoryId(categories[0]?.id || 1);
    setItemPrice('');
    setItemCostPrice('');
    setItemDescription('');
    setItemImageUrl(IMAGE_PRESETS[0].url);
    setItemIsRecommended(false);
    setItemPrepTime(15);
    setItemModalOpen(true);
  };

  // Open Edit Item
  const handleOpenEditItem = (dish) => {
    setEditingItem(dish);
    setItemName(dish.name);
    setItemCategoryId(dish.category_id);
    setItemPrice(dish.price);
    setItemCostPrice(dish.cost_price || 0);
    setItemDescription(dish.description || '');
    setItemImageUrl(dish.image_url || '');
    setItemIsRecommended(dish.is_recommended);
    setItemPrepTime(dish.prep_time_minutes || 15);
    setItemModalOpen(true);
  };

  // Submit Item
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemName || !itemPrice || !itemCategoryId) return;
    setSavingItem(true);

    const payload = {
      category_id: parseInt(itemCategoryId, 10),
      name: itemName,
      description: itemDescription,
      price: parseFloat(itemPrice),
      cost_price: parseFloat(itemCostPrice || 0),
      image_url: itemImageUrl,
      is_recommended: itemIsRecommended,
      prep_time_minutes: parseInt(itemPrepTime || 15, 10)
    };

    if (editingItem) {
      await updateMenuItem(editingItem.id, payload);
    } else {
      await createMenuItem(payload);
    }

    setSavingItem(false);
    setItemModalOpen(false);
  };

  // Delete Item
  const handleDeleteItem = async (dish) => {
    if (window.confirm(`ยืนยันการลบเมนู "${dish.name}" หรือไม่?`)) {
      await deleteMenuItem(dish.id);
    }
  };

  // Open Create Category
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDisplayOrder(categories.length + 1);
    setCategoryModalOpen(true);
  };

  // Open Edit Category
  const handleOpenEditCategory = (cat) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDisplayOrder(cat.display_order || 0);
    setCategoryModalOpen(true);
  };

  // Submit Category
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName) return;
    setSavingCat(true);

    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name: catName,
        display_order: parseInt(catDisplayOrder || 0, 10)
      });
    } else {
      await createCategory({
        name: catName,
        display_order: parseInt(catDisplayOrder || 0, 10)
      });
    }

    setSavingCat(false);
    setCategoryModalOpen(false);
  };

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    if (window.confirm(`ยืนยันการลบหมวดหมู่ "${cat.name}" หรือไม่? เมนูในหมวดนี้จะได้รับผลกระทบ`)) {
      await deleteCategory(cat.id);
    }
  };

  // Filter items
  const filteredDishes = menuItems.filter(item => {
    const matchesCat = selectedCategoryFilter === 'all' || item.category_id === parseInt(selectedCategoryFilter, 10);
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ flex: 1, padding: '1.75rem', overflowY: 'auto' }}>
      {/* Header & Sub-Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
            จัดการเมนู & หมวดหมู่อาหาร (Menu Management)
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            เพิ่ม ลบ แก้ไข เมนูและหมวดหมู่อาหาร บันทึกลง PostgreSQL แบบ Real-time
          </p>
        </div>

        {/* Sub-tab navigation (NVIDIA Angular Tabs) */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--bg-surface-secondary)',
          padding: '3px',
          borderRadius: 'var(--rounded-sm)',
          border: '1px solid var(--border-subtle)',
          gap: '3px'
        }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.45rem 1.15rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: 'var(--rounded-sm)',
              border: activeAdminTab === 'items' ? '1px solid var(--nv-primary)' : '1px solid transparent',
              background: activeAdminTab === 'items' ? 'var(--nv-primary)' : 'transparent',
              color: activeAdminTab === 'items' ? '#000000' : 'var(--text-secondary)'
            }}
            onClick={() => setActiveAdminTab('items')}
          >
            <Utensils size={15} /> เมนูอาหาร ({menuItems.length})
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.45rem 1.15rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: 'var(--rounded-sm)',
              border: activeAdminTab === 'categories' ? '1px solid var(--nv-primary)' : '1px solid transparent',
              background: activeAdminTab === 'categories' ? 'var(--nv-primary)' : 'transparent',
              color: activeAdminTab === 'categories' ? '#000000' : 'var(--text-secondary)'
            }}
            onClick={() => setActiveAdminTab('categories')}
          >
            <Layers size={15} /> หมวดหมู่อาหาร ({categories.length})
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.45rem 1.15rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: 'var(--rounded-sm)',
              border: activeAdminTab === 'settings' ? '1px solid var(--nv-primary)' : '1px solid transparent',
              background: activeAdminTab === 'settings' ? 'var(--nv-primary)' : 'transparent',
              color: activeAdminTab === 'settings' ? '#000000' : 'var(--text-secondary)'
            }}
            onClick={() => setActiveAdminTab('settings')}
          >
            <Receipt size={15} /> ตั้งค่าร้านค้า & ใบเสร็จ
          </button>
          <button
            type="button"
            className="btn"
            style={{
              padding: '0.45rem 1.15rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              borderRadius: 'var(--rounded-sm)',
              border: activeAdminTab === 'staff' ? '1px solid var(--nv-primary)' : '1px solid transparent',
              background: activeAdminTab === 'staff' ? 'var(--nv-primary)' : 'transparent',
              color: activeAdminTab === 'staff' ? '#000000' : 'var(--text-secondary)'
            }}
            onClick={() => setActiveAdminTab('staff')}
          >
            <Users size={15} /> พนักงาน & สิทธิ์ (Staff)
          </button>
        </div>
      </div>

      {/* ================= TAB 1: MENU ITEMS ================= */}
      {activeAdminTab === 'items' && (
        <div>
          {/* Controls: Search, Category Filter, and Add Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
              <div className="search-input-wrapper" style={{ maxWidth: '320px', flex: 1 }}>
                <Search size={16} className="search-icon-pos" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเมนู..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '0.65rem 1rem 0.65rem 2.5rem',
                    fontSize: '0.88rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-pill)',
                    color: 'var(--text-main)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                />
              </div>

              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                style={{
                  padding: '0.65rem 1.1rem',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontFamily: 'inherit',
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <option value="all">ทุกหมวดหมู่ ({menuItems.length})</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary" onClick={handleOpenCreateItem} style={{ boxShadow: 'var(--shadow-sm)' }}>
              <Plus size={16} /> เพิ่มเมนูอาหารใหม่
            </button>
          </div>

          {/* Dishes Table */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', width: '70px', fontWeight: 600 }}>รูปภาพ</th>
                  <th style={{ fontWeight: 600 }}>ชื่อเมนู</th>
                  <th style={{ fontWeight: 600 }}>หมวดหมู่</th>
                  <th style={{ textAlign: 'right', fontWeight: 600 }}>ราคาขาย</th>
                  <th style={{ textAlign: 'right', fontWeight: 600 }}>ต้นทุน</th>
                  <th style={{ textAlign: 'center', fontWeight: 600 }}>เวลาปรุง</th>
                  <th style={{ textAlign: 'center', fontWeight: 600 }}>สถานะของ</th>
                  <th style={{ textAlign: 'center', width: '110px', fontWeight: 600 }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredDishes.map(dish => (
                  <tr key={dish.id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                    <td style={{ padding: '0.75rem 1.25rem' }}>
                      <img
                        src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'}
                        alt={dish.name}
                        style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {dish.name}
                        {dish.is_recommended && (
                          <span style={{
                            background: 'rgba(255, 59, 48, 0.1)',
                            color: 'var(--apple-red)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-pill)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Flame size={10} /> แนะนำ
                          </span>
                        )}
                      </div>
                      {dish.description && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                          {dish.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        padding: '4px 9px',
                        borderRadius: 'var(--radius-pill)',
                        fontSize: '0.78rem',
                        fontWeight: 500
                      }}>
                        {dish.category_name}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      ฿{parseFloat(dish.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                      ฿{parseFloat(dish.cost_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                      {dish.prep_time_minutes} นาที
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => toggleAvailability(dish.id)}
                        style={{
                          background: dish.is_available ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)',
                          border: '1px solid ' + (dish.is_available ? 'rgba(52, 199, 89, 0.3)' : 'rgba(255, 59, 48, 0.3)'),
                          color: dish.is_available ? 'var(--apple-green)' : 'var(--apple-red)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-pill)',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {dish.is_available ? '✓ พร้อมขาย' : '✗ ของหมด'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(dish)}
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--apple-blue)',
                            padding: '6px 9px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer'
                          }}
                          title="แก้ไขเมนู"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(dish)}
                          style={{
                            background: 'rgba(255, 59, 48, 0.08)',
                            border: '1px solid rgba(255, 59, 48, 0.2)',
                            color: 'var(--apple-red)',
                            padding: '6px 9px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer'
                          }}
                          title="ลบเมนู"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 2: CATEGORIES ================= */}
      {activeAdminTab === 'categories' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
              จัดการหมวดหมู่สำหรับจัดกลุ่มเมนูอาหารในร้าน
            </p>
            <button className="btn btn-primary" onClick={handleOpenCreateCategory} style={{ boxShadow: 'var(--shadow-sm)' }}>
              <Plus size={16} /> เพิ่มหมวดหมู่อาหารใหม่
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    {cat.name}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                    {cat.item_count || 0} เมนูในหมวดนี้ • ลำดับแสดง: {cat.display_order}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditCategory(cat)}
                    style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--apple-blue)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    style={{
                      background: 'rgba(255, 59, 48, 0.08)',
                      border: '1px solid rgba(255, 59, 48, 0.2)',
                      color: 'var(--apple-red)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 3: RECEIPT & STORE SETTINGS ================= */}
      {activeAdminTab === 'settings' && (
        <ReceiptSettingsView />
      )}

      {/* ================= TAB 4: STAFF & PERMISSIONS ================= */}
      {activeAdminTab === 'staff' && (
        <StaffAdminView />
      )}

      {/* ================= MODAL: ADD / EDIT MENU ITEM ================= */}
      {itemModalOpen && (
        <div className="modal-overlay" onClick={() => setItemModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {editingItem ? `แก้ไขเมนู: ${editingItem.name}` : '+ เพิ่มเมนูอาหารใหม่'}
              </h3>
              <button 
                onClick={() => setItemModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Name & Category Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                      ชื่อเมนูอาหาร *
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ข้าวผัดสับปะรดกุ้งสด"
                      required
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                      หมวดหมู่ *
                    </label>
                    <select
                      value={itemCategoryId}
                      onChange={(e) => setItemCategoryId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price, Cost Price, Prep Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                      ราคาขาย (฿) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="180.00"
                      required
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--apple-blue)',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                      ต้นทุน (฿)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="70.00"
                      value={itemCostPrice}
                      onChange={(e) => setItemCostPrice(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                      เวลาปรุง (นาที)
                    </label>
                    <input
                      type="number"
                      value={itemPrepTime}
                      onChange={(e) => setItemPrepTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontFamily: 'inherit',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                    รายละเอียด / วัตถุดิบ
                  </label>
                  <textarea
                    rows={2}
                    placeholder="สูตรต้นตำรับ ใช้วัตถุดิบสดใหม่ รสชาติกลมกล่อม..."
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Checkbox Recommended */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="isRecommended"
                    checked={itemIsRecommended}
                    onChange={(e) => setItemIsRecommended(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--apple-blue)', cursor: 'pointer' }}
                  />
                  <label htmlFor="isRecommended" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                    <Flame size={14} style={{ color: 'var(--apple-red)' }} /> ติดป้าย "เมนูแนะนำยอดฮิต (Recommended)"
                  </label>
                </div>

                {/* Image URL & Preset Gallery */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                    ลิงก์รูปภาพอาหาร (Image URL)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '0.5rem' }}>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={itemImageUrl}
                      onChange={(e) => setItemImageUrl(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.65rem 0.9rem',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-main)',
                        fontFamily: 'inherit',
                        outline: 'none',
                        fontSize: '0.85rem'
                      }}
                    />
                    {itemImageUrl && (
                      <img
                        src={itemImageUrl}
                        alt="Preview"
                        style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                      />
                    )}
                  </div>

                  {/* Preset Gallery */}
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={12} style={{ color: 'var(--apple-orange)' }} /> หรือคลิกเลือกจากคลังรูปภาพอาหารสำเร็จรูป:
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '6px',
                      maxHeight: '130px',
                      overflowY: 'auto',
                      padding: '6px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      {IMAGE_PRESETS.map((preset, i) => (
                        <div
                          key={i}
                          onClick={() => setItemImageUrl(preset.url)}
                          style={{
                            cursor: 'pointer',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: itemImageUrl === preset.url ? '2px solid var(--apple-blue)' : '1px solid var(--border-subtle)',
                            position: 'relative'
                          }}
                          title={preset.name}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            style={{ width: '100%', height: '50px', objectFit: 'cover', display: 'block' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setItemModalOpen(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingItem}>
                  {savingItem ? 'กำลังบันทึก...' : editingItem ? 'บันทึกการแก้ไข' : 'เพิ่มเมนูอาหาร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT CATEGORY ================= */}
      {categoryModalOpen && (
        <div className="modal-overlay" onClick={() => setCategoryModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {editingCategory ? `แก้ไขหมวดหมู่: ${editingCategory.name}` : '+ เพิ่มหมวดหมู่อาหารใหม่'}
              </h3>
              <button 
                onClick={() => setCategoryModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                    ชื่อหมวดหมู่ *
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น อาหารจานเดียว, สลัดเพื่อสุขภาพ"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
                    ลำดับการแสดงผล (Display Order)
                  </label>
                  <input
                    type="number"
                    value={catDisplayOrder}
                    onChange={(e) => setCatDisplayOrder(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCategoryModalOpen(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingCat}>
                  {savingCat ? 'กำลังบันทึก...' : editingCategory ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
