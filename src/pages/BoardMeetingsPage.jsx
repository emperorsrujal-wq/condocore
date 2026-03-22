import { subscribeMeetings, addMeeting, updateMeeting, deleteMeeting, uploadFile, addDocument, subscribeProperties, subscribeTenants, subscribeVotes } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Spinner, EmptyState } from '../components/UI';
import { Vote, ClipboardList, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Minus, FileText } from 'lucide-react';
import { useHOAMode } from '../contexts/HOAModeContext';
import { jsPDF } from 'jspdf';

const MEETING_TYPES = ['AGM (Annual General Meeting)', 'Special Meeting', 'Board Meeting', 'Emergency Meeting'];

const generateMinutesPDF = (meeting, landlordName) => {
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`MEETING MINUTES`, 105, 18, null, null, 'center');
  doc.setFontSize(12);
  doc.text(meeting.title, 105, 27, null, null, 'center');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const motionsText = (meeting.motions || []).map((m, i) =>
    `Motion ${i + 1}: ${m.text}\n  Moved by: ${m.movedBy || 'N/A'} | Seconded by: ${m.secondedBy || 'N/A'}\n  Result: ${m.result || 'Pending'} (For: ${m.votesFor || 0}, Against: ${m.votesAgainst || 0}, Abstain: ${m.votesAbstain || 0})`
  ).join('\n\n');

  const body = `
Date: ${meeting.date || 'N/A'}
Type: ${meeting.type}
Location: ${meeting.location || 'N/A'}
Called to Order: ${meeting.startTime || 'N/A'}
Quorum Achieved: ${meeting.quorumAchieved ? 'Yes' : 'No'} (${meeting.attendeeCount || 0} members present)

Chairperson: ${meeting.chairperson || landlordName || 'N/A'}
Recording Secretary: ${meeting.secretary || 'N/A'}

------------------------------
MOTIONS RECORDED:
------------------------------
${motionsText || 'No motions recorded.'}

------------------------------
GENERAL NOTES:
------------------------------
${meeting.notes || 'No additional notes.'}

Meeting Adjourned: ${meeting.endTime || 'N/A'}

___________________________________   ___________________________________
Chairperson Signature                  Secretary Signature
  `;

  const split = doc.splitTextToSize(body, 180);
  doc.text(split, 15, 38);
  return doc.output('blob');
};

const FORM_DEFAULT = {
  title: '', type: 'Board Meeting', date: new Date().toISOString().split('T')[0],
  location: '', startTime: '', endTime: '', chairperson: '', secretary: '',
  attendeeCount: '', quorumAchieved: false, notes: '', motions: [],
  propertyId: '', propertyName: ''
};

const MOTION_DEFAULT = { text: '', movedBy: '', secondedBy: '', result: 'Carried', votesFor: 0, votesAgainst: 0, votesAbstain: 0 };

export default function BoardMeetingsPage({ userProfile, onToast }) {
  const { label, isHOAMode } = useHOAMode();
  const [meetings, setMeetings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(null);
  const [meetingVotes, setMeetingVotes] = useState({}); // { meetingId: [votes] }

  useEffect(() => {
    if (!userProfile) return;
    const isPrivileged = ['manager', 'landlord', 'super_admin'].includes(userProfile.role);

    const u1 = subscribeMeetings(data => { 
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
      setMeetings(sorted); 
      setLoading(false); 
    });
    const u2 = subscribeProperties(data => setProperties(data));
    const u3 = subscribeTenants(data => setTenants(data));
    
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); };
  }, [userProfile]);

  useEffect(() => {
    if (!expanded) return;
    const unsub = subscribeVotes(expanded, data => {
      setMeetingVotes(prev => ({ ...prev, [expanded]: data }));
    });
    return () => unsub();
  }, [expanded]);

  const filtered = meetings.filter(m => {
    const q = search.toLowerCase();
    return m.title?.toLowerCase().includes(q) || m.type?.toLowerCase().includes(q);
  });

  const F = (k) => ({ value: form[k] ?? '', onChange: e => setForm(f => {
    const next = { ...f, [k]: e.target.value };
    // Auto-quorum check
    if (k === 'attendeeCount' || k === 'propertyId') {
      const propId = k === 'propertyId' ? e.target.value : f.propertyId;
      const attCount = k === 'attendeeCount' ? parseInt(e.target.value) || 0 : parseInt(f.attendeeCount) || 0;
      const totalUnits = tenants.filter(t => t.propertyId === propId).length;
      if (totalUnits > 0) {
        next.quorumAchieved = attCount >= (totalUnits * 0.25);
      }
    }
    return next;
  }) });

  const updateMotion = (idx, key, val) => {
    const updated = [...(form.motions || [])];
    updated[idx] = { ...updated[idx], [key]: val };
    setForm(f => ({ ...f, motions: updated }));
  };
  const addMotion = () => setForm(f => ({ ...f, motions: [...(f.motions || []), { ...MOTION_DEFAULT }] }));
  const removeMotion = (idx) => setForm(f => ({ ...f, motions: f.motions.filter((_, i) => i !== idx) }));

  const openAdd = () => { setForm({ ...FORM_DEFAULT, date: new Date().toISOString().split('T')[0] }); setEditing(null); setShowForm(true); };
  const openEdit = (m) => { setForm(m); setEditing(m); setShowForm(true); };

  const handleSave = async () => {
    if (!form.title || !form.date || !form.propertyId) return onToast('Title, date, and building are required.', 'error');
    setSaving(true);
    try {
      if (editing) { await updateMeeting(editing.id, form); onToast('Meeting updated.'); }
      else { await addMeeting(form); onToast('Meeting logged.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this meeting record?')) return;
    try { await deleteMeeting(id); onToast('Deleted.'); }
    catch (e) { onToast(e.message, 'error'); }
  };

  const handlePrintMinutes = async (meeting) => {
    setGenerating(meeting.id);
    try {
      const blob = generateMinutesPDF(meeting, userProfile?.name);
      const filename = `Meeting_Minutes_${(meeting.title || 'Meeting').replace(/\s+/g, '_')}_${meeting.date}.pdf`;
      const path = `documents/${filename}`;
      const url = await uploadFile(blob, path);
      await addDocument({ name: `Minutes: ${meeting.title}`, type: 'Report', unit: 'General', url, storagePath: path, size: (blob.size / 1024).toFixed(1) + ' KB', ext: 'PDF', uploadedBy: userProfile?.name || 'System' });
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = localUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(localUrl);
      onToast('Minutes PDF generated and saved!');
    } catch (e) { onToast(e.message, 'error'); }
    setGenerating(null);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title={isHOAMode ? "Board Meeting Minutes" : "Management Meetings"} subtitle={`${meetings.length} meetings on record`}
        action={['manager', 'landlord', 'super_admin'].includes(userProfile?.role) && <Btn onClick={openAdd}><Plus size={15} /> Log Meeting</Btn>} />

      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or meeting type..."
          style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none' }} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📋" title="No Meetings Logged" body="Start by recording your first board meeting." action={<Btn onClick={openAdd}>Log Meeting</Btn>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(meeting => {
            const isOpen = expanded === meeting.id;
            const motions = meeting.motions || [];
            return (
              <div key={meeting.id} style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : meeting.id)}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: `${P.navy}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ClipboardList size={18} color={P.navy} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: P.text }}>{meeting.title}</div>
                    <div style={{ fontSize: 12, color: P.textMuted, marginTop: 2 }}>
                      {meeting.date} · {meeting.type} · {motions.length} motion{motions.length !== 1 ? 's' : ''}
                      {meeting.quorumAchieved ? <span style={{ color: P.success, marginLeft: 8 }}>✓ Quorum</span> : <span style={{ color: P.danger, marginLeft: 8 }}>✗ No Quorum</span>}
                      {meeting.status === 'Active' && <span style={{ color: P.gold, marginLeft: 8, fontWeight: 700 }}>● Live Poll Open</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); handlePrintMinutes(meeting); }} disabled={generating === meeting.id}
                      style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#EAF7F2', color: P.success, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText size={12} /> {generating === meeting.id ? '...' : 'Minutes PDF'}
                    </button>
                    {['manager', 'landlord', 'super_admin'].includes(userProfile?.role) && (
                      <>
                        <button onClick={e => { e.stopPropagation(); openEdit(meeting); }} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer' }}>Edit</button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(meeting.id); }} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}>Del</button>
                      </>
                    )}
                    {isOpen ? <ChevronDown size={16} color={P.textMuted} /> : <ChevronRight size={16} color={P.textMuted} />}
                  </div>
                </div>

                {/* Expanded: motions + notes */}
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: `1px solid ${P.border}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14, marginBottom: 16, fontSize: 12 }}>
                      {[['Location', meeting.location], ['Chairperson', meeting.chairperson], ['Attendees', meeting.attendeeCount], ['Start', meeting.startTime], ['End', meeting.endTime], ['Secretary', meeting.secretary]].map(([label, val]) => val ? (
                        <div key={label} style={{ padding: '8px 12px', borderRadius: 8, background: P.bg }}>
                          <div style={{ color: P.textMuted, fontWeight: 700, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.3 }}>{label}</div>
                          <div style={{ color: P.text, fontWeight: 600, marginTop: 2 }}>{val}</div>
                        </div>
                      ) : null)}
                    </div>

                    {motions.length > 0 && (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 10 }}>Motions ({motions.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {motions.map((m, idx) => {
                            const poll = (meetingVotes[meeting.id] || []).filter(v => v.motionIndex === idx);
                            const pollYes = poll.filter(v => v.vote === 'Yes').length;
                            const pollNo = poll.filter(v => v.vote === 'No').length;
                            const pollAbs = poll.filter(v => v.vote === 'Abstain').length;

                            return (
                              <div key={idx} style={{ padding: '12px 14px', borderRadius: 10, background: P.bg, border: `1px solid ${P.border}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Motion {idx + 1}: {m.text}</div>
                                  {poll.length > 0 && (
                                    <div style={{ fontSize: 10, background: '#FFF9E6', padding: '2px 8px', borderRadius: 6, border: `1px solid ${P.gold}44`, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <Vote size={10} color={P.gold} /> <b style={{ color: P.gold }}>Homeowner Poll: {pollYes}Y / {pollNo}N</b>
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: P.textMuted, flexWrap: 'wrap' }}>
                                  <span>Moved: <b style={{ color: P.text }}>{m.movedBy || '—'}</b></span>
                                  <span>Seconded: <b style={{ color: P.text }}>{m.secondedBy || '—'}</b></span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <b style={{ color: P.text }}>Board:</b>
                                    <ThumbsUp size={12} color={P.success} /> <b style={{ color: P.success }}>{m.votesFor}</b>
                                    <ThumbsDown size={12} color={P.danger} style={{ marginLeft: 6 }} /> <b style={{ color: P.danger }}>{m.votesAgainst}</b>
                                    <Minus size={12} color={P.textMuted} style={{ marginLeft: 6 }} /> <b>{m.votesAbstain}</b>
                                  </span>
                                  <span style={{ fontWeight: 700, color: m.result === 'Carried' ? P.success : m.result === 'Defeated' ? P.danger : P.textMuted }}>
                                    → {m.result}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {meeting.notes && (
                      <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: P.bg, fontSize: 13, color: P.textMuted, lineHeight: 1.5 }}>
                        <b style={{ color: P.text }}>Notes:</b> {meeting.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Meeting Record' : 'Log Board Meeting'} onClose={() => setShowForm(false)}>
          <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}><Input label="Meeting Title *" {...F('title')} placeholder="e.g. Q1 2025 Board Meeting" /></div>
              <Select label="Meeting Type" {...F('type')} options={MEETING_TYPES} />
              <Select label="Status" {...F('status')} options={['Draft', 'Active', 'Completed']} />
              <Select label="Building *" value={form.propertyId} onChange={e => {
                const p = properties.find(prop => prop.id === e.target.value);
                setForm(f => {
                  const next = { ...f, propertyId: e.target.value, propertyName: p?.name || '' };
                  // Re-calc quorum
                  const totalUnits = tenants.filter(t => t.propertyId === e.target.value).length;
                  if (totalUnits > 0) {
                    next.quorumAchieved = (parseInt(f.attendeeCount) || 0) >= (totalUnits * 0.25);
                  }
                  return next;
                });
              }} options={[{ label: 'Select Building', value: '' }, ...properties.map(p => ({ label: p.name, value: p.id }))]} />
              <Input label="Date *" type="date" {...F('date')} />
              <Input label="Location" {...F('location')} placeholder="e.g. Building Lobby, Zoom" />
              <Input label="Chairperson" {...F('chairperson')} placeholder="Name of chair" />
              <Input label="Recording Secretary" {...F('secretary')} placeholder="Name of secretary" />
              <Input label="Start Time" type="time" {...F('startTime')} />
              <Input label="End Time" type="time" {...F('endTime')} />
              <Input label="Members Present" type="number" {...F('attendeeCount')} placeholder="0" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 9, background: form.quorumAchieved ? '#EAF7F2' : '#FDECEA', border: `1px solid ${form.quorumAchieved ? P.success : P.danger}`, marginTop: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: form.quorumAchieved ? P.success : P.danger }}>
                  {form.quorumAchieved ? '✓ Quorum Achieved' : '✗ Quorum Not Met'}
                </div>
                <div style={{ fontSize: 11, color: P.textMuted }}>
                  Required: {Math.ceil(tenants.filter(t => t.propertyId === form.propertyId).length * 0.25)} (25% of {tenants.filter(t => t.propertyId === form.propertyId).length} units)
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}><Input label="General Notes / Action Items" {...F('notes')} placeholder="Agenda items, follow-ups..." /></div>

            {/* Motions */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Motions ({(form.motions || []).length})</div>
                <button onClick={addMotion} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: `1px solid ${P.border}`, background: P.bg, cursor: 'pointer' }}>+ Add Motion</button>
              </div>
              {(form.motions || []).map((m, idx) => (
                <div key={idx} style={{ padding: 12, borderRadius: 10, background: P.bg, border: `1px solid ${P.border}`, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: P.textMuted }}>Motion {idx + 1}</span>
                    <button onClick={() => removeMotion(idx)} style={{ fontSize: 11, color: P.danger, background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                  </div>
                  <Input label="Motion Text" value={m.text} onChange={e => updateMotion(idx, 'text', e.target.value)} placeholder="Be it resolved that..." />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                    <Input label="Moved By" value={m.movedBy} onChange={e => updateMotion(idx, 'movedBy', e.target.value)} placeholder="Name" />
                    <Input label="Seconded By" value={m.secondedBy} onChange={e => updateMotion(idx, 'secondedBy', e.target.value)} placeholder="Name" />
                    <Input label="Votes For" type="number" value={m.votesFor} onChange={e => updateMotion(idx, 'votesFor', Number(e.target.value))} />
                    <Input label="Votes Against" type="number" value={m.votesAgainst} onChange={e => updateMotion(idx, 'votesAgainst', Number(e.target.value))} />
                    <Input label="Abstentions" type="number" value={m.votesAbstain} onChange={e => updateMotion(idx, 'votesAbstain', Number(e.target.value))} />
                    <Select label="Result" value={m.result} onChange={e => updateMotion(idx, 'result', e.target.value)} options={['Carried', 'Defeated', 'Tabled', 'Withdrawn']} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save Meeting Record'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
