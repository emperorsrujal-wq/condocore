import { useState, useEffect } from 'react';
import { Banknote, Plus, Search, Users, CheckCircle2, Clock } from 'lucide-react';
import { subscribeAssessments, addAssessment, updateAssessment, deleteAssessment, subscribeTenants, subscribeProperties, subscribeAssessmentPayments, setUnitPayment } from '../firebase';
import { jsPDF } from 'jspdf';
import { P, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState, ConfirmModal } from '../components/UI';
import { useHOAMode } from '../contexts/HOAModeContext';

const ASSESSMENT_CATEGORIES = [
  'Emergency Roof Repair', 'Elevator Upgrade', 'Parking Lot Resurfacing',
  'Window Replacement', 'Plumbing Overhaul', 'Common Area Renovation',
  'Insurance Deductible', 'Legal Fees', 'Other Capital Expenditure'
];

const FORM_DEFAULT = {
  title: '', category: 'Emergency Roof Repair', totalAmount: '',
  dueDate: '', description: '', status: 'Active', payments: [], propertyId: '', propertyName: ''
};

export default function SpecialAssessmentsPage({ userProfile, onToast }) {
  const { label, isHOAMode } = useHOAMode();
  const [assessments, setAssessments] = useState([]);
  const [owners, setOwners] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [unitPayments, setUnitPayments] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!userProfile) return;
    const u1 = subscribeAssessments(data => { 
      const sorted = [...data].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
      });
      setAssessments(sorted); 
      setLoading(false); 
    });
    const uP = subscribeProperties(data => setProperties(data));
    
    const isPrivileged = ['manager', 'landlord', 'super_admin'].includes(userProfile.role);
    let u2;
    if (isPrivileged) {
      u2 = subscribeTenants(data => setOwners(data));
    }
    
    return () => { u1 && u1(); uP && uP(); u2 && u2(); };
  }, [userProfile]);

  useEffect(() => {
    if (!viewing) { setUnitPayments([]); return; }
    const unsub = subscribeAssessmentPayments(viewing.id, data => setUnitPayments(data));
    return () => unsub();
  }, [viewing]);

  // Calculate per-unit levy: split total by number of targeted owners
  const calcPerUnit = (totalAmount, targetOwnersCount) => {
    const count = targetOwnersCount || owners.length; 
    if (!count) return 0;
    return (Number(totalAmount) || 0) / count;
  };

  const calcCollected = (assessment, payments) => {
    const paidCount = (payments || []).filter(p => p.paid).length;
    return paidCount * assessment.perUnit;
  };

  const filtered = assessments.filter(a => {
    const q = search.toLowerCase();
    return a.title?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q);
  });

  const openAdd = () => {
    setForm(FORM_DEFAULT);
    setEditing(null); setShowForm(true);
  };

  const openEdit = (a) => { setForm(a); setEditing(a); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title || !form.totalAmount || !form.propertyId) return onToast('Title, total amount, and building are required.', 'error');
    setSaving(true);
    try {
      const targetOwners = owners.filter(o => o.propertyId === form.propertyId || o.property === form.propertyName);
      const perUnitValue = calcPerUnit(form.totalAmount, targetOwners.length);
      
      const payload = { 
        ...form, 
        totalAmount: parseFloat(form.totalAmount) || 0, 
        perUnit: perUnitValue,
        unitIds: targetOwners.map(o => o.id) // Track who is included
      };
      // Remove deprecated payments array from parent doc
      delete payload.payments;
      
      let assessmentId;
      if (editing) { 
        await updateAssessment(editing.id, payload); 
        assessmentId = editing.id;
        onToast('Assessment updated.'); 
      } else { 
        const docRef = await addAssessment(payload); 
        assessmentId = docRef.id;
        // Initialize unit payments sub-collection
        for (const owner of targetOwners) {
          await setUnitPayment(assessmentId, owner.id, {
            ownerId: owner.id,
            ownerName: owner.name,
            unit: owner.unit,
            paid: false,
            datePaid: ''
          });
        }
        onToast('Special assessment levied.'); 
      }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setConfirmAction({ message: 'Delete this assessment?', action: async () => {
      try { await deleteAssessment(id); if (viewing?.id === id) setViewing(null); onToast('Deleted.'); }
      catch (e) { onToast(e.message, 'error'); }
    } });
    return;
  };

  const togglePayment = async (assessment, paymentDoc) => {
    const isPaid = !paymentDoc.paid;
    try {
      await setUnitPayment(assessment.id, paymentDoc.id, {
        paid: isPaid,
        datePaid: isPaid ? new Date().toISOString().split('T')[0] : ''
      });
      onToast('Payment status updated.');
    } catch (e) { onToast(e.message, 'error'); }
  };

  const generateInvoice = (assessment, payment) => {
    const doc = new jsPDF();
    const primary = '#004085';
    
    doc.setFontSize(22);
    doc.setTextColor(primary);
    doc.text('SPECIAL ASSESSMENT INVOICE', 105, 30, { align: 'center' });
    
    doc.setDrawColor(primary);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(payment.ownerName, 20, 56);
    doc.text(`Unit ${payment.unit}`, 20, 62);
    doc.text(assessment.propertyName || 'Building Complex', 20, 68);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Details:', 130, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 130, 56);
    doc.text(`Assessment ID: ${assessment.id.slice(0, 8)}`, 130, 62);
    doc.text(`Due Date: ${assessment.dueDate || 'N/A'}`, 130, 68);
    
    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 80, 170, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 25, 87);
    doc.text('Amount', 160, 87);
    
    // Line Item
    doc.setFont('helvetica', 'normal');
    doc.text(assessment.title, 25, 100);
    doc.text(`$${assessment.perUnit.toFixed(2)}`, 160, 100);
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text(assessment.description || '', 25, 106, { maxWidth: 120 });
    
    doc.setDrawColor(200);
    doc.line(20, 115, 190, 115);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Due:', 130, 125);
    doc.text(`$${assessment.perUnit.toFixed(2)}`, 160, 125);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Please make payment via the CondoCore Owner Portal or contact management.', 105, 150, { align: 'center' });
    
    doc.save(`Invoice_${assessment.title.replace(/\s+/g, '_')}_Unit_${payment.unit}.pdf`);
    onToast('Invoice generated.');
  };

  const F = (k) => ({ value: form[k] || '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title={label('assessments', 'Special Assessments')} subtitle={`One-time charges levied across ${isHOAMode ? 'homeowners' : 'tenants'}`}
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
            <Table headers={['Assessment', 'Building', 'Per Unit', 'Collected', 'Status', '']}>
              {filtered.map((a, i) => {
                const perUnit = a.perUnit || calcPerUnit(a.totalAmount, (a.payments || []).length);
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
                    <TD muted>{a.propertyName || 'Multiple'}</TD>
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
              Bldg: <b>{viewing.propertyName}</b> · Per Unit: <b style={{ color: P.navy }}>${viewing.perUnit?.toFixed(2)}</b> · Total: <b>${(Number(viewing.totalAmount) || 0).toLocaleString()}</b>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} /> Unit Payment Status
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
              {unitPayments.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: P.textMuted }}>No payments recorded for this assessment.</div>
              ) : unitPayments.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: p.paid ? '#EAF7F2' : P.bg, border: `1px solid ${p.paid ? P.success + '44' : P.border}` }}>
                  {p.paid
                    ? <CheckCircle2 size={18} color={P.success} />
                    : <Clock size={18} color={P.textMuted} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.ownerName}</div>
                    <div style={{ fontSize: 11, color: P.textMuted }}>Unit {p.unit}{p.paid && p.datePaid ? ` · Paid ${p.datePaid}` : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn variant="ghost" size="xs" onClick={() => generateInvoice(viewing, p)} title="Generate Invoice" style={{ padding: '4px 6px' }}>
                      <Banknote size={13} />
                    </Btn>
                    <button onClick={() => togglePayment(viewing, p)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: 'none', background: p.paid ? '#F8D7DA' : '#D4EDDA', color: p.paid ? P.danger : P.success, cursor: 'pointer', fontWeight: 700 }}>
                      {p.paid ? 'Undo' : 'Mark Paid'}
                    </button>
                  </div>
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
            <Select label="Building *" value={form.propertyId} onChange={e => {
              const p = properties.find(prop => prop.id === e.target.value);
              setForm(f => ({ ...f, propertyId: e.target.value, propertyName: p?.name || '' }));
            }} options={[{ label: 'Select Building', value: '' }, ...properties.map(p => ({ label: p.name, value: p.id }))]} />
            <Input label="Total Amount ($) *" type="number" {...F('totalAmount')} placeholder="0.00" />
            <Input label="Payment Due Date" type="date" {...F('dueDate')} />
            <Select label="Status" {...F('status')} options={['Active', 'Closed']} />
            <div style={{ gridColumn: '1/-1' }}><Input label="Description / Reason" {...F('description')} placeholder="Explain the need for this levy..." /></div>
          </div>
          {form.propertyId && form.totalAmount && (
            <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 9, background: '#EAF7F2', fontSize: 13, color: '#155724', fontWeight: 600 }}>
              {(() => {
                const targetCount = owners.filter(o => o.propertyId === form.propertyId || o.property === form.propertyName).length;
                return (
                  <>✓ Per unit levy: <b>${calcPerUnit(form.totalAmount, targetCount).toFixed(2)}</b> across {targetCount} {isHOAMode ? 'homeowners' : 'tenants'} in {form.propertyName}</>
                );
              })()}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Levy Assessment'}</Btn>
          </div>
        </Modal>
      )}

      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          onConfirm={() => { confirmAction.action(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
