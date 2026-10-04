import React, { useState, useEffect } from 'react';
import { usePos } from '../../context/PosContext';
import { TableQrModal } from './TableQrModal';
import { 
  X, 
  Users, 
  Clock, 
  Utensils, 
  CreditCard, 
  ArrowRightLeft, 
  Receipt, 
  Plus, 
  Check, 
  ChefHat,
  ChevronRight,
  UserX,
  QrCode
} from 'lucide-react';

export const TableActionModal = ({ 
  table, 
  onClose, 
  onGoToOrder, 
  onOpenCheckout,
  onOpenReceipt
}) => {
  const [showQrModal, setShowQrModal] = useState(false);
  const { 
    openTable, 
    cancelTable,
    fetchOrderForTable, 
    transferTable, 
    tables 
  } = usePos();

  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestCount, setGuestCount] = useState(2);
  const [notes, setNotes] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [targetTableId, setTargetTableId] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      if (table.current_order_id || table.status !== 'available') {
        const data = await fetchOrderForTable(table.id);
        if (isMounted) setOrderData(data);
      }
      if (isMounted) setLoading(false);
    };
    load();
    return () => { isMounted = false; };
  }, [table, fetchOrderForTable]);

  const handleOpenTable = async () => {
    const success = await openTable(table.id, guestCount, notes);
    if (success) {
      onGoToOrder(table);
    }
  };

  const handleTransfer = async () => {
    if (!targetTableId) return;
    const success = await transferTable(table.id, targetTableId);
    if (success) {
      onClose();
    }
  };

  const handleCancelTable = async () => {
    const hasItems = orderData?.items?.length > 0;
    const msg = hasItems 
      ? `โต๊ะ ${table.table_number} มีรายการอาหารที่สั่งไว้แล้ว ต้องการยกเลิกออเดอร์ทั้งหมดและคืนโต๊ะว่างใช่หรือไม่?` 
      : `ลูกค้ายกเลิก/ไม่สั่งอาหาร ต้องการยกเลิกการเปิดโต๊ะ ${table.table_number} และคืนสถานะเป็น "โต๊ะว่าง" ใช่หรือไม่?`;

    if (!window.confirm(msg)) return;

    setCancelling(true);
    const success = await cancelTable(table.id, 'ลูกค้ายกเลิก/ไม่สั่งอาหาร');
    setCancelling(false);
    if (success) {
      onClose();
    }
  };

  const availableTargetTables = tables.filter(t => t.id !== table.id && t.status === 'available');

  const getStatusBadge = () => {
    switch (table.status) {
      case 'available':
        return <span className="stat-chip stat-chip-available">🟢 ว่าง</span>;
      case 'occupied':
        return <span className="stat-chip stat-chip-occupied">🔴 มีลูกค้า</span>;
      case 'ordered':
        return <span className="stat-chip" style={{ background: 'var(--status-ordered-bg)', color: 'var(--status-ordered-text)', border: '1px solid var(--status-ordered-border)' }}>🟡 รออาหาร</span>;
      case 'billing':
        return <span className="stat-chip" style={{ background: 'var(--status-billing-bg)', color: 'var(--status-billing-text)', border: '1px solid var(--status-billing-border)' }}>🟣 รอเช็คบิล</span>;
      default:
        return <span className="stat-chip">{table.status}</span>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2>
                โต๊ะ {table.table_number}
              </h2>
              {getStatusBadge()}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
              {table.zone_name} • รองรับ {table.capacity} ที่นั่ง
            </p>
          </div>
          <button 
            className="modal-close-btn"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {table.status === 'available' ? (
            /* Open Table Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  จำนวนลูกค้า (ท่าน)
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 4, 6, 8].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGuestCount(num)}
                      style={{
                        flex: 1,
                        padding: '0.65rem 0',
                        borderRadius: 'var(--radius-sm)',
                        border: guestCount === num ? '2px solid var(--apple-blue)' : '1px solid var(--border-subtle)',
                        background: guestCount === num ? 'var(--apple-blue-tint)' : 'var(--bg-canvas)',
                        color: guestCount === num ? 'var(--apple-blue)' : 'var(--text-main)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  หมายเหตุเพิ่มเติม / ความต้องการพิเศษ
                </label>
                <input
                  type="text"
                  placeholder="เช่น ขอเก้าอี้เด็ก, แอร์ตก, ลูกค้าประจำ..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem'
                  }}
                />
              </div>

              <div style={{ background: 'var(--status-available-bg)', border: '1px dashed var(--status-available-border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                <p style={{ fontSize: '0.84rem', color: 'var(--status-available-text)', lineHeight: 1.5 }}>
                  💡 เมื่อกด "เปิดโต๊ะและสั่งอาหาร" ระบบจะเปลี่ยนสถานะโต๊ะบนผัง Top View เป็น "มีลูกค้า" และนำทางไปหน้าเมนูอาหารทันที
                </p>
              </div>
            </div>
          ) : (
            /* Occupied Table Details & Order Summary */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Order Items List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    รายการอาหารที่สั่ง ({orderData?.items?.length || 0} รายการ)
                  </h4>
                  {orderData && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      บิล: {orderData.order_number}
                    </span>
                  )}
                </div>

                {loading ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>กำลังโหลดรายการอาหาร...</p>
                ) : orderData?.items?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                    {orderData.items.map(item => (
                      <div 
                        key={item.id} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-canvas)',
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ 
                            background: 'var(--apple-blue-tint)', 
                            color: 'var(--apple-blue)', 
                            padding: '2px 8px', 
                            borderRadius: 'var(--radius-xs)', 
                            fontSize: '0.8rem', 
                            fontWeight: 700 
                          }}>
                            {item.quantity}x
                          </span>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-main)' }}>{item.item_name}</div>
                            {item.notes && <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>• {item.notes}</div>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--apple-blue)' }}>
                            ฿{parseFloat(item.total_price).toFixed(2)}
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: item.status === 'served' ? 'var(--status-available-bg)' : 'var(--status-ordered-bg)',
                            color: item.status === 'served' ? 'var(--status-available-text)' : 'var(--status-ordered-text)'
                          }}>
                            {item.status === 'served' ? '✓ เสิร์ฟแล้ว' : item.status === 'cooking' ? '🍳 กำลังปรุง' : '⏳ รอคิว'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    background: 'var(--bg-surface-secondary)',
                    border: '1px dashed var(--border-subtle)',
                    borderRadius: 'var(--rounded-sm)',
                    padding: '1.25rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    <Utensils size={28} style={{ opacity: 0.25, margin: '0 auto 0.5rem' }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>ยังไม่มีรายการอาหารในโต๊ะนี้</p>
                    <p style={{ fontSize: '0.78rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                      กดปุ่ม <strong>"สั่งอาหารเพิ่ม"</strong> เพื่อเลือกเมนู หรือกด <strong>"ยกเลิกเปิดโต๊ะ"</strong> ด้านล่างหากลูกค้าไม่สั่งอาหาร
                    </p>
                  </div>
                )}
              </div>

              {/* Order Totals Summary */}
              {orderData && (
                <div style={{ background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <span>ยอดรวมอาหาร</span>
                    <span>฿{parseFloat(orderData.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {parseFloat(orderData.discount_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--status-occupied)', marginBottom: '4px' }}>
                      <span>ส่วนลด ({orderData.discount_type})</span>
                      <span>-฿{parseFloat(orderData.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(orderData.service_charge_amount || 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Service Charge ({orderData.service_charge_rate}%)</span>
                      <span>฿{parseFloat(orderData.service_charge_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <span>ภาษีมูลค่าเพิ่ม VAT (7%)</span>
                    <span>฿{parseFloat(orderData.vat_amount || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700, color: 'var(--apple-blue)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                    <span>ยอดรวมสุทธิ</span>
                    <span>฿{parseFloat(orderData.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Transfer Table Mode */}
              {isTransferring && (
                <div style={{ background: 'var(--apple-blue-tint)', border: '1px solid var(--apple-blue-tint-strong)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--apple-blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowRightLeft size={15} /> ย้ายรายการและลูกค้าไปยังโต๊ะอื่น:
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={targetTableId}
                      onChange={(e) => setTargetTableId(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.8rem'
                      }}
                    >
                      <option value="">-- เลือกโต๊ะปลายทางที่ว่าง --</option>
                      {availableTargetTables.map(t => (
                        <option key={t.id} value={t.id}>
                          โต๊ะ {t.table_number} ({t.zone_name} - {t.capacity} ที่นั่ง)
                        </option>
                      ))}
                    </select>
                    <button 
                      className="btn btn-primary"
                      onClick={handleTransfer}
                      disabled={!targetTableId}
                    >
                      ยืนยันการย้าย
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer" style={{ padding: '0.85rem 1.25rem' }}>
          {table.status === 'available' ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setShowQrModal(true)}
                title="สร้าง QR Code ให้ลูกค้าสแกนสั่งอาหารเอง"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <QrCode size={15} />
                QR สั่งอาหาร
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={onClose}>
                  ยกเลิก
                </button>
                <button className="btn btn-primary" onClick={handleOpenTable}>
                  <Utensils size={16} />
                  เปิดโต๊ะและสั่งอาหาร
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%' }}>
              {/* Row 1: Table Operations Bar (Cancel table, Transfer, Print bill, QR code, Close) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ height: '34px', fontSize: '0.8rem', padding: '0 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    onClick={handleCancelTable}
                    disabled={cancelling}
                    title="ยกเลิกการเปิดโต๊ะ และคืนสถานะเป็นโต๊ะว่าง (กรณีลูกค้าเปลี่ยนใจไม่สั่ง)"
                  >
                    <UserX size={14} />
                    {cancelling ? 'กำลังยกเลิก...' : 'ยกเลิกเปิดโต๊ะ'}
                  </button>

                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    style={{ height: '34px', fontSize: '0.8rem', padding: '0 10px' }}
                    onClick={() => setIsTransferring(!isTransferring)}
                    title="ย้ายโต๊ะ"
                  >
                    <ArrowRightLeft size={14} />
                    {isTransferring ? 'ปิดย้ายโต๊ะ' : 'ย้ายโต๊ะ'}
                  </button>

                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    style={{ height: '34px', fontSize: '0.8rem', padding: '0 10px' }}
                    onClick={() => setShowQrModal(true)}
                    title="แสดง QR Code สั่งอาหารประจำโต๊ะนี้"
                  >
                    <QrCode size={14} />
                    QR โต๊ะ
                  </button>

                  {orderData?.items?.length > 0 && (
                    <button 
                      type="button"
                      className="btn btn-secondary"
                      style={{ height: '34px', fontSize: '0.8rem', padding: '0 10px' }}
                      onClick={() => onOpenReceipt(orderData.id)}
                      title="ดูบิลชั่วคราว"
                    >
                      <Receipt size={14} />
                      พิมพ์บิล
                    </button>
                  )}
                </div>

                <button 
                  type="button"
                  className="btn btn-secondary"
                  style={{ height: '34px', fontSize: '0.8rem', padding: '0 12px' }}
                  onClick={onClose}
                >
                  ปิด
                </button>
              </div>

              {/* Row 2: Primary Actions (Add Dishes + Checkout) 50% / 50% */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', width: '100%' }}>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  style={{ height: '40px', fontWeight: 700, width: '100%' }}
                  onClick={() => onGoToOrder(table)}
                >
                  <Plus size={15} />
                  สั่งอาหารเพิ่ม
                </button>
                <button 
                  type="button"
                  className="btn btn-primary"
                  style={{ height: '40px', fontWeight: 700, width: '100%' }}
                  onClick={() => onOpenCheckout(orderData)}
                  disabled={!orderData || !orderData.items || orderData.items.length === 0}
                >
                  <CreditCard size={15} />
                  คิดเงิน / เช็คบิล
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table QR Code Modal */}
        {showQrModal && (
          <TableQrModal
            table={table}
            onClose={() => setShowQrModal(false)}
          />
        )}
      </div>
    </div>
  );
};
