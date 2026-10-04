import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  Receipt, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Banknote, 
  QrCode,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';

export const DailyReport = ({ onOpenReceipt }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch('/api/reports/daily');
        const json = await res.json();
        if (json.success) {
          setReport(json.data);
        }
      } catch (err) {
        console.error('Error fetching report:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', color: '#94a3b8' }}>กำลังโหลดรายงานการขาย...</div>;
  }

  const summary = report?.summary || {};
  const totalRevenue = parseFloat(summary.total_revenue || 0);

  return (
    <div style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto', backgroundColor: 'var(--bg-canvas)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            รายงานสรุปยอดขายประจำวัน (Daily Analytics)
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            ข้อมูลบันทึกในฐานข้อมูล PostgreSQL • ประจำวันที่ {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
          </p>
        </div>
      </div>

      {/* Top 4 KPI Cards (Apple Health / Metrics Style) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* KPI 1 */}
        <div className="metric-card">
          <div className="corner-square" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="metric-title">ยอดขายสุทธิวันนี้</span>
            <div style={{ padding: '6px', borderRadius: 'var(--rounded-sm)', background: 'var(--nv-surface-dark)', color: 'var(--nv-primary)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="metric-value">
            ฿{totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--status-available-text)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <TrendingUp size={12} /> ยอดคำนวณรวม VAT & ค่าบริการ
          </div>
        </div>

        {/* KPI 2 */}
        <div className="metric-card">
          <div className="corner-square" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="metric-title">จำนวนบิลที่ปิดแล้ว</span>
            <div style={{ padding: '6px', borderRadius: 'var(--rounded-sm)', background: 'var(--nv-surface-dark)', color: 'var(--nv-primary)' }}>
              <Receipt size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--text-main)' }}>
            {summary.total_bills || 0} บิล
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            ยอดเฉลี่ย ฿{summary.total_bills > 0 ? (totalRevenue / summary.total_bills).toFixed(0) : '0'} / บิล
          </div>
        </div>

        {/* KPI 3 */}
        <div className="metric-card">
          <div className="corner-square" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="metric-title">จำนวนลูกค้าทั้งหมด</span>
            <div style={{ padding: '6px', borderRadius: 'var(--rounded-sm)', background: 'var(--nv-surface-dark)', color: 'var(--nv-primary)' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--text-main)' }}>
            {summary.total_guests || 0} ท่าน
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            ยอดเฉลี่ย ฿{summary.total_guests > 0 ? (totalRevenue / summary.total_guests).toFixed(0) : '0'} / ท่าน
          </div>
        </div>

        {/* KPI 4 */}
        <div className="metric-card">
          <div className="corner-square" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="metric-title">ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
            <div style={{ padding: '6px', borderRadius: 'var(--rounded-sm)', background: 'var(--nv-surface-dark)', color: 'var(--nv-primary)' }}>
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--text-main)' }}>
            ฿{parseFloat(summary.total_vat || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            ส่วนลดรวม ฿{parseFloat(summary.total_discount || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Middle Grid: Payment Breakdown & Top Dishes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Payment Methods Breakdown */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--rounded-sm)',
          padding: '1.25rem',
          position: 'relative'
        }}>
          <div className="corner-square" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            สัดส่วนการชำระเงิน (Payment Methods)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(report?.paymentBreakdown || []).map(p => {
              const amount = parseFloat(p.amount);
              const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
              const isPromptPay = p.payment_method === 'promptpay';
              const isCash = p.payment_method === 'cash';

              return (
                <div key={p.payment_method}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '0.84rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: 500 }}>
                      {isPromptPay && <QrCode size={15} style={{ color: 'var(--apple-blue)' }} />}
                      {isCash && <Banknote size={15} style={{ color: 'var(--status-available)' }} />}
                      {!isPromptPay && !isCash && <CreditCard size={15} style={{ color: 'var(--status-billing)' }} />}
                      {isPromptPay ? 'Thai QR PromptPay' : isCash ? 'เงินสด (Cash)' : 'บัตรเครดิต'}
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>({p.transaction_count} บิล)</span>
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--apple-blue)' }}>
                      ฿{amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ({pct.toFixed(1)}%)
                    </span>
                  </div>

                  {/* Apple rounded progress bar */}
                  <div style={{ width: '100%', height: '7px', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: isPromptPay ? 'var(--apple-blue)' : isCash ? 'var(--status-available)' : 'var(--status-billing)',
                      borderRadius: 'var(--radius-full)'
                    }} />
                  </div>
                </div>
              );
            })}

            {(!report?.paymentBreakdown || report.paymentBreakdown.length === 0) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ยังไม่มีรายการชำระเงินวันนี้</p>
            )}
          </div>
        </div>

        {/* Top Selling Dishes */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--rounded-sm)',
          padding: '1.25rem',
          position: 'relative'
        }}>
          <div className="corner-square" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', textTransform: 'uppercase' }}>
            เมนูอาหารขายดีประจำวัน (Top Sellers)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {(report?.topDishes || []).map((dish, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--rounded-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--rounded-xs)',
                    background: idx === 0 ? 'var(--nv-primary)' : idx === 1 ? 'var(--nv-surface-elevated)' : 'var(--nv-surface-soft)',
                    color: idx === 0 ? '#000000' : '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    {dish.item_name}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    ขายได้ <strong>{dish.quantity_sold}</strong> จาน
                  </span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--nv-primary)' }}>
                    ฿{parseFloat(dish.total_sales).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}

            {(!report?.topDishes || report.topDishes.length === 0) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ยังไม่มีข้อมูลเมนูขายดีวันนี้</p>
            )}
          </div>
        </div>
      </div>

      {/* Staff Sales Performance Breakdown */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--rounded-sm)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        position: 'relative'
      }}>
        <div className="corner-square" />
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={17} style={{ color: 'var(--nv-primary)' }} />
          สรุปยอดขายแยกตามพนักงาน (Staff Sales Performance)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {(report?.staffSales || []).map((staff, idx) => {
            const sales = parseFloat(staff.total_sales || 0);
            const pct = totalRevenue > 0 ? (sales / totalRevenue) * 100 : 0;
            return (
              <div 
                key={idx}
                style={{
                  background: 'var(--bg-surface-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--rounded-sm)',
                  padding: '1rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--nv-primary)',
                      color: '#000000',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {idx + 1}
                    </span>
                    {staff.staff_name}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {staff.bills_count} บิล
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--nv-primary)' }}>
                    ฿{sales.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {pct.toFixed(1)}% ของยอดรวม
                  </span>
                </div>

                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 'var(--rounded-xs)', overflow: 'hidden', marginTop: '8px' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--nv-primary)', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}

          {(!report?.staffSales || report.staffSales.length === 0) && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>ยังไม่มีข้อมูลยอดขายพนักงานวันนี้</p>
          )}
        </div>
      </div>

      {/* Recent Bills List */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        boxShadow: 'var(--shadow-card)'
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
          ประวัติการปิดบิลล่าสุด (Recent Closed Bills)
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.65rem 0' }}>เลขที่บิล</th>
              <th>โต๊ะ</th>
              <th>พนักงาน</th>
              <th>ช่องทางชำระ</th>
              <th>เวลาที่ปิดบิล</th>
              <th style={{ textAlign: 'right' }}>ยอดสุทธิ</th>
              <th style={{ textAlign: 'center', width: '90px' }}>การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            {(report?.recentBills || []).map(bill => (
              <tr key={bill.id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                <td style={{ padding: '0.75rem 0', fontWeight: 600 }}>{bill.order_number}</td>
                <td><span style={{ padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-pill)', fontWeight: 500 }}>โต๊ะ {bill.table_number}</span></td>
                <td>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {bill.staff_name || bill.cashier_name || 'ทั่วไป'}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontSize: '0.74rem',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: bill.payment_method === 'promptpay' ? 'var(--apple-blue-tint)' : 'var(--status-available-bg)',
                    color: bill.payment_method === 'promptpay' ? 'var(--apple-blue)' : 'var(--status-available-text)',
                    fontWeight: 600
                  }}>
                    {bill.payment_method ? bill.payment_method.toUpperCase() : '-'}
                  </span>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {bill.closed_at ? new Date(bill.closed_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--apple-blue)' }}>
                  ฿{parseFloat(bill.total_amount).toFixed(2)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => onOpenReceipt(bill.id)}
                    className="btn btn-secondary"
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.74rem'
                    }}
                  >
                    ดูบิล
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
