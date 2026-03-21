import { useState, useEffect } from 'react';
import { subscribeTenants, subscribePayments, subscribeMaintenance, subscribeAnnouncements } from '../firebase';
import { P, StatCard, Card, StatusBadge, Spinner } from '../components/UI';

export default function DashboardPage({ onNavigate, userProfile, tenantData }) {
  const [tenants,  setTenants]  = useState([]);
  const [payments, setPayments] = useState([]);
  const [maint,    setMaint]    = useState([]);
  const [notices,  setNotices]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let count = 0;
    const done = () => { count++; if (count >= 3) setLoading(false); };
    const u1 = subscribeTenants(d => { setTenants(d); done(); });
    const u2 = subscribePayments(d => { setPayments(d); done(); });
    const u3 = subscribeMaintenance(d => { setMaint(d); done(); });
    const u4 = subscribeAnnouncements(d => setNotices(d));
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  const role = userProfile?.role;

  // Metrics
  const activeT    = tenants.filter(t => t.status === 'active').length;
  const collected  = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalRent  = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const openMaint  = maint.filter(m => m.status !== 'resolved').length;
  const colRate    = totalRent > 0 ? Math.round(collected / totalRent * 100) : 0;
  const expiring   = tenants.filter(t => t.status === 'expiring').length;
  const overdue    = payments.filter(p => p.status === 'overdue').length;

  const recentPayments   = payments.slice(0, 5);
  const recentMaint      = maint.filter(m => m.status !== 'resolved').slice(0, 4);
  const pinnedNotices    = notices.filter(n => n.pinned).slice(0, 3);
  const recentAnnounce   = notices.slice(0, 3);

  // ── Tenant Dashboard ──
  if (role === 'tenant' && tenantData) {
    const myPayments  = payments.filter(p => p.tenantId === tenantData.id).slice(0, 4);
    const myMaint     = maint.filter(m => m.tenantId === tenantData.id).slice(0, 3);
    const pendingPay  = myPayments.find(p => p.status === 'pending' || p.status === 'overdue');
    return (
      <div>
        {/* Welcome banner */}
        <div style={{ background: P.navy, borderRadius: 18, padding: '26px 30px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(200,169,110,0.08)' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, color: P.gold, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Welcome back</div>
            <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 26, color: '#fff', margin: '0 0 4px' }}>{userProfile.name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 18px', fontSize: 13 }}>Unit {tenantData.unit} · {tenantData.property}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => onNavigate('my-payments')} style={{ padding: '9px 18px', borderRadius: 9, background: P.gold, border: 'none', color: P.navy, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Pay Rent</button>
              <button onClick={() => onNavigate('maintenance')} style={{ padding: '9px 18px', borderRadius: 9, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Submit Request</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label="Monthly Rent" value={`$${(tenantData.rent || 0).toLocaleString()}`} sub="Per month" color={pendingPay ? P.danger : P.success} />
          <StatCard label="Lease Ends" value={tenantData.leaseEnd || '—'} color={P.gold} />
          <StatCard label="Open Requests" value={myMaint.filter(m => m.status !== 'resolved').length} color={P.warning} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Card style={{ padding: 22 }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: P.text, marginBottom: 14 }}>Recent Payments</div>
            {myPayments.length === 0 ? <div style={{ fontSize: 13, color: P.textMuted }}>No payments yet.</div> :
              myPayments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${P.border}` }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600 }}>{p.month || p.due}</div><div style={{ fontSize: 11, color: P.textMuted }}>${(p.amount||0).toLocaleString()}</div></div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
          </Card>
          <Card style={{ padding: 22 }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: P.text, marginBottom: 14 }}>My Requests</div>
            {myMaint.length === 0 ? <div style={{ fontSize: 13, color: P.textMuted }}>No open requests.</div> :
              myMaint.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${P.border}` }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}><div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div><div style={{ fontSize: 11, color: P.textMuted }}>{r.category}</div></div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
          </Card>
        </div>
      </div>
    );
  }

  // ── Manager / Landlord Dashboard ──
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, color: P.text, margin: 0 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userProfile?.name?.split(' ')[0] || 'there'}
        </h1>
        <p style={{ color: P.textMuted, margin: '4px 0 0', fontSize: 14 }}>Here's your portfolio overview for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Active Tenants" value={activeT} sub={`${expiring} expiring`} color={P.navyLight} icon="👤" />
        <StatCard label="Rent Collected" value={`$${collected.toLocaleString()}`} sub={`${colRate}% of $${totalRent.toLocaleString()}`} color={P.success} icon="💰" />
        <StatCard label="Open Maintenance" value={openMaint} sub="Requests open" color={openMaint > 0 ? P.danger : P.success} icon="🔧" />
        <StatCard label="Overdue Payments" value={overdue} sub="Need follow-up" color={overdue > 0 ? P.danger : P.success} icon="⚠️" />
      </div>

      {/* Alerts */}
      {(overdue > 0 || expiring > 0 || openMaint > 3) && (
        <div style={{ background: '#FEF3E2', border: `1px solid ${P.warning}30`, borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.warning, marginBottom: 6 }}>⚠️ Action Required</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {overdue > 0 && <button onClick={() => onNavigate('rent')} style={{ fontSize: 12, color: P.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>🔴 {overdue} overdue payment{overdue > 1 ? 's' : ''} →</button>}
            {expiring > 0 && <button onClick={() => onNavigate('tenants')} style={{ fontSize: 12, color: P.warning, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>🟡 {expiring} lease{expiring > 1 ? 's' : ''} expiring →</button>}
            {openMaint > 3 && <button onClick={() => onNavigate('maintenance')} style={{ fontSize: 12, color: P.info, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>🔵 {openMaint} open requests →</button>}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Recent Payments */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: P.text }}>Recent Payments</div>
            <button onClick={() => onNavigate('rent')} style={{ fontSize: 12, color: P.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
          </div>
          {recentPayments.length === 0
            ? <div style={{ fontSize: 13, color: P.textMuted }}>No payments yet.</div>
            : recentPayments.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${P.border}` }}>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>{p.tenant}</div><div style={{ fontSize: 12, color: P.textMuted }}>Unit {p.unit}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 14, fontWeight: 700 }}>${(p.amount||0).toLocaleString()}</div><StatusBadge status={p.status} /></div>
              </div>
            ))}
        </Card>

        {/* Open Maintenance */}
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: P.text }}>Maintenance</div>
            <button onClick={() => onNavigate('maintenance')} style={{ fontSize: 12, color: P.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
          </div>
          {recentMaint.length === 0
            ? <div style={{ fontSize: 13, color: P.textMuted, padding: '20px 0', textAlign: 'center' }}>✓ No open requests!</div>
            : recentMaint.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${P.border}` }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}><div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div><div style={{ fontSize: 12, color: P.textMuted }}>Unit {m.unit} · {m.category}</div></div>
                <StatusBadge status={m.status} />
              </div>
            ))}
        </Card>
      </div>

      {/* Recent Announcements */}
      {recentAnnounce.length > 0 && (
        <Card style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: P.text }}>Recent Announcements</div>
            <button onClick={() => onNavigate('announcements')} style={{ fontSize: 12, color: P.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {recentAnnounce.map(a => (
              <div key={a.id} style={{ background: P.bg, borderRadius: 10, padding: '13px 15px', border: `1px solid ${P.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: P.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.body}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
