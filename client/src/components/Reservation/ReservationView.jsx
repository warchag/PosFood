import React, { useState, useMemo } from 'react';
import { usePos } from '../../context/PosContext';
import { 
  Calendar, 
  Clock, 
  Users, 
  Phone, 
  User, 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  Layers, 
  Filter,
  Sparkles,
  ArrowRight,
  X,
  FileText
} from 'lucide-react';

export const ReservationView = ({ onGoToTable, onGoToOrder }) => {
  const { 
    reservations, 
    tables, 
    zones, 
    createReservation, 
    updateReservation, 
    checkInReservation, 
    cancelReservation,
    currentStaff 
  } = usePos();

  // Filters & State
  const [selectedDateFilter, setSelectedDateFilter] = useState('today'); // 'today', 'tomorrow', 'all', 'custom'
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'confirmed', 'checked_in', 'cancelled'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    guest_count: 2,
    reservation_date: todayStr,
    reservation_time: '18:00',
    table_id: '',
    special_requests: ''
  });

  // Calculate target date for filter
  const targetDate = useMemo(() => {
    if (selectedDateFilter === 'today') return todayStr;
    if (selectedDateFilter === 'tomorrow') return tomorrowStr;
    if (selectedDateFilter === 'custom') return customDate;
    return null; // 'all'
  }, [selectedDateFilter, customDate, todayStr, tomorrowStr]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      // Date filter
      if (targetDate && r.reservation_date !== targetDate) return false;

      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = r.customer_name?.toLowerCase().includes(term);
        const phoneMatch = r.customer_phone?.includes(term);
        const tableMatch = r.table_number?.toLowerCase().includes(term);
        if (!nameMatch && !phoneMatch && !tableMatch) return false;
      }

      return true;
    });
  }, [reservations, targetDate, statusFilter, searchTerm]);

  // Metrics for Today
  const todayReservations = reservations.filter(r => r.reservation_date === todayStr);
  const metrics = {
    total: todayReservations.length,
    confirmed: todayReservations.filter(r => r.status === 'confirmed').length,
    checkedIn: todayReservations.filter(r => r.status === 'checked_in').length,
    cancelled: todayReservations.filter(r => r.status === 'cancelled').length
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingReservation(null);
    setFormData({
      customer_name: '',
      customer_phone: '',
      guest_count: 2,
      reservation_date: targetDate || todayStr,
      reservation_time: '18:30',
      table_id: '',
      special_requests: ''
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (res) => {
    setEditingReservation(res);
    setFormData({
      customer_name: res.customer_name || '',
      customer_phone: res.customer_phone || '',
      guest_count: res.guest_count || 2,
      reservation_date: res.reservation_date || todayStr,
      reservation_time: res.reservation_time ? res.reservation_time.slice(0, 5) : '18:00',
      table_id: res.table_id ? String(res.table_id) : '',
      special_requests: res.special_requests || ''
    });
    setIsModalOpen(true);
  };

  // Save Reservation
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.customer_phone.trim()) {
      alert('กรุณากรอกชื่อลูกค้าและเบอร์โทรศัพท์');
      return;
    }

    setSubmitting(true);
    const payload = {
      ...formData,
      table_id: formData.table_id ? parseInt(formData.table_id, 10) : null,
      guest_count: parseInt(formData.guest_count, 10) || 2
    };

    let res;
    if (editingReservation) {
      res = await updateReservation(editingReservation.id, payload);
    } else {
      res = await createReservation(payload);
    }

    setSubmitting(false);
    if (res.success) {
      setIsModalOpen(false);
    } else {
      alert(res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // Check in customer
  const handleCheckIn = async (res) => {
    if (!res.table_id) {
      alert('รายการจองนี้ยังไม่ได้ระบุโต๊ะ กรุณากดแก้ไขเพื่อเลือกโต๊ะก่อนเช็คอิน');
      return;
    }

    if (!window.confirm(`ยืนยันการเช็คอินคุณ ${res.customer_name} เข้าโต๊ะ ${res.table_number || ''} หรือไม่?`)) {
      return;
    }

    const result = await checkInReservation(res.id, res.guest_count, res.special_requests);
    if (result.success) {
      if (onGoToTable && result.data?.table) {
        onGoToTable(result.data.table);
      }
    } else {
      alert(result.error || 'เช็คอินไม่สำเร็จ');
    }
  };

  // Cancel reservation
  const handleCancel = async (res) => {
    const reason = window.prompt(`ระบุเหตุผลในการยกเลิกการจองของคุณ ${res.customer_name}:`, 'ลูกค้ายกเลิก/โทรแจ้งเลื่อน');
    if (reason === null) return;

    const result = await cancelReservation(res.id, reason);
    if (!result.success) {
      alert(result.error || 'ยกเลิกการจองไม่สำเร็จ');
    }
  };

  // Available tables for assignment in form
  const availableTables = tables.filter(t => t.status === 'available' || (editingReservation && t.id === editingReservation.table_id));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-canvas)' }}>
      {/* 1. Header Toolbar */}
      <div style={{
        padding: '0.85rem 1.5rem',
        background: 'var(--bg-surface-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--nv-primary)" />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, letterSpacing: '-0.3px', color: 'var(--text-main)' }}>
              ระบบจัดการการจองโต๊ะ (TABLE RESERVATIONS)
            </h2>
            <span style={{
              background: 'var(--status-reserved-bg)',
              color: 'var(--status-reserved-text)',
              border: '1px solid var(--status-reserved-border)',
              borderRadius: 'var(--rounded-xs)',
              padding: '2px 8px',
              fontSize: '0.74rem',
              fontWeight: 700
            }}>
              {metrics.confirmed} รอมาถึงวันนี้
            </span>
          </div>
          <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            บันทึกการจองล่วงหน้า คุมผังที่นั่งอัตโนมัติ และเช็คอินลูกค้าเข้าโต๊ะในคลิกเดียว
          </p>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleOpenAdd}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '38px', padding: '0 16px' }}
        >
          <Plus size={16} />
          + บันทึกการจองใหม่
        </button>
      </div>

      {/* 2. Top Metrics Cards (NVIDIA Style: 2px sharp rectangular geometry) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        padding: '1rem 1.5rem 0.5rem 1.5rem'
      }}>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--rounded-sm)',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ยอดจองวันนี้ทั้งหมด</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.total} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>กลุ่ม</span></div>
        </div>

        <div style={{
          background: 'var(--status-reserved-bg)',
          border: '1px solid var(--status-reserved-border)',
          borderRadius: 'var(--rounded-sm)',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--status-reserved-text)', fontWeight: 600 }}>รอยืนยัน / กำลังจะมา</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--status-reserved-text)' }}>{metrics.confirmed} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>โต๊ะ</span></div>
        </div>

        <div style={{
          background: 'var(--status-available-bg)',
          border: '1px solid var(--status-available-border)',
          borderRadius: 'var(--rounded-sm)',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--status-available-text)', fontWeight: 600 }}>เช็คอินเข้าโต๊ะแล้ว</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--status-available-text)' }}>{metrics.checkedIn} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>โต๊ะ</span></div>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--rounded-sm)',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>ยกเลิก / ไม่มา</div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-muted)' }}>{metrics.cancelled} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>รายการ</span></div>
        </div>
      </div>

      {/* 3. Filter Controls Strip */}
      <div style={{
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {/* Date Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--nv-surface-soft)', padding: '3px', borderRadius: 'var(--rounded-xs)' }}>
          <button
            type="button"
            onClick={() => setSelectedDateFilter('today')}
            style={{
              padding: '5px 12px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: selectedDateFilter === 'today' ? 'var(--nv-primary)' : 'transparent',
              color: selectedDateFilter === 'today' ? '#000000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--rounded-xs)',
              cursor: 'pointer'
            }}
          >
            วันนี้ ({todayStr})
          </button>

          <button
            type="button"
            onClick={() => setSelectedDateFilter('tomorrow')}
            style={{
              padding: '5px 12px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: selectedDateFilter === 'tomorrow' ? 'var(--nv-primary)' : 'transparent',
              color: selectedDateFilter === 'tomorrow' ? '#000000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--rounded-xs)',
              cursor: 'pointer'
            }}
          >
            พรุ่งนี้
          </button>

          <button
            type="button"
            onClick={() => setSelectedDateFilter('all')}
            style={{
              padding: '5px 12px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: selectedDateFilter === 'all' ? 'var(--nv-primary)' : 'transparent',
              color: selectedDateFilter === 'all' ? '#000000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--rounded-xs)',
              cursor: 'pointer'
            }}
          >
            ทุกวัน
          </button>

          <button
            type="button"
            onClick={() => setSelectedDateFilter('custom')}
            style={{
              padding: '5px 12px',
              fontSize: '0.82rem',
              fontWeight: 600,
              background: selectedDateFilter === 'custom' ? 'var(--nv-primary)' : 'transparent',
              color: selectedDateFilter === 'custom' ? '#000000' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--rounded-xs)',
              cursor: 'pointer'
            }}
          >
            เลือกวัน
          </button>

          {selectedDateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              style={{
                padding: '3px 8px',
                fontSize: '0.8rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--rounded-xs)',
                marginLeft: '4px'
              }}
            />
          )}
        </div>

        {/* Status Filter & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>สถานะ:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '5px 10px',
                fontSize: '0.82rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--rounded-xs)',
                background: 'var(--bg-canvas)'
              }}
            >
              <option value="all">ทุกสถานะ</option>
              <option value="confirmed">ยืนยันแล้ว / รอมา</option>
              <option value="checked_in">เช็คอินเข้าโต๊ะแล้ว</option>
              <option value="cancelled">ยกเลิกแล้ว</option>
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เบอร์โทร, โต๊ะ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '5px 10px 5px 30px',
                fontSize: '0.82rem',
                width: '180px',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--rounded-xs)',
                background: 'var(--bg-canvas)'
              }}
            />
          </div>
        </div>
      </div>

      {/* 4. Reservations Table List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
        {filteredReservations.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '240px',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            <Calendar size={44} style={{ opacity: 0.25, marginBottom: '0.75rem' }} />
            <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px 0' }}>
              ไม่พบรายการจองในช่วงที่เลือก
            </h4>
            <p style={{ fontSize: '0.82rem', margin: '0 0 1rem 0' }}>
              คลิกปุ่ม "+ บันทึกการจองใหม่" เพื่อบันทึกข้อมูลการจองโต๊ะของลูกค้า
            </p>
            <button className="btn btn-primary" onClick={handleOpenAdd} style={{ height: '36px', padding: '0 16px' }}>
              <Plus size={15} /> บันทึกการจองใหม่
            </button>
          </div>
        ) : (
          <div style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--rounded-sm)',
            overflow: 'hidden',
            background: 'var(--bg-surface)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: 'var(--nv-surface-soft)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>เวลานัด & วันที่</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>โต๊ะ / โซน</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>ลูกค้า & เบอร์ติดต่อ</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>จำนวนแขก</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>ความต้องการพิเศษ</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>สถานะ</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map((res, index) => {
                  const isToday = res.reservation_date === todayStr;
                  return (
                    <tr 
                      key={res.id} 
                      style={{ 
                        borderBottom: '1px solid var(--border-subtle)',
                        background: res.status === 'confirmed' && isToday ? 'rgba(0, 70, 164, 0.02)' : 'transparent',
                        transition: 'background 0.1s ease'
                      }}
                    >
                      {/* Time & Date */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="var(--nv-link-blue)" />
                          <span style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
                            {res.reservation_time} น.
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {res.reservation_date} {isToday && <span style={{ color: 'var(--nv-primary-dark)', fontWeight: 700 }}>• วันนี้</span>}
                        </div>
                      </td>

                      {/* Table / Zone */}
                      <td style={{ padding: '12px 14px' }}>
                        {res.table_number ? (
                          <div>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              background: 'var(--nv-surface-dark)',
                              color: '#ffffff',
                              borderRadius: 'var(--rounded-xs)',
                              fontWeight: 800,
                              fontSize: '0.84rem'
                            }}>
                              โต๊ะ {res.table_number}
                            </span>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                              {res.zone_name || 'โซนร้าน'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                            (ยังไม่ระบุโต๊ะ)
                          </span>
                        )}
                      </td>

                      {/* Customer Name & Phone */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                          {res.customer_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <Phone size={12} />
                          <a href={`tel:${res.customer_phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {res.customer_phone}
                          </a>
                        </div>
                      </td>

                      {/* Guest Count */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Users size={13} color="var(--text-muted)" />
                          <span style={{ fontWeight: 600 }}>{res.guest_count} ท่าน</span>
                        </div>
                      </td>

                      {/* Special Requests */}
                      <td style={{ padding: '12px 14px', maxWidth: '240px' }}>
                        {res.special_requests ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {res.special_requests}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>-</span>
                        )}
                        {res.staff_name && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                            ผู้รับจอง: {res.staff_name}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '12px 14px' }}>
                        {res.status === 'confirmed' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--status-reserved-bg)',
                            color: 'var(--status-reserved-text)',
                            border: '1px solid var(--status-reserved-border)',
                            borderRadius: 'var(--rounded-xs)',
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            🔷 ยืนยันแล้ว
                          </span>
                        )}
                        {res.status === 'checked_in' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--status-available-bg)',
                            color: 'var(--status-available-text)',
                            border: '1px solid var(--status-available-border)',
                            borderRadius: 'var(--rounded-xs)',
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            <CheckCircle2 size={12} /> เช็คอินแล้ว
                          </span>
                        )}
                        {res.status === 'cancelled' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--nv-surface-soft)',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--rounded-xs)',
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            <XCircle size={12} /> ยกเลิก
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {res.status === 'confirmed' && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleCheckIn(res)}
                              title="เช็คอินลูกค้าเข้าโต๊ะทันที"
                              style={{
                                height: '30px',
                                padding: '0 10px',
                                fontSize: '0.78rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <CheckCircle2 size={13} />
                              เช็คอินเข้าโต๊ะ
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleOpenEdit(res)}
                            title="แก้ไขข้อมูลการจอง"
                            style={{
                              height: '30px',
                              padding: '0 8px',
                              fontSize: '0.78rem'
                            }}
                          >
                            <Edit3 size={13} />
                          </button>

                          {res.status === 'confirmed' && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleCancel(res)}
                              title="ยกเลิกการจองนี้"
                              style={{
                                height: '30px',
                                padding: '0 8px',
                                fontSize: '0.78rem',
                                color: 'var(--nv-error)'
                              }}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE / EDIT RESERVATION ================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--nv-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  {editingReservation ? 'แก้ไขข้อมูลการจองโต๊ะ' : 'บันทึกการจองโต๊ะใหม่'}
                </h3>
              </div>
              <button 
                className="modal-close-btn" 
                onClick={() => !submitting && setIsModalOpen(false)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Customer Name & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      ชื่อลูกค้าผู้จอง <span style={{ color: 'var(--nv-error)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น คุณณภัทร"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      เบอร์โทรศัพท์ <span style={{ color: 'var(--nv-error)' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="เช่น 089-123-4567"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      วันที่จอง <span style={{ color: 'var(--nv-error)' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.reservation_date}
                      onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      เวลาที่จอง <span style={{ color: 'var(--nv-error)' }}>*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.reservation_time}
                      onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                {/* Quick Time Chips */}
                <div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>เลือกเวลาด่วน:</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['11:30', '12:00', '13:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, reservation_time: t })}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.74rem',
                          borderRadius: 'var(--rounded-xs)',
                          border: formData.reservation_time === t ? '1px solid var(--nv-primary)' : '1px solid var(--border-subtle)',
                          background: formData.reservation_time === t ? 'var(--status-available-bg)' : 'var(--bg-canvas)',
                          fontWeight: formData.reservation_time === t ? 700 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guest Count Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    จำนวนแขก (ท่าน)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[1, 2, 4, 6, 8, 10, 12].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({ ...formData, guest_count: num })}
                        style={{
                          flex: 1,
                          padding: '0.5rem 0',
                          fontSize: '0.84rem',
                          borderRadius: 'var(--rounded-xs)',
                          border: formData.guest_count === num ? '2px solid var(--nv-primary)' : '1px solid var(--border-subtle)',
                          background: formData.guest_count === num ? 'var(--status-available-bg)' : 'var(--bg-canvas)',
                          fontWeight: formData.guest_count === num ? 800 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Assignment */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    เลือกโต๊ะอาหาร
                  </label>
                  <select
                    value={formData.table_id}
                    onChange={(e) => setFormData({ ...formData, table_id: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.88rem',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--rounded-xs)',
                      background: 'var(--bg-canvas)'
                    }}
                  >
                    <option value="">-- ยังไม่ระบุโต๊ะ (จัดโต๊ะหน้างาน) --</option>
                    {zones.map(z => {
                      const zoneTbls = availableTables.filter(t => t.zone_id === z.id);
                      if (zoneTbls.length === 0) return null;
                      return (
                        <optgroup key={z.id} label={z.name}>
                          {zoneTbls.map(t => (
                            <option key={t.id} value={t.id}>
                              โต๊ะ {t.table_number} ({t.shape === 'rect' ? 'สี่เหลี่ยม' : t.shape === 'round' ? 'โต๊ะกลม' : t.shape === 'booth' ? 'ซุ้มโซฟา' : 'บาร์'}, รองรับ {t.capacity} ท่าน)
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                {/* Special Requests */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    หมายเหตุ / ความต้องการพิเศษ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ขอเก้าอี้เด็ก 1 ตัว, ฉลองครบรอบแต่งงาน, ไม่เอาโต๊ะใกล้แอร์"
                    value={formData.special_requests}
                    onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'กำลังบันทึก...' : editingReservation ? 'บันทึกการแก้ไข' : 'ยืนยันการจองโต๊ะ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
