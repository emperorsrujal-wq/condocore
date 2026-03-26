import { useState, useEffect } from 'react';
import { Plus, Download } from 'lucide-react';
import { subscribePayments, addPayment, updatePayment } from '../firebase';
import { P, StatusBadge, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState, StatCard } from '../components/UI';
import { useHOAMode } from '../contexts/HOAModeContext';

const FORM_DEFAULT = { tenant: '', tenantId: '', unit: '', amount: '', due: '', month: '', method: 'E-Transfer', status: 'pending' };

export default function PaymentsPage({ onToast, tenants = [], myOnly, tenantData, userProfile }) {
  const { label } = useHOAMode();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [recordModal, setRecordModal] = useState(null);
  const [form, setForm]         = useState(FORM_DEFAULT);
  const [saving, setSaving]     = useState(false);

  const isManager = ['manager', 'landlord', 'super_admin', 'super-admin'].includes(userProfile?.role);

  useEffect(() => {
    const unsub = subscribePayments(data => { setPayments(data); setLoading(false); });
    return unsub;
  }, []);

  // Filter payments: tenants/owners only see their own
  const myPayments = myOnly && tenantData ? payments.filter(p => p.tenantId === tenantData.id || p.tenant === tenantData.name) : payments;
  const filtered = filter === 'all' ? myPayments : myPayments.filter(p => p.status === filter);
  const total      = myPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const collected  = myPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const outstanding= myPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const rate       = total > 0 ? Math.round(collected / total * 100) : 0;

  const handleAddPayment = async () => {
    if (!form.tenant || !form.amount) return onToast('Fill required fields.', 'error');
    setSaving(true);
    try {
      await addPayment({ ...form, amount: parseFloat(form.amount) || 0, paid: null });
      setShowAdd(false); setForm(FORM_DEFAULT); onToast('Payment record added.');
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleRecord = async () => {
    if (!recordModal) return;
    setSaving(true);
    try {
      await updatePayment(recordModal.id, { status: 'paid', paid: new Date().toISOString().split('T')[0], method: recordModal.method });
      setRecordModal(null); onToast('Payment recorded successfully!');
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title={myOnly ? 'My Payments' : label('rent', 'Rent') + " & Payments"} subtitle={myOnly ? 'View your payment history' : `Track all ${label('rent', 'rent').toLowerCase()} collection`}
        action={isManager ? <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm"><Download size={14} /> Export</Btn>
          <Btn onClick={() => setShowAdd(true)}><Plus size={15} /> Add Record</Btn>
        </div> : null} />

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Expected" value={`$${total.toLocaleString()}`} color={P.navyLight} />
        <StatCard label="Collected" value={`$${collected.toLocaleString()}`} color={P.success} />
        <StatCard label="Outstanding" value={`$${outstanding.toLocaleString()}`} color={P.danger} />
        <StatCard label="Collection Rate" value={`${rate}%`} color={P.gold} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {['all', 'paid', 'pending', 'overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${filter === f ? P.navy : P.border}`, background: filter === f ? P.navy : P.card, color: filter === f ? '#fff' : P.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {filtered.length === 0
        ? <EmptyState icon="💰" title="No payment records" body={`Add payment records to start tracking ${label('rent', 'rent').toLowerCase()} collection.`} action={<Btn onClick={() => setShowAdd(true)}><Plus size={14} /> Add Record</Btn>} />
        : (
          <Table headers={[label('tenant', 'Tenant'), 'Unit', 'Amount', 'Due Date', 'Paid On', 'Method', 'Status', '']}>
            {filtered.map((p, i) => (
              <TR key={p.id} idx={i}>
                <TD><span style={{ fontWeight: 600, color: P.text }}>{p.tenant}</span></TD>
                <TD muted>Unit {p.unit}</TD>
                <TD bold>${(p.amount || 0).toLocaleString()}</TD>
                <TD muted>{p.due || '—'}</TD>
                <TD><span style={{ color: p.paid ? P.success : P.textMuted }}>{p.paid || '—'}</span></TD>
                <TD muted>{p.method || '—'}</TD>
                <TD><StatusBadge status={p.status} /></TD>
                <TD>
                  {isManager && p.status !== 'paid' && (
                    <button onClick={() => setRecordModal({ ...p })} style={{ background: '#EAF7F2', color: P.success, border: `1px solid ${P.success}30`, borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Record</button>
                  )}
                </TD>
              </TR>
            ))}
          </Table>
        )}

      {/* Add Record Modal */}
      {showAdd && (
        <Modal title="Add Payment Record" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ gridColumn: 'span 2', marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>{label('tenant', 'Tenant')} *</label>
              <select value={form.tenant} onChange={e => {
                const t = tenants.find(t => t.name === e.target.value);
                setForm(f => ({ ...f, tenant: e.target.value, tenantId: t?.id || '', unit: t?.unit || '' }));
              }} style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                <option value="">Select {label('tenant', 'tenant').toLowerCase()}...</option>
                {tenants.map(t => <option key={t.id} value={t.name}>{t.name} — Unit {t.unit}</option>)}
              </select>
            </div>
            <Input label="Amount ($) *" type="number" {...F('amount')} />
            <Input label="Month" {...F('month')} placeholder="e.g. December 2024" />
            <Input label="Due Date" type="date" {...F('due')} />
            <Select label="Method" {...F('method')} options={['E-Transfer', 'Cheque', 'Direct Debit', 'Cash', 'Credit Card']} />
            <div style={{ gridColumn: 'span 2' }}>
              <Select label="Status" {...F('status')} options={['pending', 'paid', 'overdue']} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleAddPayment} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Add Record'}</Btn>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      {recordModal && (
        <Modal title="Record Payment" onClose={() => setRecordModal(null)} maxWidth={400}>
          <p style={{ color: P.textMuted, fontSize: 14, marginBottom: 18 }}>Recording payment for <strong style={{ color: P.text }}>{recordModal.tenant}</strong> — Unit {recordModal.unit}</p>
          <div style={{ background: P.bg, borderRadius: 10, padding: '14px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: P.textMuted }}>Amount</span>
            <span style={{ fontSize: 22, fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: P.text }}>${(recordModal.amount || 0).toLocaleString()}</span>
          </div>
          <Select label="Payment Method" value={recordModal.method || 'E-Transfer'} onChange={e => setRecordModal(r => ({ ...r, method: e.target.value }))} options={['E-Transfer', 'Cheque', 'Direct Debit', 'Cash', 'Credit Card']} />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setRecordModal(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="success" onClick={handleRecord} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : '✓ Confirm Payment'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
