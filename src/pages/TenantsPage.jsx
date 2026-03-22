import { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, Home, Calendar, DollarSign } from 'lucide-react';
import { subscribeTenants, addTenant, updateTenant, deleteTenant, subscribeProperties, uploadFile, addDocument } from '../firebase';
import { P, StatusBadge, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState, Avatar } from '../components/UI';
import { useHOAMode } from '../contexts/HOAModeContext';
import { generateLeasePDF } from '../utils/pdfGenerator';

const FORM_DEFAULT = { name: '', email: '', phone: '', unit: '', property: '', leaseStart: '', leaseEnd: '', rent: '', status: 'active', type: 'Condo', pets: [], occupants: [] };

export default function TenantsPage({ onToast }) {
  const { label, isHOAMode } = useHOAMode();
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
  
  // Temp states for new pet/occupant inline forms
  const [newPet, setNewPet] = useState({ name: '', type: '', breed: '' });
  const [newOcc, setNewOcc] = useState({ name: '', relation: '', phone: '' });

  useEffect(() => {
    const unsubT = subscribeTenants(data => { 
      const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setTenants(sorted); 
      setLoading(false); 
    });
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
  const openEdit = (t) => { 
    setForm({ 
      name: t.name||'', email: t.email||'', phone: t.phone||'', unit: t.unit||'', 
      property: t.property||'', leaseStart: t.leaseStart||'', leaseEnd: t.leaseEnd||'', 
      rent: String(t.rent||''), status: t.status||'active', type: t.type||'Condo',
      pets: t.pets||[], occupants: t.occupants||[]
    }); 
    setEditing(t); setShowForm(true); setSelected(null); 
  };

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

  const handleAddPet = async () => {
    if(!newPet.name || !newPet.type) return;
    const updated = [...(selected.pets || []), newPet];
    await updateTenant(selected.id, { pets: updated });
    setSelected({ ...selected, pets: updated });
    setNewPet({ name: '', type: '', breed: '' });
  };
  const handleRemovePet = async (idx) => {
    const updated = selected.pets.filter((_, i) => i !== idx);
    await updateTenant(selected.id, { pets: updated });
    setSelected({ ...selected, pets: updated });
  };

  const handleAddOcc = async () => {
    if(!newOcc.name) return;
    const updated = [...(selected.occupants || []), newOcc];
    await updateTenant(selected.id, { occupants: updated });
    setSelected({ ...selected, occupants: updated });
    setNewOcc({ name: '', relation: '', phone: '' });
  };
  const handleRemoveOcc = async (idx) => {
    const updated = selected.occupants.filter((_, i) => i !== idx);
    await updateTenant(selected.id, { occupants: updated });
    setSelected({ ...selected, occupants: updated });
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title={label('tenants', 'Tenants & Leases')} subtitle={`${tenants.length} ${isHOAMode ? 'homeowners' : 'tenants'} across all properties`}
        action={<Btn onClick={openAdd}><Plus size={15} /> Add {label('tenant', 'Tenant')}</Btn>} />

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
        ? <EmptyState icon="👤" title={isHOAMode ? "No homeowners found" : "No tenants found"} body={search ? `No results for "${search}"` : `Add your first ${isHOAMode ? 'homeowner' : 'tenant'} to get started.`} action={<Btn onClick={openAdd}><Plus size={14} /> Add {label('tenant', 'Tenant')}</Btn>} />
        : (
          <Table headers={[label('tenant', 'Tenant'), isHOAMode ? 'Unit / Building' : 'Unit / Property', isHOAMode ? 'Ownership Period' : 'Lease Period', label('rent', 'Rent'), 'Status', '']}>
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
              { icon: Home, label: isHOAMode ? 'Unit' : 'Unit', val: `${selected.unit} (${selected.type})` },
              { icon: Home, label: isHOAMode ? 'Building' : 'Property', val: selected.property },
              { icon: Calendar, label: isHOAMode ? 'Ownership Start' : 'Lease Start', val: selected.leaseStart },
              { icon: Calendar, label: isHOAMode ? 'Ownership End' : 'Lease End', val: selected.leaseEnd },
              { icon: DollarSign, label: isHOAMode ? 'Monthly Dues' : 'Monthly Rent', val: `$${(selected.rent||0).toLocaleString()}` },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} style={{ background: P.bg, borderRadius: 9, padding: '11px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}><Icon size={12} color={P.gold} /><span style={{ fontSize: 10, color: P.textMuted, textTransform: 'uppercase', fontWeight: 700 }}>{label}</span></div>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{val || '—'}</div>
              </div>
            ))}
          </div>

          {/* Registries */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, paddingTop: 16, borderTop: `1px solid ${P.border}` }}>
            {/* Occupants Registry */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.navy, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Secondary Occupants</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {(selected.occupants || []).map((o, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: P.card, border: `1px solid ${P.border}`, padding: '8px 12px', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{o.name} <span style={{ color: P.textMuted, fontSize: 11, fontWeight: 400 }}>({o.relation})</span></div>
                      {o.phone && <div style={{ fontSize: 11, color: P.textMuted }}>{o.phone}</div>}
                    </div>
                    <button onClick={() => handleRemoveOcc(i)} style={{ background: 'none', border: 'none', color: P.danger, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Remove</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newOcc.name} onChange={e=>setNewOcc({...newOcc, name: e.target.value})} placeholder="Name" style={{ flex: 2, padding: 8, fontSize: 12, borderRadius: 6, border: `1px solid ${P.border}` }} />
                <input value={newOcc.relation} onChange={e=>setNewOcc({...newOcc, relation: e.target.value})} placeholder="Relation" style={{ flex: 1, padding: 8, fontSize: 12, borderRadius: 6, border: `1px solid ${P.border}` }} />
                <button onClick={handleAddOcc} style={{ background: P.navy, color: '#fff', border: 'none', borderRadius: 6, padding: '0 10px', fontSize: 12, cursor: 'pointer' }}>Add</button>
              </div>
            </div>

            {/* Pets Registry */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.navy, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Pet Registry</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {(selected.pets || []).map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: P.card, border: `1px solid ${P.border}`, padding: '8px 12px', borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{p.name} <span style={{ color: P.textMuted, fontSize: 11, fontWeight: 400 }}>({p.type})</span></div>
                      {p.breed && <div style={{ fontSize: 11, color: P.textMuted }}>{p.breed}</div>}
                    </div>
                    <button onClick={() => handleRemovePet(i)} style={{ background: 'none', border: 'none', color: P.danger, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Remove</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newPet.name} onChange={e=>setNewPet({...newPet, name: e.target.value})} placeholder="Pet Name" style={{ flex: 2, padding: 8, fontSize: 12, borderRadius: 6, border: `1px solid ${P.border}` }} />
                <input value={newPet.type} onChange={e=>setNewPet({...newPet, type: e.target.value})} placeholder="Dog/Cat" style={{ flex: 1, padding: 8, fontSize: 12, borderRadius: 6, border: `1px solid ${P.border}` }} />
                <button onClick={handleAddPet} style={{ background: P.gold, color: P.navy, fontWeight: 700, border: 'none', borderRadius: 6, padding: '0 10px', fontSize: 12, cursor: 'pointer' }}>Add</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <StatusBadge status={selected.status} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="primary" size="sm" onClick={() => handleGenerateLease(selected)} disabled={generating}>
                {generating ? 'Generating...' : isHOAMode ? 'Unit Certificate' : 'Generate Lease'}
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => openEdit(selected)}>Edit</Btn>
              <Btn variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>Delete</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editing ? (isHOAMode ? 'Edit Homeowner' : 'Edit Tenant') : (isHOAMode ? 'Add New Homeowner' : 'Add New Tenant')} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input label={isHOAMode ? "Homeowner Full Name *" : "Tenant Full Name *"} {...F('name')} placeholder="John Doe" />
            </div>
            <Input label="Email Address *" type="email" {...F('email')} placeholder="john@example.com" />
            <Input label="Phone Number" {...F('phone')} placeholder="+1 (555) 000-0000" />
            <div style={{ gridColumn: 'span 2' }}>
              <Select label={isHOAMode ? "Building *" : "Property *"} value={form.propertyId} onChange={e => {
                const p = properties.find(prop => prop.id === e.target.value);
                setForm(f => ({ ...f, propertyId: e.target.value, property: p?.name || '' }));
              }} options={[{ label: `Select ${isHOAMode ? 'Building' : 'Property'}`, value: '' }, ...properties.map(p => ({ label: p.name, value: p.id }))]} />
            </div>
            <Input label="Unit Number *" {...F('unit')} placeholder="101" />
            <Select label="Unit Type" {...F('type')} options={['Residential', 'Commercial', 'Parking', 'Locker']} />
            <Input label={isHOAMode ? "Ownership Start Date" : "Lease Start Date"} type="date" {...F('leaseStart')} />
            <Input label={isHOAMode ? "Ownership End Date" : "Lease End Date"} type="date" {...F('leaseEnd')} />
            <Input label={isHOAMode ? "Monthly Dues ($)" : "Monthly Rent ($)"} type="number" {...F('rent')} placeholder="0.00" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Select label="Status" {...F('status')} options={['active', 'expiring', 'overdue']} />
            <Select label="Classification" {...F('type')} options={isHOAMode ? ['Owner-Occupied', 'Tenanted', 'Vacant'] : ['Standard', 'Corporate', 'Short-term']} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
              {saving ? 'Saving...' : editing ? (isHOAMode ? 'Update Homeowner' : 'Update Tenant') : (isHOAMode ? 'Add Homeowner' : 'Add Tenant')}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
