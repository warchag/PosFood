import React, { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';

export const ReceiptModal = ({ orderId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const res = await fetch(`/api/billing/receipt/${orderId}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (err) {
        console.error('Error fetching receipt:', err);
      } finally {
        setLoading(false);
      }
    };
    if (orderId) fetchReceipt();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3>
            ใบเสร็จรับเงิน (Receipt Preview)
          </h3>
          <button 
            className="modal-close-btn"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Thermal Slip Body */}
        <div className="modal-body" style={{ background: 'var(--bg-surface-secondary)', padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>กำลังโหลดใบเสร็จ...</p>
          ) : data ? (
            <div className="receipt-paper" id="printable-receipt">
              <div className="receipt-header">
                <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', color: '#111827' }}>
                  {data.storeInfo?.receipt_header_title || 'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ (ABB)'}
                </div>
                <div className="receipt-title">
                  {data.storeInfo?.restaurant_name || 'SIAM CULINARY'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#374151', lineHeight: 1.45, marginTop: '4px' }}>
                  {data.storeInfo?.branch_name && (
                    <div><strong>สาขา:</strong> {data.storeInfo.branch_name}</div>
                  )}
                  <div><strong>เลขประจำตัวผู้เสียภาษี:</strong> {data.storeInfo?.tax_id || '0105563089123'}</div>
                  <div>{data.storeInfo?.restaurant_address || 'กรุงเทพมหานคร'}</div>
                  <div>โทร: {data.storeInfo?.restaurant_phone || '02-000-0000'}</div>
                </div>
              </div>

              {/* Order Info */}
              <div style={{ fontSize: '0.78rem', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.6rem', marginBottom: '0.6rem', color: '#374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>โต๊ะ: <strong>{data.order.table_number}</strong></span>
                  <span>บิล: {data.order.order_number}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span>วันที่: {new Date(data.order.created_at).toLocaleDateString('th-TH')}</span>
                  <span>เวลา: {new Date(data.order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <span>ลูกค้า: {data.order.guest_count} ท่าน</span>
                  {data.order.staff_name && (
                    <span>ผู้รับออเดอร์: <strong>{data.order.staff_name}</strong></span>
                  )}
                </div>
                {data.payment?.cashier_name && (
                  <div style={{ textAlign: 'right', marginTop: '2px' }}>
                    แคชเชียร์: <strong>{data.payment.cashier_name}</strong>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div style={{ borderBottom: '1px dashed #9ca3af', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#4b5563' }}>
                      <th style={{ paddingBottom: '4px' }}>รายการ</th>
                      <th style={{ textAlign: 'center', width: '30px' }}>จน.</th>
                      <th style={{ textAlign: 'right', width: '60px' }}>รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, i) => (
                      <tr key={i} style={{ color: '#111827' }}>
                        <td style={{ padding: '3px 0' }}>{item.item_name}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>฿{parseFloat(item.total_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculation Totals */}
              <div style={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ยอดรวม (Subtotal)</span>
                  <span>฿{parseFloat(data.order.subtotal).toFixed(2)}</span>
                </div>
                {parseFloat(data.order.discount_amount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                    <span>ส่วนลด (Discount)</span>
                    <span>-฿{parseFloat(data.order.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(data.order.service_charge_amount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Service Charge ({data.order.service_charge_rate}%)</span>
                    <span>฿{parseFloat(data.order.service_charge_amount).toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
                  <span>฿{parseFloat(data.order.vat_amount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 700, color: '#111827', borderTop: '1px solid #111827', paddingTop: '4px', marginTop: '4px' }}>
                  <span>ยอดสุทธิ (Total)</span>
                  <span>฿{parseFloat(data.order.total_amount).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Details */}
              {data.payment && (
                <div style={{ marginTop: '0.6rem', borderTop: '1px dashed #9ca3af', paddingTop: '0.6rem', fontSize: '0.75rem', color: '#4b5563' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>วิธีชำระ:</span>
                    <span><strong>{data.payment.payment_method.toUpperCase()}</strong></span>
                  </div>
                  {data.payment.payment_method === 'cash' && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>รับเงิน:</span>
                        <span>฿{parseFloat(data.payment.amount_received).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>เงินทอน:</span>
                        <span>฿{parseFloat(data.payment.change_amount).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Footer Note */}
              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.72rem', color: '#4b5563', borderTop: '1px dashed #9ca3af', paddingTop: '0.6rem', lineHeight: 1.4 }}>
                <div>{data.storeInfo?.receipt_footer || 'ขอบคุณที่ใช้บริการ / Thank you & Please come again'}</div>
                <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>
                  VAT Included • ราคารวมภาษีมูลค่าเพิ่มแล้ว
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#ef4444' }}>ไม่พบข้อมูลใบเสร็จ</p>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            ปิด
          </button>
          <button className="btn btn-primary" onClick={handlePrint} disabled={!data}>
            <Printer size={16} /> พิมพ์ใบเสร็จ
          </button>
        </div>
      </div>
    </div>
  );
};
