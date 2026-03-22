import { useState, useEffect } from 'react';
import { Gavel, Plus, Search, Calendar, CheckCircle2, CircleDashed } from 'lucide-react';
import { subscribeEvictions, addEviction, updateEviction, deleteEviction, subscribeTenants } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState } from '../components/UI';

// Eviction Timeline Generators based on precise jurisdictional law
const generateTimeline = (formType, issueDateStr) => {
  const dt = new Date(issueDateStr);
  const addDays = (days) => { const d = new Date(dt); d.setDate(d.getDate() + days); return d.toLocaleDateString(); };
  
  if (formType === 'N4') return [
    { title: 'N4 Issued (Non-Payment)', date: dt.toLocaleDateString(), desc: 'Notice officially served to tenant.' },
    { title: '14-Day Wait Period', date: addDays(14), desc: 'Tenant has 14 days to pay arrears. If paid, notice is void.' },
    { title: 'File L1 Application', date: addDays(15), desc: 'If unpaid, file L1 Application to Evict with LTB immediately.' },
    { title: 'LTB Hearing Scheduled', date: addDays(75), desc: 'Typical wait time is 60-90 days from L1 filing.' },
    { title: 'Standard Eviction Order', date: addDays(105), desc: 'Board adjudicator typically yields order 30 days post-hearing.' },
    { title: 'Sheriff Enforces Possession', date: addDays(120), desc: 'Sheriff execution required if tenant fails to vacate.' }
  ];
  if (formType === 'N5') return [
    { title: 'N5 Issued (Damages/Interference)', date: dt.toLocaleDateString(), desc: 'Notice served to correct behavior.' },
    { title: '7-Day Void Period', date: addDays(7), desc: 'If tenant corrects issue within 7 days, notice is void.' },
    { title: 'File L2 Application', date: addDays(20), desc: 'File L2 with LTB if behavior not corrected.' },
    { title: 'LTB Hearing Scheduled', date: addDays(85), desc: 'Expect 60-90 days for LTB scheduling queue.' },
    { title: 'Eviction Order', date: addDays(115), desc: 'Possession ordered if evidence upheld.' }
  ];
  if (formType === 'N12') return [
    { title: 'N12 Issued (Landlord Use)', date: dt.toLocaleDateString(), desc: '60 Days notice minimum required.' },
    { title: 'Tenant Receives Compensation', date: addDays(59), desc: '1 month rent compensation MUST be paid before termination.' },
    { title: 'Termination Date', date: addDays(60), desc: 'Tenant must vacate the premises.' },
    { title: 'File L2 (If Tenant Refuses)', date: addDays(65), desc: 'File L2 to enforce order if tenant disputes.' }
  ];
  if (formType === 'RTB30') return [
    { title: '10-Day Notice (BC Unpaid Rent)', date: dt.toLocaleDateString(), desc: 'RTB-30 issued to tenant.' },
    { title: '5-Day Dispute Window', date: addDays(5), desc: 'Tenant must pay or file Dispute Resolution within 5 days.' },
    { title: 'Move-out Deadline', date: addDays(10), desc: 'If undisputed and unpaid, tenant vacates in 10 days.' },
    { title: 'Order of Possession Filing', date: addDays(11), desc: 'Apply via RTB Direct Request if tenant remains.' },
    { title: 'Writ of Possession', date: addDays(30), desc: 'Supreme Court writ issued for bailiff enforcement.' }
  ];
  return [
    { title: `${formType} Issued`, date: dt.toLocaleDateString(), desc: 'Process initialized.' },
    { title: 'Awaiting Compliance', date: addDays(14), desc: 'Check local legislation timelines.' }
  ];
};

export default function EvictionsPage({ userProfile, onToast }) {
  const [evictions, setEvictions] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState({ tenantId: '', formType: 'N4', issueDate: new Date().toISOString().split('T')[0], status: 'Active Process', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubE = subscribeEvictions(data => { 
      const sorted = [...data].sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
      setEvictions(sorted); 
      setLoading(false); 
    });
    const unsubT = subscribeTenants(data => setTenants(data));
    return () => { unsubE(); unsubT(); };
  }, []);

  const filtered = evictions.filter(e => {
    const tName = tenants.find(t => t.id === e.tenantId)?.name || '';
    return e.formType.toLowerCase().includes(search.toLowerCase()) || 
           e.status.toLowerCase().includes(search.toLowerCase()) || 
           tName.toLowerCase().includes(search.toLowerCase());
  });

  const handleSave = async () => {
    if (!form.tenantId || !form.issueDate) return onToast('Tenant and Issue Date required', 'error');
    setSaving(true);
    try {
      await addEviction(form);
      onToast('Eviction tracker active.');
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleResolve = async (eObj) => {
    if (!confirm('Mark this eviction process as Resolved/Closed?')) return;
    try { await updateEviction(eObj.id, { status: 'Resolved' }); onToast('Process closed.'); }
    catch (e) { onToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently wipe this eviction record?')) return;
    try { await deleteEviction(id); onToast('Record deleted.'); }
    catch (e) { onToast(e.message, 'error'); }
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Eviction Timeline Manager" subtitle="Automated chronological projections for LTB/RTB proceedings"
        action={<Btn onClick={() => { setForm({ tenantId:'', formType:'N4', issueDate:new Date().toISOString().split('T')[0], status:'Active Process', notes:'' }); setShowForm(true); }}><Plus size={15}/> Start Eviction Case</Btn>} />

      <div style={{ marginBottom: 20, position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Tenant Name or Form Type..."
          style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none' }} />
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Left Side: Active Cases Table */}
        <div style={{ flex: 1.5 }}>
          {filtered.length === 0 ? (
            <EmptyState icon="⚖️" title="No Active Evictions" body="The process registry is completely clear." action={<Btn onClick={() => setShowForm(true)}>Start Case</Btn>} />
          ) : (
            <Table headers={['Case / Tenant', 'Current Stage', 'Action']}>
              {filtered.map((eObj, i) => {
                const tenant = tenants.find(t => t.id === eObj.tenantId);
                const timeline = generateTimeline(eObj.formType, eObj.issueDate);
                const nextStep = timeline.find(step => new Date(step.date) >= new Date()) || timeline[timeline.length - 1];

                return (
                  <TR key={eObj.id} idx={i}>
                    <TD>
                      <div onClick={() => setViewing(eObj)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: eObj.status === 'Resolved' ? '#E8F5E9' : '#FDECEA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Gavel size={16} color={eObj.status === 'Resolved' ? P.success : P.danger} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{tenant ? tenant.name : 'Unknown User'} ({eObj.formType})</div>
                          <div style={{ fontSize: 12, color: P.textMuted }}>Issued: {eObj.issueDate}</div>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <div style={{ fontSize: 13, fontWeight: 600, color: eObj.status === 'Resolved' ? P.success : P.navy }}>{eObj.status === 'Resolved' ? 'Case Closed' : nextStep.title}</div>
                      <div style={{ fontSize: 11, color: P.textMuted }}>{eObj.status === 'Resolved' ? 'No further action required' : `Due: ${nextStep.date}`}</div>
                    </TD>
                    <TD>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setViewing(eObj)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: viewing?.id === eObj.id ? P.navy : '#fff', color: viewing?.id === eObj.id ? '#fff' : P.text, cursor: 'pointer' }}>View Timeline</button>
                        {eObj.status !== 'Resolved' && <button onClick={() => handleResolve(eObj)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#E8F5E9', color: P.success, cursor: 'pointer' }}>Resolve</button>}
                        <button onClick={() => handleDelete(eObj.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: 'none', color: P.danger, cursor: 'pointer' }}>Del</button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </Table>
          )}
        </div>

        {/* Right Side: Visual Timeline Renderer */}
        {viewing && (
          <div style={{ flex: 1, background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: 24, boxShadow: '0 4px 14px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: P.text, marginBottom: 4 }}>Legal Chronology</div>
            <div style={{ fontSize: 13, color: P.textMuted, marginBottom: 24, paddingBottom: 16, borderBottom: `1px dashed ${P.border}` }}>
              Tracking compliance dates for {viewing.formType} Form.<br/>
              <b>Tenant:</b> {tenants.find(t => t.id === viewing.tenantId)?.name || 'Unknown'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: 10, bottom: 20, width: 2, background: P.border, zIndex: 0 }} />
              
              {generateTimeline(viewing.formType, viewing.issueDate).map((step, idx) => {
                const stepDate = new Date(step.date);
                const isPast = stepDate < new Date() && viewing.status !== 'Resolved';
                const isResolved = viewing.status === 'Resolved';
                const isDue = stepDate.toDateString() === new Date().toDateString();

                return (
                  <div key={idx} style={{ display: 'flex', gap: 16, padding: '12px 0', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 30, flexShrink: 0, display: 'flex', justifyContent: 'center', background: P.card, paddingTop: 2 }}>
                      {isResolved || isPast ? <CheckCircle2 size={24} color={P.success} fill="#fff" /> : 
                       isDue ? <CircleDashed size={24} color={P.danger} fill="#fff" /> : 
                       <div style={{ width: 14, height: 14, borderRadius: '50%', background: P.navyLight, border: `3px solid white`, boxShadow: `0 0 0 1px ${P.border}`, marginTop: 4 }} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: (isResolved||isPast) ? P.success : (isDue ? P.danger : P.text) }}>{step.title}</div>
                        <div style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: P.bg, color: P.textMuted, fontWeight: 600 }}>{step.date}</div>
                      </div>
                      <div style={{ fontSize: 12, color: P.textMuted, marginTop: 4, lineHeight: 1.4 }}>{step.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
          </div>
        )}
      </div>

      {showForm && (
        <Modal title="Start Eviction Timeline" onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <Select label="Tenant *" {...F('tenantId')} options={[{value:'', label:'Select Tenant'}, ...tenants.map(t => ({ value: t.id, label: `${t.name} (Unit ${t.unit})` }))] } />
            <Select label="Initial Process / Form type *" {...F('formType')} options={['N4', 'N5', 'N12', 'RTB30', 'RTDRS']} />
            <Input label="Date Issued to Tenant *" type="date" {...F('issueDate')} />
            <Input label="Case Notes" {...F('notes')} placeholder="Optional context..." />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Lock Chronology'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
