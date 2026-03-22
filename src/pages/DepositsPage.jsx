import { useState, useEffect } from 'react';
import { PiggyBank, Plus, Search, ChevronRight } from 'lucide-react';
import { subscribeDeposits, subscribeTenantDeposits, addDeposit, updateDeposit, deleteDeposit, subscribeTenants } from '../firebase';
import { P, StatusBadge, Btn, Modal, Input, Select, PageHeader, Table, TR, TD, Spinner, EmptyState } from '../components/UI';
import { generateLMRStatementPDF } from '../utils/pdfGenerator';
import { uploadFile, addDocument } from '../firebase';

const FORM_DEFAULT = { tenantId: '', property: '', type: 'Security Deposit', amount: '', status: 'Held in Escrow', dateCollected: '', notes: '' };

// Ontario Rent Increase Guideline (User specified 0% for 2024-25)
const ONTARIO_LMR_RATES = {
  2019: 0.018,
  2020: 0.022,
  2021: 0.000,
  2022: 0.012,
  2023: 0.025,
  2024: 0.000,
  2025: 0.000
};

const calculateLMRInterest = (amount, dateCollectedStr) => {
  if (!dateCollectedStr || !amount) return { totalInterest: 0, breakdown: [] };
  const _amt = Number(amount);
  const startY = Number(dateCollectedStr.split('-')[0]);
  const currentY = new Date().getFullYear();
  let totalInterest = 0;
  const breakdown = [];

  for (let y = startY; y < currentY; y++) {
    // Treat unknown historical rates as 0% for MVP simplicity
    const rate = ONTARIO_LMR_RATES[y] || 0;
    const earned = _amt * rate;
    totalInterest += earned;
    breakdown.push({ year: y, rate, earned });
  }
  return { totalInterest, breakdown };
};

export default function DepositsPage({ userProfile, onToast }) {
  const isTenant = userProfile?.role === 'tenant' || userProfile?.role === 'owner';
  
  const [deposits, setDeposits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let unsubD, unsubT;
    if (isTenant) {
      unsubD = subscribeTenantDeposits(userProfile.uid, data => { 
        const sorted = [...data].sort((a, b) => (b.dateCollected || '').localeCompare(a.dateCollected || ''));
        setDeposits(sorted); 
        setLoading(false); 
      });
    } else {
      unsubD = subscribeDeposits(data => { 
        const sorted = [...data].sort((a, b) => (b.dateCollected || '').localeCompare(a.dateCollected || ''));
        setDeposits(sorted); 
        setLoading(false); 
      });
      unsubT = subscribeTenants(data => setTenants(data));
    }
    return () => { unsubD && unsubD(); unsubT && unsubT(); };
  }, [isTenant, userProfile?.uid]);

  const filtered = deposits.filter(d => {
    const q = search.toLowerCase();
    const tName = tenants.find(t => t.id === d.tenantId)?.name || '';
    return d.type.toLowerCase().includes(q) || d.status.toLowerCase().includes(q) || tName.toLowerCase().includes(q);
  });

  const aggregateEscrow = filtered.reduce((acc, curr) => curr.status === 'Held in Escrow' ? acc + (Number(curr.amount) || 0) : acc, 0);

  const openAdd = () => { setForm({ ...FORM_DEFAULT, dateCollected: new Date().toISOString().split('T')[0] }); setEditing(null); setShowForm(true); };
  const openEdit = (d) => { setForm(d); setEditing(d); setShowForm(true); };

  const handleSave = async () => {
    if (!form.tenantId || !form.amount) return onToast('Tenant and Amount are required.', 'error');
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0 };
      if (editing) { await updateDeposit(editing.id, payload); onToast('Ledger updated.'); }
      else { await addDeposit(payload); onToast('Deposit logged to Escrow.'); }
      setShowForm(false);
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this escrow ledger record?')) return;
    try { await deleteDeposit(id); onToast('Ledger record deleted.'); }
    catch (e) { onToast(e.message, 'error'); }
  };

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const handleGenerateStatement = async (deposit) => {
    const tenant = tenants.find(t => t.id === deposit.tenantId);
    if (!tenant) return onToast('Tenant data missing', 'error');
    
    setLoading(true);
    try {
      const interestCalculations = calculateLMRInterest(deposit.amount, deposit.dateCollected);
      const blob = await generateLMRStatementPDF(tenant, deposit, interestCalculations, userProfile?.name);
      
      const filename = `LMR_Interest_Statement_${tenant.name.replace(/\s+/g, '_')}_${new Date().getFullYear()}.pdf`;
      const path = `documents/${filename}`;
      const url = await uploadFile(blob, path);

      await addDocument({
        name: `LMR Annual Interest Statement`,
        type: 'Report',
        unit: tenant.unit,
        tenantId: tenant.id,
        url,
        storagePath: path,
        size: (blob.size / 1024).toFixed(1) + ' KB',
        ext: 'PDF',
        uploadedBy: userProfile?.name || 'System'
      });

      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);

      onToast('LMR Statement Generated & Saved to Tenant Documents!');
    } catch (e) {
      console.error(e);
      onToast(e.message, 'error');
    }
    setLoading(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title={isTenant ? "My Deposits" : "Escrow & Deposits Ledger"} subtitle={isTenant ? "Security deposits and Last Month Rent held" : `Total Active Escrow Held: $${aggregateEscrow.toLocaleString()}`} 
        action={!isTenant && <Btn onClick={openAdd}><Plus size={15} /> Log Deposit</Btn>} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Tenant Name, Type, or Status..."
            style={{ width: '100%', padding: '9px 12px 9px 33px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🏦" title="No Escrow Records Found" body="There are no deposits logged in this ledger." action={!isTenant && <Btn onClick={openAdd}>Log New Deposit</Btn>} />
      ) : (
        <Table headers={['Deposit Type', 'Tenant / Unit', 'Amount', 'Status', '']}>
          {filtered.map((d, i) => {
            const tenant = tenants.find(t => t.id === d.tenantId);
            return (
              <TR key={d.id} idx={i}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${P.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PiggyBank size={16} color={P.gold} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{d.type}</div>
                      <div style={{ fontSize: 12, color: P.textMuted }}>{d.dateCollected || d.createdAt?.toDate().toLocaleDateString() || '--'}</div>
                    </div>
                  </div>
                </TD>
                <TD bold>{isTenant ? 'You' : (tenant ? `${tenant.name} (${tenant.unit})` : 'Unknown')}</TD>
                <TD bold style={{ color: d.status === 'Held in Escrow' ? P.success : P.text }}>${(Number(d.amount)||0).toLocaleString()}</TD>
                <TD>
                  <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, border: `1px solid ${d.status==='Held in Escrow' ? P.success+'55' : P.danger+'55'}`, color: d.status==='Held in Escrow' ? P.success : P.danger, display: 'inline-block' }}>
                    {d.status}
                  </div>
                </TD>
                <TD>
                  {!isTenant && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {d.type === 'Last Month Rent (LMR)' && d.dateCollected && (
                        <button onClick={() => handleGenerateStatement(d)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#EAF7F2', color: P.success, cursor: 'pointer' }}>Print LMR Statement</button>
                      )}
                      <button onClick={() => openEdit(d)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleDelete(d.id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', color: P.danger, cursor: 'pointer' }}>Del</button>
                    </div>
                  )}
                </TD>
              </TR>
            );
          })}
        </Table>
      )}

      {showForm && !isTenant && (
        <Modal title={editing ? 'Edit Escrow Ledger' : 'Log New Deposit'} onClose={() => setShowForm(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Tenant Account *" {...F('tenantId')} options={[{value:'', label:'Select Tenant'}, ...tenants.map(t => ({ value: t.id, label: `${t.name} (${t.unit})` }))] } />
            <Select label="Deposit Type *" {...F('type')} options={['Security Deposit', 'Last Month Rent (LMR)', 'Pet Deposit', 'Key FOB Deposit', 'Other']} />
            <Input label="Amount ($) *" type="number" {...F('amount')} placeholder="0.00" />
            <Select label="Status" {...F('status')} options={['Held in Escrow', 'Refunded', 'Applied to Missing Rent', 'Forfeited (Damages)']} />
            <Input label="Date Collected" type="date" {...F('dateCollected')} />
            <Input label="Property Notes" {...F('property')} placeholder="e.g. Cleared via Wire Transfer" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Input label="Internal Notes" {...F('notes')} placeholder="Optional details..." />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Btn variant="ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSave} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Lock Escrow Ledger'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
