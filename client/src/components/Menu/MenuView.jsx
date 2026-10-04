import React, { useState } from 'react';
import { usePos } from '../../context/PosContext';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Send, 
  Utensils, 
  Flame, 
  Clock, 
  Check, 
  MessageSquare,
  Sparkles,
  ArrowLeft,
  UserX
} from 'lucide-react';

export const MenuView = ({ table, onBackToFloor, onOrderSubmitted }) => {
  const { 
    categories, 
    menuItems, 
    cart, 
    addToCart, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart,
    submitCartToOrder,
    cancelTable 
  } = usePos();

  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNoteItem, setSelectedNoteItem] = useState(null);
  const [itemNoteText, setItemNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategoryId === 'all' || item.category_id === parseInt(activeCategoryId, 10);
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((acc, curr) => acc + (parseFloat(curr.menuItem.price) * curr.quantity), 0);

  const handleAddWithNote = (dish) => {
    setSelectedNoteItem(dish);
    setItemNoteText('');
  };

  const confirmAddNote = () => {
    if (selectedNoteItem) {
      addToCart(selectedNoteItem, 1, itemNoteText);
      setSelectedNoteItem(null);
      setItemNoteText('');
    }
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    const success = await submitCartToOrder(table.id);
    setSubmitting(false);
    if (success) {
      if (onOrderSubmitted) onOrderSubmitted();
      onBackToFloor();
    }
  };

  const handleCancelTableOrder = async () => {
    if (!table) return;
    const confirmMsg = `ลูกค้ายกเลิก/ไม่สั่งอาหาร ต้องการยกเลิกการเปิดโต๊ะ ${table.table_number} และคืนสถานะเป็น "โต๊ะว่าง" ใช่หรือไม่?`;
    if (!window.confirm(confirmMsg)) return;

    clearCart();
    const success = await cancelTable(table.id, 'ลูกค้ายกเลิก/ไม่สั่งอาหาร');
    if (success) {
      onBackToFloor();
    }
  };

  return (
    <div className="menu-view-container">
      {/* Menu Main Section */}
      <div className="menu-content-area">
        {/* Header with Table info & Search */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="btn btn-secondary"
              onClick={onBackToFloor}
              style={{ padding: '0.45rem 0.85rem' }}
            >
              <ArrowLeft size={16} /> กลับผังโต๊ะ
            </button>

            {table && (
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelTableOrder}
                style={{ padding: '0.45rem 0.85rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                title="ลูกค้ายกเลิก/ไม่สั่งอาหาร คืนสถานะเป็นโต๊ะว่าง"
              >
                <UserX size={15} /> ยกเลิกโต๊ะนี้
              </button>
            )}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.015em' }}>
                สั่งอาหาร: โต๊ะ {table ? table.table_number : 'POS'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {table ? `${table.zone_name} • ${table.capacity} ที่นั่ง` : 'เลือกเมนูอาหาร'}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-input-wrapper" style={{ maxWidth: '320px' }}>
            <Search size={16} className="search-icon-pos" />
            <input 
              type="text" 
              placeholder="ค้นหาเมนูอาหาร เครื่องดื่ม..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Chips */}
        <div className="category-chips">
          <button
            className={`category-chip ${activeCategoryId === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategoryId('all')}
          >
            🌟 ทั้งหมด ({menuItems.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-chip ${activeCategoryId === cat.id.toString() ? 'active' : ''}`}
              onClick={() => setActiveCategoryId(cat.id.toString())}
            >
              {cat.name} ({cat.item_count || 0})
            </button>
          ))}
        </div>

        {/* Menu Cards Grid (Apple Store Style) */}
        <div className="menu-cards-grid">
          {filteredItems.map(dish => (
            <div key={dish.id} className="menu-card" onClick={() => addToCart(dish, 1)}>
              {/* Signature NVIDIA Corner Square */}
              <div className="corner-square" />

              {/* Image */}
              <div style={{ position: 'relative' }}>
                <img 
                  src={dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'} 
                  alt={dish.name}
                  className="menu-card-img"
                  loading="lazy"
                />
                {dish.is_recommended && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'var(--nv-primary)',
                    color: 'var(--nv-on-primary)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--rounded-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    textTransform: 'uppercase'
                  }}>
                    <Flame size={12} /> ยอดฮิต
                  </span>
                )}
                {dish.prep_time_minutes && (
                  <span style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.85)',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: 'var(--rounded-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    border: '1px solid #333333'
                  }}>
                    <Clock size={10} /> {dish.prep_time_minutes} นาที
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="menu-card-body">
                <h3 className="menu-card-title">{dish.name}</h3>
                <p className="menu-card-desc">{dish.description || 'สูตรต้นตำรับ ใช้วัตถุดิบสดใหม่'}</p>
                
                <div className="menu-card-price-row">
                  <span className="menu-card-price">฿{parseFloat(dish.price).toLocaleString()}</span>
                  
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddWithNote(dish);
                      }}
                      title="เพิ่มหมายเหตุพิเศษ (เช่น เผ็ดน้อย)"
                      style={{
                        padding: '6px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-pill)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <MessageSquare size={13} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(dish, 1);
                      }}
                      className="btn btn-primary"
                      style={{
                        padding: '5px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      <Plus size={14} /> สั่ง
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Sidebar for Current Table (Apple macOS / iPad Inspector) */}
      <div className="cart-sidebar">
        <div className="cart-header">
          <div>
            <h3>
              รายการที่เลือก ({cart.reduce((a, c) => a + c.quantity, 0)})
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              โต๊ะ {table?.table_number || '-'} • รอส่งเข้าครัว
            </p>
          </div>
          {cart.length > 0 && (
            <button 
              onClick={clearCart}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--status-occupied)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Trash2 size={13} /> ล้างทั้งหมด
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="cart-items-scroll">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Utensils size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ยังไม่มีรายการอาหารในตะกร้า</p>
              <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>คลิกที่เมนูอาหารด้านซ้ายเพื่อเลือกรายการ</p>
            </div>
          ) : (
            cart.map((item, index) => (
              <div key={index} className="cart-item-row">
                <div style={{ flex: 1, paddingRight: '8px' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {item.menuItem.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--apple-blue)', marginTop: '2px', fontWeight: 600 }}>
                    ฿{parseFloat(item.menuItem.price).toLocaleString()}
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--apple-blue)', marginTop: '3px' }}>
                      ✎ {item.notes}
                    </div>
                  )}
                </div>

                {/* Quantity Controls (Apple Stepper) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="stepper-btn"
                    onClick={() => updateCartQuantity(index, -1)}
                  >
                    <Minus size={12} />
                  </button>

                  <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '18px', textAlign: 'center', color: 'var(--text-main)' }}>
                    {item.quantity}
                  </span>

                  <button
                    className="stepper-btn"
                    onClick={() => updateCartQuantity(index, 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Send to Kitchen Button */}
        <div className="cart-summary">
          <div className="summary-row">
            <span>จำนวนรายการ</span>
            <span>{cart.reduce((a, c) => a + c.quantity, 0)} จาน</span>
          </div>
          <div className="summary-total">
            <span>ยอดรวมรอบนี้</span>
            <span style={{ color: 'var(--apple-blue)' }}>฿{cartTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
            disabled={cart.length === 0 || submitting}
            onClick={handleSubmitOrder}
          >
            <Send size={16} />
            {submitting ? 'กำลังส่งข้อมูล...' : 'ส่งออเดอร์เข้าครัว (Send to Kitchen)'}
          </button>
        </div>
      </div>

      {/* Note modal */}
      {selectedNoteItem && (
        <div className="modal-overlay" onClick={() => setSelectedNoteItem(null)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                หมายเหตุพิเศษ: {selectedNoteItem.name}
              </h3>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
                {['เผ็ดน้อย', 'ไม่ใส่พริก', 'ไม่ใส่ผักชี', 'หวาน 50%', 'แยกน้ำ', 'ขอช้อนส้อมเพิ่ม'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setItemNoteText(prev => prev ? `${prev}, ${tag}` : tag)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-pill)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="ระบุข้อความพิเศษเพิ่มเติม..."
                value={itemNoteText}
                onChange={(e) => setItemNoteText(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem'
                }}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedNoteItem(null)}>
                ยกเลิก
              </button>
              <button className="btn btn-primary" onClick={confirmAddNote}>
                เพิ่มลงรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
