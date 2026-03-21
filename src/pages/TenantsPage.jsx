import { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, Home, Calendar, DollarSign } from 'lucide-react';
import { subscribeTenants, addTenant, updateTenant, deleteTenant, subscribeProperties, uploadFile, addDocument } from '../firebase';
import { P, StatusBadge, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState, Avatar } from '../components/UI';
import { generateLeasePDF } from '../utils/pdfGenerator';

const FORM_DEFAULT = { name: '', email: '', phone: '', unit: '', property: '', leaseStart: '', leaseEnd: '', rent: '', status: 'active', type: 'Condo' };

export default function TenantsPage({ onToast }) {
  const [tenants, setTenants]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(FORM_DEFAULT);
  const [saving, setSaving]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const unsubT = subscribeTenants(data => { setTenants(data); setLoading(false); });
    const unsubP = subscribeProperties(data => setProperties(data));
    return () => { unsubT(); unsubP(); };
  }, []);

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    const matchQ = t.name?.toLowerCase().includes(q) || t.unit?.toLowerCase().includes(q) || t.property?.toLowerCase().includes(q);
    const matchF = filter === 'all' || t.status === filter;
    return matchQ && matchF;
  });

  const openAdd = () => { setForm(FORM_DEFAULT); setEditing(null); setShowForm(true); };
  const openEdit = (t) => { setForm({ name: t.name||'', email: t.email||'', phone: t.phone||'', unit: t.unit||'', property: t.property||'', leaseStart: t.leaseStart||'', leaseEnd: t.leaseEnd||'', rent: String(t.rent||''), status: t.status||'active', type: t.type||'Condo' }); setEditing(t); setShowForm(true); setSelected(null); };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.unit) return onToast('Please fill required fields.', 'error');
    setSaving(true);
    try {
      const data = { ...form, rent: parseFloat(form.rent) || 0 };
      if (editing) { await updateTenant(editing.id, data); onToast('Tenant updated.'); }
      else { await addTenant(data); onToast('Tenant added.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this tenant?')) return;
    try { await deleteTenant(id); setSelected(null); onToast('Tenant deleted.'); }
    catch (e) { onToast(e.message, 'error'); }
  };

  const handleGenerateLease = async (t) => {
    setGenerating(true);
    try {
      onToast('Generating PDF...');
      const blob = await generateLeasePDF(t);
      const filename = `documents/leases/${t.id}_${Date.now()}.pdf`;
      
      const url = await uploadFile(blob, filename);
      await addDocument({
        title: `Lease Agreement - ${t.name}`,
        url,
        tenantId: t.userId || t.id,
        propertyId: t.propertyId || null,
        type: 'lease'
      });
      
      onToast('Lease generated and attached successfully!', 'success');
    } catch (e) {
      onToast('Failed to generate lease: ' + e.message, 'error');
    }
    setGenerating(false);
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Tenants & Leases" subtitle={`${tenants.length} tenants across all properties`}
        action={<Btn onClick={openAdd}><Plus size={15} /> Add Tenant</Btn>} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenants, units, properties..."
            style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
        </div>
        {['all', 'active', 'expiring', 'overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '9px 16px', borderRadius: 9, border: `1.5px solid ${filter === f ? P.navy : P.border}`, background: filter === f ? P.navy : P.card, color: filter === f ? '#fff' : P.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0
        ? <EmptyState icon="👤" title="No tenants found" body={search ? `No results for "${search}"` : 'Add your first tenant to get started.'} action={<Btn onClick={openAdd}><Plus size={14} /> Add Tenant</Btn>} />
        : (
          <Table headers={['Tenant', 'Unit / Property', 'Lease Period', 'Rent', 'Status', '']}>
            {filtered.map((t, i) => (
              <TR key={t.id} idx={i} onClick={() => setSelected(t)}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={t.name} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: P.text }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: P.textMuted }}>{t.email}</div>
                    </div>
                  </div>
                </TD>
                <TD><div style={{ fontWeight: 600, fontSize: 14 }}>Unit {t.unit}</div><div style={{ fontSize: 12, color: P.textMuted }}>{t.property} · {t.type}</div></TD>
                <TD muted><div>{t.leaseStart}</div><div>→ {t.leaseEnd}</div></TD>
                <TD bold>${(t.rent || 0).toLocaleString()}<span style={{ fontWeight: 400, fontSize: 11, color: P.textMuted }}>/mo</span></TD>
                <TD><StatusBadge status={t.status} /></TD>
                <TD><div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={e => { e.stopPropagation(); openEdit(t); }} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer', color: P.text }}>Edit</button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(t.id); }} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}>Del</button>
                </div></TD>
              </TR>
            ))}
          </Table>
        )}

      {/* Detail Modal */}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { icon: Mail, label: 'Email', val: selected.email },
              { icon: Phone, label: 'Phone', val: selected.phone },
              { icon: Home, label: 'Unit', val: `${selected.unit} (${selected.type})` },
              { icon: Home, label: 'Property', val: selected.property },
              { icon: Calendar, label: 'Lease Start', val: selected.leaseStart },
              { icon: Calendar, label: 'Lease End', val: selected.leaseEnd },
              { icon: DollarSign, label: 'Monthly Rent', val: `$${(selected.rent||0).toLocaleString()}` },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} style={{ background: P.bg, borderRadius: 9, padding: '11px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}><Icon size={12} color={P.gold} /><span style={{ fontSize: 10, color: P.textMuted, textTransform: 'uppercase', fontWeight: 700 }}>{label}</span></div>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{val || '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusBadge status={selected.status} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" size="sm" onClick={() => handleGenerateLease(selected)} disabled={generating}>
                {generating ? 'Generating...' : 'Generate Lease'}
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => openEdit(selected)}>Edit</Btn>
              <Btn variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>Delete</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editing ? 'Edit Tenant' : 'Add New Tenant'} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Input label="Full Name *" {...F('name')} />
            <Input label="Email *" type="email" {...F('email')} />
            <Input label="Phone" {...F('phone')} />
            <Input label="Unit Number *" {...F('unit')} placeholder="e.g. 1204" />
            <Select label="Property Name" {...F('property')} options={['', ...properties.map(p => p.name)]} />
            <Input label="Monthly Rent ($)" type="number" {...F('rent')} />
            <Input label="Lease Start" type="date" {...F('leaseStart')} />
            <Input label="Lease End" type="date" {...F('leaseEnd')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Select label="Status" {...F('status')} options={['active', 'expiring', 'overdue']} />
            <Select label="Unit Type" {...F('type')} options={['Condo', 'Basement', 'Penthouse', 'Studio']} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
              {saving ? 'Saving...' : editing ? 'Update Tenant' : 'Add Tenant'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
