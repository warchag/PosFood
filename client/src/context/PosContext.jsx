import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const PosContext = createContext(null);

export const PosProvider = ({ children }) => {
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('1'); // Default to zone 1, NO 'all'
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]); // [ { menuItem, quantity, notes } ]
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  // Staff & Authentication state
  const [currentStaff, setCurrentStaff] = useState(() => {
    try {
      const saved = localStorage.getItem('pos_current_staff');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [allStaff, setAllStaff] = useState([]);

  // Fetch tables and zones
  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/tables');
      const json = await res.json();
      if (json.success) {
        setTables(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    }
  }, []);

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch('/api/zones');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setZones(json.data);
        // Default to first zone if selectedZone is not set
        setSelectedZone(prev => {
          if (!prev || prev === 'all' || !json.data.some(z => z.id.toString() === prev)) {
            return json.data[0].id.toString();
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to fetch zones:', err);
    }
  }, []);

  // Fetch Menu
  const fetchMenu = useCallback(async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/menu-items')
      ]);
      const catJson = await catRes.json();
      const itemJson = await itemRes.json();
      if (catJson.success) setCategories(catJson.data);
      if (itemJson.success) setMenuItems(itemJson.data);
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    }
  }, []);

  // Fetch staff list
  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/staff');
      const json = await res.json();
      if (json.success) {
        setAllStaff(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch staff list:', err);
    }
  }, []);

  // Login with PIN
  const loginWithPin = async (pinCode, staffId = null) => {
    try {
      const res = await fetch('/api/auth/login-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_code: pinCode, staff_id: staffId })
      });
      const json = await res.json();
      if (json.success) {
        setCurrentStaff(json.data);
        localStorage.setItem('pos_current_staff', JSON.stringify(json.data));
        return { success: true, staff: json.data };
      }
      return { success: false, error: json.error || 'รหัส PIN ไม่ถูกต้อง' };
    } catch (err) {
      return { success: false, error: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว' };
    }
  };

  // Logout staff
  const logoutStaff = () => {
    setCurrentStaff(null);
    localStorage.removeItem('pos_current_staff');
  };

  // Fetch active order for specific table
  const fetchOrderForTable = useCallback(async (tableId) => {
    if (!tableId) return null;
    try {
      const res = await fetch(`/api/orders/${tableId}?byTable=true`);
      const json = await res.json();
      if (json.success) {
        setActiveOrder(json.data);
        return json.data;
      } else {
        setActiveOrder(null);
        return null;
      }
    } catch (err) {
      setActiveOrder(null);
      return null;
    }
  }, []);

  // Initialize Socket.io
  useEffect(() => {
    const s = io(window.location.origin, {
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    s.on('connect', () => {
      console.log('Socket.io connected:', s.id);
    });

    // Real-time events
    s.on('table:opened', () => { fetchTables(); fetchZones(); });
    s.on('table:freed', () => { fetchTables(); fetchZones(); });
    s.on('table:layout_updated', () => { fetchTables(); fetchZones(); });
    s.on('tables:batch_updated', () => { fetchTables(); fetchZones(); });
    s.on('tables:transferred', () => { fetchTables(); fetchZones(); });
    s.on('table:created', () => { fetchTables(); fetchZones(); });
    s.on('table:deleted', () => { fetchTables(); fetchZones(); });
    s.on('zone:created', () => fetchZones());
    s.on('zone:updated', () => fetchZones());
    s.on('zone:deleted', () => { fetchZones(); fetchTables(); });

    s.on('order:updated', () => {
      fetchTables();
      fetchZones();
      if (selectedTable) fetchOrderForTable(selectedTable.id);
    });
    s.on('payment:completed', () => {
      fetchTables();
      fetchZones();
    });

    s.on('menu:created', () => fetchMenu());
    s.on('menu:updated', () => fetchMenu());
    s.on('menu:deleted', () => fetchMenu());
    s.on('category:created', () => fetchMenu());
    s.on('category:updated', () => fetchMenu());
    s.on('category:deleted', () => fetchMenu());

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [selectedTable, fetchTables, fetchZones, fetchMenu, fetchOrderForTable]);

  useEffect(() => {
    fetchTables();
    fetchZones();
    fetchMenu();
    fetchStaff();
  }, [fetchTables, fetchZones, fetchMenu, fetchStaff]);

  // Open a table
  const openTable = async (tableId, guestCount = 2, notes = '') => {
    try {
      const res = await fetch(`/api/tables/${tableId}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          guest_count: guestCount, 
          notes,
          staff_id: currentStaff?.id,
          staff_name: currentStaff?.nickname || currentStaff?.name || 'พนักงาน'
        })
      });
      const json = await res.json();
      if (json.success) {
        await fetchTables();
        await fetchZones();
        const updatedTable = tables.find(t => t.id === tableId) || json.data.table;
        setSelectedTable(updatedTable);
        await fetchOrderForTable(tableId);
        return true;
      }
    } catch (err) {
      console.error('Error opening table:', err);
    }
    return false;
  };

  // Cancel / Free a table (e.g. customer didn't order or left)
  const cancelTable = async (tableId, reason = '') => {
    try {
      const res = await fetch(`/api/tables/${tableId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const json = await res.json();
      if (json.success) {
        await fetchTables();
        await fetchZones();
        if (selectedTable?.id === tableId) {
          setSelectedTable(null);
        }
        return true;
      } else {
        alert(json.error || 'ไม่สามารถยกเลิกการเปิดโต๊ะได้');
      }
    } catch (err) {
      console.error('Error cancelling table:', err);
      alert('เกิดข้อผิดพลาดในการยกเลิกโต๊ะ');
    }
    return false;
  };

  // Cart operations
  const addToCart = (menuItem, quantity = 1, notes = '') => {
    setCart(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id && item.notes === notes);
      if (existing) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id && item.notes === notes
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { menuItem, quantity, notes }];
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index, delta) => {
    setCart(prev =>
      prev
        .map((item, i) => {
          if (i === index) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const clearCart = () => setCart([]);

  // Submit cart items to active table order
  const submitCartToOrder = async (tableId) => {
    if (!tableId || cart.length === 0) return false;
    const itemsPayload = cart.map(c => ({
      menu_item_id: c.menuItem.id,
      item_name: c.menuItem.name,
      unit_price: c.menuItem.price,
      quantity: c.quantity,
      notes: c.notes || ''
    }));

    try {
      const res = await fetch('/api/orders/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId,
          items: itemsPayload
        })
      });
      const json = await res.json();
      if (json.success) {
        clearCart();
        await fetchTables();
        await fetchZones();
        await fetchOrderForTable(tableId);
        return true;
      }
    } catch (err) {
      console.error('Error submitting order:', err);
    }
    return false;
  };

  // Transfer table
  const transferTable = async (fromTableId, toTableId) => {
    try {
      const res = await fetch('/api/tables/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTableId, toTableId })
      });
      const json = await res.json();
      if (json.success) {
        await fetchTables();
        await fetchZones();
        setSelectedTable(null);
        setActiveOrder(null);
        return true;
      }
    } catch (err) {
      console.error('Error transferring table:', err);
    }
    return false;
  };

  // Save updated floor plan table layout
  const saveBatchLayout = async (layouts) => {
    try {
      const res = await fetch('/api/tables/batch-layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layouts })
      });
      const json = await res.json();
      if (json.success) {
        await fetchTables();
        await fetchZones();
        return true;
      }
    } catch (err) {
      console.error('Error saving layout:', err);
    }
    return false;
  };

  // === Zone CRUD Methods ===
  const createZone = async (zoneData) => {
    try {
      const res = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zoneData)
      });
      const json = await res.json();
      if (json.success) {
        await fetchZones();
        setSelectedZone(json.data.id.toString());
        return json.data;
      }
    } catch (err) {
      console.error('Error creating zone:', err);
    }
    return null;
  };

  const updateZone = async (id, zoneData) => {
    try {
      const res = await fetch(`/api/zones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zoneData)
      });
      const json = await res.json();
      if (json.success) {
        await fetchZones();
        return json.data;
      }
    } catch (err) {
      console.error('Error updating zone:', err);
    }
    return null;
  };

  const deleteZone = async (id) => {
    try {
      const res = await fetch(`/api/zones/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        await fetchZones();
        await fetchTables();
        return true;
      }
    } catch (err) {
      console.error('Error deleting zone:', err);
    }
    return false;
  };

  // === Table CRUD Methods ===
  const createTable = async (tableData) => {
    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tableData)
      });
      const json = await res.json();
      if (json.success) {
        await fetchTables();
        await fetchZones();
        return json.data;
      }
    } catch (err) {
      console.error('Error creating table:', err);
    }
    return null;
  };

  const deleteTable = async (id) => {
    try {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        await fetchTables();
        await fetchZones();
        return true;
      }
    } catch (err) {
      console.error('Error deleting table:', err);
    }
    return false;
  };

  // === Menu & Category CRUD Methods ===
  const createCategory = async (catData) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData)
      });
      const json = await res.json();
      if (json.success) {
        await fetchMenu();
        return json.data;
      }
    } catch (err) {
      console.error('Error creating category:', err);
    }
    return null;
  };

  const updateCategory = async (id, catData) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData)
      });
      const json = await res.json();
      if (json.success) {
        await fetchMenu();
        return json.data;
      }
    } catch (err) {
      console.error('Error updating category:', err);
    }
    return null;
  };

  const deleteCategory = async (id) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        await fetchMenu();
        return true;
      }
    } catch (err) {
      console.error('Error deleting category:', err);
    }
    return false;
  };

  const createMenuItem = async (itemData) => {
    try {
      const res = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      const json = await res.json();
      if (json.success) {
        await fetchMenu();
        return json.data;
      }
    } catch (err) {
      console.error('Error creating menu item:', err);
    }
    return null;
  };

  const updateMenuItem = async (id, itemData) => {
    try {
      const res = await fetch(`/api/menu-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      const json = await res.json();
      if (json.success) {
        await fetchMenu();
        return json.data;
      }
    } catch (err) {
      console.error('Error updating menu item:', err);
    }
    return null;
  };

  const deleteMenuItem = async (id) => {
    try {
      const res = await fetch(`/api/menu-items/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        await fetchMenu();
        return true;
      }
    } catch (err) {
      console.error('Error deleting menu item:', err);
    }
    return false;
  };

  const toggleAvailability = async (id) => {
    try {
      const res = await fetch(`/api/menu-items/${id}/toggle`, {
        method: 'PATCH'
      });
      const json = await res.json();
      if (json.success) {
        await fetchMenu();
        return json.data;
      }
    } catch (err) {
      console.error('Error toggling availability:', err);
    }
    return null;
  };

  return (
    <PosContext.Provider
      value={{
        tables,
        zones,
        selectedZone,
        setSelectedZone,
        selectedTable,
        setSelectedTable,
        activeOrder,
        fetchOrderForTable,
        categories,
        menuItems,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        submitCartToOrder,
        openTable,
        cancelTable,
        transferTable,
        isEditMode,
        setIsEditMode,
        saveBatchLayout,
        fetchTables,
        fetchZones,
        fetchMenu,
        createZone,
        updateZone,
        deleteZone,
        createTable,
        deleteTable,
        createCategory,
        updateCategory,
        deleteCategory,
        createMenuItem,
        updateMenuItem,
        deleteMenuItem,
        toggleAvailability,
        socket,
        currentStaff,
        setCurrentStaff,
        allStaff,
        fetchStaff,
        loginWithPin,
        logoutStaff,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => useContext(PosContext);
