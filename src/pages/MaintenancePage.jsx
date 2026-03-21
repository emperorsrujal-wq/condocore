import { useState, useEffect } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { subscribeMaintenance, subscribeTenantMaintenance, addMaintenanceRequest, updateMaintenanceRequest } from '../firebase';
import { P, StatusBadge, Btn, Modal, Input, Select, Textarea, PageHeader, Spinner, EmptyState } from '../components/UI';

const FORM_DEFAULT = { title: '', unit: '', tenantName: '', tenantId: '', propertyName: '', category: 'Plumbing', priority: 'medium', notes: '' };

export default function MaintenancePage({ onToast, userProfile, tenantData }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm]         = useState(FORM_DEFAULT);
  const [saving, setSaving]     = useState(false);
  const isTenant = userProfile?.role === 'tenant';

  useEffect(() => {
    let unsub;
    if (isTenant && tenantData?.id) {
      unsub = subscribeTenantMaintenance(tenantData.id, data => { setRequests(data); setLoading(false); });
    } else {
      unsub = subscribeMaintenance(data => { setRequests(data); setLoading(false); });
    }
    return () => unsub && unsub();
  }, [isTenant, tenantData?.id]);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const handleSubmit = async () => {
    if (!form.title) return onToast('Please enter a title.', 'error');
    setSaving(true);
    try {
      const data = {
        ...form,
        status: 'open',
        date: new Date().toISOString().split('T')[0],
        ...(isTenant && tenantData ? { unit: tenantData.unit, tenantName: tenantData.name, tenantId: tenantData.id, propertyName: tenantData.property } : {})
      };
      await addMaintenanceRequest(data);
      setShowAdd(false); setForm(FORM_DEFAULT); onToast('Request submitted!');
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleStatusChange = async (id, status) => {
    try {
      const note = status === 'in-progress' ? 'Work order assigned.' : status === 'resolved' ? 'Issue resolved and closed.' : '';
      const existing = requests.find(r => r.id === id);
      const updates = [...(existing?.updates || []), { date: new Date().toLocaleDateString(), text: note }];
      await updateMaintenanceRequest(id, { status, updates });
      onToast(`Status updated to ${status}.`);
    } catch (e) { onToast(e.message, 'error'); }
  };

  const PRIORITY_COLORS = { urgent: P.danger, high: '#D45B00', medium: P.warning, low: P.textMuted };
  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Maintenance Requests"
        subtitle={`${requests.filter(r => r.status !== 'resolved').length} open requests`}
        action={<Btn onClick={() => setShowAdd(true)}><Plus size={15} /> New Request</Btn>} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'open', 'in-progress', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${filter === f ? P.navy : P.border}`, background: filter === f ? P.navy : P.card, color: filter === f ? '#fff' : P.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            {f === 'in-progress' ? 'In Progress' : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0
        ? <EmptyState icon="🔧" title="No maintenance requests" body={isTenant ? 'Submit a request if you have an issue.' : 'No requests match this filter.'} action={<Btn onClick={() => setShowAdd(true)}><Plus size={14} /> New Request</Btn>} />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(r => {
              const isOpen = expanded === r.id;
              return (
                <div key={r.id} style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, boxShadow: '0 2px 8px rgba(11,30,61,0.06)', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 22px', display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : r.id)}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: PRIORITY_COLORS[r.priority] + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Wrench size={19} color={PRIORITY_COLORS[r.priority]} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, fontWeight: 700, color: P.text }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: P.textMuted, marginTop: 2 }}>
                        {r.tenantName && <span>{r.tenantName} · </span>}Unit {r.unit} · {r.propertyName} · {r.category} · {r.date}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      <StatusBadge status={r.priority} />
                      <StatusBadge status={r.status} />
                      <span style={{ fontSize: 16, color: P.textMuted }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ padding: '0 22px 18px', borderTop: `1px solid ${P.border}` }}>
                      {r.notes && (
                        <div style={{ marginTop: 14, padding: '10px 14px', background: P.bg, borderRadius: 9, borderLeft: `3px solid ${P.gold}`, fontSize: 13, color: P.textMuted }}>{r.notes}</div>
                      )}

                      {/* Timeline */}
                      {r.updates?.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Timeline</div>
                          {r.updates.map((u, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === r.updates.length - 1 ? P.gold : P.success, marginTop: 4, flexShrink: 0 }} />
                                {i < r.updates.length - 1 && <div style={{ width: 2, flex: 1, background: P.border, marginTop: 3 }} />}
                              </div>
                              <div style={{ paddingBottom: 4 }}>
                                <div style={{ fontSize: 11, color: P.textMuted }}>{u.date}</div>
                                <div style={{ fontSize: 13, color: P.text }}>{u.text}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Manager actions */}
                      {!isTenant && r.status !== 'resolved' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                          {r.status === 'open' && (
                            <button onClick={() => handleStatusChange(r.id, 'in-progress')} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#EAF0FB', color: P.info, cursor: 'pointer' }}>→ In Progress</button>
                          )}
                          <button onClick={() => handleStatusChange(r.id, 'resolved')} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#EAF7F2', color: P.success, cursor: 'pointer' }}>✓ Mark Resolved</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {/* Add Request Modal */}
      {showAdd && (
        <Modal title="New Maintenance Request" onClose={() => setShowAdd(false)}>
          <Input label="Issue Title *" {...F('title')} placeholder="e.g. Leaking kitchen faucet" />
          {!isTenant && (
            <>
              <Input label="Unit Number" {...F('unit')} placeholder="e.g. 1204" />
              <Input label="Tenant Name" {...F('tenantName')} />
              <Input label="Property" {...F('propertyName')} />
            </>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Select label="Category" {...F('category')} options={['Plumbing', 'Electrical', 'HVAC', 'Security', 'Windows', 'Appliances', 'Other']} />
            <Select label="Priority" {...F('priority')} options={['low', 'medium', 'high', 'urgent']} />
          </div>
          <Textarea label="Additional Notes" {...F('notes')} placeholder="Describe the issue in detail..." />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSubmit} disabled={saving} style={{ flex: 2 }}>{saving ? 'Submitting...' : 'Submit Request'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
