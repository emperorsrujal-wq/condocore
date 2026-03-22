import { useState, useEffect } from 'react';
import { Plus, Building2, MapPin, List, Edit, Trash2 } from 'lucide-react';
import { subscribeProperties, addProperty, updateProperty, deleteProperty } from '../firebase';
import { P, Btn, Modal, Input, Select, Textarea, PageHeader, Table, TR, TD, Spinner, EmptyState, StatCard } from '../components/UI';
import { useHOAMode } from '../contexts/HOAModeContext';

const FORM_DEFAULT = { name: '', address: '', type: 'Residential', units: '', description: '', amenities: '', bookableAmenities: [] };

export default function PropertiesPage({ onToast }) {
  const { label, isHOAMode } = useHOAMode();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(FORM_DEFAULT);
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    const unsub = subscribeProperties(data => { setProperties(data); setLoading(false); });
    return unsub;
  }, []);

  const openAdd = () => { setForm(FORM_DEFAULT); setEditing(null); setShowForm(true); };
  const openEdit = (p) => { 
    setForm({ 
      name: p.name || '', 
      address: p.address || '', 
      type: p.type || 'Residential', 
      units: String(p.units || ''), 
      description: p.description || '', 
      amenities: Array.isArray(p.amenities) ? p.amenities.join(', ') : (p.amenities || ''),
      bookableAmenities: p.bookableAmenities || []
    }); 
    setEditing(p); 
    setShowForm(true); 
  };

  const handleSave = async () => {
    if (!form.name || !form.address) return onToast('Name and Address are required.', 'error');
    setSaving(true);
    try {
      const amenitiesArr = form.amenities ? form.amenities.split(',').map(s => s.trim()).filter(Boolean) : [];
      const data = { ...form, units: parseInt(form.units) || 0, amenities: amenitiesArr };
      if (editing) { await updateProperty(editing.id, data); onToast('Property updated.'); }
      else { await addProperty(data); onToast('Property added.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this property? This will not delete associated tenants but will break links.')) return;
    try { await deleteProperty(id); onToast('Property deleted.'); }
    catch (e) { onToast(e.message, 'error'); }
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  const totalUnits = properties.reduce((s, p) => s + (p.units || 0), 0);

  return (
    <div>
      <PageHeader title={isHOAMode ? "Building Portfolio" : "Property Portfolio"} subtitle={`${properties.length} managed ${isHOAMode ? 'buildings' : 'properties'}`}
        action={<Btn onClick={openAdd}><Plus size={15} /> Add {isHOAMode ? 'Building' : 'Property'}</Btn>} />

      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Total Properties" value={properties.length} color={P.navyLight} icon="🏢" />
        <StatCard label="Total Units" value={totalUnits} color={P.success} icon="🔑" />
        <StatCard label="Active Portfolio" value={properties.filter(p => p.type === 'Residential').length} sub="Residential" color={P.gold} icon="🏠" />
      </div>

      {properties.length === 0
        ? <EmptyState icon="🏢" title={isHOAMode ? "No buildings found" : "No properties found"} body={`Start by adding your first ${isHOAMode ? 'building' : 'property'} to CanadaCore.`} action={<Btn onClick={openAdd}><Plus size={14} /> Add {isHOAMode ? 'Building' : 'Property'}</Btn>} />
        : (
          <Table headers={[isHOAMode ? 'Building' : 'Property', 'Address', 'Type', 'Units', 'Amenities', '']}>
            {properties.map((p, i) => (
              <TR key={p.id} idx={i}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={18} color={P.navyLight} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: P.text }}>{p.name}</div>
                  </div>
                </TD>
                <TD><div style={{ fontSize: 13, color: P.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {p.address}</div></TD>
                <TD><span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: P.bg, color: P.navyLight }}>{p.type}</span></TD>
                <TD bold>{p.units || 0}</TD>
                <TD>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.amenities?.slice(0, 2).map((a, ai) => (
                      <span key={ai} style={{ fontSize: 10, background: '#F0F4F8', padding: '2px 6px', borderRadius: 4, color: P.textMuted }}>{a}</span>
                    ))}
                    {p.amenities?.length > 2 && <span style={{ fontSize: 10, color: P.gold, fontWeight: 700 }}>+{p.amenities.length - 2} more</span>}
                  </div>
                </TD>
                <TD>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(p)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer', color: P.text, fontSize: 12 }}>Edit</button>
                    <button onClick={() => handleDelete(p.id)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer', fontSize: 12 }}>Del</button>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}

      {showForm && (
        <Modal title={editing ? (isHOAMode ? 'Edit Building' : 'Edit Property') : (isHOAMode ? 'Add New Building' : 'Add New Property')} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Building Name *" helpText="The common name for this building or complex." {...F('name')} placeholder="e.g. Harborview Condominiums" />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <Input label="Address *" helpText="The full legal address of the property." {...F('address')} placeholder="Full street address, city, province" />
            </div>
            <Select label="Property Type" helpText="Governs which management modules (HOA, Condo, etc.) are available." {...F('type')} options={['Residential', 'Condo', 'HOA', 'Single Unit', 'Multi-Family', 'Commercial', 'Mixed-Use', 'Industrial']} />
            <Input label="Total Units" helpText="The total number of keys or individual property units." type="number" {...F('units')} />
          </div>
          <Input label="Amenities (comma separated)" helpText="Common features like Gym, Pool, or Parking." {...F('amenities')} placeholder="e.g. Pool, Gym, Concierge, Underground Parking" />
          
          <div style={{ marginTop: 12, borderTop: `1px dashed ${P.border}`, paddingTop: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: P.navy, display: 'block', marginBottom: 8 }}>Bookable Facilities</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {form.bookableAmenities?.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: P.bg, borderRadius: 20, border: `1px solid ${P.border}` }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{a}</span>
                  <button onClick={() => setForm(f => ({ ...f, bookableAmenities: f.bookableAmenities.filter((_, idx) => idx !== i) }))} style={{ border: 'none', background: 'none', color: P.danger, cursor: 'pointer', padding: 0, display: 'flex' }}><X size={14} /></button>
                </div>
              ))}
              <input 
                placeholder="+ Add bookable facility (e.g. Guest Suite)" 
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!e.target.value.trim()) return;
                    setForm(f => ({ ...f, bookableAmenities: [...(f.bookableAmenities || []), e.target.value.trim()] }));
                    e.target.value = '';
                  }
                }}
                style={{ fontSize: 12, border: 'none', background: 'none', outline: 'none', minWidth: 200, padding: '4px 8px' }}
              />
            </div>
            <div style={{ fontSize: 11, color: P.textMuted }}>Specify which amenities can be reserved by residents (Gym, Party Room, etc.). Press Enter to add.</div>
          </div>

          <Textarea label="Description" {...F('description')} placeholder="Optional building description..." rows={2} />
          
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
              {saving ? 'Saving...' : editing ? 'Update Property' : 'Add Property'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
