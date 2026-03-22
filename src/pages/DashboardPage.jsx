import { useState, useEffect } from 'react';
import { subscribeTenants, subscribePayments, subscribeMaintenance, subscribeAnnouncements, subscribeMeetings, subscribeVotes, submitVote } from '../firebase';
import { P, StatCard, Card, StatusBadge, Spinner, Btn } from '../components/UI';
import { Vote, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { useHOAMode } from '../contexts/HOAModeContext';

export default function DashboardPage({ onNavigate, userProfile, tenantData }) {
  const { label, isHOAMode } = useHOAMode();
  const [tenants,  setTenants]  = useState([]);
  const [payments, setPayments] = useState([]);
  const [maint,    setMaint]    = useState([]);
  const [notices,  setNotices]  = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [myVotes,  setMyVotes]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  const role = userProfile?.role;

  useEffect(() => {
    let unsubT, unsubP, unsubM, unsubA, unsubMe;

    if (role) {
      const isAdmin = ['manager', 'landlord', 'super_admin'].includes(role);

      if (isAdmin) {
        unsubT = subscribeTenants(data => setTenants(data));
        unsubP = subscribePayments(data => setPayments(data));
        unsubM = subscribeMaintenance(data => setMaint(data));
        unsubA = subscribeAnnouncements(data => setNotices(data));
        unsubMe = subscribeMeetings(data => { setMeetings(data); setLoading(false); });
      } else {
        unsubP = subscribePayments(data => setPayments(data));
        unsubM = subscribeMaintenance(data => setMaint(data));
        unsubA = subscribeAnnouncements(data => setNotices(data));
        unsubMe = subscribeMeetings(data => { setMeetings(data); setLoading(false); });
      }
    }

    return () => {
      unsubT && unsubT();
      unsubP && unsubP();
      unsubM && unsubM();
      unsubA && unsubA();
      unsubMe && unsubMe();
    };
  }, [role]);

  useEffect(() => {
    if (!role || role !== 'tenant' || !meetings.length || !userProfile?.uid) return;
    const active = meetings.find(m => m.status === 'Active');
    if (!active) { setMyVotes([]); return; }
    const unsub = subscribeVotes(active.id, data => {
      setMyVotes(data.filter(v => v.userId === userProfile.uid));
    });
    return () => unsub();
  }, [role, meetings, userProfile?.uid]);

  // Metrics
  const activeT    = tenants.filter(t => t.status === 'active').length;
  const collected  = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalRent  = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const openMaint  = maint.filter(m => m.status !== 'resolved').length;
  const colRate    = totalRent > 0 ? Math.round(collected / totalRent * 100) : 0;
  const expiring   = tenants.filter(t => t.status === 'expiring').length;
  const overdue    = payments.filter(p => p.status === 'overdue').length;

  const recentPayments = [...payments].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
    return dateB - dateA;
  }).slice(0, 5);

  const recentMaint = maint.filter(m => m.status !== 'resolved').sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
    return dateB - dateA;
  }).slice(0, 4);

  const recentAnnounce = [...notices].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
    return dateB - dateA;
  }).slice(0, 3);
  
  const pinnedNotices = recentAnnounce.filter(n => n.pinned);

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
              <button onClick={() => onNavigate('my-payments')} style={{ padding: '9px 18px', borderRadius: 9, background: P.gold, border: 'none', color: P.navy, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {label('my-payments', 'Pay Rent')}
              </button>
              <button onClick={() => onNavigate('maintenance')} style={{ padding: '9px 18px', borderRadius: 9, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                {label('maintenance', 'Submit Request')}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard label={isHOAMode ? "Monthly Dues" : "Monthly Rent"} value={`$${(tenantData.rent || 0).toLocaleString()}`} sub="Per month" color={pendingPay ? P.danger : P.success} />
          <StatCard label={isHOAMode ? "Ownership Entry" : "Lease Ends"} value={tenantData.leaseEnd || '—'} color={P.gold} />
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

        {/* Governance & Voting Section */}
        {isHOAMode && meetings.filter(m => m.status === 'Active').length > 0 && (
          <Card style={{ padding: 22, marginTop: 18, border: `1.5px solid ${P.gold}44` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF9E6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Vote size={20} color={P.gold} />
              </div>
              <div>
                <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, color: P.text }}>Board Governance & Voting</div>
                <div style={{ fontSize: 12, color: P.textMuted }}>Cast your vote on active building motions</div>
              </div>
            </div>

            {meetings.filter(m => m.status === 'Active').map(m => (
              <div key={m.id} style={{ background: P.bg, borderRadius: 12, padding: 16, border: `1px solid ${P.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Meeting: {m.title} ({m.date})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(m.motions || []).map((motion, idx) => {
                    const myVote = myVotes.find(v => v.motionIndex === idx);
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 14px', borderRadius: 9, border: `1px solid ${P.border}` }}>
                        <div style={{ flex: 1, paddingRight: 10 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{motion.text}</div>
                          {myVote && <div style={{ fontSize: 11, color: P.success, fontWeight: 700, marginTop: 4 }}>✓ Your Vote: {myVote.vote}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => submitVote(m.id, `${userProfile.uid}_${idx}`, { userId: userProfile.uid, motionIndex: idx, vote: 'Yes' })}
                            style={{ padding: '6px 12px', borderRadius: 7, border: myVote?.vote === 'Yes' ? `2px solid ${P.success}` : `1px solid ${P.border}`, background: myVote?.vote === 'Yes' ? '#EAF7F2' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={14} color={P.success} /> <span style={{ fontSize: 12, fontWeight: 600 }}>Yes</span>
                          </button>
                          <button onClick={() => submitVote(m.id, `${userProfile.uid}_${idx}`, { userId: userProfile.uid, motionIndex: idx, vote: 'No' })}
                            style={{ padding: '6px 12px', borderRadius: 7, border: myVote?.vote === 'No' ? `2px solid ${P.danger}` : `1px solid ${P.border}`, background: myVote?.vote === 'No' ? '#FDECEA' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <XCircle size={14} color={P.danger} /> <span style={{ fontSize: 12, fontWeight: 600 }}>No</span>
                          </button>
                          <button onClick={() => submitVote(m.id, `${userProfile.uid}_${idx}`, { userId: userProfile.uid, motionIndex: idx, vote: 'Abstain' })}
                            style={{ padding: '6px 12px', borderRadius: 7, border: myVote?.vote === 'Abstain' ? `2px solid ${P.textMuted}` : `1px solid ${P.border}`, background: myVote?.vote === 'Abstain' ? P.bg : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MinusCircle size={14} color={P.textMuted} /> <span style={{ fontSize: 12, fontWeight: 600 }}>Abstain</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </Card>
        )}
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
        <StatCard label={label('tenants', 'Active Tenants')} value={activeT} sub={`${expiring} expiring`} color={P.navyLight} icon="👤" />
        <StatCard label={label('rent', 'Rent') + " Collected"} value={`$${collected.toLocaleString()}`} sub={`${colRate}% of $${totalRent.toLocaleString()}`} color={P.success} icon="💰" />
        <StatCard label={"Open " + label('maintenance', 'Maintenance')} value={openMaint} sub="Requests open" color={openMaint > 0 ? P.danger : P.success} icon="🔧" />
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
