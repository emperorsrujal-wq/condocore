import { useState, useEffect } from 'react';
import { Plus, User, Phone, Mail, Building, Edit, Trash2, Star } from 'lucide-react';
import { subscribeVendors, addVendor, updateVendor, deleteVendor } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState, ConfirmModal } from '../components/UI';

const FORM_DEFAULT = { name: '', category: 'Plumbing', contact: '', phone: '', email: '', rating: '5' };

export default function VendorsPage({ onToast, userProfile }) {
  const isManager = ['manager', 'landlord', 'super_admin', 'super-admin'].includes(userProfile?.role);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    const unsub = subscribeVendors(data => { 
      const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setVendors(sorted); 
      setLoading(false); 
    });
    return () => unsub();
  }, []);
  
  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    return v.name?.toLowerCase().includes(q) || v.category?.toLowerCase().includes(q) || v.contact?.toLowerCase().includes(q);
  });

  const openAdd = () => { setForm(FORM_DEFAULT); setEditing(null); setShowForm(true); };
  const openEdit = (v) => { setForm({ ...v }); setEditing(v); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.phone) return onToast('Name and Phone are required.', 'error');
    setSaving(true);
    try {
      if (editing) { await updateVendor(editing.id, form); onToast('Vendor updated.'); }
      else { await addVendor(form); onToast('Vendor added.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setConfirmAction({ message: 'Delete this vendor?', action: async () => {
      try { await deleteVendor(id); onToast('Vendor deleted.'); }
      catch (e) { onToast(e.message, 'error'); }
    } });
    return;
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Vendor & Contractor Directory" subtitle={`${vendors.length} registered service providers`}
        action={isManager ? <Btn onClick={openAdd}><Plus size={15} /> Add Vendor</Btn> : null} />

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..."
          style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none', background: P.card }} />
      </div>

      {filtered.length === 0
        ? <EmptyState icon="👷" title="No vendors found" body={search ? "Adjust your search to find a provider." : "Start by adding your preferred contractors and service providers."} action={isManager && !search ? <Btn onClick={openAdd}><Plus size={14} /> Add Vendor</Btn> : null} />
        : (
          <Table headers={['Vendor', 'Category', 'Contact Info', 'Rating', '']}>
            {filtered.map((v, i) => (
              <TR key={v.id} idx={i}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building size={18} color={P.navyLight} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: P.text }}>{v.name}</div>
                  </div>
                </TD>
                <TD><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: P.bg, color: P.navyLight }}>{v.category}</span></TD>
                <TD>
                  <div style={{ fontSize: 12, color: P.text }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={10} color={P.textMuted} /> {v.contact}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={10} color={P.textMuted} /> {v.phone}</div>
                    {v.email && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Mail size={10} color={P.textMuted} /> {v.email}</div>}
                  </div>
                </TD>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, color: P.gold }}>
                    <Star size={12} fill={P.gold} /> <span style={{ fontSize: 13, fontWeight: 700 }}>{v.rating}</span>
                  </div>
                </TD>
                {isManager && <TD>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(v)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer', color: P.text, fontSize: 12 }}>Edit</button>
                    <button onClick={() => handleDelete(v.id)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer', fontSize: 12 }}>Del</button>
                  </div>
                </TD>}
              </TR>
            ))}
          </Table>
        )}

      {showForm && isManager && (
        <Modal title={editing ? 'Edit Vendor' : 'Add New Vendor'} onClose={() => setShowForm(false)}>
          <Input label="Vendor / Company Name *" helpText="e.g. Reliable Plumbing Services" {...F('name')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Select label="Category" helpText="Primary trade or specialty." {...F('category')} options={['Plumbing', 'Electrical', 'HVAC', 'Cleaning', 'Security', 'Landscaping', 'Roofing', 'Other']} />
            <Select label="Rating" helpText="Your internal quality score." {...F('rating')} options={['1', '2', '3', '4', '5']} />
          </div>
          <div style={{ borderTop: `1px solid ${P.border}`, margin: '14px 0', paddingTop: 14 }}>
            <Input label="Primary Contact Person" helpText="The name of the lead contractor." {...F('contact')} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Input label="Phone Number *" type="tel" {...F('phone')} />
              <Input label="Email Address" type="email" {...F('email')} />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
              {saving ? 'Saving...' : editing ? 'Update Vendor' : 'Add Vendor'}
            </Btn>
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
