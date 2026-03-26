import { useState, useEffect } from 'react';
import { Package, Plus, Search, CheckCircle } from 'lucide-react';
import { subscribePackages, subscribeTenantPackages, addPackage, updatePackage, deletePackage, subscribeTenants } from '../firebase';
import { P, StatusBadge, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState, ConfirmModal } from '../components/UI';

const FORM_DEFAULT = { tenantId: '', courier: '', tracking: '', status: 'pending', notes: '' };

export default function PackagesPage({ userProfile, onToast }) {
  const isTenant = userProfile?.role === 'tenant' || userProfile?.role === 'owner';
  
  const [packages, setPackages] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    let unsubP, unsubT;
    if (isTenant) {
      unsubP = subscribeTenantPackages(userProfile.uid, data => { 
        const sorted = [...data].sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        setPackages(sorted); 
        setLoading(false); 
      });
    } else {
      unsubP = subscribePackages(data => { 
        const sorted = [...data].sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        setPackages(sorted); 
        setLoading(false); 
      });
      unsubT = subscribeTenants(data => setTenants(data));
    }
    return () => { unsubP && unsubP(); unsubT && unsubT(); };
  }, [isTenant, userProfile?.uid]);

  const filtered = packages.filter(p => {
    const q = search.toLowerCase();
    const tName = tenants.find(t => t.id === p.tenantId)?.name || '';
    return (p.courier || '').toLowerCase().includes(q) || (p.tracking || '').toLowerCase().includes(q) || tName.toLowerCase().includes(q);
  });

  const openAdd = () => { setForm(FORM_DEFAULT); setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ tenantId: p.tenantId || '', courier: p.courier || '', tracking: p.tracking || '', status: p.status || 'pending', notes: p.notes || '' }); setEditing(p); setShowForm(true); };

  const handleSave = async () => {
    if (!form.tenantId || !form.courier) return onToast('Tenant and Courier are required.', 'error');
    setSaving(true);
    try {
      if (editing) { await updatePackage(editing.id, form); onToast('Package updated.'); }
      else { await addPackage(form); onToast('Package logged & Tenant Notified!'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleMarkPickedUp = async (p) => {
    setConfirmAction({ message: 'Mark package as picked up?', action: async () => {
      try { await updatePackage(p.id, { status: 'picked up' }); onToast('Package picked up.'); }
      catch (e) { onToast(e.message, 'error'); }
    } });
    return;
  };

  const handleDelete = async (id) => {
    setConfirmAction({ message: 'Delete this package record?', action: async () => {
      try { await deletePackage(id); onToast('Package deleted.'); }
      catch (e) { onToast(e.message, 'error'); }
    } });
    return;
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title={isTenant ? "My Deliveries" : "Package & Delivery Logs"} subtitle={isTenant ? "Track your incoming parcels" : "Manage incoming packages for all buildings"} 
        action={!isTenant && <Btn onClick={openAdd}><Plus size={15} /> Log Package</Btn>} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tracking, courier, or tenant..."
            style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📦" title="No Packages Found" body="No pending deliveries." action={!isTenant && <Btn onClick={openAdd}>Log Package</Btn>} />
      ) : (
        <Table headers={['Courier / Tracking', isTenant ? 'Received' : 'Assigned To', 'Status', '']}>
          {filtered.map((p, i) => {
            const tenant = tenants.find(t => t.id === p.tenantId);
            return (
              <TR key={p.id} idx={i}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${P.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Package size={16} color={P.gold} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.courier}</div>
                      <div style={{ fontSize: 12, color: P.textMuted }}>{p.tracking || 'No Tracking Info'}</div>
                    </div>
                  </div>
                </TD>
                <TD bold>{isTenant ? (p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'Today') : (tenant ? `${tenant.name} (${tenant.unit})` : 'Unknown')}</TD>
                <TD><StatusBadge status={p.status === 'picked up' ? 'active' : 'pending'} /></TD>
                <TD>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {p.status === 'pending' && <button onClick={() => handleMarkPickedUp(p)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.success}`, background: '#E8F5E9', color: P.success, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12}/> Picked Up</button>}
                    {!isTenant && <button onClick={() => openEdit(p)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer' }}>Edit</button>}
                    {!isTenant && <button onClick={() => handleDelete(p.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}>Del</button>}
                  </div>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {showForm && !isTenant && (
        <Modal title={editing ? 'Edit Package' : 'Log New Package'} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Assign to Tenant *" {...F('tenantId')} options={[{value:'', label:'Select Tenant'}, ...tenants.map(t => ({ value: t.id, label: `${t.name} (${t.unit})` }))] } />
            <Select label="Courier *" {...F('courier')} options={['UPS', 'FedEx', 'USPS', 'Amazon', 'DHL', 'Canada Post', 'Other']} />
            <Input label="Tracking Number" {...F('tracking')} placeholder="e.g. 1Z9999W... (Optional)" />
            <Select label="Status" {...F('status')} options={['pending', 'picked up']} />
          </div>
          <div style={{ marginTop: 12 }}>
            <Input label="Notes" {...F('notes')} placeholder="Optional details..." />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save & Notify'}</Btn>
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
