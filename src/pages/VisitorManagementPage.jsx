import { useState, useEffect } from 'react';
import { UserPlus, Clock, CheckCircle2, XCircle, Search, Calendar, Car, Shield, LogIn, LogOut, Trash2 } from 'lucide-react';
import { subscribeVisitors, addVisitor, updateVisitorStatus, deleteVisitor, subscribeProperties } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState, StatusBadge } from '../components/UI';

const VISITOR_TYPES = ['Guest', 'Delivery', 'Service/Maintenance', 'Family', 'Other'];

export default function VisitorManagementPage({ userProfile, tenantData, onToast }) {
  const [visitors, setVisitors] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [form, setForm] = useState({ guestName: '', visitDate: '', type: 'Guest', vehicleInfo: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const isManager = ['manager', 'landlord', 'super_admin'].includes(userProfile?.role);

  useEffect(() => {
    const unsubP = subscribeProperties(data => {
      setProperties(data);
      if (!isManager && tenantData?.propertyId) {
        setSelectedPropertyId(tenantData.propertyId);
      } else if (data.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(data[0].id);
      }
    });
    return () => unsubP();
  }, [isManager, tenantData?.propertyId]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    const unsubV = subscribeVisitors(selectedPropertyId, data => {
      const sorted = [...data].sort((a, b) => (b.visitDate || '').localeCompare(a.visitDate || ''));
      setVisitors(sorted);
      setLoading(false);
    });
    return () => unsubV();
  }, [selectedPropertyId]);

  const handleAdd = async () => {
    if (!form.guestName || !form.visitDate) return onToast('Guest name and date are required.', 'error');
    setSaving(true);
    try {
      await addVisitor({
        ...form,
        propertyId: selectedPropertyId,
        residentId: userProfile.uid,
        residentName: userProfile.name,
        unit: tenantData?.unit || 'N/A',
        status: 'Upcoming'
      });
      onToast('Visitor pre-registered!');
      setShowAdd(false);
      setForm({ guestName: '', visitDate: '', type: 'Guest', vehicleInfo: '', notes: '' });
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleStatus = async (id, status) => {
    try {
      await updateVisitorStatus(id, status);
      onToast(`Visitor marked as ${status.toLowerCase()}.`);
    } catch (e) { onToast(e.message, 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this visitor record?')) return;
    try {
      await deleteVisitor(id);
      onToast('Record removed.');
    } catch (e) { onToast(e.message, 'error'); }
  };

  const filtered = visitors.filter(v => {
    const q = search.toLowerCase();
    const isOwnerMatch = isManager || v.residentId === userProfile.uid;
    const isSearchMatch = (v.guestName || '').toLowerCase().includes(q) || (v.unit || '').toLowerCase().includes(q);
    return isOwnerMatch && isSearchMatch;
  });

  const F = (k) => ({ value: form[k] || '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading && properties.length === 0) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Visitor Management" subtitle={isManager ? "Security Log & Guest Registration" : "Pre-register your guests for easy building access"}
        action={<Btn onClick={() => setShowAdd(true)}><UserPlus size={15} /> Pre-Register Guest</Btn>} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guests or units..."
            style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none' }} />
        </div>
        {isManager && (
          <div style={{ width: 250 }}>
            <Select value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)} options={properties.map(p => ({ label: p.name, value: p.id }))} />
          </div>
        )}
      </div>

      <div style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="🚪" title="No Visitors Logged" body="Pre-register your guests so security can assist them upon arrival." />
        ) : (
          <Table headers={['Guest', 'Visit Date', 'Type', 'Unit', 'Status', 'Actions']}>
            {filtered.map((v, i) => (
              <TR key={v.id} idx={i}>
                <TD>
                  <div style={{ fontWeight: 600 }}>{v.guestName}</div>
                  {v.vehicleInfo && <div style={{ fontSize: 11, color: P.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}><Car size={10} /> {v.vehicleInfo}</div>}
                </TD>
                <TD>
                  <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} color={P.textMuted} />
                    {v.visitDate}
                  </div>
                </TD>
                <TD><StatusBadge status={v.type === 'Delivery' ? 'warning' : 'info'} label={v.type} /></TD>
                <TD bold>{v.unit}</TD>
                <TD><StatusBadge status={v.status === 'Upcoming' ? 'neutral' : v.status === 'Checked-In' ? 'success' : 'expired'} label={v.status} /></TD>
                <TD>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {isManager && v.status === 'Upcoming' && (
                      <Btn variant="success" size="xs" onClick={() => handleStatus(v.id, 'Checked-In')} style={{ padding: '4px 8px' }}><LogIn size={13} /> Check In</Btn>
                    )}
                    {isManager && v.status === 'Checked-In' && (
                      <Btn variant="ghost" size="xs" onClick={() => handleStatus(v.id, 'Completed')} style={{ padding: '4px 8px' }}><LogOut size={13} /> Check Out</Btn>
                    )}
                    {(isManager || v.residentId === userProfile.uid) && (
                      <button onClick={() => handleDelete(v.id)} style={{ padding: 6, borderRadius: 8, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}><Trash2 size={14} /></button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </div>

      {showAdd && (
        <Modal title="Pre-Register Visitor" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}><Input label="Guest Name *" {...F('guestName')} placeholder="e.g. John Doe" /></div>
            <Input label="Visit Date *" type="date" {...F('visitDate')} />
            <Select label="Visitor Type" {...F('type')} options={VISITOR_TYPES} />
            <div style={{ gridColumn: '1/-1' }}><Input label="Vehicle Details (Optional)" {...F('vehicleInfo')} placeholder="Make, Model or License Plate" /></div>
            <div style={{ gridColumn: '1/-1' }}><Input label="Notes for Security" {...F('notes')} placeholder="e.g. Needs guest parking access" /></div>
          </div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, background: P.bg, padding: 10, borderRadius: 8 }}>
            <Shield size={14} /> This information helps security verify and assist your guests.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleAdd} disabled={saving} style={{ flex: 2 }}>{saving ? 'Register Guest' : 'Register Guest'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
