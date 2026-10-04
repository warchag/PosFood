import React, { useState, useEffect, useCallback } from 'react';
import { usePos } from '../../context/PosContext';
import { 
  ChefHat, 
  Clock, 
  CheckCircle, 
  Flame, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';

export const KitchenDisplay = () => {
  const { socket } = usePos();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/kitchen/queue');
      const json = await res.json();
      if (json.success) {
        setQueue(json.data);
      }
    } catch (err) {
      console.error('Error fetching kitchen queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();

    if (socket) {
      socket.on('kitchen:new_order', () => fetchQueue());
      socket.on('kitchen:item_status_changed', () => fetchQueue());
      socket.on('order:updated', () => fetchQueue());
    }

    const interval = setInterval(fetchQueue, 15000); // 15s polling fallback
    return () => clearInterval(interval);
  }, [socket, fetchQueue]);

  const handleUpdateStatus = async (itemId, nextStatus) => {
    try {
      const res = await fetch(`/api/order-items/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const json = await res.json();
      if (json.success) {
        fetchQueue();
      }
    } catch (err) {
      console.error('Error updating item status:', err);
    }
  };

  // Group by table
  const groupedByTable = queue.reduce((acc, item) => {
    const key = item.table_number;
    if (!acc[key]) {
      acc[key] = {
        table_number: item.table_number,
        zone_name: item.zone_name,
        order_number: item.order_number,
        items: []
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const tablesList = Object.values(groupedByTable);

  const getMinutesAgo = (dateStr) => {
    const mins = Math.floor((new Date() - new Date(dateStr)) / 60000);
    return mins < 1 ? 'เมื่อสักครู่' : `${mins} นาทีที่แล้ว`;
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto', backgroundColor: 'var(--bg-canvas)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--text-main)',
            color: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-xs)'
          }}>
            <ChefHat size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.015em' }}>
              Kitchen Display System (จอคิวครัว)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              รายการอาหารที่ต้องปรุงทั้งหมด: {queue.length} จาน ({tablesList.length} โต๊ะ)
            </p>
          </div>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={fetchQueue}
        >
          <RefreshCw size={15} /> รีเฟรชข้อมูล
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>กำลังโหลดข้อมูลคิวครัว...</p>
      ) : tablesList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          color: 'var(--text-muted)'
        }}>
          <CheckCircle size={44} style={{ color: 'var(--status-available)', margin: '0 auto 1rem', opacity: 0.9 }} />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.35rem' }}>ไม่มีรายการอาหารค้างทำ</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>เมื่อมีการสั่งอาหารจากโต๊ะ รายการจะปรากฏบนหน้านี้แบบ Real-time</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {tablesList.map(t => (
            <div 
              key={t.table_number} 
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--rounded-sm)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
            >
              <div className="corner-square" />
              {/* Card Header */}
              <div style={{
                background: 'var(--bg-surface-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
                padding: '0.85rem 1.15rem 0.85rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    โต๊ะ {t.table_number}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {t.zone_name} • บิล {t.order_number}
                  </div>
                </div>
                <span style={{
                  background: 'var(--nv-surface-dark)',
                  color: 'var(--nv-primary)',
                  fontWeight: 700,
                  fontSize: '0.74rem',
                  padding: '3px 8px',
                  borderRadius: 'var(--rounded-sm)',
                  border: '1px solid var(--nv-hairline-strong)',
                  textTransform: 'uppercase'
                }}>
                  {t.items.length} รายการ
                </span>
              </div>

              {/* Items List */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                {t.items.map(item => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{
                          background: 'var(--apple-blue-tint)',
                          color: 'var(--apple-blue)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-xs)'
                        }}>
                          {item.quantity}x
                        </span>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {item.item_name}
                          </div>
                          {item.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--status-occupied)', fontWeight: 500, marginTop: '2px' }}>
                              ⚠️ หมายเหตุ: {item.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <Clock size={11} /> {getMinutesAgo(item.created_at)}
                      </div>
                    </div>

                    {/* Status Action Buttons */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', justifyContent: 'flex-end' }}>
                      {item.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, 'cooking')}
                          className="btn"
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            background: 'var(--status-ordered-bg)',
                            color: 'var(--status-ordered-text)',
                            border: '1px solid var(--status-ordered-border)',
                            fontWeight: 600
                          }}
                        >
                          <Flame size={13} /> กำลังเริ่มปรุง
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(item.id, 'served')}
                          className="btn btn-success"
                          style={{
                            padding: '4px 12px',
                            fontSize: '0.75rem'
                          }}
                        >
                          <CheckCircle size={13} /> ปรุงเสร็จแล้ว / พร้อมเสิร์ฟ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
