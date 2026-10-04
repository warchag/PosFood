import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  Receipt, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Banknote, 
  QrCode, 
  ArrowUpRight, 
  UserCheck,
  Printer,
  Download,
  RefreshCw,
  Search,
  FileText,
  X,
  CalendarRange,
  Clock,
  ShoppingBag,
  Percent,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export const DailyReport = ({ onOpenReceipt }) => {
  // Filter States
  const [period, setPeriod] = useState('today'); // 'today' | 'yesterday' | 'month' | 'date' | 'range' | 'all'
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [selectedStaff, setSelectedStaff] = useState('all');

  // Search & Modals
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillDetail, setSelectedBillDetail] = useState(null);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Data & Loading States
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch Report Data
  const fetchReport = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append('period', period);
      if (period === 'date') params.append('date', selectedDate);
      if (period === 'month') params.append('month', selectedMonth);
      if (period === 'range') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }
      if (selectedStaff && selectedStaff !== 'all') {
        params.append('staff', selectedStaff);
      }

      const res = await fetch(`/api/reports/daily?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReport(json.data);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, selectedDate, selectedMonth, startDate, endDate, selectedStaff]);

  // Calculations & Aggregations
  const summary = report?.summary || {};
  const totalRevenue = parseFloat(summary.total_revenue || 0);
  const totalSubtotal = parseFloat(summary.total_subtotal || 0);
  const totalDiscount = parseFloat(summary.total_discount || 0);
  const totalVat = parseFloat(summary.total_vat || 0);
  const totalServiceCharge = parseFloat(summary.total_service_charge || 0);
  const totalBills = parseInt(summary.total_bills || 0, 10);
  const totalGuests = parseInt(summary.total_guests || 0, 10);
  const avgBill = totalBills > 0 ? (totalRevenue / totalBills) : 0;
  const avgGuest = totalGuests > 0 ? (totalRevenue / totalGuests) : 0;

  // Filter bills by search query
  const bills = report?.bills || [];
  const filteredBills = useMemo(() => {
    if (!searchQuery.trim()) return bills;
    const q = searchQuery.toLowerCase().trim();
    return bills.filter(b => 
      (b.order_number && b.order_number.toLowerCase().includes(q)) ||
      (b.table_number && String(b.table_number).toLowerCase().includes(q)) ||
      (b.staff_name && b.staff_name.toLowerCase().includes(q)) ||
      (b.cashier_name && b.cashier_name.toLowerCase().includes(q)) ||
      (b.payment_method && b.payment_method.toLowerCase().includes(q))
    );
  }, [bills, searchQuery]);

  // Extract distinct staff members for filter dropdown
  const availableStaff = useMemo(() => {
    const set = new Set();
    bills.forEach(b => {
      if (b.staff_name) set.add(b.staff_name);
      if (b.cashier_name) set.add(b.cashier_name);
    });
    return Array.from(set);
  }, [bills]);

  // Export to CSV with UTF-8 BOM for Thai language support
  const handleExportCSV = () => {
    if (!bills.length) {
      alert('ไม่มีข้อมูลบิลสำหรับส่งออก');
      return;
    }

    const headers = [
      'เลขที่บิล',
      'โต๊ะ',
      'พนักงานรับออเดอร์',
      'แคชเชียร์',
      'ช่องทางชำระ',
      'จำนวนลูกค้า',
      'ยอดก่อนลด/ภาษี (Subtotal)',
      'ส่วนลด (Discount)',
      'ภาษีมูลค่าเพิ่ม (VAT 7%)',
      'ค่าบริการ (Service Charge)',
      'ยอดสุทธิ (Total Amount)',
      'วันเวลาที่ปิดบิล',
      'รายการอาหารที่ขาย'
    ];

    const rows = bills.map(b => {
      const itemsStr = (b.items || [])
        .map(i => `${i.name || i.item_name} x${i.quantity || 1} (${(parseFloat(i.unit_price || i.price || 0) * (i.quantity || 1)).toFixed(2)}฿)`)
        .join('; ');

      return [
        `"${b.order_number || ''}"`,
        `"โต๊ะ ${b.table_number || ''}"`,
        `"${b.staff_name || ''}"`,
        `"${b.cashier_name || ''}"`,
        `"${b.payment_method || ''}"`,
        b.guest_count || 1,
        parseFloat(b.subtotal || 0).toFixed(2),
        parseFloat(b.discount_amount || 0).toFixed(2),
        parseFloat(b.vat_amount || 0).toFixed(2),
        parseFloat(b.service_charge_amount || 0).toFixed(2),
        parseFloat(b.total_amount || 0).toFixed(2),
        `"${b.closed_at ? new Date(b.closed_at).toLocaleString('th-TH') : ''}"`,
        `"${itemsStr.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานยอดขาย_${report?.filterInfo?.period || 'sales'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print from PDF Preview
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto', backgroundColor: 'var(--bg-canvas)' }}>
      {/* Page Title & Control Bar */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '1rem', 
        marginBottom: '1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
              รายงานยอดขายและวิเคราะห์การขาย
            </h2>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--rounded-xs)',
              background: 'var(--nv-primary)',
              color: '#000000',
              textTransform: 'uppercase'
            }}>
              POSTGRESQL ANALYTICS
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            {report?.filterInfo?.label || 'รายงานการขาย'} • {report?.storeInfo?.name || 'Siam Culinary POS'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => fetchReport(true)}
            className="btn btn-secondary"
            title="รีเฟรชข้อมูล"
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'กำลังดึง...' : 'รีเฟรช'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px' }}
          >
            <Download size={14} />
            <span>ส่งออก CSV (Excel)</span>
          </button>

          <button
            onClick={() => setShowPdfModal(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <Printer size={15} />
            <span>พิมพ์ / พรีวิว PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Period, Date Picker, Month Picker, Staff Filter) */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--rounded-sm)',
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Period Selector Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-canvas)', padding: '3px', borderRadius: 'var(--rounded-sm)', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'today', label: 'วันนี้' },
            { id: 'yesterday', label: 'เมื่อวานนี้' },
            { id: 'month', label: 'ประจำเดือน' },
            { id: 'date', label: 'ระบุวันที่' },
            { id: 'range', label: 'กำหนดช่วงวัน' },
            { id: 'all', label: 'ทั้งหมด' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              style={{
                border: 'none',
                background: period === tab.id ? 'var(--nv-surface-elevated)' : 'transparent',
                color: period === tab.id ? 'var(--nv-primary)' : 'var(--text-secondary)',
                fontWeight: period === tab.id ? 700 : 500,
                fontSize: '0.8rem',
                padding: '5px 12px',
                borderRadius: 'var(--rounded-xs)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Filters depending on Period */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* If Month view */}
          {period === 'month' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>เลือกเดือน:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{
                  background: 'var(--bg-surface-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '4px 8px',
                  borderRadius: 'var(--rounded-xs)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* If Specific Date view */}
          {period === 'date' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>เลือกวันที่:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  background: 'var(--bg-surface-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '4px 8px',
                  borderRadius: 'var(--rounded-xs)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* If Custom Date Range view */}
          {period === 'range' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ตั้งแต่วันที่:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  background: 'var(--bg-surface-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '4px 8px',
                  borderRadius: 'var(--rounded-xs)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  background: 'var(--bg-surface-secondary)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '4px 8px',
                  borderRadius: 'var(--rounded-xs)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
            </div>
          )}

          {/* Staff Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>พนักงาน:</span>
            <select
              value={selectedStaff}
              onChange={e => setSelectedStaff(e.target.value)}
              style={{
                background: 'var(--bg-surface-secondary)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                padding: '4px 10px',
                borderRadius: 'var(--rounded-xs)',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">พนักงานทุกคน (All Staff)</option>
              {availableStaff.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin-icon" style={{ marginBottom: '8px' }} />
          <div>กำลังประมวลผลรายงานยอดขายจากฐานข้อมูล PostgreSQL...</div>
        </div>
      ) : (
        <>
          {/* Top 5 KPI Summary Cards (NVIDIA Metric Style) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* KPI 1: Net Sales */}
            <div className="metric-card">
              <div className="corner-square" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="metric-title">ยอดขายสุทธิรวม (Net Sales)</span>
                <div style={{ padding: '6px', borderRadius: 'var(--rounded-sm)', background: 'var(--nv-surface-dark)', color: 'var(--nv-primary)' }}>
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="metric-value">
                ฿{totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--status-available-text)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <TrendingUp size={12} /> รวมส่วนลด VAT และ Service
              </div>
            </div>

            {/* KPI 2: Subtotal before Discount */}
            <div className="metric-card">
              <div className="corner-square" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="metric-title">ยอดรวมก่อนลด (Subtotal)</span>
                <div style={{ padding: '6px', borderRadius: 'var(--rounded-sm)', background: 'var(--nv-surface-dark)', color: '#60a5fa' }}>
                  <ShoppingBag size={18} />
                </div>
              </div>
              <div className="metric-value" style={{ color: 'var(--text-main)' }}>
                ฿{totalSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: totalDiscount > 0 ? 'var(--nv-error)' : 'var(--text-secondary)', marginTop: '4px' }}>
                ส่วนลดสะสม: -฿{totalDiscount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* KPI 3: Closed Bills & Avg per Bill */}
            <div className="metric-card">
              <div className="corner-square" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="metric-title">จำนวนบิลที่ปิด (Closed Bills)</span>
                <div style={{ padding: '6px', borderRadius: 'var(--rounded-sm)', background: 'var(--nv-surface-dark)', color: 'var(--nv-primary)' }}>
                  <Receipt size={18} />
                </div>
              </div>
              <div className="metric-value" style={{ color: 'var(--text-main)' }}>
                {totalBills.toLocaleString()} บิล
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                เฉลี่ย ฿{avgBill.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / บิล
              </div>
            </div>

            {/* KPI 4: Total Guests & Avg per Guest */}
            <div className="metric-card">
              <div className="corner-square" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="metric-title">จำนวนลูกค้า (Total Guests)</span>
                <div style={{ padding: '6px', borderRadius: 'var(--rounded-sm)', background: 'var(--nv-surface-dark)', color: '#f59e0b' }}>
                  <Users size={18} />
                </div>
              </div>
              <div className="metric-value" style={{ color: 'var(--text-main)' }}>
                {totalGuests.toLocaleString()} ท่าน
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                เฉลี่ย ฿{avgGuest.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ท่าน
              </div>
            </div>

            {/* KPI 5: VAT & Service Charge */}
            <div className="metric-card">
              <div className="corner-square" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="metric-title">ภาษี (VAT) & เซอร์วิสชาร์จ</span>
                <div style={{ padding: '6px', borderRadius: 'var(--rounded-sm)', background: 'var(--nv-surface-dark)', color: '#a855f7' }}>
                  <Percent size={18} />
                </div>
              </div>
              <div className="metric-value" style={{ color: 'var(--text-main)' }}>
                ฿{(totalVat + totalServiceCharge).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                VAT: ฿{totalVat.toFixed(2)} • SVC: ฿{totalServiceCharge.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Daily Trend Chart (Shown when period is month, range, or all) */}
          {(report?.dailyTrend && report.dailyTrend.length > 0) && (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--rounded-sm)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              position: 'relative'
            }}>
              <div className="corner-square" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BarChart3 size={17} style={{ color: 'var(--nv-primary)' }} />
                    แนวโน้มยอดขายรายวัน (Daily Sales Trend)
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    เปรียบเทียบยอดขายในแต่ละวันตามช่วงเวลาที่เลือก
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--nv-primary)' }}>
                  รวม {report.dailyTrend.length} วันที่มีการขาย
                </div>
              </div>

              {/* Bar Chart Container */}
              {(() => {
                const maxDaySales = Math.max(...report.dailyTrend.map(d => parseFloat(d.total_amount || d.total_sales || 0)), 1);
                return (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '12px',
                    height: '160px',
                    paddingTop: '20px',
                    overflowX: 'auto',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '8px'
                  }}>
                    {report.dailyTrend.map((day, idx) => {
                      const amount = parseFloat(day.total_amount || day.total_sales || 0);
                      const heightPercent = Math.max((amount / maxDaySales) * 100, 4);
                      const isHighest = amount === maxDaySales && maxDaySales > 0;
                      const dayDisplay = day.day_label || (day.day ? day.day.slice(8) : '');

                      return (
                        <div 
                          key={idx}
                          style={{
                            flex: '1 0 45px',
                            minWidth: '45px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end',
                            position: 'relative'
                          }}
                          title={`${day.day || day.sale_date}: ฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} (${day.bills_count} บิล)`}
                        >
                          {/* Amount tag on top of bar */}
                          <div style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: isHighest ? 'var(--nv-primary)' : 'var(--text-secondary)',
                            marginBottom: '4px',
                            whiteSpace: 'nowrap'
                          }}>
                            ฿{amount > 1000 ? `${(amount / 1000).toFixed(1)}k` : amount.toFixed(0)}
                          </div>

                          {/* Bar */}
                          <div style={{
                            width: '100%',
                            maxWidth: '32px',
                            height: `${heightPercent}%`,
                            background: isHighest 
                              ? 'linear-gradient(180deg, var(--nv-primary) 0%, #4d8200 100%)' 
                              : 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                            borderRadius: '2px 2px 0 0',
                            transition: 'height 0.4s ease',
                            boxShadow: isHighest ? '0 0 10px rgba(118, 185, 0, 0.4)' : 'none'
                          }} />

                          {/* Day Label */}
                          <div style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-secondary)',
                            marginTop: '6px',
                            whiteSpace: 'nowrap',
                            textAlign: 'center'
                          }}>
                            {dayDisplay}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Middle Grid: Payment Breakdown, Top Dishes, Staff Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            {/* 1. Payment Methods Breakdown */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--rounded-sm)',
              padding: '1.25rem',
              position: 'relative'
            }}>
              <div className="corner-square" />
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', textTransform: 'uppercase' }}>
                สัดส่วนการชำระเงิน (Payment Methods)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {(report?.paymentBreakdown || []).map(p => {
                  const amount = parseFloat(p.amount);
                  const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                  const isPromptPay = p.payment_method === 'promptpay';
                  const isCash = p.payment_method === 'cash';

                  return (
                    <div key={p.payment_method}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '0.84rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 600 }}>
                          {isPromptPay && <QrCode size={15} style={{ color: 'var(--apple-blue)' }} />}
                          {isCash && <Banknote size={15} style={{ color: 'var(--status-available)' }} />}
                          {!isPromptPay && !isCash && <CreditCard size={15} style={{ color: 'var(--status-billing)' }} />}
                          {isPromptPay ? 'Thai QR PromptPay' : isCash ? 'เงินสด (Cash)' : 'บัตรเครดิต / อื่นๆ'}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({p.transaction_count} บิล)</span>
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ({pct.toFixed(1)}%)
                        </span>
                      </div>

                      <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--rounded-full)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: isPromptPay ? 'var(--apple-blue)' : isCash ? 'var(--status-available)' : 'var(--status-billing)',
                          borderRadius: 'var(--rounded-full)'
                        }} />
                      </div>
                    </div>
                  );
                })}

                {(!report?.paymentBreakdown || report.paymentBreakdown.length === 0) && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีรายการชำระเงินในช่วงเวลานี้</p>
                )}
              </div>
            </div>

            {/* 2. Top Selling Dishes */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--rounded-sm)',
              padding: '1.25rem',
              position: 'relative'
            }}>
              <div className="corner-square" />
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', textTransform: 'uppercase' }}>
                เมนูอาหารขายดี (Top Sellers)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(report?.topDishes || []).slice(0, 5).map((dish, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--rounded-xs)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: 'var(--rounded-xs)',
                        background: idx === 0 ? 'var(--nv-primary)' : idx === 1 ? 'var(--nv-surface-elevated)' : 'var(--nv-surface-soft)',
                        color: idx === 0 ? '#000000' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.84rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {dish.item_name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <strong>{dish.quantity_sold}</strong> จาน
                      </span>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--nv-primary)' }}>
                        ฿{parseFloat(dish.total_sales).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}

                {(!report?.topDishes || report.topDishes.length === 0) && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีข้อมูลเมนูขายดี</p>
                )}
              </div>
            </div>

            {/* 3. Staff Sales Performance */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--rounded-sm)',
              padding: '1.25rem',
              position: 'relative'
            }}>
              <div className="corner-square" />
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} style={{ color: 'var(--nv-primary)' }} />
                ยอดขายแยกตามพนักงาน (Staff Sales)
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(report?.staffSales || []).map((staff, idx) => {
                  const sales = parseFloat(staff.total_sales || 0);
                  const pct = totalRevenue > 0 ? (sales / totalRevenue) * 100 : 0;
                  return (
                    <div 
                      key={idx}
                      style={{
                        background: 'var(--bg-canvas)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--rounded-xs)',
                        padding: '0.65rem 0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: 'var(--nv-primary)',
                            color: '#000000',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {idx + 1}
                          </span>
                          {staff.staff_name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {staff.bills_count} บิล
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--nv-primary)' }}>
                          ฿{sales.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {pct.toFixed(1)}% ของยอดรวม
                        </span>
                      </div>
                    </div>
                  );
                })}

                {(!report?.staffSales || report.staffSales.length === 0) && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีข้อมูลยอดขายแยกตามพนักงาน</p>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Bills Table (แสดงตามบิลการขาย และคลิกดูรายละเอียด) */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--rounded-sm)',
            padding: '1.25rem',
            position: 'relative'
          }}>
            <div className="corner-square" />
            
            {/* Table Header & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  รายการบิลการขาย (Sales Invoices & Closed Bills)
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  แสดงทั้งหมด {filteredBills.length} บิล • คลิกที่แถวเพื่อดูรายละเอียดว่าขายอะไรไปและใครขาย
                </span>
              </div>

              {/* Search input */}
              <div style={{ position: 'relative', width: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="ค้นหาเลขบิล, โต๊ะ, พนักงาน..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    fontSize: '0.82rem',
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--rounded-xs)',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)', background: 'var(--bg-canvas)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>เลขที่บิล</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>โต๊ะ</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>พนักงาน / แคชเชียร์</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>เวลาปิดบิล</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>ช่องทางชำระ</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>รายการ</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>ส่วนลด</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>VAT</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>ยอดสุทธิ (Total)</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '100px' }}>รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map(bill => {
                    const itemCount = (bill.items || []).reduce((acc, curr) => acc + (parseInt(curr.quantity, 10) || 1), 0);
                    return (
                      <tr 
                        key={bill.id}
                        onClick={() => setSelectedBillDetail(bill)}
                        style={{ 
                          borderBottom: '1px solid var(--border-subtle)', 
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--nv-primary)' }}>
                          {bill.order_number}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: 'var(--rounded-xs)', 
                            background: 'var(--nv-surface-dark)', 
                            color: '#ffffff',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}>
                            โต๊ะ {bill.table_number}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                            {bill.staff_name || 'ทั่วไป'}
                          </div>
                          {bill.cashier_name && bill.cashier_name !== bill.staff_name && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              แคชเชียร์: {bill.cashier_name}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          {bill.closed_at ? new Date(bill.closed_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: 'var(--rounded-xs)',
                            background: bill.payment_method === 'promptpay' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: bill.payment_method === 'promptpay' ? '#60a5fa' : '#4ade80',
                            fontWeight: 700,
                            border: `1px solid ${bill.payment_method === 'promptpay' ? '#3b82f6' : '#22c55e'}`
                          }}>
                            {bill.payment_method ? bill.payment_method.toUpperCase() : 'CASH'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {itemCount} รายการ
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: parseFloat(bill.discount_amount || 0) > 0 ? 'var(--nv-error)' : 'var(--text-secondary)' }}>
                          {parseFloat(bill.discount_amount || 0) > 0 ? `-฿${parseFloat(bill.discount_amount).toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          ฿{parseFloat(bill.vat_amount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 800, color: 'var(--nv-primary)', fontSize: '0.92rem' }}>
                          ฿{parseFloat(bill.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBillDetail(bill);
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.74rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <FileText size={12} />
                            ดูบิล
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredBills.length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        ไม่พบรายการบิลการขายในช่วงเวลานี้
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* Table Footer with Summary Sum */}
                {filteredBills.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-subtle)', background: 'var(--bg-canvas)', fontWeight: 800, color: 'var(--text-main)' }}>
                      <td colSpan="5" style={{ padding: '0.85rem 0.5rem' }}>
                        ยอดรวมตามตัวกรอง ({filteredBills.length} บิล)
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem' }}>
                        {filteredBills.reduce((acc, b) => acc + (b.items || []).reduce((ia, ic) => ia + (parseInt(ic.quantity, 10) || 1), 0), 0)} รายการ
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: 'var(--nv-error)' }}>
                        -฿{filteredBills.reduce((acc, b) => acc + parseFloat(b.discount_amount || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                        ฿{filteredBills.reduce((acc, b) => acc + parseFloat(b.vat_amount || 0), 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right', color: 'var(--nv-primary)', fontSize: '1rem' }}>
                        ฿{filteredBills.reduce((acc, b) => acc + parseFloat(b.total_amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 1. DRILL-DOWN BILL DETAIL MODAL (คลิกดูรายละเอียดของบิลนั้นๆ) */}
      {/* ========================================================================= */}
      {selectedBillDetail && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => setSelectedBillDetail(null)}
        >
          <div 
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--rounded-sm)',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-canvas)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    รายละเอียดบิล {selectedBillDetail.order_number}
                  </h3>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--rounded-xs)',
                    background: 'var(--nv-primary)',
                    color: '#000000',
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}>
                    โต๊ะ {selectedBillDetail.table_number}
                  </span>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  ปิดบิลเมื่อ: {selectedBillDetail.closed_at ? new Date(selectedBillDetail.closed_at).toLocaleString('th-TH') : '-'}
                </div>
              </div>

              <button
                onClick={() => setSelectedBillDetail(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Attribution Info Card (ใครขาย / ใครคิดเงิน / จ่ายแบบไหน) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                background: 'var(--bg-canvas)',
                padding: '0.85rem',
                borderRadius: 'var(--rounded-xs)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.25rem'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>พนักงานรับออเดอร์</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    {selectedBillDetail.staff_name || 'ทั่วไป'}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>แคชเชียร์ผู้ปิดบิล</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    {selectedBillDetail.cashier_name || selectedBillDetail.staff_name || 'แคชเชียร์หลัก'}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block' }}>ช่องทางการชำระ</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--nv-primary)', textTransform: 'uppercase' }}>
                    {selectedBillDetail.payment_method || 'CASH'}
                  </strong>
                </div>
              </div>

              {/* Items List (ขายอะไรไปบ้าง) */}
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.65rem' }}>
                รายการอาหารและเครื่องดื่มที่ขาย ({selectedBillDetail.items?.length || 0} รายการ)
              </h4>

              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--rounded-xs)', overflow: 'hidden', marginBottom: '1.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 10px', width: '30px' }}>#</th>
                      <th style={{ padding: '8px 10px' }}>ชื่อเมนู</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', width: '60px' }}>จำนวน</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '85px' }}>ราคา/หน่วย</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', width: '95px' }}>ราคารวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedBillDetail.items || []).map((item, idx) => {
                      const qty = parseInt(item.quantity, 10) || 1;
                      const price = parseFloat(item.unit_price || item.price || 0);
                      const lineTotal = item.total_price !== undefined ? parseFloat(item.total_price) : qty * price;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.item_name || item.name}</div>
                            {item.notes && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--nv-warning-bright)' }}>
                                * {item.notes}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>
                            {qty}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            ฿{price.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                            ฿{lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}

                    {(!selectedBillDetail.items || selectedBillDetail.items.length === 0) && (
                      <tr>
                        <td colSpan="5" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          ไม่มีรายการสินค้าในบิลนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Price Breakdown & Totals */}
              <div style={{
                background: 'var(--bg-canvas)',
                padding: '1rem',
                borderRadius: 'var(--rounded-xs)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span>ยอดรวมค่าอาหาร (Subtotal)</span>
                  <span>฿{parseFloat(selectedBillDetail.subtotal || 0).toFixed(2)}</span>
                </div>

                {parseFloat(selectedBillDetail.discount_amount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--nv-error)' }}>
                    <span>ส่วนลด (Discount)</span>
                    <span>-฿{parseFloat(selectedBillDetail.discount_amount).toFixed(2)}</span>
                  </div>
                )}

                {parseFloat(selectedBillDetail.service_charge_amount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <span>ค่าบริการ (Service Charge)</span>
                    <span>฿{parseFloat(selectedBillDetail.service_charge_amount).toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                  <span>฿{parseFloat(selectedBillDetail.vat_amount || 0).toFixed(2)}</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: '6px',
                  paddingTop: '8px',
                  borderTop: '1px dashed var(--border-subtle)'
                }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ยอดสุทธิที่ชำระ (Total Paid)
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--nv-primary)' }}>
                    ฿{parseFloat(selectedBillDetail.total_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-canvas)'
            }}>
              <button
                onClick={() => {
                  if (onOpenReceipt) onOpenReceipt(selectedBillDetail.id);
                  setSelectedBillDetail(null);
                }}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
              >
                <Printer size={14} />
                <span>ดูใบเสร็จย่อ / พิมพ์สลิป</span>
              </button>

              <button
                onClick={() => setSelectedBillDetail(null)}
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '6px 16px' }}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. OFFICIAL A4 PDF PREVIEW MODAL (พรีวิว PDF และพิมพ์รายงานยอดขาย) */}
      {/* ========================================================================= */}
      {showPdfModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 10000,
            overflowY: 'auto',
            padding: '2rem 1rem'
          }}
        >
          {/* Floating Action Bar (Hidden on print) */}
          <div 
            className="no-print"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10001,
              background: 'var(--nv-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--rounded-sm)',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: '850px',
              marginBottom: '1rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: 'var(--nv-primary)' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                ตัวอย่างก่อนพิมพ์ A4 (Sales Report PDF Preview)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={handlePrint}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', padding: '6px 16px' }}
              >
                <Printer size={15} />
                <span>พิมพ์ / บันทึก PDF (Print / Save)</span>
              </button>

              <button
                onClick={() => setShowPdfModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.84rem', padding: '6px 12px' }}
              >
                ปิด
              </button>
            </div>
          </div>

          {/* Printable A4 Paper Document Container */}
          <div 
            id="pdf-report-print-area"
            style={{
              width: '100%',
              maxWidth: '850px',
              minHeight: '1100px',
              backgroundColor: '#ffffff',
              color: '#111827',
              padding: '40px 48px',
              boxShadow: '0 0 20px rgba(0,0,0,0.4)',
              boxSizing: 'border-box',
              fontFamily: "'Inter', 'Prompt', sans-serif"
            }}
          >
            {/* Document Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111827', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#000000', textTransform: 'uppercase' }}>
                  {report?.storeInfo?.restaurant_name || report?.storeInfo?.name || 'Siam Culinary & Bistro'}
                </h1>
                <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px', lineHeight: 1.4 }}>
                  {report?.storeInfo?.restaurant_address || report?.storeInfo?.address || '88/1 ถ.สุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กทม. 10110'}<br />
                  โทรศัพท์: {report?.storeInfo?.restaurant_phone || report?.storeInfo?.phone || '0959201930'} | เลขประจำตัวผู้เสียภาษี: {report?.storeInfo?.tax_id || '0105563089123'}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#166534' }}>
                  รายงานสรุปยอดขาย
                </h2>
                <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>
                  <strong>ช่วงเวลา:</strong> {report?.filterInfo?.label || 'รายงานประจำวัน'}<br />
                  <strong>พิมพ์เมื่อ:</strong> {new Date().toLocaleString('th-TH')}<br />
                  <strong>พนักงานที่กรอง:</strong> {selectedStaff === 'all' ? 'พนักงานทุกคน' : selectedStaff}
                </div>
              </div>
            </div>

            {/* KPI Summary Block for Print */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <div>
                <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>ยอดขายสุทธิ (Net Total)</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                  ฿{totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>ยอดรวมก่อนลด (Subtotal)</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                  ฿{totalSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>ส่วนลดรวม / VAT รวม</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
                  -฿{totalDiscount.toFixed(2)} / ฿{totalVat.toFixed(2)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>จำนวนบิล / ลูกค้า</span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                  {totalBills} บิล ({totalGuests} ท่าน)
                </div>
              </div>
            </div>

            {/* Payment Summary Table for Print */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 6px 0', textTransform: 'uppercase', color: '#111827' }}>
                1. สรุปยอดตามช่องทางการชำระเงิน (Payment Summary)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #d1d5db', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px' }}>ช่องทางการชำระ</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>จำนวนบิล</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>ยอดเงินสุทธิ</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>สัดส่วน (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(report?.paymentBreakdown || []).map(p => {
                    const amt = parseFloat(p.amount);
                    const pct = totalRevenue > 0 ? (amt / totalRevenue) * 100 : 0;
                    return (
                      <tr key={p.payment_method} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.payment_method?.toUpperCase()}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{p.transaction_count}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                          ฿{amt.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Detailed Bills Table for Print */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 6px 0', textTransform: 'uppercase', color: '#111827' }}>
                2. บันทึกรายละเอียดตามบิลการขาย (Closed Invoices Audit Log)
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #9ca3af', textAlign: 'left' }}>
                    <th style={{ padding: '6px 6px' }}>เลขที่บิล</th>
                    <th style={{ padding: '6px 6px' }}>โต๊ะ</th>
                    <th style={{ padding: '6px 6px' }}>พนักงาน</th>
                    <th style={{ padding: '6px 6px' }}>เวลาปิดบิล</th>
                    <th style={{ padding: '6px 6px' }}>ชำระโดย</th>
                    <th style={{ padding: '6px 6px', textAlign: 'right' }}>ยอดก่อนลด</th>
                    <th style={{ padding: '6px 6px', textAlign: 'right' }}>ส่วนลด</th>
                    <th style={{ padding: '6px 6px', textAlign: 'right' }}>VAT</th>
                    <th style={{ padding: '6px 6px', textAlign: 'right' }}>ยอดสุทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map(bill => (
                    <tr key={bill.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '5px 6px', fontWeight: 700 }}>{bill.order_number}</td>
                      <td style={{ padding: '5px 6px' }}>T-{bill.table_number}</td>
                      <td style={{ padding: '5px 6px' }}>{bill.staff_name || bill.cashier_name || 'ทั่วไป'}</td>
                      <td style={{ padding: '5px 6px', color: '#4b5563' }}>
                        {bill.closed_at ? new Date(bill.closed_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td style={{ padding: '5px 6px' }}>{bill.payment_method?.toUpperCase()}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>฿{parseFloat(bill.subtotal || 0).toFixed(2)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>
                        {parseFloat(bill.discount_amount || 0) > 0 ? `-฿${parseFloat(bill.discount_amount).toFixed(2)}` : '0.00'}
                      </td>
                      <td style={{ padding: '5px 6px', textAlign: 'right' }}>฿{parseFloat(bill.vat_amount || 0).toFixed(2)}</td>
                      <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700 }}>
                        ฿{parseFloat(bill.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f3f4f6', borderTop: '2px solid #111827', fontWeight: 800 }}>
                    <td colSpan="5" style={{ padding: '8px 6px' }}>ยอดรวมสุทธิทั้งสิ้น ({filteredBills.length} บิล)</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      ฿{filteredBills.reduce((acc, b) => acc + parseFloat(b.subtotal || 0), 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      -฿{filteredBills.reduce((acc, b) => acc + parseFloat(b.discount_amount || 0), 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                      ฿{filteredBills.reduce((acc, b) => acc + parseFloat(b.vat_amount || 0), 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontSize: '11px', color: '#166534' }}>
                      ฿{filteredBills.reduce((acc, b) => acc + parseFloat(b.total_amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature & Endorsement Block */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '40px',
              marginTop: '50px',
              paddingTop: '20px',
              borderTop: '1px solid #d1d5db'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #9ca3af', width: '200px', margin: '0 auto 8px auto', height: '40px' }} />
                <div style={{ fontSize: '11px', fontWeight: 600 }}>ลงชื่อ: ผู้จัดทำรายงาน (Prepared By)</div>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>วันที่: ____ / ____ / ________</div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #9ca3af', width: '200px', margin: '0 auto 8px auto', height: '40px' }} />
                <div style={{ fontSize: '11px', fontWeight: 600 }}>ลงชื่อ: ผู้ตรวจสอบ / ผู้จัดการร้าน (Audited By)</div>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>วันที่: ____ / ____ / ________</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
