import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Server, 
  Radio, 
  Laptop, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  Layers,
  ChevronUp,
  X,
  ExternalLink,
  Info
} from 'lucide-react';
import { usePos } from '../../context/PosContext';

export const SystemStatusFooter = () => {
  const { socket } = usePos();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system/status');
      const data = await res.json();
      setStatus(data);
      setLastCheck(new Date());
    } catch (err) {
      console.error('Failed to fetch system status:', err);
      setStatus(prev => ({
        ...prev,
        success: false,
        status: 'error',
        error: err.message,
        database: { connected: false, error: 'Cannot connect to API server' },
        server: { status: 'offline', port: 5001 }
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (!socket) return;
    setIsSocketConnected(socket.connected);

    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  const dbConnected = status?.database?.connected;
  const apiOnline = status?.server?.status === 'online';
  const clientPort = window.location.port || '80';
  const serverPort = status?.server?.port || 5001;
  const dbPort = status?.database?.port || 5432;
  const dbHost = status?.database?.host || 'localhost';
  const dbName = status?.database?.database || 'restaurant_pos';
  const latency = status?.database?.latency_ms;
  const clientIp = status?.server?.client_ip || '127.0.0.1';

  return (
    <>
      <footer className="system-status-footer" role="contentinfo" aria-label="System Operational Status">
        {/* Left Status Indicators */}
        <div className="status-footer-left">
          {/* Database Indicator */}
          <div 
            className={`status-pill ${dbConnected ? 'online' : 'offline'}`}
            title={`PostgreSQL Database Status: ${dbConnected ? 'Connected' : 'Disconnected'}`}
          >
            <span className={`status-dot ${dbConnected ? 'pulse-green' : 'pulse-red'}`} />
            <Database size={12} className="status-icon" />
            <span className="status-label">DB:</span>
            <span className="status-val">
              {dbConnected ? (
                <>
                  <span>PostgreSQL 16</span>
                  <span className="dim">@{dbHost}:{dbPort}</span>
                  <span className="db-badge">{dbName}</span>
                  {latency !== undefined && <span className="latency-badge">{latency}ms</span>}
                </>
              ) : (
                <span className="text-danger">DISCONNECTED</span>
              )}
            </span>
          </div>

          <div className="footer-v-divider" />

          {/* Backend API Server */}
          <div 
            className={`status-pill ${apiOnline ? 'online' : 'offline'}`}
            title={`Express API Server: Port ${serverPort}`}
          >
            <span className={`status-dot ${apiOnline ? 'pulse-green' : 'pulse-red'}`} />
            <Server size={12} className="status-icon" />
            <span className="status-label">API:</span>
            <span className="status-val">
              <span>Port {serverPort}</span>
              <span className="sub-tag">{apiOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </span>
          </div>

          <div className="footer-v-divider" />

          {/* WebSocket / Socket.io */}
          <div 
            className={`status-pill ${isSocketConnected ? 'online' : 'offline'}`}
            title="Real-time WebSocket Push Engine"
          >
            <span className={`status-dot ${isSocketConnected ? 'pulse-green' : 'pulse-amber'}`} />
            <Radio size={12} className="status-icon" />
            <span className="status-label">SOCKET:</span>
            <span className="status-val">
              {isSocketConnected ? 'LIVE' : 'RECONNECTING'}
            </span>
          </div>
        </div>

        {/* Right Status Indicators */}
        <div className="status-footer-right">
          {/* Web Client Info */}
          <div className="status-pill client-info">
            <Laptop size={12} className="status-icon" />
            <span className="status-label">CLIENT:</span>
            <span className="status-val">:{clientPort}</span>
            <span className="dim">• IP: {clientIp}</span>
          </div>

          <div className="footer-v-divider" />

          {/* Manual Refresh / Timestamp */}
          <button 
            type="button" 
            className="status-action-btn"
            onClick={fetchStatus} 
            disabled={loading}
            title={`คลิกเพื่อตรวจสอบสถานะใหม่ (อัปเดตล่าสุด: ${lastCheck ? lastCheck.toLocaleTimeString('th-TH') : '-'})`}
          >
            <RefreshCw size={11} className={loading ? 'spin-icon' : ''} />
            <span>{lastCheck ? lastCheck.toLocaleTimeString('th-TH') : 'ตรวจสถานะ'}</span>
          </button>

          {/* Diagnostics Modal Button */}
          <button 
            type="button"
            className="diagnostics-toggle-btn"
            onClick={() => setShowModal(true)}
            title="ดูข้อมูลสถานะระบบและ Database Connection Pool แบบละเอียด"
          >
            <Info size={11} />
            <span>รายละเอียดระบบ</span>
          </button>
        </div>
      </footer>

      {/* Engineering System Diagnostics Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 1200 }}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '640px', padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={18} style={{ color: 'var(--nv-primary)' }} />
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
                  สถานะการเชื่อมต่อระบบ & ฐานข้อมูล (System Diagnostics)
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem' }}>
              {/* Overall Status Banner */}
              <div style={{
                background: dbConnected ? 'rgba(118, 185, 0, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${dbConnected ? 'var(--nv-primary)' : '#ef4444'}`,
                borderRadius: 'var(--rounded-sm)',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {dbConnected ? (
                    <CheckCircle2 size={22} style={{ color: 'var(--nv-primary)' }} />
                  ) : (
                    <XCircle size={22} style={{ color: '#ef4444' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                      {dbConnected ? 'ระบบฐานข้อมูลและ API ทำงานปกติ (HEALTHY)' : 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (OFFLINE)'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      ตรวจสอบเวลา: {lastCheck ? lastCheck.toLocaleString('th-TH') : '-'} • Latency: {latency || 0} ms
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-secondary" 
                  style={{ height: '32px', fontSize: '0.78rem', padding: '0 10px' }}
                  onClick={fetchStatus}
                  disabled={loading}
                >
                  <RefreshCw size={12} className={loading ? 'spin-icon' : ''} /> Ping ทดสอบใหม่
                </button>
              </div>

              {/* Detailed Specs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* Database Specs Box */}
                <div style={{
                  background: 'var(--bg-surface-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--rounded-sm)',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <Database size={15} style={{ color: 'var(--nv-primary)' }} />
                    ฐานข้อมูล (PostgreSQL)
                  </div>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>สถานะ:</td>
                        <td style={{ fontWeight: 700, color: dbConnected ? 'var(--nv-primary)' : '#ef4444', textAlign: 'right' }}>
                          {dbConnected ? 'CONNECTED' : 'DISCONNECTED'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>Host / IP:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                          {dbHost} ({status?.database?.ip || '127.0.0.1'})
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>Port:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                          {dbPort}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>ชื่อ Database:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                          {dbName}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>Database User:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                          {status?.database?.user || 'worracag'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>Connection Pool:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right' }}>
                          {status?.database?.pool ? `Total: ${status.database.pool.total}, Idle: ${status.database.pool.idle}` : '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Server & Network Specs Box */}
                <div style={{
                  background: 'var(--bg-surface-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--rounded-sm)',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <Server size={15} style={{ color: 'var(--nv-primary)' }} />
                    เซิร์ฟเวอร์ & เครือข่าย (Backend API)
                  </div>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>API Status:</td>
                        <td style={{ fontWeight: 700, color: apiOnline ? 'var(--nv-primary)' : '#ef4444', textAlign: 'right' }}>
                          {apiOnline ? 'ONLINE' : 'OFFLINE'}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>API Port:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                          {serverPort}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>Web Client Port:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                          {clientPort} (Vite)
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>Client IP:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right', fontFamily: 'monospace' }}>
                          {clientIp}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>WebSocket Clients:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right' }}>
                          {status?.websocket?.client_count || 1} เครื่องเชื่อมต่อ
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)', padding: '3px 0' }}>Server Uptime:</td>
                        <td style={{ fontWeight: 600, textAlign: 'right' }}>
                          {status?.server?.uptime_seconds ? `${Math.floor(status.server.uptime_seconds / 60)} นาที` : '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowModal(false)}
                style={{ height: '36px', fontSize: '0.85rem' }}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
