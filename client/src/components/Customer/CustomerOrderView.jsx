import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Utensils, 
  ShoppingBag, 
  Bell, 
  Clock, 
  Flame, 
  ChevronRight, 
  Plus, 
  Minus, 
  X, 
  Check, 
  Receipt, 
  AlertCircle,
  Sparkles,
  Search,
  MessageSquare,
  Coffee,
  HelpCircle,
  CreditCard,
  Lock,
  Key,
  Delete
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { io } from 'socket.io-client';

export const CustomerOrderView = ({ tableNumber }) => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [itemNote, setItemNote] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Order Tracking State
  const [orderStatusData, setOrderStatusData] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [callStaffModalOpen, setCallStaffModalOpen] = useState(false);
  const [callSuccessMsg, setCallSuccessMsg] = useState('');

  // Table PIN Security State
  const [tablePin, setTablePin] = useState(() => {
    try {
      return sessionStorage.getItem(`pos_pin_${tableNumber}`) || '';
    } catch (e) {
      return '';
    }
  });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Clear saved PIN if table becomes closed or tableNumber changes
  useEffect(() => {
    if (orderStatusData && !orderStatusData.is_table_open) {
      setTablePin('');
      try {
        sessionStorage.removeItem(`pos_pin_${tableNumber}`);
      } catch (e) {}
    }
  }, [orderStatusData?.is_table_open, tableNumber]);

  // 1. Fetch Categories & Menu
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setCategories(json.data);
          if (json.data.length > 0) setSelectedCategory(json.data[0].id);
        }
      })
      .catch(err => console.error('Error fetching categories:', err));

    fetch('/api/menu-items')
      .then(res => res.json())
      .then(json => {
        if (json.success) setMenuItems(json.data);
      })
      .catch(err => console.error('Error fetching menu:', err));
  }, []);

  // 2. Fetch Live Order Status for this table
  const fetchOrderStatus = useCallback(() => {
    if (!tableNumber) return;
    fetch(`/api/customer/order-status/${encodeURIComponent(tableNumber)}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setOrderStatusData(json.data);
        }
      })
      .catch(err => console.error('Error fetching order status:', err));
  }, [tableNumber]);

  useEffect(() => {
    fetchOrderStatus();
  }, [fetchOrderStatus]);

  // 3. Socket.io Live Updates
  useEffect(() => {
    const socket = io(window.location.origin, {
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('Customer socket connected:', socket.id);
    });

    socket.on('order:updated', () => fetchOrderStatus());
    socket.on('kitchen:item_status_changed', () => fetchOrderStatus());
    socket.on('payment:completed', () => fetchOrderStatus());
    socket.on('table:opened', () => fetchOrderStatus());
    socket.on('table:freed', () => fetchOrderStatus());
    socket.on('table:status_changed', () => fetchOrderStatus());
    socket.on('table:layout_updated', () => fetchOrderStatus());
    socket.on('tables:batch_updated', () => fetchOrderStatus());

    return () => socket.disconnect();
  }, [fetchOrderStatus]);

  // Cart Calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Cart Handlers
  const handleAddToCart = (item, quantity = 1, notes = '') => {
    setCart(prev => {
      const existingIndex = prev.findIndex(i => i.id === item.id && (i.notes || '') === (notes || ''));
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += quantity;
        return next;
      }
      return [...prev, { ...item, quantity, notes }];
    });
  };

  const handleUpdateCartQuantity = (index, delta) => {
    setCart(prev => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index].quantity = newQty;
      }
      return next;
    });
  };

  const handleOpenItemDetail = (item) => {
    setSelectedItemForModal(item);
    setItemQuantity(1);
    setItemNote('');
  };

  // Verify PIN before ordering
  const handleVerifyPinSubmit = async (pinToVerify = pinInput) => {
    const cleanPin = (pinToVerify || '').trim();
    if (!cleanPin || cleanPin.length !== 4) {
      setPinError('กรุณากรอกรหัส PIN ให้ครบ 4 หลัก');
      return;
    }
    setPinError('');
    setIsVerifyingPin(true);
    try {
      const res = await fetch('/api/customer/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: tableNumber,
          pin: cleanPin
        })
      });
      const data = await res.json();
      setIsVerifyingPin(false);
      if (data.success && data.valid) {
        setTablePin(cleanPin);
        try {
          sessionStorage.setItem(`pos_pin_${tableNumber}`, cleanPin);
        } catch (e) {}
        setShowPinModal(false);
        setPinInput('');
        // Automatically submit order after successful verification if cart has items
        if (cart.length > 0) {
          executeSubmitOrder(cleanPin);
        }
      } else {
        setPinError(data.error || 'รหัส PIN ไม่ถูกต้อง กรุณาสอบถามพนักงานประจำโต๊ะ');
      }
    } catch (err) {
      setIsVerifyingPin(false);
      setPinError('ไม่สามารถตรวจสอบรหัสได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Submit Order to Kitchen
  const handleSubmitOrder = () => {
    if (cart.length === 0 || isSubmitting) return;

    if (orderStatusData && !orderStatusData.is_table_open) {
      alert('🔒 โต๊ะยังไม่เปิดให้บริการในระบบ POS กรุณาแจ้งพนักงานเพื่อเปิดโต๊ะก่อนส่งออเดอร์');
      return;
    }

    // Require PIN for customer QR ordering:
    if (!tablePin) {
      setPinError('');
      setPinInput('');
      setShowPinModal(true);
      return;
    }

    executeSubmitOrder(tablePin);
  };

  const executeSubmitOrder = async (pinToSend = tablePin) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/customer/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: tableNumber,
          pin: pinToSend,
          items: cart.map(item => ({
            id: item.id,
            menu_item_id: item.id,
            name: item.name,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity,
            notes: item.notes || ''
          })),
          notes: orderNotes
        })
      });

      const json = await res.json();
      setIsSubmitting(false);

      if (json.success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        setCart([]);
        setIsCartOpen(false);
        setOrderNotes('');
        fetchOrderStatus();
        setIsStatusModalOpen(true);
      } else {
        if (json.code === 'INVALID_PIN') {
          // Clear invalid pin and prompt user again
          setTablePin('');
          try {
            sessionStorage.removeItem(`pos_pin_${tableNumber}`);
          } catch (e) {}
          setPinError(json.error || 'รหัส PIN ไม่ถูกต้องหรือถูกเปลี่ยน กรุณากรอกรหัสใหม่อีกครั้ง');
          setPinInput('');
          setShowPinModal(true);
        } else if (json.code === 'TABLE_NOT_OPEN' || json.error === 'TABLE_NOT_OPEN') {
          alert('🔒 ' + (json.error || json.message || 'โต๊ะยังไม่เปิดให้บริการ กรุณาแจ้งพนักงานเพื่อเปิดโต๊ะ'));
          fetchOrderStatus();
        } else {
          alert(json.error || 'เกิดข้อผิดพลาดในการส่งออเดอร์');
        }
      }
    } catch (err) {
      setIsSubmitting(false);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Call Staff
  const handleCallStaff = async (type = 'call_waiter') => {
    try {
      const res = await fetch('/api/customer/call-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: tableNumber,
          type
        })
      });
      const json = await res.json();
      if (json.success) {
        setCallSuccessMsg(json.message);
        setTimeout(() => {
          setCallSuccessMsg('');
          setCallStaffModalOpen(false);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory ? item.category_id === selectedCategory : true;
      const matchesSearch = searchQuery 
        ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  return (
    <div style={{
      maxWidth: '540px',
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--nv-canvas-dark, #0a0a0a)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: cart.length > 0 ? '90px' : '30px',
      position: 'relative'
    }}>
      {/* 1. Header Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#000000',
        borderBottom: '1px solid var(--nv-hairline-strong, #27272a)',
        padding: '0.75rem 1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--nv-primary, #76b900)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              SIAM CULINARY POS
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, color: '#ffffff' }}>
                โต๊ะ {tableNumber}
              </h1>
              <span style={{
                background: 'rgba(118, 185, 0, 0.15)',
                color: 'var(--nv-primary, #76b900)',
                border: '1px solid var(--nv-primary, #76b900)',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '1px 6px'
              }}>
                สั่งเองผ่าน QR
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {/* Call Staff Button */}
            <button
              type="button"
              onClick={() => setCallStaffModalOpen(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--nv-hairline-strong, #3f3f46)',
                borderRadius: 'var(--rounded-xs, 2px)',
                color: '#ffffff',
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <Bell size={13} color="var(--nv-primary, #76b900)" />
              เรียกพนักงาน
            </button>

            {/* Active Order Live Status Pill */}
            {orderStatusData?.has_active_order && (
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(true)}
                style={{
                  background: 'var(--nv-primary, #76b900)',
                  border: 'none',
                  borderRadius: 'var(--rounded-xs, 2px)',
                  color: '#000000',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <Clock size={13} />
                คิวอาหาร ({orderStatusData.items?.length || 0})
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#71717a' }} />
          <input
            type="text"
            placeholder="ค้นหาชื่ออาหาร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: 'var(--nv-surface-elevated, #18181b)',
              border: '1px solid var(--nv-hairline-strong, #27272a)',
              borderRadius: 'var(--rounded-xs, 2px)',
              padding: '6px 10px 6px 32px',
              fontSize: '0.82rem',
              color: '#ffffff',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {/* 2. Category Nav (Horizontal Scroll) */}
      <nav style={{
        display: 'flex',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        padding: '0.65rem 1rem',
        background: '#000000',
        borderBottom: '1px solid var(--nv-hairline-strong, #27272a)',
        gap: '6px',
        scrollbarWidth: 'none'
      }}>
        {categories.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--rounded-xs, 2px)',
                background: isActive ? 'var(--nv-primary, #76b900)' : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? '#000000' : '#d4d4d8',
                border: `1px solid ${isActive ? 'var(--nv-primary, #76b900)' : 'var(--nv-hairline-strong, #27272a)'}`,
                fontSize: '0.78rem',
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </nav>

      {/* Table Status Lock Banner (if table is not open) */}
      {orderStatusData && !orderStatusData.is_table_open && (
        <div style={{
          margin: '0.85rem 1rem 0',
          padding: '0.85rem 1rem',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: 'var(--rounded-xs, 2px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '2px',
              background: 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Lock size={16} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fbbf24' }}>
                โต๊ะ {tableNumber} ยังไม่เปิดให้บริการในระบบ POS
              </div>
              <div style={{ fontSize: '0.74rem', color: '#a1a1aa', marginTop: '2px', lineHeight: 1.4 }}>
                คุณสามารถเลือกดูเมนูและเพิ่มลงตะกร้าได้ล่วงหน้า เมื่อพนักงานเปิดโต๊ะแล้วจะสามารถกดยืนยันสั่งได้ทันที
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCallStaff('request_open_table')}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              borderRadius: '2px',
              color: '#fbbf24',
              fontSize: '0.8rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Bell size={13} />
            <span>🙋 เรียกพนักงานมาเปิดโต๊ะให้</span>
          </button>
        </div>
      )}

      {/* 3. Menu Item List */}
      <main style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--nv-on-dark-mute, #a1a1aa)', margin: 0, textTransform: 'uppercase' }}>
            {categories.find(c => c.id === selectedCategory)?.name || 'รายการอาหาร'} ({filteredItems.length})
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredItems.map(item => {
            const inCartItem = cart.find(c => c.id === item.id);
            return (
              <div
                key={item.id}
                onClick={() => handleOpenItemDetail(item)}
                style={{
                  background: 'var(--nv-surface-dark, #121212)',
                  border: '1px solid var(--nv-hairline-strong, #27272a)',
                  borderRadius: 'var(--rounded-xs, 2px)',
                  padding: '0.75rem',
                  display: 'flex',
                  gap: '12px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                {/* Food Image */}
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: 'var(--rounded-xs, 2px)',
                  overflow: 'hidden',
                  background: '#27272a',
                  flexShrink: 0
                }}>
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>
                      <Utensils size={24} />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.3 }}>
                        {item.name}
                      </span>
                      {item.is_recommended && (
                        <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Flame size={10} /> แนะนำ
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p style={{ fontSize: '0.74rem', color: '#a1a1aa', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--nv-primary, #76b900)' }}>
                      ฿{parseFloat(item.price).toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(item, 1);
                      }}
                      style={{
                        background: inCartItem ? 'var(--nv-primary, #76b900)' : 'rgba(255, 255, 255, 0.08)',
                        color: inCartItem ? '#000000' : '#ffffff',
                        border: `1px solid ${inCartItem ? 'var(--nv-primary, #76b900)' : 'var(--nv-hairline-strong, #3f3f46)'}`,
                        borderRadius: 'var(--rounded-xs, 2px)',
                        padding: '4px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {inCartItem ? (
                        <>
                          <Check size={13} />
                          <span>ในตะกร้า ({inCartItem.quantity})</span>
                        </>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>สั่ง</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 4. Bottom Sticky Cart Floating Bar */}
      {cart.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          right: '16px',
          maxWidth: '508px',
          margin: '0 auto',
          zIndex: 500
        }}>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            style={{
              width: '100%',
              height: '54px',
              background: '#000000',
              border: `2px solid ${orderStatusData && !orderStatusData.is_table_open ? '#f59e0b' : 'var(--nv-primary, #76b900)'}`,
              borderRadius: 'var(--rounded-xs, 2px)',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: orderStatusData && !orderStatusData.is_table_open
                ? '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 20px rgba(245, 158, 11, 0.3)'
                : '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 20px rgba(118, 185, 0, 0.3)',
              color: '#ffffff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '2px',
                background: orderStatusData && !orderStatusData.is_table_open ? '#f59e0b' : 'var(--nv-primary, #76b900)',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '0.9rem'
              }}>
                {cartItemCount}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>ดูรายการในตะกร้า</span>
                  {orderStatusData && !orderStatusData.is_table_open && (
                    <span style={{ fontSize: '0.68rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.2)', padding: '1px 5px', borderRadius: '2px' }}>
                      🔒 รอเปิดโต๊ะ
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                  {orderStatusData && !orderStatusData.is_table_open
                    ? 'โต๊ะยังไม่เปิด • รอพนักงานเปิดโต๊ะ'
                    : 'กดเพื่อตรวจสอบ & ส่งเข้าครัว'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 900, color: orderStatusData && !orderStatusData.is_table_open ? '#f59e0b' : 'var(--nv-primary, #76b900)' }}>
                ฿{cartTotal.toFixed(2)}
              </span>
              <ChevronRight size={18} color={orderStatusData && !orderStatusData.is_table_open ? '#f59e0b' : 'var(--nv-primary, #76b900)'} />
            </div>
          </button>
        </div>
      )}

      {/* 5. Cart Drawer / Modal */}
      {isCartOpen && (
        <div 
          onClick={() => setIsCartOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '540px',
              maxHeight: '85vh',
              background: 'var(--nv-surface-dark, #121212)',
              borderTop: '2px solid var(--nv-primary, #76b900)',
              borderTopLeftRadius: 'var(--rounded-sm, 4px)',
              borderTopRightRadius: 'var(--rounded-sm, 4px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Cart Header */}
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--nv-hairline-strong, #27272a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#000000'
            }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  🛒 ตะกร้าสั่งอาหาร (โต๊ะ {tableNumber})
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                  {cart.length} รายการ ({cartItemCount} ชิ้น)
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {cart.map((item, idx) => (
                <div 
                  key={`${item.id}-${idx}`}
                  style={{
                    background: 'var(--nv-surface-elevated, #18181b)',
                    border: '1px solid var(--nv-hairline-strong, #27272a)',
                    borderRadius: 'var(--rounded-xs, 2px)',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>{item.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--nv-primary, #76b900)', fontWeight: 700, marginTop: '2px' }}>
                      ฿{(parseFloat(item.price) * item.quantity).toFixed(2)}
                    </div>
                    {item.notes && (
                      <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '2px' }}>
                        💬 {item.notes}
                      </div>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateCartQuantity(idx, -1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--nv-hairline-strong, #3f3f46)',
                        borderRadius: '2px',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Minus size={13} />
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, width: '22px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateCartQuantity(idx, 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid var(--nv-hairline-strong, #3f3f46)',
                        borderRadius: '2px',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Special Note Input */}
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '4px' }}>
                  หมายเหตุเพิ่มเติมสำหรับออเดอร์นี้:
                </label>
                <input
                  type="text"
                  placeholder="เช่น มา 3 ท่าน, ขอเสิร์ฟพร้อมกัน..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--nv-surface-elevated, #18181b)',
                    border: '1px solid var(--nv-hairline-strong, #27272a)',
                    borderRadius: 'var(--rounded-xs, 2px)',
                    padding: '8px 10px',
                    fontSize: '0.8rem',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Cart Footer & Submit */}
            <div style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--nv-hairline-strong, #27272a)',
              background: '#000000'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>ยอดรวมโดยประมาณ:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--nv-primary, #76b900)' }}>
                  ฿{cartTotal.toFixed(2)}
                </span>
              </div>

              {orderStatusData && !orderStatusData.is_table_open ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    padding: '8px 10px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '2px',
                    fontSize: '0.75rem',
                    color: '#fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Lock size={14} style={{ flexShrink: 0 }} />
                    <span>โต๊ะยังไม่ได้เปิดในระบบ POS กรุณาแจ้งพนักงานเพื่อเปิดโต๊ะก่อนส่งออเดอร์</span>
                  </div>

                  <button
                    type="button"
                    disabled
                    style={{
                      width: '100%',
                      height: '46px',
                      background: '#27272a',
                      border: '1px solid #3f3f46',
                      borderRadius: 'var(--rounded-xs, 2px)',
                      color: '#71717a',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <Lock size={16} />
                    <span>🔒 รอพนักงานเปิดโต๊ะก่อนส่งออเดอร์</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleCallStaff('request_open_table');
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid #f59e0b',
                      borderRadius: 'var(--rounded-xs, 2px)',
                      color: '#fbbf24',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Bell size={15} />
                    <span>🙋 เรียกพนักงานมาเปิดโต๊ะให้</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    padding: '8px 10px',
                    background: tablePin ? 'rgba(118, 185, 0, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    border: `1px solid ${tablePin ? 'rgba(118, 185, 0, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} color={tablePin ? 'var(--nv-primary, #76b900)' : '#fbbf24'} />
                      <span style={{ color: tablePin ? '#86efac' : '#fbbf24', fontWeight: 600 }}>
                        {tablePin ? `PIN โต๊ะ: ${tablePin} (ยืนยันแล้ว)` : 'ต้องใส่ PIN 4 หลักเพื่อส่งเข้าครัว'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {tablePin && (
                        <button
                          type="button"
                          onClick={() => {
                            setTablePin('');
                            try {
                              sessionStorage.removeItem(`pos_pin_${tableNumber}`);
                            } catch (e) {}
                            setPinError('');
                            setPinInput('');
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '2px',
                            color: '#f87171',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '2px 6px'
                          }}
                          title="ล้าง PIN เพื่อทดสอบจำลองเป็นคนนอก"
                        >
                          ล้าง PIN (เทสคนนอก)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setPinError('');
                          setPinInput(tablePin || '');
                          setShowPinModal(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: tablePin ? 'var(--nv-primary, #76b900)' : '#fbbf24',
                          textDecoration: 'underline',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0
                        }}
                      >
                        {tablePin ? 'เปลี่ยน PIN' : 'กรอก PIN'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      height: '48px',
                      background: 'var(--nv-primary, #76b900)',
                      border: 'none',
                      borderRadius: 'var(--rounded-xs, 2px)',
                      color: '#000000',
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSubmitting ? (
                      <span>กำลังส่งเข้าครัว...</span>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>ยืนยันการสั่งอาหาร (ส่งเข้าครัว)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Item Detail & Customization Modal */}
      {selectedItemForModal && (
        <div 
          onClick={() => setSelectedItemForModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              background: 'var(--nv-surface-dark, #121212)',
              border: '1px solid var(--nv-hairline-strong, #27272a)',
              borderRadius: 'var(--rounded-sm, 4px)',
              overflow: 'hidden'
            }}
          >
            {/* Food Image */}
            {selectedItemForModal.image_url && (
              <div style={{ width: '100%', height: '180px', position: 'relative' }}>
                <img 
                  src={selectedItemForModal.image_url} 
                  alt={selectedItemForModal.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => setSelectedItemForModal(null)}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    {selectedItemForModal.name}
                  </h3>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--nv-primary, #76b900)', marginTop: '4px' }}>
                    ฿{parseFloat(selectedItemForModal.price).toFixed(2)}
                  </div>
                </div>
              </div>

              {selectedItemForModal.description && (
                <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: '0 0 1rem' }}>
                  {selectedItemForModal.description}
                </p>
              )}

              {/* Special Note Input */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#d4d4d8', marginBottom: '6px' }}>
                  ข้อความเพิ่มเติมถึงเชฟ:
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {['ไม่เผ็ด', 'เผ็ดน้อย', 'ไม่ใส่ชูรส', 'ไม่ใส่ผัก', 'แยกน้ำซุป'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setItemNote(prev => prev ? `${prev}, ${tag}` : tag)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--nv-hairline-strong, #3f3f46)',
                        borderRadius: '2px',
                        color: '#a1a1aa',
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        cursor: 'pointer'
                      }}
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="ระบุข้อความพิเศษเพิ่มเติม..."
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'var(--nv-surface-elevated, #18181b)',
                    border: '1px solid var(--nv-hairline-strong, #27272a)',
                    borderRadius: '2px',
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Quantity Stepper & Add */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--nv-hairline-strong, #3f3f46)',
                      borderRadius: '2px',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Minus size={15} />
                  </button>
                  <span style={{ fontSize: '1rem', fontWeight: 800, width: '28px', textAlign: 'center' }}>
                    {itemQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setItemQuantity(itemQuantity + 1)}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--nv-hairline-strong, #3f3f46)',
                      borderRadius: '2px',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart(selectedItemForModal, itemQuantity, itemNote);
                    setSelectedItemForModal(null);
                  }}
                  style={{
                    flex: 1,
                    height: '42px',
                    background: 'var(--nv-primary, #76b900)',
                    border: 'none',
                    borderRadius: 'var(--rounded-xs, 2px)',
                    color: '#000000',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  ใส่ตะกร้า (฿{(parseFloat(selectedItemForModal.price) * itemQuantity).toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Live Order Tracking Status Modal */}
      {isStatusModalOpen && (
        <div 
          onClick={() => setIsStatusModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '85vh',
              background: 'var(--nv-surface-dark, #121212)',
              border: '1px solid var(--nv-hairline-strong, #27272a)',
              borderRadius: 'var(--rounded-sm, 4px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Status Header */}
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid var(--nv-hairline-strong, #27272a)',
              background: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  สถานะอาหาร - โต๊ะ {tableNumber}
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                  เลขออเดอร์: {orderStatusData?.order?.order_number || '-'}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setIsStatusModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Status Content */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {orderStatusData?.items?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {orderStatusData.items.map((it) => {
                    const isServed = it.status === 'served';
                    const isCooking = it.status === 'cooking';
                    return (
                      <div
                        key={it.id}
                        style={{
                          background: 'var(--nv-surface-elevated, #18181b)',
                          border: `1px solid ${isServed ? 'rgba(118, 185, 0, 0.4)' : isCooking ? 'rgba(245, 158, 11, 0.4)' : 'var(--nv-hairline-strong, #27272a)'}`,
                          borderRadius: 'var(--rounded-xs, 2px)',
                          padding: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>
                            {it.item_name} <span style={{ color: 'var(--nv-primary, #76b900)' }}>x{it.quantity}</span>
                          </div>
                          {it.notes && (
                            <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '2px' }}>
                              💬 {it.notes}
                            </div>
                          )}
                          <div style={{ fontSize: '0.72rem', color: '#71717a', marginTop: '2px' }}>
                            สั่งเมื่อ {new Date(it.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {/* Status Chip */}
                        <div>
                          {isServed ? (
                            <span style={{ background: 'rgba(118, 185, 0, 0.15)', color: 'var(--nv-primary, #76b900)', border: '1px solid var(--nv-primary, #76b900)', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '2px' }}>
                              ✓ เสิร์ฟแล้ว
                            </span>
                          ) : isCooking ? (
                            <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid #f59e0b', fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '2px' }}>
                              🍳 กำลังปรุง
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#a1a1aa', border: '1px solid #3f3f46', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '2px' }}>
                              ⏳ รอทำ
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#a1a1aa' }}>
                  <Utensils size={36} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>ยังไม่มีรายการอาหารที่กำลังทำ</p>
                </div>
              )}
            </div>

            {/* Status Footer */}
            <div style={{
              padding: '1rem 1.25rem',
              borderTop: '1px solid var(--nv-hairline-strong, #27272a)',
              background: '#000000',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>ยอดรวมขณะนี้:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--nv-primary, #76b900)' }}>
                  ฿{parseFloat(orderStatusData?.order?.total_amount || 0).toFixed(2)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                style={{
                  background: 'var(--nv-primary, #76b900)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '2px',
                  padding: '8px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                สั่งอาหารเพิ่ม (+ Add)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Call Staff Action Sheet Modal */}
      {callStaffModalOpen && (
        <div 
          onClick={() => setCallStaffModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              background: 'var(--nv-surface-dark, #121212)',
              border: '1px solid var(--nv-hairline-strong, #27272a)',
              borderRadius: 'var(--rounded-sm, 4px)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--nv-hairline-strong, #27272a)',
              background: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} color="var(--nv-primary, #76b900)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  เรียกพนักงานบริการ (โต๊ะ {tableNumber})
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setCallStaffModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {callSuccessMsg ? (
                <div style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: 'rgba(118, 185, 0, 0.1)',
                  border: '1px solid var(--nv-primary, #76b900)',
                  borderRadius: '2px',
                  color: 'var(--nv-primary, #76b900)',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}>
                  <Check size={28} style={{ margin: '0 auto 6px' }} />
                  <div>{callSuccessMsg}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { type: 'request_open_table', label: '🔓 ขอเปิดโต๊ะอาหาร (ลูกค้านั่งที่โต๊ะแล้ว)', icon: HelpCircle },
                    { type: 'call_waiter', label: '🙋 เรียกพนักงานมารับบริการ', icon: HelpCircle },
                    { type: 'bill', label: '💳 ขอเช็คบิล / ชำระเงิน', icon: CreditCard },
                    { type: 'water', label: '🧊 ขอน้ำดื่ม / น้ำแข็งเพิ่ม', icon: Coffee },
                    { type: 'cutlery', label: '🍽️ ขอช้อนส้อม / จานแบ่งเพิ่ม', icon: Utensils }
                  ].map(option => (
                    <button
                      key={option.type}
                      type="button"
                      onClick={() => handleCallStaff(option.type)}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--nv-surface-elevated, #18181b)',
                        border: '1px solid var(--nv-hairline-strong, #27272a)',
                        borderRadius: 'var(--rounded-xs, 2px)',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--nv-primary, #76b900)';
                        e.currentTarget.style.background = 'rgba(118, 185, 0, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--nv-hairline-strong, #27272a)';
                        e.currentTarget.style.background = 'var(--nv-surface-elevated, #18181b)';
                      }}
                    >
                      <span>{option.label}</span>
                      <ChevronRight size={15} color="#71717a" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Table Security PIN Modal */}
      {showPinModal && (
        <div
          onClick={() => setShowPinModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(10px)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '380px',
              background: 'var(--nv-surface-dark, #121212)',
              border: '1px solid var(--nv-hairline-strong, #27272a)',
              borderRadius: 'var(--rounded-sm, 6px)',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.25rem 1rem',
              borderBottom: '1px solid var(--nv-hairline-strong, #27272a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#000000'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24'
                }}>
                  <Key size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    รหัส PIN ประจำโต๊ะ
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#a1a1aa', marginTop: '1px' }}>
                    โต๊ะ {tableNumber} • ความปลอดภัยการสั่งอาหาร
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.78rem', color: '#d4d4d8', margin: '0 0 1rem', lineHeight: 1.45, textAlign: 'center' }}>
                กรุณากรอกรหัส PIN 4 หลักที่พนักงานแจ้ง หรือดูจากใบเสร็จ/ป้ายเปิดโต๊ะ เพื่อยืนยันการสั่งอาหาร
              </p>

              {/* 4 Digit Boxes */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '1rem'
              }}>
                {[0, 1, 2, 3].map(idx => {
                  const digit = pinInput[idx];
                  const isCurrent = pinInput.length === idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '48px',
                        height: '54px',
                        background: digit ? 'rgba(118, 185, 0, 0.12)' : 'var(--nv-surface-elevated, #18181b)',
                        border: `2px solid ${
                          digit 
                            ? 'var(--nv-primary, #76b900)' 
                            : isCurrent 
                              ? '#fbbf24' 
                              : 'var(--nv-hairline-strong, #3f3f46)'
                        }`,
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.6rem',
                        fontWeight: 900,
                        color: digit ? 'var(--nv-primary, #76b900)' : '#71717a',
                        fontFamily: 'monospace',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {digit ? digit : ''}
                    </div>
                  );
                })}
              </div>

              {/* Error Message */}
              {pinError && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  fontSize: '0.76rem',
                  color: '#f87171',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{pinError}</span>
                </div>
              )}

              {/* Numeric Keypad Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '1rem'
              }}>
                {[
                  '1', '2', '3',
                  '4', '5', '6',
                  '7', '8', '9',
                  'C', '0', '⌫'
                ].map(key => {
                  const isSpecial = key === 'C' || key === '⌫';
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setPinError('');
                        if (key === 'C') {
                          setPinInput('');
                        } else if (key === '⌫') {
                          setPinInput(prev => prev.slice(0, -1));
                        } else {
                          if (pinInput.length < 4) {
                            const nextPin = pinInput + key;
                            setPinInput(nextPin);
                            // Auto verify when 4 digits reached
                            if (nextPin.length === 4) {
                              handleVerifyPinSubmit(nextPin);
                            }
                          }
                        }
                      }}
                      style={{
                        height: '52px',
                        background: isSpecial ? 'rgba(255, 255, 255, 0.05)' : 'var(--nv-surface-elevated, #18181b)',
                        border: '1px solid var(--nv-hairline-strong, #27272a)',
                        borderRadius: '4px',
                        color: isSpecial ? '#a1a1aa' : '#ffffff',
                        fontSize: isSpecial ? '1rem' : '1.35rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseDown={e => {
                        e.currentTarget.style.background = 'rgba(118, 185, 0, 0.2)';
                        e.currentTarget.style.borderColor = 'var(--nv-primary, #76b900)';
                      }}
                      onMouseUp={e => {
                        e.currentTarget.style.background = isSpecial ? 'rgba(255, 255, 255, 0.05)' : 'var(--nv-surface-elevated, #18181b)';
                        e.currentTarget.style.borderColor = 'var(--nv-hairline-strong, #27272a)';
                      }}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  style={{
                    flex: 1,
                    height: '42px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--nv-hairline-strong, #3f3f46)',
                    borderRadius: 'var(--rounded-xs, 2px)',
                    color: '#a1a1aa',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyPinSubmit()}
                  disabled={pinInput.length !== 4 || isVerifyingPin}
                  style={{
                    flex: 2,
                    height: '42px',
                    background: pinInput.length === 4 ? 'var(--nv-primary, #76b900)' : '#27272a',
                    border: 'none',
                    borderRadius: 'var(--rounded-xs, 2px)',
                    color: pinInput.length === 4 ? '#000000' : '#71717a',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    cursor: pinInput.length === 4 && !isVerifyingPin ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {isVerifyingPin ? (
                    <span>กำลังตรวจสอบ...</span>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>ยืนยันรหัส PIN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
