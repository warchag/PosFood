import React, { useState, useRef, useEffect } from 'react';
import { usePos } from '../../context/PosContext';
import { BatchQrPrintModal } from './BatchQrPrintModal';
import { 
  Users, 
  Move, 
  Save, 
  RotateCw, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Sparkles,
  ShoppingBag,
  DollarSign,
  Square,
  Circle,
  Armchair,
  Wine,
  Settings,
  X,
  Trash2,
  Edit3,
  QrCode,
  Key
} from 'lucide-react';

export const FloorPlanView = ({ onSelectTable }) => {
  const [batchQrModalOpen, setBatchQrModalOpen] = useState(false);
  const { 
    tables, 
    zones, 
    selectedZone, 
    setSelectedZone, 
    isEditMode, 
    setIsEditMode, 
    saveBatchLayout,
    createTable,
    deleteTable,
    createZone,
    updateZone,
    deleteZone
  } = usePos();

  const [localTables, setLocalTables] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const boardRef = useRef(null);

  // Modals for adding table & managing zones
  const [addTableModalOpen, setAddTableModalOpen] = useState(false);
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableShape, setNewTableShape] = useState('rect'); // 'rect', 'round', 'booth', 'bar'
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [addingTable, setAddingTable] = useState(false);

  const [manageZonesModalOpen, setManageZonesModalOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneDesc, setNewZoneDesc] = useState('');
  const [editingZone, setEditingZone] = useState(null);
  const [savingZone, setSavingZone] = useState(false);

  // Sync local tables when DB tables update and not actively editing
  useEffect(() => {
    if (!hasChanges) {
      setLocalTables(tables);
    }
  }, [tables, hasChanges]);

  // Current active zone object & statistics
  const currentZoneId = parseInt(selectedZone, 10);
  const currentZone = zones.find(z => z.id === currentZoneId) || zones[0];

  // Filter tables strictly for current zone (NO 'all' zone)
  const zoneTables = localTables.filter(t => t.zone_id === (currentZone?.id || currentZoneId));

  // Calculate live table shape statistics for current zone
  const totalInZone = zoneTables.length;
  const occupiedInZone = zoneTables.filter(t => t.status !== 'available').length;
  const availableInZone = totalInZone - occupiedInZone;

  const rectCount = zoneTables.filter(t => t.shape === 'rect').length;
  const roundCount = zoneTables.filter(t => t.shape === 'round').length;
  const boothCount = zoneTables.filter(t => t.shape === 'booth').length;
  const barCount = zoneTables.filter(t => t.shape === 'bar').length;

  // Mouse drag handlers for floor plan repositioning
  const handleMouseDown = (e, table) => {
    if (!isEditMode) return;
    e.stopPropagation();
    const boardRect = boardRef.current.getBoundingClientRect();
    setDraggingId(table.id);
    setDragOffset({
      x: e.clientX - boardRect.left - table.x,
      y: e.clientY - boardRect.top - table.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isEditMode || !draggingId) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    
    // Snap to 10px grid
    let newX = Math.round((e.clientX - boardRect.left - dragOffset.x) / 10) * 10;
    let newY = Math.round((e.clientY - boardRect.top - dragOffset.y) / 10) * 10;

    // Boundaries
    newX = Math.max(10, Math.min(boardRect.width - 120, newX));
    newY = Math.max(10, Math.min(boardRect.height - 120, newY));

    setLocalTables(prev => 
      prev.map(t => t.id === draggingId ? { ...t, x: newX, y: newY } : t)
    );
    setHasChanges(true);
  };

  const handleMouseUp = () => {
    if (draggingId) {
      setDraggingId(null);
    }
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    const layouts = localTables.map(t => ({
      id: t.id,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      rotation: t.rotation || 0,
      shape: t.shape
    }));
    await saveBatchLayout(layouts);
    setHasChanges(false);
    setSaving(false);
    setIsEditMode(false);
  };

  // Add table submit
  const handleAddTableSubmit = async (e) => {
    e.preventDefault();
    if (!newTableNum) return;
    setAddingTable(true);

    // Pick reasonable spawn coordinates that don't collide directly
    const spawnX = 60 + ((zoneTables.length % 5) * 160);
    const spawnY = 80 + (Math.floor(zoneTables.length / 5) * 140);

    await createTable({
      table_number: newTableNum.toUpperCase(),
      zone_id: currentZone.id,
      shape: newTableShape,
      capacity: parseInt(newTableCapacity, 10),
      x: spawnX,
      y: spawnY
    });

    setAddingTable(false);
    setNewTableNum('');
    setAddTableModalOpen(false);
  };

  // Add/Edit Zone submit
  const handleSaveZone = async (e) => {
    e.preventDefault();
    if (!newZoneName) return;
    setSavingZone(true);

    if (editingZone) {
      await updateZone(editingZone.id, {
        name: newZoneName,
        description: newZoneDesc
      });
    } else {
      await createZone({
        name: newZoneName,
        description: newZoneDesc,
        display_order: zones.length + 1
      });
    }

    setSavingZone(false);
    setEditingZone(null);
    setNewZoneName('');
    setNewZoneDesc('');
  };

  const handleDeleteZone = async (z) => {
    if (window.confirm(`ยืนยันการลบโซน "${z.name}" หรือไม่? (โต๊ะในโซนนี้จะไม่มีสังกัดโซน)`)) {
      await deleteZone(z.id);
    }
  };

  // Render chairs for 2D top view
  const renderChairs = (table) => {
    const chairs = [];
    const capacity = table.capacity || 4;

    if (table.shape === 'round') {
      const radius = (table.width || 90) / 2;
      for (let i = 0; i < capacity; i++) {
        const angle = (i * 2 * Math.PI) / capacity;
        const chairX = radius + (radius + 10) * Math.cos(angle) - 10;
        const chairY = radius + (radius + 10) * Math.sin(angle) - 10;
        chairs.push(
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${chairX}px`,
              top: `${chairY}px`,
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.18)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              pointerEvents: 'none'
            }}
          />
        );
      }
      return chairs;
    }

    if (table.shape === 'bar') {
      return (
        <div 
          style={{
            position: 'absolute',
            bottom: '-14px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.22)',
            border: '2px solid rgba(255, 255, 255, 0.35)',
            pointerEvents: 'none'
          }}
        />
      );
    }

    // Default rect / booth chairs
    if (capacity >= 2) {
      chairs.push(<div key="top" className="table-chair chair-top" />);
      chairs.push(<div key="bottom" className="table-chair chair-bottom" />);
    }
    if (capacity >= 4) {
      chairs.push(<div key="left" className="table-chair chair-left" />);
      chairs.push(<div key="right" className="table-chair chair-right" />);
    }

    return chairs;
  };

  return (
    <div className="floor-plan-page">
      {/* 1. Zone Tabs Bar (NO "All Zones" button) */}
      <div className="floor-controls-bar">
        {/* Specific Zone Tabs */}
        <div className="zone-selector">
          {zones.map(z => {
            const count = localTables.filter(t => t.zone_id === z.id).length;
            const isSelected = selectedZone === z.id.toString();
            return (
              <button
                key={z.id}
                className={`zone-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedZone(z.id.toString())}
              >
                <Layers size={14} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                {z.name.split(' (')[0]} ({count} โต๊ะ)
              </button>
            );
          })}

          <button
            type="button"
            className="zone-btn"
            style={{ borderStyle: 'dashed', color: '#93c5fd' }}
            onClick={() => setManageZonesModalOpen(true)}
            title="เพิ่มหรือจัดการโซนอาหาร"
          >
            <Plus size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            จัดการโซน
          </button>
        </div>

        {/* Legend */}
        <div className="floor-legend">
          <div className="legend-item">
            <span className="legend-dot available" />
            <span>โต๊ะว่าง</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot occupied" />
            <span>มีลูกค้า</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot ordered" />
            <span>รออาหาร</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot billing" />
            <span>รอเช็คบิล</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot reserved" />
            <span>จอง</span>
          </div>
        </div>

        {/* Layout Designer & Add Table Actions */}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setNewTableNum(`${currentZone?.name ? currentZone.name.charAt(0) : 'T'}-${zoneTables.length + 1}`);
              setAddTableModalOpen(true);
            }}
          >
            <Plus size={16} />
            + เพิ่มโต๊ะในโซนนี้
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setBatchQrModalOpen(true)}
            title="พิมพ์ป้าย QR Code สั่งอาหารของทุกโต๊ะในร้าน"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <QrCode size={15} />
            พิมพ์ QR ทุกโต๊ะ
          </button>

          {isEditMode ? (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setLocalTables(tables);
                  setHasChanges(false);
                  setIsEditMode(false);
                }}
              >
                ยกเลิก
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveLayout}
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'กำลังบันทึก...' : 'บันทึกตำแหน่ง'}
              </button>
            </>
          ) : (
            <button 
              className="btn btn-secondary"
              onClick={() => setIsEditMode(true)}
              title="ลากและจัดผังโต๊ะอาหารแบบ Top View"
            >
              <Move size={16} />
              จัดผังโต๊ะ
            </button>
          )}
        </div>
      </div>

      {/* 2. Zone Information & Table Types Summary Banner (Apple Style) */}
      {currentZone && (
        <div className="zone-info-banner">
          {/* Zone Title & Description */}
          <div className="zone-title-group">
            <div className="zone-icon-box">
              <Layers size={17} />
            </div>
            <div>
              <div className="zone-title-text">
                {currentZone.name}
                <span className="zone-badge-count">
                  {totalInZone} โต๊ะ
                </span>
              </div>
              {currentZone.description && (
                <div className="zone-desc-text">
                  {currentZone.description}
                </div>
              )}
            </div>
          </div>

          {/* Table Shape / Types Breakdown in this Zone */}
          <div className="zone-stats-group">
            {/* Available vs Occupied stats */}
            <div style={{ display: 'flex', gap: '6px', paddingRight: '0.75rem', borderRight: '1px solid var(--border-subtle)' }}>
              <span className="stat-chip stat-chip-available">
                🟢 ว่าง {availableInZone}
              </span>
              <span className="stat-chip stat-chip-occupied">
                🔴 มีลูกค้า {occupiedInZone}
              </span>
            </div>

            {/* Shape Types */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>ประเภทโต๊ะ:</span>
              
              <span className="shape-badge">
                <Square size={12} style={{ color: '#0071e3' }} /> สี่เหลี่ยม <strong>{rectCount}</strong>
              </span>

              <span className="shape-badge">
                <Circle size={12} style={{ color: '#ff9500' }} /> กลม <strong>{roundCount}</strong>
              </span>

              <span className="shape-badge">
                <Armchair size={12} style={{ color: '#af52de' }} /> ซุ้มโซฟา <strong>{boothCount}</strong>
              </span>

              <span className="shape-badge">
                <Wine size={12} style={{ color: '#ff3b30' }} /> บาร์ <strong>{barCount}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Top View Interactive Floor Board Canvas */}
      <div 
        className="floor-canvas-wrapper" 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
      >
        <div 
          ref={boardRef}
          className={`floor-board ${isEditMode ? 'edit-mode' : ''}`}
        >
          {isEditMode && (
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '16px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'var(--apple-blue-tint-strong)',
              border: '1px solid var(--apple-blue)',
              color: 'var(--apple-blue)',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 30,
              pointerEvents: 'none'
            }}>
              <Move size={14} /> โหมดจัดผังร้าน: ลากและปล่อยโต๊ะเพื่อจัดตำแหน่งใน {currentZone?.name}
            </div>
          )}

          {/* Tables in Current Zone */}
          {zoneTables.map(table => {
            const isDragging = draggingId === table.id;
            return (
              <div
                key={table.id}
                className={`top-view-table shape-${table.shape} status-${table.status}`}
                style={{
                  left: `${table.x}px`,
                  top: `${table.y}px`,
                  width: `${table.width || 100}px`,
                  height: `${table.height || 80}px`,
                  cursor: isEditMode ? 'grab' : 'pointer',
                  opacity: isDragging ? 0.75 : 1,
                  zIndex: isDragging ? 50 : 10,
                }}
                onMouseDown={(e) => handleMouseDown(e, table)}
                onClick={() => {
                  if (!isEditMode) {
                    onSelectTable(table);
                  }
                }}
              >
                {/* 2D Chairs */}
                {renderChairs(table)}

                {/* Table Core Info */}
                <div className="table-num">{table.table_number}</div>
                <div className="table-cap">
                  <Users size={11} />
                  <span>{table.guest_count > 0 ? `${table.guest_count}/${table.capacity}` : table.capacity}</span>
                </div>

                {/* Bill Badge if table has running bill */}
                {table.current_total && parseFloat(table.current_total) > 0 && (
                  <div className="table-bill-badge">
                    ฿{parseFloat(table.current_total).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                )}

                {/* Session PIN Badge for QR ordering security */}
                {table.status !== 'available' && table.current_pin && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-9px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#000000',
                    border: '1px solid #f59e0b',
                    color: '#fbbf24',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '2px',
                    padding: '1px 6px',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                    zIndex: 25
                  }}
                  title="รหัสเปิดโต๊ะ (PIN) สำหรับให้ลูกค้ากรอกในมือถือ"
                  >
                    <Key size={10} color="#fbbf24" />
                    <span>PIN {table.current_pin}</span>
                  </div>
                )}

                {/* Reservation Badge on Floor Board */}
                {table.status === 'reserved' && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--status-reserved)',
                    border: '1px solid #ffffff',
                    color: '#ffffff',
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    borderRadius: '2px',
                    padding: '1px 6px',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    zIndex: 26
                  }}
                  title={`จองโดย ${table.reserved_customer_name || 'ลูกค้า'} เวลา ${table.reserved_time || ''} น.`}
                  >
                    <span>จอง {table.reserved_time ? `${table.reserved_time} น.` : ''}</span>
                  </div>
                )}

                {/* Delete button in edit mode */}
                {isEditMode && table.status === 'available' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`ลบโต๊ะ ${table.table_number} หรือไม่?`)) {
                        deleteTable(table.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: 'var(--status-occupied)',
                      border: 'none',
                      color: '#fff',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      boxShadow: 'var(--shadow-xs)',
                      zIndex: 35
                    }}
                    title="ลบโต๊ะนี้"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}

          {zoneTables.length === 0 && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              <Layers size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>ยังไม่มีโต๊ะในโซนนี้</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: '0.75rem', padding: '0.5rem 1.1rem' }}
                onClick={() => {
                  setNewTableNum(`${currentZone?.name ? currentZone.name.charAt(0) : 'T'}-1`);
                  setAddTableModalOpen(true);
                }}
              >
                <Plus size={15} /> + เพิ่มโต๊ะแรกในโซนนี้
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ADD TABLE TO ZONE (Apple Style) ================= */}
      {addTableModalOpen && (
        <div className="modal-overlay" onClick={() => setAddTableModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                + เพิ่มโต๊ะใหม่ใน: {currentZone?.name}
              </h3>
              <button 
                className="modal-close-btn"
                onClick={() => setAddTableModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTableSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {/* Table Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    รหัส / หมายเลขโต๊ะ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น A-09, VIP-02, B-05"
                    value={newTableNum}
                    onChange={(e) => setNewTableNum(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.95rem',
                      fontWeight: 600
                    }}
                  />
                </div>

                {/* Table Shape / Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    ประเภทโต๊ะ (รูปทรงมุมมอง Top View) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {[
                      { id: 'rect', label: 'สี่เหลี่ยม', icon: Square, desc: 'โต๊ะมาตรฐาน' },
                      { id: 'round', label: 'โต๊ะกลม', icon: Circle, desc: 'โต๊ะกลม' },
                      { id: 'booth', label: 'ซุ้มโซฟา', icon: Armchair, desc: 'Booth' },
                      { id: 'bar', label: 'เคาน์เตอร์บาร์', icon: Wine, desc: 'ที่นั่งเดี่ยว' },
                    ].map(shape => {
                      const Icon = shape.icon;
                      const isSel = newTableShape === shape.id;
                      return (
                        <button
                          key={shape.id}
                          type="button"
                          onClick={() => setNewTableShape(shape.id)}
                          style={{
                            padding: '0.75rem 0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            border: isSel ? '2px solid var(--apple-blue)' : '1px solid var(--border-subtle)',
                            background: isSel ? 'var(--apple-blue-tint)' : 'var(--bg-canvas)',
                            color: isSel ? 'var(--apple-blue)' : 'var(--text-secondary)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          <Icon size={18} />
                          <span style={{ fontSize: '0.74rem', fontWeight: isSel ? 600 : 500 }}>{shape.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Capacity */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    จำนวนที่นั่ง (Capacity) *
                  </label>
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    {[1, 2, 4, 6, 8, 10].map(cap => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setNewTableCapacity(cap)}
                        style={{
                          flex: 1,
                          padding: '0.55rem 0',
                          borderRadius: 'var(--radius-sm)',
                          border: newTableCapacity === cap ? '2px solid var(--apple-blue)' : '1px solid var(--border-subtle)',
                          background: newTableCapacity === cap ? 'var(--apple-blue-tint)' : 'var(--bg-canvas)',
                          color: newTableCapacity === cap ? 'var(--apple-blue)' : 'var(--text-main)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'var(--transition-fast)'
                        }}
                      >
                        {cap}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddTableModalOpen(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={addingTable}>
                  {addingTable ? 'กำลังเพิ่มโต๊ะ...' : '+ เพิ่มโต๊ะลงผัง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MANAGE ZONES (Apple Style) ================= */}
      {manageZonesModalOpen && (
        <div className="modal-overlay" onClick={() => setManageZonesModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                จัดการโซนอาหารในร้าน (Zone Management)
              </h3>
              <button 
                className="modal-close-btn"
                onClick={() => setManageZonesModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Add / Edit Form */}
              <form onSubmit={handleSaveZone} style={{ background: 'var(--bg-canvas)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  {editingZone ? `แก้ไขโซน: ${editingZone.name}` : '+ เพิ่มโซนอาหารใหม่'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <input
                    type="text"
                    required
                    placeholder="ชื่อโซน เช่น โซนชั้น 2 (Second Floor), โซน Rooftop"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="คำอธิบายโซน เช่น บรรยากาศวิวเมือง, ลมธรรมชาติ..."
                    value={newZoneDesc}
                    onChange={(e) => setNewZoneDesc(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '4px' }}>
                    {editingZone && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingZone(null);
                          setNewZoneName('');
                          setNewZoneDesc('');
                        }}
                      >
                        ยกเลิก
                      </button>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={savingZone}>
                      {savingZone ? 'กำลังบันทึก...' : editingZone ? 'บันทึกการแก้ไข' : '+ เพิ่มโซน'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Zones List */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.65rem' }}>
                  โซนทั้งหมดในระบบ ({zones.length} โซน):
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                  {zones.map(z => {
                    const count = tables.filter(t => t.zone_id === z.id).length;
                    return (
                      <div
                        key={z.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 1rem',
                          background: 'var(--bg-canvas)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                            {z.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {count} โต๊ะ • {z.description || 'ไม่มีคำอธิบาย'}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingZone(z);
                              setNewZoneName(z.name);
                              setNewZoneDesc(z.description || '');
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            title="แก้ไขโซน"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteZone(z)}
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                            title="ลบโซน"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setManageZonesModalOpen(false)}>
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch QR Print Modal */}
      {batchQrModalOpen && (
        <BatchQrPrintModal onClose={() => setBatchQrModalOpen(false)} />
      )}
    </div>
  );
};
