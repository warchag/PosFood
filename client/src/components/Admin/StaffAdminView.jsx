import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  ShieldCheck, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Lock, 
  Shield, 
  Eye, 
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { usePos } from '../../context/PosContext';

export const StaffAdminView = () => {
  const { allStaff, fetchStaff } = usePos();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('waiter');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setName('');
    setNickname('');
    setRole('waiter');
    setPinCode('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setName(staff.name);
    setNickname(staff.nickname || '');
    setRole(staff.role);
    setPinCode(''); // blank means keep unchanged unless entered
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('กรุณากรอกชื่อพนักงาน');
      return;
    }

    if (!editingStaff && (!pinCode || pinCode.length < 4)) {
      setErrorMsg('กรุณากำหนดรหัส PIN อย่างน้อย 4 หลัก');
      return;
    }

    if (editingStaff && pinCode && pinCode.length < 4) {
      setErrorMsg('รหัส PIN ใหม่ต้องมีอย่างน้อย 4 หลัก');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const url = editingStaff ? `/api/staff/${editingStaff.id}` : '/api/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          nickname: nickname.trim() || null,
          role,
          ...(pinCode ? { pin_code: pinCode } : {})
        })
      });

      const json = await res.json();
      if (json.success) {
        await fetchStaff();
        setModalOpen(false);
      } else {
        setErrorMsg(json.error || 'บันทึกข้อมูลล้มเหลว');
      }
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staff) => {
    if (!window.confirm(`ยืนยันการลบหรือระงับการใช้งานพนักงาน "${staff.name}" หรือไม่?`)) return;

    try {
      const res = await fetch(`/api/staff/${staff.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        await fetchStaff();
      } else {
        alert(json.error || 'ลบข้อมูลล้มเหลว');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const getRoleLabel = (r) => {
    switch (r) {
      case 'admin': return 'ผู้จัดการ (Manager / Admin)';
      case 'cashier': return 'แคชเชียร์ (Cashier)';
      case 'waiter': return 'พนักงานบริการ (Waiter)';
      default: return r;
    }
  };

  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'admin':
        return { background: 'rgba(118, 185, 0, 0.15)', color: 'var(--nv-primary)', border: '1px solid var(--nv-primary)' };
      case 'cashier':
        return { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid #3b82f6' };
      case 'waiter':
        return { background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid #eab308' };
      default:
        return { background: 'var(--bg-surface-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' };
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} style={{ color: 'var(--nv-primary)' }} />
            จัดการรายชื่อพนักงาน & สิทธิ์การใช้งาน (Staff & Permissions)
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            กำหนดรหัส PIN 4 หลัก และกำหนดบทบาท (ผู้จัดการ / แคชเชียร์ / พนักงานเสิร์ฟ)
          </p>
        </div>

        <button 
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAdd}
        >
          <UserPlus size={16} /> + เพิ่มพนักงานใหม่
        </button>
      </div>

      {/* Staff Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {allStaff.map(staff => (
          <div 
            key={staff.id}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--rounded-sm)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
          >
            <div className="corner-square" />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--rounded-sm)',
                  background: 'var(--nv-surface-dark)',
                  color: 'var(--nv-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  border: '1px solid var(--nv-hairline-strong)'
                }}>
                  {staff.nickname ? staff.nickname.charAt(0) : staff.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.96rem', color: 'var(--text-main)' }}>
                    {staff.name}
                  </div>
                  {staff.nickname && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      ชื่อเล่น: {staff.nickname}
                    </div>
                  )}
                </div>
              </div>

              <span style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 'var(--rounded-xs)',
                textTransform: 'uppercase',
                ...getRoleBadgeStyle(staff.role)
              }}>
                {staff.role}
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-surface-secondary)', padding: '0.65rem 0.85rem', borderRadius: 'var(--rounded-xs)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span>บทบาท:</span>
                <strong style={{ color: 'var(--text-main)' }}>{getRoleLabel(staff.role)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>สถานะ:</span>
                <span style={{ color: 'var(--nv-primary)', fontWeight: 700 }}>● ใช้งานอยู่</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <button 
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, height: '34px', fontSize: '0.8rem' }}
                onClick={() => handleOpenEdit(staff)}
              >
                <Edit2 size={13} /> แก้ไข / เปลี่ยน PIN
              </button>

              <button 
                type="button"
                className="btn btn-secondary"
                style={{ height: '34px', width: '36px', padding: 0, color: '#ef4444' }}
                onClick={() => handleDelete(staff)}
                title="ลบพนักงาน"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Staff Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '440px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} style={{ color: 'var(--nv-primary)' }} />
                <h3>{editingStaff ? `แก้ไขพนักงาน: ${editingStaff.name}` : 'เพิ่มพนักงานใหม่'}</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setModalOpen(false)}>
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {errorMsg && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.65rem', borderRadius: 'var(--rounded-xs)', fontSize: '0.82rem' }}>
                    ⚠ {errorMsg}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    ชื่อ-นามสกุล <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="เช่น สมศักดิ์ สุขใจ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    ชื่อเล่น / ชื่อย่อแสดงในบิล
                  </label>
                  <input 
                    type="text"
                    placeholder="เช่น คุณสมศักดิ์"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    บทบาท & สิทธิ์การใช้งาน (Role) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem' }}
                  >
                    <option value="admin">ผู้จัดการ (Admin / Manager) - เข้าถึงได้ทุกฟังก์ชัน</option>
                    <option value="cashier">แคชเชียร์ (Cashier) - รับออเดอร์, คิดเงิน, เช็คบิล</option>
                    <option value="waiter">พนักงานบริการ (Waiter) - เปิดโต๊ะ และสั่งอาหารเข้าครัว</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    รหัส PIN 4 หลัก {editingStaff && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      placeholder={editingStaff ? '•••• (PIN เดิมถูกบันทึกไว้)' : 'เช่น 1234'}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '2px' }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Check size={16} /> {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
