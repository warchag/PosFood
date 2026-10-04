import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Utensils, 
  Smartphone,
  Share2
} from 'lucide-react';
import { usePos } from '../../context/PosContext';

export const TableQrModal = ({ table, onClose }) => {
  const { storeSettings } = usePos();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef(null);

  const storeName = storeSettings?.restaurant_name || 'SIAM CULINARY';
  const customerUrl = `${window.location.origin}/?table=${encodeURIComponent(table.table_number)}`;

  useEffect(() => {
    QRCode.toDataURL(customerUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR code:', err));
  }, [customerUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(customerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenCustomerView = () => {
    window.open(customerUrl, '_blank');
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=600,height=800');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR สั่งอาหาร - โต๊ะ ${table.table_number}</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justifyContent: center;
              min-height: 90vh;
              margin: 0;
              padding: 20px;
              color: #111827;
              text-align: center;
            }
            .card {
              border: 3px solid #111827;
              border-radius: 16px;
              padding: 30px 24px;
              max-width: 360px;
              width: 100%;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            .store-name {
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 1px;
              text-transform: uppercase;
              color: #4b5563;
              margin-bottom: 4px;
            }
            .table-badge {
              display: inline-block;
              background: #111827;
              color: #ffffff;
              font-size: 32px;
              font-weight: 900;
              padding: 6px 24px;
              border-radius: 8px;
              margin: 12px 0 16px;
              letter-spacing: 0.5px;
            }
            .qr-img {
              width: 240px;
              height: 240px;
              margin: 0 auto 16px;
              display: block;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 8px;
            }
            .tagline {
              font-size: 16px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 6px;
            }
            .instructions {
              font-size: 13px;
              color: #6b7280;
              line-height: 1.4;
            }
            .footer-url {
              font-size: 11px;
              color: #9ca3af;
              margin-top: 16px;
              word-break: break-all;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="store-name">${storeName}</div>
            <div class="table-badge">โต๊ะ ${table.table_number}</div>
            <img class="qr-img" src="${qrDataUrl}" alt="Table QR Code" />
            <div class="tagline">📱 สแกนเพื่อดูเมนู & สั่งอาหาร</div>
            <div class="instructions">
              เปิดกล้องมือถือสแกน QR Code นี้<br/>
              สั่งอาหารง่าย ไม่ต้องรอเรียกพนักงาน
            </div>
            <div class="footer-url">${customerUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
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
        zIndex: 2200,
        padding: '1rem'
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--nv-surface-dark)',
          border: '1px solid var(--nv-hairline-strong)',
          borderRadius: 'var(--rounded-sm)',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
        }}
      >
        {/* Header */}
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
              color: '#000000'
            }}>
              <QrCode size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                QR Code สั่งอาหารประจำโต๊ะ {table.table_number}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--nv-on-dark-mute)', margin: '2px 0 0' }}>
                {table.zone_name} • รองรับ {table.capacity} ที่นั่ง
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--nv-on-dark-mute)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body / Printable Tent Preview */}
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div 
            ref={printRef}
            style={{
              background: '#ffffff',
              borderRadius: 'var(--rounded-sm)',
              padding: '1.5rem 1.25rem',
              color: '#111827',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              maxWidth: '340px',
              margin: '0 auto'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#6b7280' }}>
              {storeName}
            </div>

            <div style={{
              display: 'inline-block',
              background: '#000000',
              color: 'var(--nv-primary)',
              fontSize: '1.5rem',
              fontWeight: 900,
              padding: '4px 16px',
              borderRadius: 'var(--rounded-xs)',
              margin: '10px 0 14px'
            }}>
              โต๊ะ {table.table_number}
            </div>

            {/* QR Image */}
            <div style={{
              width: '210px',
              height: '210px',
              margin: '0 auto',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`QR โต๊ะ ${table.table_number}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>กำลังสร้าง QR Code...</span>
              )}
            </div>

            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Smartphone size={16} color="var(--nv-primary)" />
                สแกนดูเมนู & สั่งอาหาร
              </div>
              <p style={{ fontSize: '0.74rem', color: '#4b5563', margin: '4px 0 0' }}>
                เปิดกล้องมือถือสแกนได้ทันที ไม่ต้องโหลดแอป
              </p>
            </div>
          </div>

          {/* URL Bar */}
          <div style={{
            marginTop: '1.25rem',
            background: 'var(--nv-surface-elevated)',
            border: '1px solid var(--nv-hairline-strong)',
            borderRadius: 'var(--rounded-xs)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <span style={{ 
              fontSize: '0.74rem', 
              color: 'var(--nv-on-dark-mute)', 
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '300px'
            }}>
              {customerUrl}
            </span>

            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                background: copied ? 'var(--nv-primary)' : 'rgba(255, 255, 255, 0.08)',
                color: copied ? '#000000' : '#ffffff',
                border: 'none',
                borderRadius: 'var(--rounded-xs)',
                padding: '4px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
                transition: 'var(--transition-fast)'
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--nv-hairline-strong)',
          display: 'flex',
          gap: '10px',
          background: '#000000'
        }}>
          <button
            type="button"
            onClick={handleOpenCustomerView}
            style={{
              flex: 1,
              height: '42px',
              background: 'transparent',
              border: '1px solid var(--nv-hairline-strong)',
              borderRadius: 'var(--rounded-xs)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <ExternalLink size={15} />
            เปิดทดสอบหน้านี้
          </button>

          <button
            type="button"
            onClick={handlePrint}
            style={{
              flex: 1,
              height: '42px',
              background: 'var(--nv-primary)',
              border: 'none',
              borderRadius: 'var(--rounded-xs)',
              color: '#000000',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Printer size={15} />
            พิมพ์ป้ายตั้งโต๊ะ
          </button>
        </div>
      </div>
    </div>
  );
};
