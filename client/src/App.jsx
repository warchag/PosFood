import React, { useState, useEffect } from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { FloorPlanView } from './components/FloorPlan/FloorPlanView';
import { TableActionModal } from './components/FloorPlan/TableActionModal';
import { MenuView } from './components/Menu/MenuView';
import { CheckoutModal } from './components/Billing/CheckoutModal';
import { ReceiptModal } from './components/Billing/ReceiptModal';
import { KitchenDisplay } from './components/Kitchen/KitchenDisplay';
import { DailyReport } from './components/Reports/DailyReport';
import { MenuAdminView } from './components/Admin/MenuAdminView';
import { ReservationView } from './components/Reservation/ReservationView';
import { SystemStatusFooter } from './components/Common/SystemStatusFooter';
import { PinLoginModal } from './components/Auth/PinLoginModal';
import { CustomerOrderView } from './components/Customer/CustomerOrderView';
import { io } from 'socket.io-client';
import { 
  Square,
  LayoutGrid, 
  BookOpen, 
  ChefHat, 
  BarChart3, 
  SlidersHorizontal,
  Calendar,
  Sun,
  Moon,
  Activity,
  Database,
  Radio,
  ExternalLink,
  User,
  Lock,
  LogOut,
  ShieldCheck,
  Bell,
  X
} from 'lucide-react';

const MainAppContent = () => {
  const { 
    selectedTable, 
    setSelectedTable, 
    tables,
    reservations,
    currentStaff,
    logoutStaff
  } = usePos();

  const [activeTab, setActiveTab] = useState('floor'); // 'floor', 'menu', 'kitchen', 'reservation', 'report', 'admin'
  const [modalTable, setModalTable] = useState(null);
  const [checkoutOrder, setCheckoutOrder] = useState(null);
  const [receiptOrderId, setReceiptOrderId] = useState(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [requiredRoleForAction, setRequiredRoleForAction] = useState(null);
  const [pendingTabAfterAuth, setPendingTabAfterAuth] = useState(null);
  const [staffAlert, setStaffAlert] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const pendingReservationCount = (reservations || []).filter(r => r.reservation_date === todayStr && r.status === 'confirmed').length;
  
  // Real-time listener for customer QR orders and staff calls
  useEffect(() => {
    const s = io(window.location.origin);
    s.on('customer:order_submitted', (data) => {
      setStaffAlert({
        id: Date.now(),
        type: 'order',
        title: `🔔 โต๊ะ ${data.table_number} สั่งอาหารผ่าน QR!`,
        message: `${data.items_count} รายการ (฿${parseFloat(data.total_amount).toFixed(2)}) • ${data.time}`
      });
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}
    });

    s.on('staff:call', (data) => {
      setStaffAlert({
        id: Date.now(),
        type: 'call',
        title: `🛎️ โต๊ะ ${data.table_number}: ${data.message}`,
        message: `เวลา ${data.time}`
      });
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(1100, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } catch (e) {}
    });

    return () => s.disconnect();
  }, []);

  // Theme state: defaults to 'light' (Paper-white canvas with dark header/footer per design.md)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('siam_pos_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('siam_pos_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Safe Tab Change with Role Guarding
  const handleTabChange = (targetTab) => {
    if (targetTab === 'admin') {
      if (!currentStaff || currentStaff.role !== 'admin') {
        setRequiredRoleForAction('admin');
        setPendingTabAfterAuth('admin');
        setIsLoginModalOpen(true);
        return;
      }
    }
    setActiveTab(targetTab);
  };

  // Table click from floor plan
  const handleSelectTable = (table) => {
    setModalTable(table);
  };

  const handleGoToOrder = (table) => {
    setSelectedTable(table);
    setModalTable(null);
    setActiveTab('menu');
  };

  const handleOpenCheckout = (order) => {
    setCheckoutOrder(order);
    setModalTable(null);
  };

  const handleOpenReceipt = (orderId) => {
    setReceiptOrderId(orderId);
  };

  // Count occupied tables
  const occupiedCount = tables.filter(t => t.status !== 'available').length;
  const availableCount = tables.length - occupiedCount;

  return (
    <div className="app-container">
      {/* 1. TOP UTILITY BAR (design.md: 32px deep black, technical metadata) */}
      <div className="utility-bar">
        <div className="utility-bar-left">
          <div className="utility-pill">
            <span className="dot" />
            <span>ENGINE: SIAM POS v2.4</span>
          </div>
          <div className="utility-pill" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={11} color="#76b900" />
            <span>POSTGRESQL 16: CONNECTED</span>
          </div>
          <div className="utility-pill" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Radio size={11} color="#76b900" />
            <span>SOCKET.IO: LIVE</span>
          </div>
        </div>
        <div className="utility-bar-right">
          <span>OCCUPANCY: <strong>{occupiedCount} / {tables.length}</strong> TABLES IN USE</span>
          <span>AVAILABLE: <strong>{availableCount}</strong></span>
          {pendingReservationCount > 0 && (
            <span style={{ color: '#93c5fd' }}>RESERVED: <strong>{pendingReservationCount} TODAY</strong></span>
          )}
          <span>TH-TH • 24H POS CLOUD</span>
        </div>
      </div>

      {/* 2. PRIMARY NAV (design.md: 64px deep black #000000, 2px angular geometry) */}
      <header className="top-navbar">
        <div className="brand-section">
          {/* Signature green square logo */}
          <div className="brand-logo-icon" title="NVIDIA Design Standard - SIAM POS">
            <Square size={18} fill="#000000" color="#000000" />
          </div>
          <div className="brand-info">
            <h1>
              SIAM CULINARY <span className="green-accent">POS</span>
            </h1>
            <p>ENGINEERING-GRADE RESTAURANT SYSTEM</p>
          </div>
        </div>

        {/* Navigation Tabs (Angular 2px Tabs with Green Active Indicator) */}
        <nav className="nav-tabs">
          <button 
            className={`nav-tab-btn ${activeTab === 'floor' ? 'active' : ''}`}
            onClick={() => handleTabChange('floor')}
          >
            <LayoutGrid size={15} />
            ผังโต๊ะอาหาร
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'kitchen' ? 'active' : ''}`}
            onClick={() => handleTabChange('kitchen')}
          >
            <ChefHat size={15} />
            คิวครัว (KDS)
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'reservation' ? 'active' : ''}`}
            onClick={() => handleTabChange('reservation')}
            style={{ position: 'relative' }}
          >
            <Calendar size={15} />
            การจองโต๊ะ
            {pendingReservationCount > 0 && (
              <span style={{
                marginLeft: '4px',
                padding: '1px 6px',
                fontSize: '0.68rem',
                fontWeight: 800,
                background: 'var(--status-reserved)',
                color: '#ffffff',
                borderRadius: 'var(--rounded-xs)'
              }}>
                {pendingReservationCount}
              </span>
            )}
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => handleTabChange('report')}
          >
            <BarChart3 size={15} />
            รายงานยอดขาย
          </button>

          <button 
            className={`nav-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => handleTabChange('admin')}
          >
            <SlidersHorizontal size={15} />
            จัดการระบบ
          </button>
        </nav>

        {/* Actions Cluster */}
        <div className="nav-actions">
          {/* Staff Login / Profile Pill */}
          {currentStaff ? (
            <div 
              className="staff-nav-pill"
              onClick={() => {
                setRequiredRoleForAction(null);
                setIsLoginModalOpen(true);
              }}
              title="คลิกเพื่อสลับพนักงาน หรือป้อน PIN ใหม่"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                background: 'var(--nv-surface-dark)',
                border: '1px solid var(--nv-hairline-strong)',
                borderRadius: 'var(--rounded-xs)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: 'var(--rounded-xs)',
                background: currentStaff.role === 'admin' ? 'var(--nv-primary)' : '#3b82f6',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {currentStaff.nickname ? currentStaff.nickname.charAt(0) : currentStaff.name.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ffffff' }}>
                  {currentStaff.nickname || currentStaff.name}
                </span>
                <span style={{ 
                  fontSize: '0.62rem', 
                  fontWeight: 800, 
                  color: currentStaff.role === 'admin' ? 'var(--nv-primary)' : 'var(--nv-on-dark-mute)',
                  letterSpacing: '0.5px'
                }}>
                  {currentStaff.role.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  logoutStaff();
                }}
                title="ออกจากระบบ"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--nv-on-dark-mute)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRequiredRoleForAction(null);
                setIsLoginModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'var(--nv-primary)',
                color: '#000000',
                border: 'none',
                borderRadius: 'var(--rounded-xs)',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <Lock size={13} />
              เข้าสู่ระบบ PIN
            </button>
          )}

          <div className="status-badge-live">
            <span className="pulse-dot" />
            <span>โต๊ะไม่ว่าง {occupiedCount}/{tables.length}</span>
          </div>

          <button 
            className="theme-switch-btn" 
            onClick={toggleTheme}
            title={theme === 'light' ? 'สลับโหมด: NVIDIA Dark Console' : 'สลับโหมด: NVIDIA Paper Canvas'}
            aria-label="Toggle Surface Mode"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Real-time Customer QR Alert Banner */}
      {staffAlert && (
        <div style={{
          background: staffAlert.type === 'call' ? '#ef4444' : 'var(--nv-primary)',
          color: staffAlert.type === 'call' ? '#ffffff' : '#000000',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
          fontSize: '0.84rem',
          zIndex: 999,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{staffAlert.title}</span>
            <span style={{ opacity: 0.85, fontSize: '0.76rem', fontWeight: 600 }}>{staffAlert.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setStaffAlert(null)}
            style={{
              background: 'rgba(0, 0, 0, 0.15)',
              border: 'none',
              borderRadius: '2px',
              color: 'inherit',
              cursor: 'pointer',
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 3. MAIN CONTENT CANVAS */}
      <main className="main-layout">
        {activeTab === 'floor' && (
          <FloorPlanView onSelectTable={handleSelectTable} />
        )}

        {activeTab === 'menu' && (
          <MenuView 
            table={selectedTable} 
            onBackToFloor={() => setActiveTab('floor')} 
            onOrderSubmitted={() => setActiveTab('floor')}
            onOpenCheckout={handleOpenCheckout}
          />
        )}

        {activeTab === 'kitchen' && (
          <KitchenDisplay />
        )}

        {activeTab === 'reservation' && (
          <ReservationView 
            onGoToTable={(table) => {
              setSelectedTable(table);
              setActiveTab('floor');
              setModalTable(table);
            }}
            onGoToOrder={(table) => {
              setSelectedTable(table);
              setActiveTab('menu');
            }}
          />
        )}

        {activeTab === 'report' && (
          <DailyReport onOpenReceipt={handleOpenReceipt} />
        )}

        {activeTab === 'admin' && (
          <MenuAdminView />
        )}
      </main>

      {/* Engineering System & Database Status Footer */}
      <SystemStatusFooter />

      {/* PIN Login & Staff Switching Modal */}
      <PinLoginModal
        isOpen={!currentStaff || isLoginModalOpen}
        requiredRole={requiredRoleForAction}
        onClose={() => {
          setIsLoginModalOpen(false);
          setRequiredRoleForAction(null);
          setPendingTabAfterAuth(null);
        }}
        onSuccess={(staff) => {
          setIsLoginModalOpen(false);
          setRequiredRoleForAction(null);
          if (pendingTabAfterAuth) {
            setActiveTab(pendingTabAfterAuth);
            setPendingTabAfterAuth(null);
          }
        }}
      />

      {/* Modals */}
      {modalTable && (
        <TableActionModal
          table={tables.find(t => t.id === modalTable.id) || modalTable}
          onClose={() => setModalTable(null)}
          onGoToOrder={handleGoToOrder}
          onOpenCheckout={handleOpenCheckout}
          onOpenReceipt={handleOpenReceipt}
        />
      )}

      {checkoutOrder && (
        <CheckoutModal
          order={checkoutOrder}
          onClose={() => setCheckoutOrder(null)}
          onSuccess={(paidOrderId) => {
            setCheckoutOrder(null);
            setReceiptOrderId(paidOrderId);
          }}
        />
      )}

      {receiptOrderId && (
        <ReceiptModal
          orderId={receiptOrderId}
          onClose={() => setReceiptOrderId(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const tableParam = urlParams.get('table');

  if (tableParam) {
    return <CustomerOrderView tableNumber={tableParam} />;
  }

  return (
    <PosProvider>
      <MainAppContent />
    </PosProvider>
  );
}
