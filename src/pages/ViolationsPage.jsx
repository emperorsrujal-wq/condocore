import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Search, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { subscribeViolations, addViolation, updateViolation, deleteViolation, subscribeTenants, uploadFile, addDocument } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState } from '../components/UI';
import { jsPDF } from 'jspdf';

const VIOLATION_TYPES = [
  'Noise Complaint', 'Unauthorized Pet', 'Parking Violation', 'Improper Waste Disposal',
  'Unapproved Renovation', 'Common Area Misuse', 'Short-term Rental (Airbnb)',
  'Balcony/Patio Violation', 'Smoking in Common Areas', 'Failure to Maintain Unit', 'Other'
];

const FINE_SCHEDULE = {
  'First Warning':  0,
  'Second Notice':  100,
  'Third Notice':   250,
  'Final Notice':   500,
};

const STATUS_STYLES = {
  'Open':       { bg: '#FFF3CD', color: '#856404', border: '#FFECB5' },
  'In Progress':{ bg: '#CCE5FF', color: '#004085', border: '#B8DAFF' },
  'Resolved':   { bg: '#D4EDDA', color: '#155724', border: '#C3E6CB' },
  'Escalated':  { bg: '#F8D7DA', color: '#721C24', border: '#F5C6CB' },
};

const generateViolationPDF = (owner, violation, landlordName) => {
  const doc = new jsPDF();
  const stage = violation.escalationLevel || 'First Warning';
  const fine = FINE_SCHEDULE[stage] || 0;
  const dateStr = new Date().toLocaleDateString();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`BYLAW VIOLATION NOTICE — ${stage.toUpperCase()}`, 105, 20, null, null, 'center');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const body = `
Date: ${dateStr}
From: ${landlordName || 'Board of Directors / Management'}

To: ${owner?.name || 'Homeowner'}
Unit: ${owner?.unit || violation.unit || 'N/A'}

Dear ${owner?.name || 'Homeowner'},

This notice is to inform you of a bylaw violation recorded at your unit.

VIOLATION DETAILS:
Type: ${violation.type}
Date Observed: ${violation.dateObserved || 'Unknown'}
Description: ${violation.description || 'See attached records.'}

ESCALATION LEVEL: ${stage}
FINE ASSESSED: ${fine > 0 ? `$${fine}.00` : 'No fine at this stage (Warning only)'}

${fine > 0 ? `Payment of $${fine}.00 is due within 30 days of this notice. Failure to pay may result in a lien on your unit per the Condominium Act.` : 'Please correct the violation within 7 days to avoid further action.'}

If you believe this notice has been issued in error, you may request a hearing with the Board of Directors within 14 days.

Sincerely,

___________________________________
${landlordName || 'Board of Directors'}

This notice has been delivered in accordance with the corporation's Declaration, Bylaws, and Rules.
  `;

  const split = doc.splitTextToSize(body, 180);
  doc.text(split, 15, 35);
  return doc.output('blob');
};

const FORM_DEFAULT = { ownerId: '', unit: '', type: 'Noise Complaint', description: '', dateObserved: new Date().toISOString().split('T')[0], status: 'Open', escalationLevel: 'First Warning', fineAmount: 0, notes: '' };

export default function ViolationsPage({ userProfile, onToast }) {
  const [violations, setViolations] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    const isPrivileged = ['manager', 'landlord', 'super_admin'].includes(userProfile.role);
    if (!isPrivileged) { setLoading(false); return; }

    const u1 = subscribeViolations(data => { setViolations(data); setLoading(false); });
    const u2 = subscribeTenants(data => setOwners(data));
    return () => { u1 && u1(); u2 && u2(); };
  }, [userProfile]);

  const filtered = violations.filter(v => {
    const q = search.toLowerCase();
    const oName = owners.find(o => o.id === v.ownerId)?.name || '';
    return v.type?.toLowerCase().includes(q) || v.status?.toLowerCase().includes(q) || oName.toLowerCase().includes(q);
  });

  const openViolations = violations.filter(v => v.status !== 'Resolved').length;

  const openAdd = () => { setForm({ ...FORM_DEFAULT, dateObserved: new Date().toISOString().split('T')[0] }); setEditing(null); setShowForm(true); };
  const openEdit = (v) => { setForm(v); setEditing(v); setShowForm(true); };

  const handleSave = async () => {
    if (!form.type) return onToast('Violation type required.', 'error');
    setSaving(true);
    try {
      const payload = { ...form, fineAmount: FINE_SCHEDULE[form.escalationLevel] || 0 };
      if (editing) { await updateViolation(editing.id, payload); onToast('Violation record updated.'); }
      else { await addViolation(payload); onToast('Violation logged.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this violation record?')) return;
    try { await deleteViolation(id); onToast('Record deleted.'); }
    catch (e) { onToast(e.message, 'error'); }
  };

  const handlePrintNotice = async (v) => {
    const owner = owners.find(o => o.id === v.ownerId);
    try {
      const blob = generateViolationPDF(owner, v, userProfile?.name);
      const filename = `Violation_Notice_${(owner?.name || 'Owner').replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const path = `documents/${filename}`;
      const url = await uploadFile(blob, path);

      if (owner) {
        await addDocument({
          name: `Bylaw Violation Notice (${v.escalationLevel})`,
          type: 'Notice',
          unit: owner.unit || v.unit,
          tenantId: owner.id,
          url, storagePath: path,
          size: (blob.size / 1024).toFixed(1) + ' KB',
          ext: 'PDF',
          uploadedBy: userProfile?.name || 'System'
        });
      }

      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(localUrl);
      onToast('Violation notice generated and saved!');
    } catch (e) { onToast(e.message, 'error'); }
  };

  const F = (k) => ({ value: form[k] || '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader
        title="Bylaw Violation Tracker"
        subtitle={`${openViolations} open violations · ${violations.length} total`}
        action={<Btn onClick={openAdd}><Plus size={15} /> Log Violation</Btn>}
      />

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Open', count: violations.filter(v => v.status === 'Open').length, bg: '#FFF3CD', color: '#856404', icon: <Clock size={18} /> },
          { label: 'In Progress', count: violations.filter(v => v.status === 'In Progress').length, bg: '#CCE5FF', color: '#004085', icon: <AlertTriangle size={18} /> },
          { label: 'Escalated', count: violations.filter(v => v.status === 'Escalated').length, bg: '#F8D7DA', color: '#721C24', icon: <XCircle size={18} /> },
          { label: 'Resolved', count: violations.filter(v => v.status === 'Resolved').length, bg: '#D4EDDA', color: '#155724', icon: <CheckCircle2 size={18} /> },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by owner name, type, or status..."
          style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none' }} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📋" title="No Violations Logged" body="Your corporation is fully compliant!" action={<Btn onClick={openAdd}>Log First Violation</Btn>} />
      ) : (
        <Table headers={['Violation', 'Unit / Owner', 'Stage', 'Fine', 'Status', '']}>
          {filtered.map((v, i) => {
            const owner = owners.find(o => o.id === v.ownerId);
            const ss = STATUS_STYLES[v.status] || STATUS_STYLES['Open'];
            return (
              <TR key={v.id} idx={i}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FFF3CD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <AlertTriangle size={16} color="#856404" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{v.type}</div>
                      <div style={{ fontSize: 12, color: P.textMuted }}>{v.dateObserved || '--'}</div>
                    </div>
                  </div>
                </TD>
                <TD bold>{owner ? `${owner.name} (${owner.unit || v.unit})` : (v.unit || 'N/A')}</TD>
                <TD><span style={{ fontSize: 12, fontWeight: 600, color: P.navy }}>{v.escalationLevel || 'First Warning'}</span></TD>
                <TD bold style={{ color: (v.fineAmount || 0) > 0 ? P.danger : P.textMuted }}>
                  {(v.fineAmount || 0) > 0 ? `$${Number(v.fineAmount).toLocaleString()}` : 'None'}
                </TD>
                <TD>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                    {v.status}
                  </span>
                </TD>
                <TD>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handlePrintNotice(v)} title="Generate Notice PDF" style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#EAF7F2', color: P.success, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} /> Notice</button>
                    <button onClick={() => openEdit(v)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(v.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}>Del</button>
                  </div>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Violation Record' : 'Log Bylaw Violation'} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Owner / Unit" {...F('ownerId')} options={[{ value: '', label: 'Select Owner (optional)' }, ...owners.map(o => ({ value: o.id, label: `${o.name} (${o.unit})` }))]} />
            <Input label="Unit # (if unlisted)" {...F('unit')} placeholder="e.g. 403" />
            <Select label="Violation Type *" {...F('type')} options={VIOLATION_TYPES} />
            <Input label="Date Observed" type="date" {...F('dateObserved')} />
            <Select label="Escalation Level" {...F('escalationLevel')} options={Object.keys(FINE_SCHEDULE)}
              onChange={e => setForm(f => ({ ...f, escalationLevel: e.target.value, fineAmount: FINE_SCHEDULE[e.target.value] || 0 }))} />
            <Select label="Status" {...F('status')} options={['Open', 'In Progress', 'Resolved', 'Escalated']} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Input label="Description / Evidence Notes" {...F('description')} placeholder="Describe the violation in detail..." />
          </div>
          {(FINE_SCHEDULE[form.escalationLevel] || 0) > 0 && (
            <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: '#FFF3CD', fontSize: 13, color: '#856404', fontWeight: 600 }}>
              ⚠️ Fine for this escalation level: ${FINE_SCHEDULE[form.escalationLevel]}.00
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Log Violation'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
