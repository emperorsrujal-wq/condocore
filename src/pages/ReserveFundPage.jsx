import { useState, useEffect } from 'react';
import { PiggyBank, Plus, Search, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { subscribeReserveFund, addReserveFundEntry, updateReserveFundEntry, deleteReserveFundEntry } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState } from '../components/UI';

const CATEGORY_COLORS = {
  'Contribution':  { bg: '#D4EDDA', color: '#155724' },
  'Expenditure':   { bg: '#F8D7DA', color: '#721C24' },
  'Special Levy':  { bg: '#CCE5FF', color: '#004085' },
  'Interest':      { bg: '#FFF3CD', color: '#856404' },
};

const FUND_CATEGORIES = ['Contribution', 'Expenditure', 'Special Levy', 'Interest'];

const PLANNED_ITEMS = [
  { item: 'Roof Replacement', year: 2028, estimatedCost: 180000 },
  { item: 'Elevator Modernization', year: 2027, estimatedCost: 95000 },
  { item: 'Parking Garage Repaving', year: 2026, estimatedCost: 45000 },
  { item: 'Window Replacement', year: 2030, estimatedCost: 220000 },
  { item: 'Lobby Renovation', year: 2029, estimatedCost: 60000 },
];

const FORM_DEFAULT = { description: '', category: 'Contribution', amount: '', date: new Date().toISOString().split('T')[0], notes: '' };

export default function ReserveFundPage({ userProfile, onToast }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    const isPrivileged = ['manager', 'landlord', 'super_admin'].includes(userProfile.role);
    if (!isPrivileged) { setLoading(false); return; }

    const unsub = subscribeReserveFund(data => { setEntries(data); setLoading(false); });
    return () => unsub && unsub();
  }, [userProfile]);

  const totalContributions = entries.filter(e => e.category === 'Contribution' || e.category === 'Special Levy' || e.category === 'Interest').reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const totalExpenditures  = entries.filter(e => e.category === 'Expenditure').reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const currentBalance = totalContributions - totalExpenditures;
  const totalPlanned = PLANNED_ITEMS.reduce((a, p) => a + p.estimatedCost, 0);
  const fundedPercent = Math.min(100, Math.round((currentBalance / totalPlanned) * 100));

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

  const handleDelete = async (id) => {
    if (!confirm('Delete this fund entry?')) return;
    try { await deleteReserveFundEntry(id); onToast('Entry deleted.'); }
    catch (e) { onToast(e.message, 'error'); }
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
          <div style={{ fontSize: 12, color: P.textMuted, marginTop: 4 }}>Across {PLANNED_ITEMS.length} scheduled capital projects</div>
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
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={16} color={P.navy} /> Scheduled Capital Projects
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {PLANNED_ITEMS.map(p => {
            const isFunded = currentBalance >= p.estimatedCost;
            return (
              <div key={p.item} style={{ padding: '12px 14px', borderRadius: 10, background: P.bg, border: `1px solid ${P.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{p.item}</div>
                <div style={{ fontSize: 12, color: P.textMuted, marginTop: 2 }}>Target Year: {p.year}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isFunded ? P.success : P.danger, marginTop: 6 }}>
                  ${p.estimatedCost.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: isFunded ? P.success : P.textMuted }}>
                  {isFunded ? '✓ Funded' : '○ Unfunded'}
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
    </div>
  );
}
