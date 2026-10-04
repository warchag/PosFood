import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Receipt, 
  Percent, 
  CreditCard, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Building2, 
  Phone, 
  MapPin, 
  QrCode,
  Sparkles
} from 'lucide-react';

export const ReceiptSettingsView = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [settings, setSettings] = useState({
    restaurant_name: '',
    receipt_header_title: '',
    branch_name: '',
    tax_id: '',
    restaurant_address: '',
    restaurant_phone: '',
    receipt_footer: '',
    vat_rate: '7',
    service_charge_rate: '10',
    currency_symbol: '฿',
    promptpay_id: ''
  });

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data) {
          setSettings(prev => ({
            ...prev,
            ...json.data
          }));
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        setErrorMessage('ไม่สามารถโหลดข้อมูลการตั้งค่าได้');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setSaveSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const json = await res.json();

      if (json.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setErrorMessage(json.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
        กำลังโหลดข้อมูลการตั้งค่าร้านค้าและใบเสร็จ...
      </div>
    );
  }

  // Sample values for preview calculation
  const subtotalSample = 680;
  const serviceRate = parseFloat(settings.service_charge_rate) || 0;
  const vatRate = parseFloat(settings.vat_rate) || 0;
  const serviceSample = (subtotalSample * serviceRate) / 100;
  const vatSample = ((subtotalSample + serviceSample) * vatRate) / 100;
  const totalSample = subtotalSample + serviceSample + vatSample;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Notifications */}
      {saveSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--status-available-bg)',
          border: '1px solid var(--status-available)',
          color: 'var(--status-available-text)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--rounded-sm)',
          fontSize: '0.9rem',
          fontWeight: 700
        }}>
          <CheckCircle2 size={18} />
          บันทึกการตั้งค่าชื่อร้านค้าและใบเสร็จเรียบร้อยแล้ว ข้อมูลจะปรากฏบนบิลใบเสร็จทุกใบในระบบทันที
        </div>
      )}

      {errorMessage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(229, 32, 32, 0.1)',
          border: '1px solid var(--nv-error)',
          color: 'var(--nv-error)',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--rounded-sm)',
          fontSize: '0.9rem',
          fontWeight: 700
        }}>
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      {/* Main Grid: Settings Form & Live Receipt Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.35fr) minmax(320px, 1fr)', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* Form Container */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Store & Header Tax Details */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--rounded-sm)',
            padding: '1.5rem',
            position: 'relative'
          }}>
            <div className="corner-square" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Store size={18} color="var(--nv-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>
                1. ข้อมูลร้านค้าและหัวบิลใบกำกับภาษี (Receipt Header & Tax Info)
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Restaurant Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  ชื่อร้านค้า (Restaurant Name) *
                </label>
                <input
                  type="text"
                  required
                  value={settings.restaurant_name}
                  onChange={(e) => handleChange('restaurant_name', e.target.value)}
                  placeholder="เช่น Siam Culinary & Bistro"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Receipt Header Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  หัวข้อเอกสารใบเสร็จ (Receipt Document Title) *
                </label>
                <input
                  type="text"
                  required
                  value={settings.receipt_header_title}
                  onChange={(e) => handleChange('receipt_header_title', e.target.value)}
                  placeholder="เช่น ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ (ABB)"
                  style={{ width: '100%' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                  ข้อความหัวเอกสารตามระเบียบกรมสรรพากร เช่น ใบกำกับภาษีอย่างย่อ (ABB)
                </span>
              </div>

              {/* 2-col: Branch and Tax ID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    สาขาที่ (Branch Name / Code)
                  </label>
                  <input
                    type="text"
                    value={settings.branch_name}
                    onChange={(e) => handleChange('branch_name', e.target.value)}
                    placeholder="เช่น สำนักงานใหญ่ (Head Office)"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                    เลขประจำตัวผู้เสียภาษี 13 หลัก (Tax ID) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    value={settings.tax_id}
                    onChange={(e) => handleChange('tax_id', e.target.value)}
                    placeholder="เช่น 0105563089123"
                    style={{ width: '100%', letterSpacing: '1px' }}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  ที่อยู่ร้านค้า (Restaurant Address) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={settings.restaurant_address}
                  onChange={(e) => handleChange('restaurant_address', e.target.value)}
                  placeholder="เช่น 88/1 ถ.สุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กทม. 10110"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  เบอร์โทรศัพท์ร้านค้า (Phone Number)
                </label>
                <input
                  type="text"
                  value={settings.restaurant_phone}
                  onChange={(e) => handleChange('restaurant_phone', e.target.value)}
                  placeholder="เช่น 02-765-4321 หรือ 081-234-5678"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Tax, Service Charge & PromptPay */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--rounded-sm)',
            padding: '1.5rem',
            position: 'relative'
          }}>
            <div className="corner-square" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Percent size={18} color="var(--nv-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>
                2. อัตราภาษี ค่าบริการ & ช่องทางชำระ (Tax Rates & Payment)
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
              {/* VAT Rate */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  ภาษี VAT (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings.vat_rate}
                  onChange={(e) => handleChange('vat_rate', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Service Charge */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  Service Charge (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={settings.service_charge_rate}
                  onChange={(e) => handleChange('service_charge_rate', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Currency Symbol */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                  สัญลักษณ์สกุลเงิน
                </label>
                <input
                  type="text"
                  value={settings.currency_symbol}
                  onChange={(e) => handleChange('currency_symbol', e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* PromptPay ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                หมายเลข PromptPay (เบอร์โทร หรือ เลขบัตรประชาชน สำหรับสร้าง QR ชำระเงิน)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={settings.promptpay_id}
                  onChange={(e) => handleChange('promptpay_id', e.target.value)}
                  placeholder="เช่น 0891234567 หรือ 1100400123456"
                  style={{ width: '100%' }}
                />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                ระบบจะใช้หมายเลขนี้ในการสร้าง Thai QR Code มาตรฐาน EMVCo ให้ลูกค้าสแกนจ่ายบนโต๊ะ
              </span>
            </div>
          </div>

          {/* Section 3: Receipt Footer Message */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--rounded-sm)',
            padding: '1.5rem',
            position: 'relative'
          }}>
            <div className="corner-square" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Receipt size={18} color="var(--nv-primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>
                3. ข้อความปิดท้ายใบเสร็จ (Receipt Footer Note)
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '5px' }}>
                ข้อความขอบคุณท้ายบิล (Thank you / Disclaimer message)
              </label>
              <input
                type="text"
                value={settings.receipt_footer}
                onChange={(e) => handleChange('receipt_footer', e.target.value)}
                placeholder="เช่น ขอบคุณที่ใช้บริการ / Thank you & Please come again"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Submit Action */}
          <div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{
                width: '100%',
                height: '46px',
                fontSize: '1rem',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Save size={18} />
              {saving ? 'กำลังบันทึกข้อมูลลงฐานข้อมูล...' : 'บันทึกการตั้งค่าร้านค้าและใบเสร็จ'}
            </button>
          </div>
        </form>

        {/* Right Column: Live Thermal Slip Preview */}
        <div style={{
          position: 'sticky',
          top: '80px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{
            background: 'var(--nv-surface-dark)',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--rounded-sm)',
            fontSize: '0.85rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--nv-hairline-strong)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} color="var(--nv-primary)" />
              ตัวอย่างบิลพิมพ์จริง (Live Receipt Preview)
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--nv-primary)' }}>80MM THERMAL SLIP</span>
          </div>

          {/* Realistic Thermal Paper */}
          <div className="receipt-paper" style={{ width: '100%', maxWidth: '380px', margin: '0 auto', boxShadow: 'none' }}>
            
            {/* Header */}
            <div className="receipt-header">
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', color: '#111827' }}>
                {settings.receipt_header_title || 'ใบเสร็จรับเงิน / ใบกำกับภาษีอย่างย่อ (ABB)'}
              </div>
              <div className="receipt-title" style={{ fontSize: '1.2rem' }}>
                {settings.restaurant_name || 'SIAM CULINARY'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#374151', lineHeight: 1.45, marginTop: '4px' }}>
                {settings.branch_name && (
                  <div><strong>สาขา:</strong> {settings.branch_name}</div>
                )}
                <div><strong>เลขประจำตัวผู้เสียภาษี:</strong> {settings.tax_id || '0105563089123'}</div>
                <div>{settings.restaurant_address || 'ที่อยู่ร้านค้า'}</div>
                <div>โทร: {settings.restaurant_phone || '02-000-0000'}</div>
              </div>
            </div>

            {/* Mock Order Metadata */}
            <div style={{ fontSize: '0.78rem', borderBottom: '1px dashed #9ca3af', paddingBottom: '0.6rem', marginBottom: '0.6rem', color: '#374151' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>โต๊ะ: <strong>A-01</strong></span>
                <span>บิล: ORD-20261004-001</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>วันที่: {new Date().toLocaleDateString('th-TH')}</span>
                <span>เวลา: {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div>ลูกค้า: 2 ท่าน • พนักงาน: แคชเชียร์ 01</div>
            </div>

            {/* Mock Item Lines */}
            <div style={{ borderBottom: '1px dashed #9ca3af', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#4b5563' }}>
                    <th style={{ paddingBottom: '4px' }}>รายการ</th>
                    <th style={{ textAlign: 'center', width: '30px' }}>จน.</th>
                    <th style={{ textAlign: 'right', width: '70px' }}>รวม</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ color: '#111827' }}>
                    <td style={{ padding: '3px 0' }}>ปลากะพงทอดน้ำปลา</td>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td style={{ textAlign: 'right' }}>450.00</td>
                  </tr>
                  <tr style={{ color: '#111827' }}>
                    <td style={{ padding: '3px 0' }}>ต้มยำกุ้งแม่น้ำ (หม้อไฟ)</td>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td style={{ textAlign: 'right' }}>180.00</td>
                  </tr>
                  <tr style={{ color: '#111827' }}>
                    <td style={{ padding: '3px 0' }}>ชาไทยเย็นทรงเครื่อง</td>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td style={{ textAlign: 'right' }}>50.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Calculation Totals */}
            <div style={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.55 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ยอดรวมสินค้า (Subtotal):</span>
                <span>{settings.currency_symbol}{subtotalSample.toFixed(2)}</span>
              </div>

              {serviceRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>ค่าบริการ (Service Charge {serviceRate}%):</span>
                  <span>{settings.currency_symbol}{serviceSample.toFixed(2)}</span>
                </div>
              )}

              {vatRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>ภาษีมูลค่าเพิ่ม (VAT {vatRate}%):</span>
                  <span>{settings.currency_symbol}{vatSample.toFixed(2)}</span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#111827',
                borderTop: '1px solid #111827',
                paddingTop: '0.5rem',
                marginTop: '0.5rem'
              }}>
                <span>ยอดสุทธิ (Total):</span>
                <span>{settings.currency_symbol}{totalSample.toFixed(2)}</span>
              </div>

              {/* Payment Details */}
              <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #d1d5db', paddingTop: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>วิธีชำระเงิน:</span>
                  <span><strong>THAI QR PROMPTPAY</strong></span>
                </div>
                {settings.promptpay_id && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4b5563' }}>
                    <span>PromptPay ID:</span>
                    <span>{settings.promptpay_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Note */}
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.72rem', color: '#4b5563', borderTop: '1px dashed #9ca3af', paddingTop: '0.6rem', lineHeight: 1.4 }}>
              <div>{settings.receipt_footer || 'ขอบคุณที่ใช้บริการ / Thank you & Please come again'}</div>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>
                VAT Included • ราคารวมภาษีมูลค่าเพิ่มแล้ว
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
