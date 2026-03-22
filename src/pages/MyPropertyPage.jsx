import { useState, useEffect } from 'react';
import { Home, Banknote, Clock, CheckCircle2, AlertTriangle, FileText, Download } from 'lucide-react';
import { subscribeTenantPayments, subscribeAssessments, subscribeOwnerAssessmentPayments } from '../firebase';
import { P, PageHeader, StatCard, Table, TR, TD, Spinner, EmptyState } from '../components/UI';

export default function MyPropertyPage({ userProfile, tenantData, onToast }) {
  const [payments, setPayments] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [unitPayments, setUnitPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantData?.id) {
       setLoading(false);
       return;
    }

    const unsubP = subscribeTenantPayments(tenantData.id, data => setPayments(data));
    const unsubA = subscribeAssessments(data => {
      // All assessments, we will filter them below
      setAssessments(data);
      setLoading(false);
    });

    // We also need to see if we've paid specific assessments
    const unsubUP = subscribeOwnerAssessmentPayments(tenantData.id, data => {
      setUnitPayments(data);
    });

    return () => { unsubP(); unsubA(); unsubUP(); };
  }, [tenantData?.id]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  if (!tenantData) return <EmptyState icon="🏠" title="No Property Linked" body="Your account is not currently linked to a specific unit. Please contact management." />;

  const myAssessments = assessments.filter(a => a.unitIds?.includes(tenantData.id));
  const outstandingAssessments = myAssessments.filter(a => {
    const p = unitPayments.find(up => up.assessmentId === a.id);
    return !p || !p.paid;
  });

  const totalOutstanding = outstandingAssessments.reduce((sum, a) => sum + (a.perUnit || 0), 0);

  return (
    <div>
      <PageHeader title="My Property & Ledger" subtitle={`Unit ${tenantData.unit} · ${tenantData.property || 'Managed Complex'}`} />

      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Monthly HOA Fee" value={`$${(tenantData.rentAmount || 0).toLocaleString()}`} color={P.navy} icon="🏢" />
        <StatCard label="Outstanding Levies" value={`$${totalOutstanding.toLocaleString()}`} color={totalOutstanding > 0 ? P.danger : P.success} icon="⚠️" />
        <StatCard label="Owner Status" value="Good Standing" sub="All fees paid" color={P.success} icon="✅" />
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left: Financial Ledger */}
        <div style={{ flex: 1.5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Banknote size={20} color={P.navy} />
            <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>Payment History</div>
          </div>

          <div style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
            {payments.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: P.textMuted }}>No recent payments recorded.</div>
            ) : (
              <Table headers={['Date', 'Reference', 'Type', 'Amount', 'Status']}>
                {payments.map((p, i) => (
                  <TR key={p.id} idx={i}>
                    <TD>{p.date}</TD>
                    <TD muted>{p.id.slice(0, 8)}</TD>
                    <TD><span style={{ fontWeight: 600 }}>{p.memo || 'HOA Fee'}</span></TD>
                    <TD bold>${(Number(p.amount) || 0).toLocaleString()}</TD>
                    <TD><span style={{ color: P.success, fontWeight: 700 }}>PAID</span></TD>
                  </TR>
                ))}
              </Table>
            )}
          </div>
        </div>

        {/* Right: Active Assessments */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <AlertTriangle size={20} color={P.warning} />
            <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>Special Assessments</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {myAssessments.length === 0 ? (
              <div style={{ padding: 24, background: P.card, borderRadius: 16, border: `1px dashed ${P.border}`, textAlign: 'center', color: P.textMuted }}>
                No special assessments levied against this unit.
              </div>
            ) : (
              myAssessments.map(a => {
                const p = unitPayments.find(up => up.assessmentId === a.id);
                const isPaid = p?.paid;

                return (
                  <div key={a.id} style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{a.title}</div>
                        <div style={{ fontSize: 12, color: P.textMuted, marginTop: 2 }}>Due: {a.dueDate || 'N/A'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: P.navy }}>${(a.perUnit || 0).toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: P.textMuted }}>Levy Amount</div>
                      </div>
                    </div>

                    <div style={{ padding: '10px 14px', background: isPaid ? '#EAF7F2' : '#FFF9E6', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isPaid ? <CheckCircle2 size={16} color={P.success} /> : <Clock size={16} color={P.warning} />}
                      <div style={{ fontSize: 13, fontWeight: 700, color: isPaid ? P.success : P.warning }}>
                        {isPaid ? `Paid on ${p.datePaid}` : 'Payment Outstanding'}
                      </div>
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                      <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        <Download size={14} /> Download Invoice
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
