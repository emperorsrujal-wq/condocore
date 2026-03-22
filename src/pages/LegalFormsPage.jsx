import { useState, useEffect } from 'react';
import { FileSignature, Download, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { subscribeTenants, uploadFile, addDocument, subscribeDocuments, updateDocument } from '../firebase';
import { generateLegalNoticePDF } from '../utils/pdfGenerator';
import { P, Btn, Input, Select, PageHeader, Spinner } from '../components/UI';

const REGIONS = {
  // CANADA
  ON: [
    { value: 'N4', label: 'N4 - End Tenancy for Non-payment of Rent' },
    { value: 'N12', label: 'N12 - End Tenancy for Landlord Own Use' },
    { value: 'N5', label: 'N5 - End Tenancy for Interference/Damage' },
    { value: 'L1', label: 'L1 - Application to Evict (Non-payment)' },
  ],
  BC: [
    { value: 'RTB30', label: 'RTB-30 - 10 Day Notice for Unpaid Rent' },
    { value: 'RTB1', label: 'RTB-1 - Termination of Tenancy' }
  ],
  AB: [
    { value: 'RTDRS', label: 'RTDRS - Notice to Vacate / Substantial Breach' }
  ],
  QC: [
    { value: 'TAL_NP', label: 'TAL - Notice for Non-payment of Rent' },
    { value: 'TAL_REP', label: 'TAL - Notice of Repossession' }
  ],
  MB: [
    { value: 'RTB_TERM', label: 'RTB - Notice of Termination' }
  ],
  // USA
  NY: [
    { value: 'NY_14DAY', label: '14-Day Notice to Quit (Non-payment)' },
    { value: 'NY_HOLD', label: 'Holdover Proceeding Notice' }
  ],
  CA: [
    { value: 'CA_3DAY', label: '3-Day Notice to Pay or Quit' },
    { value: 'CA_30DAY', label: '30-Day Notice to Terminate Tenancy' }
  ],
  FL: [
    { value: 'FL_3DAY', label: '3-Day Notice for Non-payment' }
  ],
  TX: [
    { value: 'TX_3DAY', label: '3-Day Notice to Vacate' }
  ]
};

export default function LegalFormsPage({ userProfile, onToast }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [allDocs, setAllDocs] = useState([]);

  const [form, setForm] = useState({
    tenantId: '',
    province: 'ON',
    formType: 'N4',
    amountOwed: '',
    deadlineDate: '',
    dateDue: '',
    reason: ''
  });

  useEffect(() => {
    const unsubT = subscribeTenants(data => { setTenants(data); setLoading(false); });
    const unsubD = subscribeDocuments(data => setAllDocs(data));
    return () => { unsubT(); unsubD(); };
  }, []);

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const handleGenerate = async () => {
    if (!form.tenantId) return onToast('Please select a tenant.', 'error');
    if (!form.province || !form.formType) return onToast('Please select province and form type.', 'error');

    const selectedTenant = tenants.find(t => t.id === form.tenantId);
    if (!selectedTenant) return onToast('Selected tenant not found.', 'error');

    setGenerating(true);
    try {
      console.log('Generating PDF for:', selectedTenant.name, form.formType);

      // Generate Blob
      const blob = await generateLegalNoticePDF(selectedTenant, form.province, form.formType, form, userProfile?.name);

      if (!blob || blob.size === 0) throw new Error('Failed to generate PDF content.');

      // Generate filename for download
      const filename = `${form.formType}_Notice_${selectedTenant.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      // Trigger automatic local download
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(localUrl);
      }, 100);

      onToast(`${form.formType} Form Generated & Downloaded!`);
    } catch (e) {
      console.error('PDF Generation Error:', e);
      onToast(`Failed to generate notice: ${e.message}`, 'error');
    }
    setGenerating(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Government Forms & Legal Notices" subtitle="Auto-generate compliance templates (LTB, RTB, RTDRS) pre-filled with tenant data" />

      <div style={{ background: P.card, borderRadius: 16, padding: '32px', border: `1px solid ${P.border}`, maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${P.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSignature size={22} color={P.gold} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>Provincial Form Generator</div>
            <div style={{ fontSize: 13, color: P.textMuted }}>Select the explicit regional template required and populate the variables. It will be saved directly into the Tenant's document ledger.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Select label="Select Target Tenant *" helpText="The resident who will receive this legal notice." {...F('tenantId')} options={[{value:'', label:'Select Tenant'}, ...tenants.map(t => ({ value: t.id, label: `${t.name} (Unit ${t.unit})` }))]} />
          
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Select label="Province / Jurisdiction *" helpText="Determines the legal template used (LTB, RTB, etc.)" {...F('province')} options={[
                {value: 'ON', label: 'Ontario (LTB)'},
                {value: 'BC', label: 'British Columbia (RTB)'},
                {value: 'AB', label: 'Alberta (RTDRS)'},
                {value: 'QC', label: 'Quebec (TAL)'},
                {value: 'MB', label: 'Manitoba (RTB)'},
                {value: 'NY', label: 'New York (NYS)'},
                {value: 'CA', label: 'California (CA-HM)'},
                {value: 'FL', label: 'Florida (FL-ST)'},
                {value: 'TX', label: 'Texas (TX-ST)'}
              ]} 
              onChange={e => {
                const prov = e.target.value;
                setForm(f => ({ ...f, province: prov, formType: REGIONS[prov][0].value }));
              }} />
            </div>
            <div style={{ flex: 2 }}>
              <Select label="Government Form Template *" helpText="Select the specific government form required for this action." {...F('formType')} options={REGIONS[form.province]} />
            </div>
          </div>

          <div style={{ padding: 20, background: P.bg, border: `1px dashed ${P.border}`, borderRadius: 12, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: P.textMuted, marginBottom: 12 }}>Dynamic Form Variables</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {(form.formType === 'N4' || form.formType === 'L1' || form.formType === 'RTB30') && (
                <Input label="Total Amount Owed ($)" helpText="The total outstanding balance including utilities if applicable." {...F('amountOwed')} placeholder="0.00" type="number" />
              )}
              {form.formType === 'RTB30' && (
                <Input label="Date Rent Was Due" helpText="The specific day the payment became late." {...F('dateDue')} type="date" />
              )}
              {(form.formType !== 'L1') && (
                <Input label="Deadline / Termination Date" helpText="The date by which the tenant must comply or vacate." {...F('deadlineDate')} type="date" />
              )}
              {(form.formType === 'N5' || form.formType === 'RTDRS') && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Input label="Reason / Description of Breach" helpText="Provide specific details about the damage or interference." {...F('reason')} placeholder="Describe the damages, interference, or breach explicitly..." />
                </div>
              )}
            </div>
          </div>

          <Btn onClick={handleGenerate} disabled={generating || !form.tenantId} style={{ marginTop: 10, height: 48, fontSize: 15 }}>
            {generating ? <Spinner size={20} color="#fff" /> : <><Download size={18} /> Generate Notice (Draft)</>}
          </Btn>
        </div>
      </div>

      {/* Pending Approvals List */}
      <div style={{ marginTop: 32, maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Clock size={20} color={P.warning} />
          <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>Pending Notice Approvals</div>
        </div>

        {allDocs.filter(d => d.status === 'pending_approval' && d.type === 'Notice').length === 0 ? (
          <div style={{ padding: '24px', background: P.card, borderRadius: 16, border: `1px dashed ${P.border}`, textAlign: 'center', color: P.textMuted, fontSize: 13 }}>
            All notices have been reviewed and approved.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allDocs.filter(d => d.status === 'pending_approval' && d.type === 'Notice').map(d => (
              <div key={d.id} style={{ background: P.card, borderRadius: 14, padding: '16px 20px', border: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: P.textMuted, marginTop: 2 }}>Unit {d.unit} · Generated by {d.uploadedBy}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer', fontSize: 12, color: P.text, textDecoration: 'none' }}>Review</a>
                  <button onClick={async () => {
                    try {
                      await updateDocument(d.id, { status: 'approved' });
                      onToast('Notice approved and sent to tenant!');
                    } catch (e) { onToast(e.message, 'error'); }
                  }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: P.success, cursor: 'pointer', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                    <CheckCircle size={14} /> Approve & Send
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
