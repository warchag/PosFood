import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, Printer, QrCode, Layers, Check } from 'lucide-react';
import { usePos } from '../../context/PosContext';

export const BatchQrPrintModal = ({ onClose }) => {
  const { tables, zones, storeSettings } = usePos();
  const [qrMap, setQrMap] = useState({});
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('all');

  const storeName = storeSettings?.restaurant_name || 'SIAM CULINARY';

  useEffect(() => {
    const generateAllQrs = async () => {
      const map = {};
      for (const table of tables) {
        const url = `${window.location.origin}/?table=${encodeURIComponent(table.table_number)}`;
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 200,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'H'
          });
          map[table.id] = { dataUrl, url };
        } catch (e) {
          console.error(e);
        }
      }
      setQrMap(map);
    };

    if (tables.length > 0) {
      generateAllQrs();
    }
  }, [tables]);

  const displayedTables = selectedZoneFilter === 'all' 
    ? tables 
    : tables.filter(t => t.zone_id.toString() === selectedZoneFilter);

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    
    const cardsHtml = displayedTables.map(t => {
      const qr = qrMap[t.id];
      const zone = zones.find(z => z.id === t.zone_id);
      return `
        <div class="qr-card">
          <div class="store-name">${storeName}</div>
          <div class="table-badge">โต๊ะ ${t.table_number}</div>
          <div class="zone-text">${zone ? zone.name.split(' (')[0] : ''}</div>
          ${qr ? `<img class="qr-img" src="${qr.dataUrl}" alt="QR ${t.table_number}" />` : ''}
          <div class="tagline">📱 สแกนเพื่อสั่งอาหาร</div>
          <div class="hint">เปิดกล้องมือถือสแกนได้ทันที</div>
          <div class="url-text">${window.location.origin}/?table=${encodeURIComponent(t.table_number)}</div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>พิมพ์ QR Code ทุกโต๊ะ - ${storeName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 10px;
              color: #111827;
              background: #ffffff;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              page-break-inside: auto;
            }
            .qr-card {
              border: 2px dashed #9ca3af;
              border-radius: 12px;
              padding: 16px;
              text-align: center;
              background: #ffffff;
              page-break-inside: avoid;
            }
            .store-name {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              color: #6b7280;
              letter-spacing: 0.5px;
            }
            .table-badge {
              display: inline-block;
              background: #000000;
              color: #76b900;
              font-size: 24px;
              font-weight: 900;
              padding: 4px 16px;
              border-radius: 6px;
              margin: 6px 0 2px;
            }
            .zone-text {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .qr-img {
              width: 150px;
              height: 150px;
              margin: 0 auto 6px;
              display: block;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 4px;
            }
            .tagline {
              font-size: 14px;
              font-weight: 800;
              color: #111827;
            }
            .hint {
              font-size: 11px;
              color: #6b7280;
              margin-top: 2px;
            }
            .url-text {
              font-size: 9px;
              color: #9ca3af;
              margin-top: 6px;
              word-break: break-all;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${cardsHtml}
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
        zIndex: 2200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
          maxWidth: '750px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
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
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                พิมพ์ป้าย QR Code สั่งอาหารประจำโต๊ะ (ทั้งหมด {displayedTables.length} โต๊ะ)
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--nv-on-dark-mute)', margin: '2px 0 0' }}>
                พิมพ์ออกมาเป็นการ์ดหรือสติ๊กเกอร์ นำไปวางประจำโต๊ะให้ลูกค้าสแกนสั่งเอง
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--nv-on-dark-mute)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{
          padding: '0.75rem 1.5rem',
          background: 'var(--nv-surface-elevated)',
          borderBottom: '1px solid var(--nv-hairline-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--nv-on-dark-mute)' }}>เลือกโซน:</span>
            <select
              value={selectedZoneFilter}
              onChange={e => setSelectedZoneFilter(e.target.value)}
              style={{
                background: 'var(--nv-surface-dark)',
                color: '#ffffff',
                border: '1px solid var(--nv-hairline-strong)',
                padding: '4px 8px',
                borderRadius: 'var(--rounded-xs)',
                fontSize: '0.8rem'
              }}
            >
              <option value="all">ทุกโซนในร้าน ({tables.length} โต๊ะ)</option>
              {zones.map(z => (
                <option key={z.id} value={z.id.toString()}>
                  {z.name} ({tables.filter(t => t.zone_id === z.id).length} โต๊ะ)
                </option>
              ))}
            </select>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--nv-primary)' }}>
            💡 เหมาะสำหรับพิมพ์ใส่กระดาษ A4 เพื่อตัดวางบนโต๊ะ
          </span>
        </div>

        {/* Grid Preview */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {displayedTables.map(t => {
              const qr = qrMap[t.id];
              return (
                <div
                  key={t.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: 'var(--rounded-xs)',
                    padding: '12px',
                    textAlign: 'center',
                    color: '#111827',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                    {storeName}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    background: '#000000',
                    color: 'var(--nv-primary)',
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    padding: '2px 10px',
                    borderRadius: '2px',
                    margin: '4px 0'
                  }}>
                    โต๊ะ {t.table_number}
                  </div>
                  <div style={{ width: '130px', height: '130px', margin: '4px auto' }}>
                    {qr ? (
                      <img src={qr.dataUrl} alt={`QR ${t.table_number}`} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af', paddingTop: '40px' }}>กำลังสร้าง...</div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>
                    📱 สแกนเพื่อสั่งอาหาร
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--nv-hairline-strong)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#000000'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            ปิด
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrintAll}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={15} />
            พิมพ์ป้าย QR ทั้งหมด ({displayedTables.length} โต๊ะ)
          </button>
        </div>
      </div>
    </div>
  );
};
