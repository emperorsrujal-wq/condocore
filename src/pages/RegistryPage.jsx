import { useState, useEffect } from 'react';
import { Plus, Search, Dog, Car, User, MapPin, Hash, ShieldCheck, ShieldAlert, Edit, Trash2 } from 'lucide-react';
import { subscribeRegistry, subscribeUserRegistry, addRegistryEntry, updateRegistryEntry, deleteRegistryEntry, subscribeProperties } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState, StatusBadge, ConfirmModal } from '../components/UI';

const FORM_DEFAULT = { type: 'pet', ownerName: '', unit: '', property: '', name: '', breed: '', vaccineStatus: 'up-to-date', make: '', model: '', color: '', plate: '', spot: '' };

export default function RegistryPage({ onToast, userProfile }) {
  const [entries, setEntries] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pet');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    const isAdmin = ['manager', 'landlord', 'super_admin', 'super-admin'].includes(userProfile?.role);
    const unsubR = isAdmin 
      ? subscribeRegistry(data => { 
        const sorted = [...data].sort((a, b) => (a.ownerName || '').localeCompare(b.ownerName || ''));
        setEntries(sorted); 
        setLoading(false); 
      })
      : subscribeUserRegistry(userProfile.uid, data => { 
        const sorted = [...data].sort((a, b) => (a.ownerName || '').localeCompare(b.ownerName || ''));
        setEntries(sorted); 
        setLoading(false); 
      });

    const unsubP = subscribeProperties(data => setProperties(data));
    return () => { unsubR(); unsubP(); };
  }, [userProfile]);

  const openAdd = () => { setForm({ ...FORM_DEFAULT, type: tab }); setEditing(null); setShowForm(true); };
  const openEdit = (e) => { setForm({ type: e.type, ownerName: e.ownerName, unit: e.unit, property: e.property, name: e.name || '', breed: e.breed || '', vaccineStatus: e.vaccineStatus || 'up-to-date', make: e.make || '', model: e.model || '', color: e.color || '', plate: e.plate || '', spot: e.spot || '' }); setEditing(e); setShowForm(true); };

  const handleSave = async () => {
    if (!form.ownerName || !form.unit || !form.property) return onToast('Owner, Unit, and Property are required.', 'error');
    setSaving(true);
    try {
      const dataWithUser = { ...form, userId: userProfile.uid };
      if (editing) { await updateRegistryEntry(editing.id, dataWithUser); onToast('Entry updated.'); }
      else { await addRegistryEntry(dataWithUser); onToast('Entry added.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    setConfirmAction({ message: 'Delete this entry?', action: async () => {
      try { await deleteRegistryEntry(id); onToast('Entry deleted.'); }
      catch (e) { onToast(e.message, 'error'); }
    } });
    return;
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const filtered = entries.filter(e => e.type === tab && (
    (e.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.unit || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.property || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.plate || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.name || '').toLowerCase().includes(search.toLowerCase())
  ));

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Building Registry" subtitle="Manage residents' pets and vehicles for compliance and security."
        action={<Btn onClick={openAdd}><Plus size={15} /> Add {tab.charAt(0).toUpperCase() + tab.slice(1)}</Btn>} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${P.border}`, marginBottom: 20 }}>
        {['pet', 'vehicle'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 4px', background: 'none', border: 'none', borderBottom: `2.5px solid ${tab === t ? P.navy : 'transparent'}`, color: tab === t ? P.navy : P.textMuted, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}>
            {t === 'pet' ? <Dog size={17} /> : <Car size={17} />}
            {t.charAt(0).toUpperCase() + t.slice(1)}s
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
        <input type="text" placeholder={`Search by owner, unit, or ${tab === 'pet' ? 'pet name' : 'plate number'}...`} value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '11px 12px 11px 40px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
      </div>

      {filtered.length === 0
        ? <EmptyState icon={tab === 'pet' ? '🐕' : '🚗'} title={`No ${tab}s found`} body={`You haven't registered any ${tab}s yet.`} action={<Btn onClick={openAdd}><Plus size={14} /> Add First {tab.charAt(0).toUpperCase() + tab.slice(1)}</Btn>} />
        : (
          <Table headers={tab === 'pet' ? ['Pet', 'Owner/Unit', 'Vaccination', ''] : ['Vehicle', 'Owner/Unit', 'Plate / Spot', '']}>
            {filtered.map((e, i) => (
              <TR key={e.id} idx={i}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {tab === 'pet' ? <Dog size={20} color={P.navyLight} /> : <Car size={20} color={P.navyLight} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: P.text }}>{tab === 'pet' ? e.name : `${e.make} ${e.model}`}</div>
                      <div style={{ fontSize: 12, color: P.textMuted }}>{tab === 'pet' ? e.breed : (e.color || 'No color specified')}</div>
                    </div>
                  </div>
                </TD>
                <TD>
                  <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{e.ownerName}</div>
                  <div style={{ fontSize: 12, color: P.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} /> Unit {e.unit} · {e.property}</div>
                </TD>
                <TD>
                  {tab === 'pet' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {e.vaccineStatus === 'up-to-date' ? <ShieldCheck size={16} color={P.success} /> : <ShieldAlert size={16} color={P.warning} />}
                      <StatusBadge status={e.vaccineStatus === 'up-to-date' ? 'active' : 'pending'} />
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: P.navy }}><Hash size={14} /> {e.plate}</div>
                      <div style={{ fontSize: 11, color: P.textMuted, marginTop: 2 }}>Parking Spot {e.spot || 'N/A'}</div>
                    </div>
                  )}
                </TD>
                <TD>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Btn variant="ghost" size="sm" onClick={() => openEdit(e)}><Edit size={13} /></Btn>
                    <button onClick={() => handleDelete(e.id)} style={{ padding: '7px 9px', borderRadius: 8, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}><Trash2 size={13} /></button>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}

      {showForm && (
        <Modal title={editing ? `Edit ${tab === 'pet' ? 'Pet' : 'Vehicle'}` : `Register New ${tab === 'pet' ? 'Pet' : 'Vehicle'}`} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Owner Name *" helpText="The primary resident responsible." {...F('ownerName')} placeholder="e.g. John Doe" />
            </div>
            <Input label="Unit Number *" {...F('unit')} placeholder="e.g. 101" />
            <Select label="Property *" {...F('property')} options={[{ value: '', label: 'Select Property' }, ...properties.map(p => ({ value: p.name, label: p.name }))]} />
          </div>

          <div style={{ borderTop: `1px solid ${P.border}`, margin: '14px 0', paddingTop: 14 }}>
            {tab === 'pet' ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                  <Input label="Pet Name *" {...F('name')} placeholder="e.g. Buddy" />
                  <Input label="Breed" {...F('breed')} placeholder="e.g. Golden Retriever" />
                </div>
                <Select label="Vaccination Status" helpText="Is the pet compliant with building bylaws?" {...F('vaccineStatus')} options={[
                  { value: 'up-to-date', label: 'Up to Date' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'unknown', label: 'Unknown / Not Provided' }
                ]} />
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                  <Input label="Vehicle Color" {...F('color')} placeholder="e.g. Silver" />
                  <Input label="Make (Brand)" {...F('make')} placeholder="e.g. Tesla" />
                </div>
                <Input label="Model" {...F('model')} placeholder="e.g. Model 3" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                  <Input label="License Plate *" {...F('plate')} placeholder="ABC-1234" />
                  <Input label="Assigned Spot" {...F('spot')} placeholder="P-23" />
                </div>
              </>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save Record'}</Btn>
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
