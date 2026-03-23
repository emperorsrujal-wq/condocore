import { useState, useEffect } from 'react';
import { Plus, Star, Edit, Trash2 } from 'lucide-react';
import { subscribeAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement, subscribeProperties } from '../firebase';
import { P, Btn, Modal, Input, Select, Textarea, PageHeader, Spinner, EmptyState, ConfirmModal } from '../components/UI';

const CAT_COLORS = {
  Maintenance: { color: '#C97B1A', bg: '#FEF3E2' },
  Reminder:    { color: '#1A5FA8', bg: '#EAF0FB' },
  Financial:   { color: '#C0392B', bg: '#FDECEA' },
  Policy:      { color: '#7B1A7B', bg: '#F5EAF7' },
  General:     { color: '#1A7F5A', bg: '#EAF7F2' },
};

const FORM_DEFAULT = { title: '', body: '', category: 'General', priority: 'normal', audience: 'All Properties', pinned: false };

export default function AnnouncementsPage({ onToast, userProfile }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [expanded, setExpanded]           = useState(null);
  const [showForm, setShowForm]           = useState(false);
  const [editing, setEditing]             = useState(null);
  const [form, setForm]                   = useState(FORM_DEFAULT);
  const [saving, setSaving]               = useState(false);
  const [filterCat, setFilterCat]         = useState('All');
  const [properties, setProperties]       = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);

  const isReadOnly = userProfile?.role === 'tenant' || userProfile?.role === 'owner';

  useEffect(() => {
    const unsubA = subscribeAnnouncements(data => { 
      const sorted = [...data].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
        return dateB - dateA;
      });
      setAnnouncements(sorted); 
      setLoading(false); 
    });
    const unsubP = subscribeProperties(data => setProperties(data));
    return () => { unsubA(); unsubP(); };
  }, []);

  const filtered = filterCat === 'All' ? announcements : announcements.filter(a => a.category === filterCat);
  const pinned   = filtered.filter(a => a.pinned);
  const rest     = filtered.filter(a => !a.pinned);

  const openAdd  = () => { setForm(FORM_DEFAULT); setEditing(null); setShowForm(true); };
  const openEdit = (a) => { setForm({ title: a.title, body: a.body, category: a.category, priority: a.priority, audience: a.audience, pinned: a.pinned }); setEditing(a); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title || !form.body) return onToast('Title and body are required.', 'error');
    setSaving(true);
    try {
      const data = { ...form, author: userProfile?.name || 'Manager', authorId: userProfile?.uid || '' };
      if (editing) { await updateAnnouncement(editing.id, data); onToast('Announcement updated.'); }
      else { await addAnnouncement(data); onToast('Announcement posted!'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handlePin   = async (a) => { try { await updateAnnouncement(a.id, { pinned: !a.pinned }); onToast(a.pinned ? 'Unpinned.' : 'Pinned to top.'); } catch (e) { onToast(e.message, 'error'); } };
  const handleDelete = async (id) => {
    setConfirmAction({ message: 'Delete this announcement?', action: async () => {
      try { await deleteAnnouncement(id); onToast('Deleted.'); } catch (e) { onToast(e.message, 'error'); }
    } });
    return;
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const ACard = ({ a }) => {
    const cat = CAT_COLORS[a.category] || CAT_COLORS.General;
    const open = expanded === a.id;
    const createdAt = a.createdAt?.toDate ? a.createdAt.toDate().toLocaleDateString() : 'Recent';
    return (
      <div style={{ background: P.card, borderRadius: 14, border: `1.5px solid ${a.pinned ? P.gold + '70' : P.border}`, boxShadow: '0 2px 8px rgba(11,30,61,0.06)', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ padding: '18px 22px', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start' }} onClick={() => setExpanded(open ? null : a.id)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
              {a.pinned && <Star size={13} color={P.gold} fill={P.gold} />}
              <span style={{ background: cat.bg, color: cat.color, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{a.category}</span>
              {a.priority !== 'normal' && <span style={{ background: P.danger + '18', color: P.danger, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{a.priority}</span>}
            </div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, fontWeight: 700, color: P.text }}>{a.title}</div>
            <div style={{ fontSize: 12, color: P.textMuted, marginTop: 2 }}>{createdAt} · {a.author} · {a.audience}</div>
            {!open && <p style={{ fontSize: 13, color: P.textMuted, margin: '8px 0 0', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.body}</p>}
          </div>
          {!isReadOnly && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
              <button onClick={() => handlePin(a)} style={{ padding: '5px 9px', borderRadius: 7, border: `1px solid ${a.pinned ? P.gold : P.border}`, background: a.pinned ? P.gold + '18' : 'none', cursor: 'pointer', color: a.pinned ? P.goldDark : P.textMuted }}><Star size={13} /></button>
              <button onClick={() => openEdit(a)} style={{ padding: '5px 9px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer', color: P.textMuted }}><Edit size={13} /></button>
              <button onClick={() => handleDelete(a.id)} style={{ padding: '5px 9px', borderRadius: 7, border: 'none', background: '#FDECEA', cursor: 'pointer', color: P.danger }}><Trash2 size={13} /></button>
            </div>
          )}
          <span style={{ color: P.textMuted, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
        </div>
        {open && (
          <div style={{ padding: '0 22px 20px', borderTop: `1px solid ${P.border}` }}>
            <p style={{ fontSize: 14, color: P.text, lineHeight: 1.75, margin: '16px 0 0', whiteSpace: 'pre-wrap' }}>{a.body}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Announcements"
        subtitle={`${announcements.length} announcements`}
        action={!isReadOnly && <Btn onClick={openAdd}><Plus size={15} /> New Announcement</Btn>} />

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['All', 'Maintenance', 'Reminder', 'Financial', 'Policy', 'General'].map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{ padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${filterCat === c ? P.navy : P.border}`, background: filterCat === c ? P.navy : P.card, color: filterCat === c ? '#fff' : P.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{c}</button>
        ))}
      </div>

      {filtered.length === 0
        ? <EmptyState icon="📢" title="No announcements" body="Post your first announcement to notify tenants." action={!isReadOnly && <Btn onClick={openAdd}><Plus size={14} /> New Announcement</Btn>} />
        : (
          <>
            {pinned.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Star size={12} fill={P.gold} color={P.gold} /> Pinned
                </div>
                {pinned.map(a => <ACard key={a.id} a={a} />)}
              </div>
            )}
            {rest.length > 0 && (
              <div>
                {pinned.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>All Announcements</div>}
                {rest.map(a => <ACard key={a.id} a={a} />)}
              </div>
            )}
          </>
        )}

      {/* Add/Edit Modal */}
      {showForm && (
        <Modal title={editing ? 'Edit Announcement' : 'New Announcement'} onClose={() => setShowForm(false)} maxWidth={520}>
          <Input label="Title *" {...F('title')} placeholder="e.g. Water Shutoff Notice – Dec 10" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Select label="Category" {...F('category')} options={['General', 'Maintenance', 'Reminder', 'Financial', 'Policy']} />
            <Select label="Priority" {...F('priority')} options={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} />
          </div>
          <Select label="Audience" {...F('audience')} options={['All Properties', ...properties.map(p => p.name)]} />
          <Textarea label="Message *" {...F('body')} placeholder="Write your announcement here..." rows={5} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 18, padding: '11px 14px', background: form.pinned ? P.gold + '12' : P.bg, borderRadius: 9, border: `1px solid ${form.pinned ? P.gold + '40' : P.border}` }}>
            <div onClick={() => setForm(f => ({ ...f, pinned: !f.pinned }))} style={{ width: 38, height: 21, borderRadius: 11, background: form.pinned ? P.gold : P.border, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: form.pinned ? 19 : 3, width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: P.text }}>📌 Pin to top</span>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Post Announcement →'}
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
