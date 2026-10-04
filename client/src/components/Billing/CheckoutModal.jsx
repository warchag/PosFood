import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { usePos } from '../../context/PosContext';
import { 
  X, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Receipt, 
  CheckCircle2, 
  Sparkles, 
  Percent, 
  ShieldCheck,
  Store,
  Building2
} from 'lucide-react';

// CRC16 CCITT for EMVCo Thai QR Payment Payload
function crc16(data) {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xFF;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTag(id, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// Generate standard Thai QR PromptPay EMVCo payload
function generatePromptPayPayload(target, amount) {
  if (!target) return '';
  const cleanTarget = target.replace(/[^0-9]/g, '');
  let targetTag = '';
  
  if (cleanTarget.length === 10) {
    // Mobile phone: 0066 + 9 digits (omit leading 0)
    const formattedPhone = '0066' + cleanTarget.slice(1);
    targetTag = formatTag('01', formattedPhone);
  } else if (cleanTarget.length === 13) {
    // National ID or Tax ID
    targetTag = formatTag('02', cleanTarget);
  } else if (cleanTarget.length === 15) {
    // e-Wallet ID
    targetTag = formatTag('03', cleanTarget);
  } else {
    targetTag = formatTag('01', cleanTarget);
  }

  const merchantInfo = formatTag('00', 'A000000677010111') + targetTag;
  
  let payload = 
    formatTag('00', '01') + // Format indicator
    formatTag('01', amount ? '12' : '11') + // 12 = Dynamic with amount, 11 = Static
    formatTag('29', merchantInfo) + // PromptPay AID info
    formatTag('53', '764') + // Currency Code THB
    formatTag('58', 'TH'); // Country Code
    
  if (amount && parseFloat(amount) > 0) {
    payload += formatTag('54', parseFloat(amount).toFixed(2));
  }
  
  payload += '6304';
  const checksum = crc16(payload);
  return payload + checksum;
}

export const CheckoutModal = ({ order, onClose, onSuccess }) => {
  const { currentStaff } = usePos();
  const [paymentMethod, setPaymentMethod] = useState('promptpay'); // 'promptpay', 'cash', 'credit_card'
  const [discountType, setDiscountType] = useState(order.discount_type || 'none');
  const [discountVal, setDiscountVal] = useState(parseFloat(order.discount_value || 0));
  const [serviceChargeRate, setServiceChargeRate] = useState(parseFloat(order.service_charge_rate || 0));
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [completedPaymentData, setCompletedPaymentData] = useState(null);

  // Store & Receipt Settings state
  const [storeSettings, setStoreSettings] = useState({
    restaurant_name: 'Siam Culinary & Bistro',
    receipt_header_title: 'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ (ABB)',
    branch_name: 'สำนักงานใหญ่ (Head Office)',
    restaurant_address: '',
    restaurant_phone: '',
    tax_id: '0105563089123',
    receipt_footer: 'ขอบคุณที่ใช้บริการ / Thank you & Please come again',
    vat_rate: '7',
    service_charge_rate: '10',
    currency_symbol: '฿',
    promptpay_id: '0891234567'
  });

  // Fetch real-time settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data) {
          setStoreSettings(json.data);
          // If order doesn't have custom service charge rate set, use store default
          if (parseFloat(order.service_charge_rate || 0) === 0 && parseFloat(json.data.service_charge_rate || 0) > 0) {
            setServiceChargeRate(parseFloat(json.data.service_charge_rate));
          }
        }
      } catch (err) {
        console.error('Error fetching settings in CheckoutModal:', err);
      }
    };
    fetchSettings();
  }, [order]);

  const subtotal = parseFloat(order.subtotal || 0);

  // Dynamic calculations with real settings
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (subtotal * discountVal) / 100;
  } else if (discountType === 'fixed') {
    discountAmount = Math.min(discountVal, subtotal);
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const serviceChargeAmount = (afterDiscount * serviceChargeRate) / 100;
  const vatRate = parseFloat(storeSettings.vat_rate) || 7.0;
  const vatAmount = ((afterDiscount + serviceChargeAmount) * vatRate) / 100;
  const totalAmount = afterDiscount + serviceChargeAmount + vatAmount;
  const currencySymbol = storeSettings.currency_symbol || '฿';

  const cashReceivedNum = parseFloat(amountReceived || 0);
  const changeAmount = Math.max(0, cashReceivedNum - totalAmount);

  const formatPromptPayDisplay = (id) => {
    if (!id) return '';
    const clean = id.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    }
    if (clean.length === 13) {
      return `${clean.slice(0, 1)}-${clean.slice(1, 5)}-${clean.slice(5, 10)}-${clean.slice(10, 12)}-${clean.slice(12)}`;
    }
    return id;
  };

  const handleQuickCash = (amount) => {
    setAmountReceived(amount.toString());
  };

  const handleExactCash = () => {
    setAmountReceived(Math.ceil(totalAmount).toString());
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);

    try {
      // 1. Sync updated discount, service charge, and VAT rate
      await fetch(`/api/billing/settings/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount_type: discountType,
          discount_value: discountVal,
          service_charge_rate: serviceChargeRate,
          vat_rate: vatRate
        })
      });

      // 2. Process payment
      const res = await fetch('/api/billing/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          payment_method: paymentMethod,
          amount_received: paymentMethod === 'cash' ? cashReceivedNum : totalAmount,
          change_amount: paymentMethod === 'cash' ? changeAmount : 0,
          transaction_ref: `TXN-${Date.now().toString().slice(-8)}`,
          cashier_id: currentStaff?.id || null,
          cashier_name: currentStaff?.nickname || currentStaff?.name || 'แคชเชียร์'
        })
      });

      const json = await res.json();
      if (json.success) {
        setIsProcessing(false);
        setPaymentDone(true);
        setCompletedPaymentData(json.data);

        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.error('Payment error:', err);
      setIsProcessing(false);
    }
  };

  // Generate EMVCo QR code payload
  const promptPayTarget = storeSettings.promptpay_id || '0891234567';
  const qrPayload = generatePromptPayPayload(promptPayTarget, totalAmount);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(qrPayload)}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--nv-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
              {storeSettings.restaurant_name} {storeSettings.branch_name && `• ${storeSettings.branch_name}`}
            </div>
            <h2>
              {paymentDone ? 'ชำระเงินสำเร็จแล้ว' : `คิดเงิน: โต๊ะ ${order.table_number}`}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--nv-on-dark-mute)', marginTop: '2px' }}>
              เลขที่บิล: {order.order_number} {storeSettings.tax_id && `• เลขผู้เสียภาษี: ${storeSettings.tax_id}`}
            </p>
          </div>
          <button 
            className="modal-close-btn"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        {paymentDone ? (
          /* Payment Success State */
          <div className="modal-body" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: 'var(--rounded-sm)',
              background: 'var(--status-available-bg)',
              border: '2px solid var(--nv-primary)',
              color: 'var(--nv-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <CheckCircle2 size={38} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem', letterSpacing: '-0.015em' }}>
              รับชำระเงินเรียบร้อยแล้ว
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              โต๊ะ {order.table_number} ถูกปรับสถานะเป็น "โต๊ะว่าง" พร้อมพิมพ์ใบเสร็จรับเงิน
            </p>

            <div style={{
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--rounded-sm)',
              padding: '1.25rem',
              maxWidth: '420px',
              margin: '0 auto 1.75rem',
              textAlign: 'left',
              position: 'relative'
            }}>
              <div className="corner-square" />
              
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '8px', marginBottom: '8px' }}>
                <strong style={{ color: 'var(--text-main)' }}>{storeSettings.restaurant_name}</strong>
                {storeSettings.branch_name && <div>สาขา: {storeSettings.branch_name}</div>}
                {storeSettings.tax_id && <div>เลขผู้เสียภาษี: {storeSettings.tax_id}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <span>วิธีชำระ:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>
                  {paymentMethod === 'promptpay' ? 'Thai QR PromptPay' : paymentMethod === 'cash' ? 'เงินสด (Cash)' : 'บัตรเครดิต'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <span>ยอดเงินที่ชำระ:</span>
                <span style={{ color: 'var(--nv-primary)', fontWeight: 700, fontSize: '1.1rem' }}>{currencySymbol}{totalAmount.toFixed(2)}</span>
              </div>
              {paymentMethod === 'cash' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    <span>รับเงินมา:</span>
                    <span>{currencySymbol}{cashReceivedNum.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--status-available-text)', fontWeight: 700 }}>
                    <span>เงินทอน:</span>
                    <span>{currencySymbol}{changeAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  if (onSuccess) onSuccess(order.id);
                }}
              >
                <Receipt size={16} /> พิมพ์ใบเสร็จรับเงิน (80mm)
              </button>
              <button 
                className="btn btn-primary"
                onClick={onClose}
              >
                เสร็จสิ้น / กลับผังโต๊ะ
              </button>
            </div>
          </div>
        ) : (
          /* Payment Flow Body */
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '1.5rem' }}>
            {/* Left Column: Bill Breakdown & Adjustments */}
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                สรุปยอดค่าใช้จ่าย (Bill Breakdown)
              </h4>

              <div style={{
                background: 'var(--bg-surface-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--rounded-sm)',
                padding: '1.15rem',
                marginBottom: '1rem',
                position: 'relative'
              }}>
                <div className="corner-square" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>ยอดอาหาร ({order.items?.length || 0} รายการ)</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>

                {/* Discount selector */}
                <div style={{ margin: '8px 0', padding: '8px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ส่วนลด</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[
                        { label: 'ไม่มี', type: 'none', val: 0 },
                        { label: '10%', type: 'percentage', val: 10 },
                        { label: '15%', type: 'percentage', val: 15 },
                        { label: '฿50', type: 'fixed', val: 50 },
                      ].map(d => (
                        <button
                          key={d.label}
                          type="button"
                          onClick={() => {
                            setDiscountType(d.type);
                            setDiscountVal(d.val);
                          }}
                          style={{
                            fontSize: '0.74rem',
                            padding: '3px 8px',
                            borderRadius: 'var(--rounded-sm)',
                            border: discountType === d.type && discountVal === d.val ? '1px solid var(--nv-primary)' : '1px solid var(--border-subtle)',
                            background: discountType === d.type && discountVal === d.val ? 'var(--nv-primary)' : 'var(--bg-surface)',
                            color: discountType === d.type && discountVal === d.val ? '#000000' : 'var(--text-secondary)',
                            fontWeight: discountType === d.type && discountVal === d.val ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--status-occupied)', fontWeight: 600 }}>
                      <span>หักส่วนลด</span>
                      <span>-{currencySymbol}{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Service Charge toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Service Charge</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setServiceChargeRate(0)}
                      style={{
                        fontSize: '0.74rem',
                        padding: '3px 8px',
                        borderRadius: 'var(--rounded-sm)',
                        border: serviceChargeRate === 0 ? '1px solid var(--nv-primary)' : '1px solid var(--border-subtle)',
                        background: serviceChargeRate === 0 ? 'var(--nv-primary)' : 'var(--bg-surface)',
                        color: serviceChargeRate === 0 ? '#000000' : 'var(--text-secondary)',
                        fontWeight: serviceChargeRate === 0 ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      0%
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceChargeRate(parseFloat(storeSettings.service_charge_rate) || 10)}
                      style={{
                        fontSize: '0.74rem',
                        padding: '3px 8px',
                        borderRadius: 'var(--rounded-sm)',
                        border: serviceChargeRate > 0 ? '1px solid var(--nv-primary)' : '1px solid var(--border-subtle)',
                        background: serviceChargeRate > 0 ? 'var(--nv-primary)' : 'var(--bg-surface)',
                        color: serviceChargeRate > 0 ? '#000000' : 'var(--text-secondary)',
                        fontWeight: serviceChargeRate > 0 ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      {parseFloat(storeSettings.service_charge_rate) || 10}%
                    </button>
                  </div>
                </div>

                {serviceChargeAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>Service Charge ({serviceChargeRate}%)</span>
                    <span>{currencySymbol}{serviceChargeAmount.toFixed(2)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <span>ภาษีมูลค่าเพิ่ม VAT ({vatRate}%)</span>
                  <span>{currencySymbol}{vatAmount.toFixed(2)}</span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.45rem',
                  fontWeight: 700,
                  color: 'var(--nv-primary)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '10px'
                }}>
                  <span>ยอดสุทธิ</span>
                  <span>{currencySymbol}{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Payment Methods & PromptPay Display */}
            <div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                ช่องทางการชำระเงิน
              </h4>

              {/* Payment Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('promptpay')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: 'var(--rounded-sm)',
                    border: paymentMethod === 'promptpay' ? '2px solid var(--nv-primary)' : '1px solid var(--border-subtle)',
                    background: paymentMethod === 'promptpay' ? 'var(--status-available-bg)' : 'var(--bg-canvas)',
                    color: paymentMethod === 'promptpay' ? 'var(--nv-primary)' : 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <QrCode size={19} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>พร้อมเพย์</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: 'var(--rounded-sm)',
                    border: paymentMethod === 'cash' ? '2px solid var(--nv-primary)' : '1px solid var(--border-subtle)',
                    background: paymentMethod === 'cash' ? 'var(--status-available-bg)' : 'var(--bg-canvas)',
                    color: paymentMethod === 'cash' ? 'var(--text-main)' : 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <Banknote size={19} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>เงินสด</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    borderRadius: 'var(--rounded-sm)',
                    border: paymentMethod === 'credit_card' ? '2px solid var(--nv-primary)' : '1px solid var(--border-subtle)',
                    background: paymentMethod === 'credit_card' ? 'var(--status-available-bg)' : 'var(--bg-canvas)',
                    color: paymentMethod === 'credit_card' ? 'var(--text-main)' : 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <CreditCard size={19} />
                  <span style={{ fontSize: '0.74rem', fontWeight: 700 }}>บัตรเครดิต</span>
                </button>
              </div>

              {/* Method Specific UI */}
              {paymentMethod === 'promptpay' && (
                <div className="qr-container" style={{ position: 'relative' }}>
                  <div className="corner-square" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--nv-primary)', fontWeight: 700, fontSize: '0.88rem' }}>
                    <ShieldCheck size={18} /> Thai QR Payment (EMVCo)
                  </div>

                  {/* Store Name & PromptPay Details Header */}
                  <div style={{ marginTop: '4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {storeSettings.restaurant_name || 'SIAM CULINARY'}
                    </div>
                    {storeSettings.branch_name && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        สาขา: {storeSettings.branch_name}
                      </div>
                    )}
                  </div>
                  
                  {/* Generated QR View using PromptPay EMVCo Payload */}
                  <div className="qr-box" style={{ background: '#ffffff', padding: '10px' }}>
                    <img 
                      src={qrCodeUrl}
                      alt="PromptPay QR Code"
                      style={{ width: '170px', height: '170px', display: 'block' }}
                    />
                  </div>

                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--nv-primary)' }}>
                    {currencySymbol}{totalAmount.toFixed(2)}
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '4px', fontWeight: 600 }}>
                    พร้อมเพย์ ID: <strong style={{ color: 'var(--nv-primary)' }}>{formatPromptPayDisplay(storeSettings.promptpay_id) || 'ไม่ได้ระบุ'}</strong>
                  </div>

                  {storeSettings.tax_id && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      เลขผู้เสียภาษี: {storeSettings.tax_id}
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'cash' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      รับเงินสดจากลูกค้า ({currencySymbol}):
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        fontSize: '1.35rem',
                        fontWeight: 700,
                        color: 'var(--nv-primary)'
                      }}
                    />
                  </div>

                  {/* Quick cash pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button 
                      type="button" 
                      onClick={handleExactCash}
                      className="zone-btn"
                      style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem' }}
                    >
                      พอดี ({currencySymbol}{Math.ceil(totalAmount)})
                    </button>
                    {[100, 500, 1000].map(amt => (
                      <button 
                        key={amt} 
                        type="button" 
                        onClick={() => handleQuickCash(amt)}
                        className="zone-btn"
                        style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem' }}
                      >
                        +{currencySymbol}{amt}
                      </button>
                    ))}
                  </div>

                  {/* Change calculation box */}
                  <div style={{
                    background: cashReceivedNum >= totalAmount ? 'var(--status-available-bg)' : 'var(--bg-canvas)',
                    border: '1px solid ' + (cashReceivedNum >= totalAmount ? 'var(--status-available-border)' : 'var(--border-subtle)'),
                    borderRadius: 'var(--rounded-sm)',
                    padding: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>เงินทอนที่ต้องคืน:</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 700, color: cashReceivedNum >= totalAmount ? 'var(--status-available-text)' : 'var(--text-muted)' }}>
                      {currencySymbol}{changeAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'credit_card' && (
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--rounded-sm)',
                  textAlign: 'center',
                  position: 'relative'
                }}>
                  <div className="corner-square" />
                  <CreditCard size={36} style={{ color: 'var(--nv-primary)', margin: '0 auto 0.75rem' }} />
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: 700 }}>รูดบัตรผ่านเครื่อง EDC</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    รองรับ Visa, Mastercard, JCB, UnionPay Contactless
                  </p>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--nv-primary)', marginTop: '1rem' }}>
                    {currencySymbol}{totalAmount.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Confirm Pay Button */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.5rem', height: '46px', fontSize: '1rem' }}
                disabled={isProcessing || (paymentMethod === 'cash' && cashReceivedNum < totalAmount)}
                onClick={handleConfirmPayment}
              >
                <CheckCircle2 size={18} />
                {isProcessing ? 'กำลังบันทึกการชำระเงิน...' : 'ยืนยันรับชำระเงิน (Confirm Payment)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
