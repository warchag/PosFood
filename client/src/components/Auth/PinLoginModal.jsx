import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lock, 
  Unlock, 
  User, 
  ShieldAlert, 
  ShieldCheck, 
  Delete, 
  X, 
  Check, 
  Sparkles,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { usePos } from '../../context/PosContext';

export const PinLoginModal = ({ isOpen, onClose, requiredRole = null, onSuccess }) => {
  const { allStaff, currentStaff, loginWithPin, fetchStaff } = usePos();
  
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    if (allStaff.length > 0) {
      if (requiredRole) {
        // Auto-select staff who has the required role (e.g. admin)
        const eligibleStaff = allStaff.find(s => s.role === 'admin' || s.role === requiredRole);
        setSelectedStaff(eligibleStaff || allStaff[0]);
      } else if (!selectedStaff) {
        // Auto-select first or current
        const defaultStaff = currentStaff 
          ? allStaff.find(s => s.id === currentStaff.id) 
          : allStaff[0];
        setSelectedStaff(defaultStaff || allStaff[0]);
      }
    }
  }, [allStaff, currentStaff, requiredRole, isOpen]);

  const handleDigit = useCallback((digit) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setErrorMsg('');
    }
  }, [pin.length]);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setErrorMsg('');
  }, []);

  const handleSubmitPin = useCallback(async (pinToSubmit) => {
    const finalPin = pinToSubmit || pin;
    if (finalPin.length < 4) {
      setErrorMsg('กรุณากรอกรหัส PIN 4 หลัก');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const res = await loginWithPin(finalPin, selectedStaff?.id);
    setIsSubmitting(false);

    if (res.success) {
      // Check required role if any
      if (requiredRole && res.staff.role !== 'admin' && res.staff.role !== requiredRole) {
        setErrorMsg(`พนักงานตำแหน่ง "${getRoleName(res.staff.role)}" ไม่มีสิทธิ์เข้าถึงส่วนนี้ (ต้องใช้สิทธิ์ ${getRoleName(requiredRole)})`);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');
        return;
      }

      setPin('');
      if (onSuccess) onSuccess(res.staff);
      if (onClose) onClose();
    } else {
      setErrorMsg(res.error || 'รหัส PIN ไม่ถูกต้อง');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin('');
    }
  }, [pin, selectedStaff, loginWithPin, requiredRole, onSuccess, onClose]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      handleSubmitPin(pin);
    }
  }, [pin, handleSubmitPin]);

  // Physical keyboard support
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' && onClose && currentStaff) {
        onClose();
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handleSubmitPin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleBackspace, handleSubmitPin, onClose, currentStaff, pin.length]);

  if (!isOpen) return null;

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'ผู้จัดการ (Manager)';
      case 'cashier': return 'แคชเชียร์ (Cashier)';
      case 'waiter': return 'พนักงานบริการ (Waiter)';
      default: return role;
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return { background: 'rgba(118, 185, 0, 0.15)', color: 'var(--nv-primary)', border: '1px solid var(--nv-primary)' };
      case 'cashier':
        return { background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid #3b82f6' };
      case 'waiter':
        return { background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid #eab308' };
      default:
        return { background: 'var(--bg-surface-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)' };
    }
  };

  return (
    <div 
      className="login-modal-overlay" 
      onClick={(e) => {
        // Clicking backdrop closes modal if user is already logged in
        if (e.target === e.currentTarget && currentStaff && onClose) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem'
      }}
    >
      <div className={`login-box ${shake ? 'shake-animation' : ''}`} style={{
        background: 'var(--nv-surface-dark)',
        border: '1px solid var(--nv-hairline-strong)',
        borderRadius: 'var(--rounded-sm)',
        width: '100%',
        maxWidth: '460px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        position: 'relative'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--nv-hairline-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#000000'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              background: 'var(--nv-primary)',
              borderRadius: 'var(--rounded-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
              fontWeight: 800
            }}>
              <Lock size={15} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: '0.5px' }}>
                {requiredRole ? `ยืนยันสิทธิ์: ${getRoleName(requiredRole)}` : 'เข้าสู่ระบบพนักงาน (STAFF LOGIN)'}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--nv-on-dark-mute)', margin: '2px 0 0' }}>
                {requiredRole 
                  ? `ต้องใช้รหัส PIN ของผู้มีสิทธิ์ "${getRoleName(requiredRole)}" เพื่อดำเนินการต่อ`
                  : 'กดเลือกรหัสพนักงาน แล้วป้อนรหัส PIN 4 หลัก'}
              </p>
            </div>
          </div>

          {/* Close button: Always visible when already logged in as a staff member */}
          {currentStaff && onClose && (
            <button 
              type="button" 
              onClick={onClose}
              title="ปิดหน้าต่าง / กลับไปหน้าเดิม (ESC)"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid var(--nv-hairline-strong)',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '5px 10px',
                borderRadius: 'var(--rounded-xs)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.borderColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'var(--nv-hairline-strong)';
              }}
            >
              <X size={15} />
              <span>ปิด (ESC)</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Staff Selector Pills */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--nv-on-dark-mute)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              1. เลือกผู้ใช้งาน:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
              {allStaff.length === 0 ? (
                <div style={{ gridColumn: 'span 2', padding: '1rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--nv-hairline-strong)', borderRadius: 'var(--rounded-xs)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--nv-on-dark-mute)', marginBottom: '8px' }}>
                    กำลังเชื่อมต่อฐานข้อมูลพนักงาน...
                  </div>
                  <button 
                    type="button" 
                    onClick={() => fetchStaff()}
                    style={{
                      padding: '5px 12px',
                      background: 'var(--nv-primary)',
                      color: '#000000',
                      border: 'none',
                      borderRadius: 'var(--rounded-xs)',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    โหลดรายชื่อพนักงานใหม่อีกครั้ง
                  </button>
                </div>
              ) : (
                allStaff.map(staff => {
                  const isSelected = selectedStaff?.id === staff.id;
                  const hasPermission = !requiredRole || staff.role === 'admin' || staff.role === requiredRole;
                return (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => {
                      if (!hasPermission) {
                        setErrorMsg(`พนักงานตำแหน่ง "${getRoleName(staff.role)}" ไม่มีสิทธิ์เข้าถึงส่วนนี้ (ต้องใช้ ${getRoleName(requiredRole)})`);
                        return;
                      }
                      setSelectedStaff(staff);
                      setPin('');
                      setErrorMsg('');
                    }}
                    style={{
                      background: isSelected ? 'var(--nv-surface-elevated)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isSelected ? 'var(--nv-primary)' : hasPermission && requiredRole ? 'rgba(118, 185, 0, 0.4)' : 'var(--nv-hairline-strong)'}`,
                      borderRadius: 'var(--rounded-xs)',
                      padding: '0.65rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: hasPermission ? 'pointer' : 'not-allowed',
                      opacity: hasPermission ? 1 : 0.45,
                      textAlign: 'left',
                      transition: 'var(--transition-fast)'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--rounded-xs)',
                      background: isSelected ? 'var(--nv-primary)' : 'rgba(255, 255, 255, 0.1)',
                      color: isSelected ? '#000000' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {staff.nickname ? staff.nickname.charAt(0) : staff.name.charAt(0)}
                    </div>
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {staff.nickname || staff.name}
                      </div>
                      <div style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        display: 'inline-block',
                        padding: '1px 4px',
                        borderRadius: '2px',
                        marginTop: '2px',
                        ...getRoleBadgeStyle(staff.role)
                      }}>
                        {staff.role.toUpperCase()}
                      </div>
                    </div>
                  </button>
                );
              }))}
            </div>
          </div>

          {/* PIN Input Display */}
          <div style={{
            background: 'var(--nv-surface-dark)',
            border: '1px solid var(--nv-hairline-strong)',
            borderRadius: 'var(--rounded-xs)',
            padding: '1rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--nv-on-dark-mute)', marginBottom: '0.6rem' }}>
              กำลังล็อกอิน: <strong style={{ color: 'var(--nv-primary)' }}>{selectedStaff?.name || 'พนักงาน'}</strong> ({selectedStaff?.role?.toUpperCase()})
            </div>

            {/* 4 Digit Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', margin: '0.5rem 0' }}>
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: `2px solid ${pin.length > i ? 'var(--nv-primary)' : 'var(--nv-hairline-strong)'}`,
                    background: pin.length > i ? 'var(--nv-primary)' : 'transparent',
                    boxShadow: pin.length > i ? '0 0 10px rgba(118, 185, 0, 0.5)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                />
              ))}
            </div>

            {errorMsg ? (
              <div style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, marginTop: '0.5rem' }}>
                ⚠ {errorMsg}
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'var(--nv-on-dark-mute)', marginTop: '0.5rem' }}>
                💡 รหัสเริ่มต้นตัวอย่าง: ผจก. สมศักดิ์: <code>1111</code> | แคชเชียร์: <code>2222</code> | พนักงาน: <code>3333</code>
              </div>
            )}
          </div>

          {/* Touch Numpad (Large 3x4 Grid) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            maxWidth: '320px',
            margin: '0 auto'
          }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map(key => {
              const isAction = key === 'C' || key === 'DEL';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'C') handleClear();
                    else if (key === 'DEL') handleBackspace();
                    else handleDigit(key);
                  }}
                  disabled={isSubmitting}
                  style={{
                    height: '54px',
                    background: isAction ? 'rgba(255, 255, 255, 0.05)' : 'var(--nv-surface-elevated)',
                    border: '1px solid var(--nv-hairline-strong)',
                    borderRadius: 'var(--rounded-xs)',
                    color: isAction ? '#ef4444' : '#ffffff',
                    fontSize: isAction ? '0.9rem' : '1.35rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.borderColor = 'var(--nv-primary)';
                    e.currentTarget.style.background = 'rgba(118, 185, 0, 0.2)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.borderColor = 'var(--nv-hairline-strong)';
                    e.currentTarget.style.background = isAction ? 'rgba(255, 255, 255, 0.05)' : 'var(--nv-surface-elevated)';
                  }}
                >
                  {key === 'DEL' ? <Delete size={20} /> : key}
                </button>
              );
            })}
          </div>

          {/* Prominent Cancel / Back to previous view button */}
          {currentStaff && onClose && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--nv-hairline-strong)', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  maxWidth: '320px',
                  height: '42px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--nv-hairline-strong)',
                  borderRadius: 'var(--rounded-xs)',
                  color: 'var(--nv-on-dark-mute)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'var(--transition-fast)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--nv-hairline-strong)';
                  e.currentTarget.style.color = 'var(--nv-on-dark-mute)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                <X size={15} />
                ยกเลิก / กลับไปหน้าเดิม (Cancel)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
