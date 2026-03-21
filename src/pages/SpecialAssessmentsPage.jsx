import { useState, useEffect } from 'react';
import { Banknote, Plus, Search, Users, CheckCircle2, Clock } from 'lucide-react';
import { subscribeAssessments, addAssessment, updateAssessment, deleteAssessment, subscribeTenants } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState } from '../components/UI';

const ASSESSMENT_CATEGORIES = [
  'Emergency Roof Repair', 'Elevator Upgrade', 'Parking Lot Resurfacing',
  'Window Replacement', 'Plumbing Overhaul', 'Common Area Renovation',
  'Insurance Deductible', 'Legal Fees', 'Other Capital Expenditure'
];

const FORM_DEFAULT = {
  title: '', category: 'Emergency Roof Repair', totalAmount: '',
  dueDate: '', description: '', status: 'Active', payments: []
};

export default function SpecialAssessmentsPage({ userProfile, onToast }) {
  const [assessments, setAssessments] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    // Assessments are readable by all but subscribeTenants is restricted
    const u1 = subscribeAssessments(data => { setAssessments(data); setLoading(false); });
    
    const isPrivileged = ['manager', 'landlord', 'super_admin'].includes(userProfile.role);
    let u2;
    if (isPrivileged) {
      u2 = subscribeTenants(data => setOwners(data));
    }
    
    return () => { u1 && u1(); u2 && u2(); };
  }, [userProfile]);

  // Calculate per-unit levy: split total by number of active owners
  const calcPerUnit = (totalAmount) => {
    if (!owners.length) return 0;
    return (Number(totalAmount) || 0) / owners.length;
  };

  const calcCollected = (assessment) => {
    return (assessment.payments || []).filter(p => p.paid).length * calcPerUnit(assessment.totalAmount);
  };

  const filtered = assessments.filter(a => {
    const q = search.toLowerCase();
    return a.title?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q);
  });

  const openAdd = () => {
    setForm({ ...FORM_DEFAULT, dueDate: '', payments: owners.map(o => ({ ownerId: o.id, ownerName: o.name, unit: o.unit, paid: false, datePaid: '' })) });
    setEditing(null); setShowForm(true);
  };

  const openEdit = (a) => { setForm(a); setEditing(a); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title || !form.totalAmount) return onToast('Title and total amount required.', 'error');
    setSaving(true);
    try {
      const payload = { ...form, totalAmount: parseFloat(form.totalAmount) || 0, perUnit: calcPerUnit(form.totalAmount) };
      if (editing) { await updateAssessment(editing.id, payload); onToast('Assessment updated.'); }
      else { await addAssessment(payload); onToast('Special assessment levied.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this assessment?')) return;
    try { await deleteAssessment(id); if (viewing?.id === id) setViewing(null); onToast('Deleted.'); }
    catch (e) { onToast(e.message, 'error'); }
  };

  const togglePayment = async (assessment, ownerIdx) => {
    const payments = [...(assessment.payments || [])];
    payments[ownerIdx] = { ...payments[ownerIdx], paid: !payments[ownerIdx].paid, datePaid: !payments[ownerIdx].paid ? new Date().toISOString().split('T')[0] : '' };
    try {
      await updateAssessment(assessment.id, { payments });
      setViewing(v => v ? { ...v, payments } : v);
      onToast('Payment status updated.');
    } catch (e) { onToast(e.message, 'error'); }
  };

  const F = (k) => ({ value: form[k] || '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Special Assessments" subtitle="One-time charges levied across all homeowners"
        action={<Btn onClick={openAdd}><Plus size={15} /> New Assessment</Btn>} />

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assessments..."
          style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left: Assessment list */}
        <div style={{ flex: 1.4 }}>
          {filtered.length === 0 ? (
            <EmptyState icon="📬" title="No Special Assessments" body="Levy a new assessment when unexpected capital expenses arise." action={<Btn onClick={openAdd}>New Assessment</Btn>} />
          ) : (
            <Table headers={['Assessment', 'Per Unit', 'Collected', 'Status', '']}>
              {filtered.map((a, i) => {
                const perUnit = a.perUnit || calcPerUnit(a.totalAmount);
                const collected = calcCollected(a);
                const total = Number(a.totalAmount) || 0;
                const paidCount = (a.payments || []).filter(p => p.paid).length;
                const totalUnits = (a.payments || []).length || owners.length;
                const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

                return (
                  <TR key={a.id} idx={i}>
                    <TD>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setViewing(a)}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#CCE5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Banknote size={16} color="#004085" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</div>
                          <div style={{ fontSize: 12, color: P.textMuted }}>{a.category} · Due: {a.dueDate || 'N/A'}</div>
                        </div>
                      </div>
                    </TD>
                    <TD bold>${perUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TD>
                    <TD>
                      <div style={{ fontSize: 13, fontWeight: 700, color: pct >= 100 ? P.success : P.navy }}>${collected.toLocaleString(undefined, { minimumFractionDigits: 0 })} / ${total.toLocaleString()}</div>
                      <div style={{ height: 4, background: P.border, borderRadius: 3, marginTop: 4, width: 80 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? P.success : P.navy, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 11, color: P.textMuted, marginTop: 2 }}>{paidCount}/{totalUnits} units paid</div>
                    </TD>
                    <TD>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: a.status === 'Closed' ? '#D4EDDA' : '#CCE5FF', color: a.status === 'Closed' ? '#155724' : '#004085' }}>
                        {a.status}
                      </span>
                    </TD>
                    <TD>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewing(a)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: viewing?.id === a.id ? P.navy : '#fff', color: viewing?.id === a.id ? '#fff' : P.text, cursor: 'pointer' }}>Payments</button>
                        <button onClick={() => openEdit(a)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleDelete(a.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}>Del</button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </Table>
          )}
        </div>

        {/* Right: Payment tracker panel */}
        {viewing && (
          <div style={{ flex: 1, background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{viewing.title}</div>
            <div style={{ fontSize: 13, color: P.textMuted, marginBottom: 16, paddingBottom: 14, borderBottom: `1px dashed ${P.border}` }}>
              Per Unit: <b style={{ color: P.navy }}>${(viewing.perUnit || calcPerUnit(viewing.totalAmount)).toFixed(2)}</b> · Total: <b>${(Number(viewing.totalAmount) || 0).toLocaleString()}</b>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} /> Unit Payment Status
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
              {(viewing.payments || owners.map(o => ({ ownerId: o.id, ownerName: o.name, unit: o.unit, paid: false }))).map((p, idx) => (
                <div key={p.ownerId || idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: p.paid ? '#EAF7F2' : P.bg, border: `1px solid ${p.paid ? P.success + '44' : P.border}` }}>
                  {p.paid
                    ? <CheckCircle2 size={18} color={P.success} />
                    : <Clock size={18} color={P.textMuted} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.ownerName || 'Unit ' + p.unit}</div>
                    <div style={{ fontSize: 11, color: P.textMuted }}>Unit {p.unit}{p.paid && p.datePaid ? ` · Paid ${p.datePaid}` : ''}</div>
                  </div>
                  <button onClick={() => togglePayment(viewing, idx)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: 'none', background: p.paid ? '#F8D7DA' : '#D4EDDA', color: p.paid ? P.danger : P.success, cursor: 'pointer', fontWeight: 700 }}>
                    {p.paid ? 'Undo' : 'Mark Paid'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Special Assessment' : 'Levy Special Assessment'} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}><Input label="Assessment Title *" {...F('title')} placeholder="e.g. Emergency Roof Repair 2025" /></div>
            <Select label="Category" {...F('category')} options={ASSESSMENT_CATEGORIES} />
            <Input label="Total Amount ($) *" type="number" {...F('totalAmount')} placeholder="0.00" />
            <Input label="Payment Due Date" type="date" {...F('dueDate')} />
            <Select label="Status" {...F('status')} options={['Active', 'Closed']} />
            <div style={{ gridColumn: '1/-1' }}><Input label="Description / Reason" {...F('description')} placeholder="Explain the need for this levy..." /></div>
          </div>
          {owners.length > 0 && form.totalAmount && (
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 9, background: '#EAF7F2', fontSize: 13, color: '#155724', fontWeight: 600 }}>
              ✓ Per unit levy: <b>${calcPerUnit(form.totalAmount).toFixed(2)}</b> across {owners.length} owners
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Levy Assessment'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
