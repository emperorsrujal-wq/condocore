import { useState, useEffect } from 'react';
import { PiggyBank, Plus, Search, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { subscribeReserveFund, addReserveFundEntry, updateReserveFundEntry, deleteReserveFundEntry, subscribeReserveProjects, addReserveProject, updateReserveProject, deleteReserveProject } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState, ConfirmModal } from '../components/UI';

const CATEGORY_COLORS = {
  'Contribution':  { bg: '#D4EDDA', color: '#155724' },
  'Expenditure':   { bg: '#F8D7DA', color: '#721C24' },
  'Special Levy':  { bg: '#CCE5FF', color: '#004085' },
  'Interest':      { bg: '#FFF3CD', color: '#856404' },
};

const FUND_CATEGORIES = ['Contribution', 'Expenditure', 'Special Levy', 'Interest'];
const PROJECT_DEFAULT = { item: '', year: new Date().getFullYear() + 1, estimatedCost: '' };

const FORM_DEFAULT = { description: '', category: 'Contribution', amount: '', date: new Date().toISOString().split('T')[0], notes: '' };

export default function ReserveFundPage({ userProfile, onToast }) {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [projectForm, setProjectForm] = useState(PROJECT_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!userProfile) return;
    const isPrivileged = ['manager', 'landlord', 'super_admin'].includes(userProfile.role);
    if (!isPrivileged) { setLoading(false); return; }

    const unsubE = subscribeReserveFund(data => { 
      const sorted = [...data].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setEntries(sorted); 
      setLoading(false); 
    });
    const unsubP = subscribeReserveProjects(data => {
      const sorted = [...data].sort((a, b) => (a.year || 0) - (b.year || 0));
      setProjects(sorted);
    });
    return () => { unsubE && unsubE(); unsubP && unsubP(); };
  }, [userProfile]);

  const totalContributions = entries.filter(e => e.category === 'Contribution' || e.category === 'Special Levy' || e.category === 'Interest').reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const totalExpenditures  = entries.filter(e => e.category === 'Expenditure').reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const currentBalance = totalContributions - totalExpenditures;
  const totalPlanned = projects.reduce((a, p) => a + (Number(p.estimatedCost) || 0), 0);
  const fundedPercent = totalPlanned > 0 ? Math.min(100, Math.round((currentBalance / totalPlanned) * 100)) : 100;

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    return e.description?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q);
  });

  const openAdd = () => { setForm({ ...FORM_DEFAULT, date: new Date().toISOString().split('T')[0] }); setEditing(null); setShowForm(true); };
  const openEdit = (e) => { setForm(e); setEditing(e); setShowForm(true); };

  const handleSave = async () => {
    if (!form.description || !form.amount) return onToast('Description and amount required.', 'error');
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0 };
      if (editing) { await updateReserveFundEntry(editing.id, payload); onToast('Entry updated.'); }
      else { await addReserveFundEntry(payload); onToast('Reserve fund entry logged.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleSaveProject = async () => {
    if (!projectForm.item || !projectForm.estimatedCost) return onToast('Project name and cost required.', 'error');
    setSaving(true);
    try {
      const data = { ...projectForm, year: parseInt(projectForm.year), estimatedCost: parseFloat(projectForm.estimatedCost) };
      if (editingProject) { await updateReserveProject(editingProject.id, data); onToast('Project updated.'); }
      else { await addReserveProject(data); onToast('Project added.'); }
      setShowProjectForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDeleteProject = async (id) => {
    setConfirmAction({ message: 'Delete this project?', action: async () => {
      try { await deleteReserveProject(id); onToast('Project deleted.'); }
      catch (e) { onToast(e.message, 'error'); }
    } });
    return;
  };

  const handleDelete = async (id) => {
    setConfirmAction({ message: 'Delete this fund entry?', action: async () => {
      try { await deleteReserveFundEntry(id); onToast('Entry deleted.'); }
      catch (e) { onToast(e.message, 'error'); }
    } });
    return;
  };

  const F = (k) => ({ value: form[k] || '', onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader
        title="Reserve Fund Manager"
        subtitle="Capital reserve tracking for major planned expenditures"
        action={<Btn onClick={openAdd}><Plus size={15} /> Add Entry</Btn>}
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        <div style={{ background: P.card, borderRadius: 14, padding: 20, border: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: P.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>Current Reserve Balance</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: currentBalance >= 0 ? P.success : P.danger }}>${currentBalance.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: P.textMuted, marginTop: 4 }}>After all contributions and withdrawals</div>
        </div>
        <div style={{ background: P.card, borderRadius: 14, padding: 20, border: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: P.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>Upcoming Planned Expenses</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: P.text }}>${totalPlanned.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: P.textMuted, marginTop: 4 }}>Across {projects.length} scheduled capital projects</div>
        </div>
        <div style={{ background: P.card, borderRadius: 14, padding: 20, border: `1px solid ${P.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: P.textMuted, letterSpacing: 0.5, marginBottom: 8 }}>Reserve Fund Adequacy</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: fundedPercent >= 70 ? P.success : fundedPercent >= 40 ? '#856404' : P.danger }}>{fundedPercent}%</div>
          <div style={{ height: 6, background: P.border, borderRadius: 4, marginTop: 8 }}>
            <div style={{ height: '100%', width: `${fundedPercent}%`, background: fundedPercent >= 70 ? P.success : fundedPercent >= 40 ? '#FFC107' : P.danger, borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
          <div style={{ fontSize: 11, color: P.textMuted, marginTop: 4 }}>
            {fundedPercent >= 70 ? '✓ Strong reserve position' : fundedPercent >= 40 ? '⚠ Moderate — consider special levy' : '✗ Underfunded — action required'}
          </div>
        </div>
      </div>

      {/* Planned Capital Projects */}
      <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} color={P.navy} /> Scheduled Capital Projects</div>
          <Btn size="xs" variant="ghost" onClick={() => { setProjectForm(PROJECT_DEFAULT); setEditingProject(null); setShowProjectForm(true); }}>Manage Projects</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {projects.length === 0 ? <div style={{ fontSize: 13, color: P.textMuted, py: 10 }}>No projects scheduled.</div> : 
           projects.map(p => {
            const isFunded = currentBalance >= p.estimatedCost;
            return (
              <div key={p.id} style={{ padding: '12px 14px', borderRadius: 10, background: P.bg, border: `1px solid ${P.border}`, position: 'relative' }} className="group">
                <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{p.item}</div>
                <div style={{ fontSize: 12, color: P.textMuted, marginTop: 2 }}>Target Year: {p.year}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isFunded ? P.success : P.danger, marginTop: 6 }}>
                  ${(p.estimatedCost||0).toLocaleString()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: isFunded ? P.success : P.textMuted }}>
                    {isFunded ? '✓ Funded' : '○ Unfunded'}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => { setProjectForm(p); setEditingProject(p); setShowProjectForm(true); }} style={{ fontSize: 10, color: P.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Edit</button>
                    <button onClick={() => handleDeleteProject(p.id)} style={{ fontSize: 10, color: P.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Del</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ledger */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..."
          style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none' }} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🏦" title="No Fund Entries" body="Start by logging the corporation's first reserve contribution." action={<Btn onClick={openAdd}>Add Entry</Btn>} />
      ) : (
        <Table headers={['Description', 'Category', 'Date', 'Amount', '']}>
          {filtered.map((e, i) => {
            const cs = CATEGORY_COLORS[e.category] || CATEGORY_COLORS['Contribution'];
            const isDebit = e.category === 'Expenditure';
            return (
              <TR key={e.id} idx={i}>
                <TD bold>{e.description}</TD>
                <TD>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cs.bg, color: cs.color }}>
                    {e.category}
                  </span>
                </TD>
                <TD style={{ color: P.textMuted, fontSize: 13 }}>{e.date || '--'}</TD>
                <TD bold style={{ color: isDebit ? P.danger : P.success }}>
                  {isDebit ? '−' : '+'}${(Number(e.amount) || 0).toLocaleString()}
                </TD>
                <TD>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(e)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(e.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}>Del</button>
                  </div>
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {showForm && (
        <Modal title={editing ? 'Edit Fund Entry' : 'Add Reserve Fund Entry'} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Input label="Description *" {...F('description')} placeholder="e.g. Q1 2025 Unit Contributions, Roof Repair Phase 1..." />
            </div>
            <Select label="Category *" {...F('category')} options={FUND_CATEGORIES} />
            <Input label="Amount ($) *" type="number" {...F('amount')} placeholder="0.00" />
            <Input label="Date" type="date" {...F('date')} />
            <Input label="Notes" {...F('notes')} placeholder="Optional reference..." />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save Entry'}</Btn>
          </div>
        </Modal>
      )}

      {showProjectForm && (
        <Modal title={editingProject ? 'Edit Project' : 'Add Capital Project'} onClose={() => setShowProjectForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Input label="Project Name *" value={projectForm.item} onChange={e => setProjectForm({ ...projectForm, item: e.target.value })} placeholder="e.g. Roof Replacement" />
            </div>
            <Input label="Target Year *" type="number" value={projectForm.year} onChange={e => setProjectForm({ ...projectForm, year: e.target.value })} />
            <Input label="Estimated Cost ($) *" type="number" value={projectForm.estimatedCost} onChange={e => setProjectForm({ ...projectForm, estimatedCost: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowProjectForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSaveProject} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save Project'}</Btn>
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
