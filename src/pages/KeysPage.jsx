import { useState, useEffect } from 'react';
import { Key, Plus, Search } from 'lucide-react';
import { subscribeKeys, addKey, updateKey, deleteKey, subscribeTenants } from '../firebase';
import { P, StatusBadge, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState } from '../components/UI';

const FORM_DEFAULT = { serial: '', tenantId: '', property: '', type: 'FOB', status: 'active', notes: '' };

export default function KeysPage({ onToast }) {
  const [keys, setKeys] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubK = subscribeKeys(data => { 
      const sorted = [...data].sort((a, b) => (a.serial || '').localeCompare(b.serial || ''));
      setKeys(sorted); 
      setLoading(false); 
    });
    const unsubT = subscribeTenants(data => setTenants(data));
    return () => { unsubK(); unsubT(); };
  }, []);

  const filtered = keys.filter(k => {
    const q = search.toLowerCase();
    const tName = tenants.find(t => t.id === k.tenantId)?.name || '';
    return (k.serial || '').toLowerCase().includes(q) || tName.toLowerCase().includes(q) || (k.property || '').toLowerCase().includes(q);
  });

  const openAdd = () => { setForm(FORM_DEFAULT); setEditing(null); setShowForm(true); };
  const openEdit = (k) => { setForm(k); setEditing(k); setShowForm(true); };

  const handleSave = async () => {
    if (!form.serial) return onToast('Serial Number required', 'error');
    setSaving(true);
    try {
      if (editing) { await updateKey(editing.id, form); onToast('Key updated.'); }
      else { await addKey(form); onToast('Key added.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this key record?')) return;
    try { await deleteKey(id); onToast('Key deleted.'); }
    catch (e) { onToast(e.message, 'error'); }
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Key & Access Logs" subtitle="Manage FOBs, Physical Keys, and Access Cards" 
        action={<Btn onClick={openAdd}><Plus size={15} /> Add Key</Btn>} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search serial, tenant, or property..."
            style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🔑" title="No Keys Found" body="Register a new FOB or physical key." action={<Btn onClick={openAdd}>Register Key</Btn>} />
      ) : (
        <Table headers={['Serial / Type', 'Assigned To', 'Property', 'Status', '']}>
          {filtered.map((k, i) => {
            const tenant = tenants.find(t => t.id === k.tenantId);
            return (
              <TR key={k.id} idx={i}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${P.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Key size={16} color={P.gold} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{k.serial}</div>
                      <div style={{ fontSize: 12, color: P.textMuted }}>{k.type}</div>
                    </div>
                  </div>
                </TD>
                <TD bold>{tenant ? `${tenant.name} (Unit ${tenant.unit})` : 'Unassigned'}</TD>
                <TD muted>{k.property || '—'}</TD>
                <TD><StatusBadge status={k.status} /></TD>
                <TD>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(k)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(k.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}>Del</button>
                  </div>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Key' : 'Register Key'} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Serial Number *" {...F('serial')} placeholder="e.g. FOB-99432" />
            <Select label="Key Type" {...F('type')} options={['FOB', 'Physical Key', 'Garage Remote', 'Passcode']} />
            
            <Select label="Assign to Tenant" {...F('tenantId')} options={[{value:'', label:'Unassigned'}, ...tenants.map(t => ({ value: t.id, label: `${t.name} (${t.unit})` }))]} />
            <Input label="Property / Scope" {...F('property')} placeholder="e.g. North Tower" />
            
            <Select label="Status" {...F('status')} options={['active', 'lost', 'returned', 'suspended']} />
            <Input label="Notes" {...F('notes')} placeholder="Optional details..." />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save Key'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
