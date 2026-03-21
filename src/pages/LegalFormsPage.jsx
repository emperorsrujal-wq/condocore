import { useState, useEffect } from 'react';
import { FileSignature, Download, ChevronRight } from 'lucide-react';
import { subscribeTenants, uploadFile, addDocument } from '../firebase';
import { generateLegalNoticePDF } from '../utils/pdfGenerator';
import { P, Btn, Input, Select, PageHeader, Spinner } from '../components/UI';

const REGIONS = {
  ON: [
    { value: 'N4', label: 'N4 - End Tenancy for Non-payment of Rent' },
    { value: 'N12', label: 'N12 - End Tenancy for Landlord Own Use' },
    { value: 'N5', label: 'N5 - End Tenancy for Interference/Damage' },
    { value: 'L1', label: 'L1 - Application to Evict (Non-payment)' },
  ],
  BC: [
    { value: 'RTB30', label: 'RTB-30 - 10 Day Notice for Unpaid Rent' }
  ],
  AB: [
    { value: 'RTDRS', label: 'RTDRS - Notice to Vacate / Substantial Breach' }
  ]
};

export default function LegalFormsPage({ userProfile, onToast }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

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
    const unsub = subscribeTenants(data => { setTenants(data); setLoading(false); });
    return () => unsub();
  }, []);

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const handleGenerate = async () => {
    if (!form.tenantId) return onToast('Please select a tenant.', 'error');
    if (!form.province || !form.formType) return onToast('Please select province and form type.', 'error');

    setGenerating(true);
    try {
      const selectedTenant = tenants.find(t => t.id === form.tenantId);
      
      // Generate Blob
      const blob = await generateLegalNoticePDF(selectedTenant, form.province, form.formType, form, userProfile?.name);

      // Save it automatically to the tenant's Documents folder for record keeping
      const filename = `${form.formType}_Notice_${selectedTenant.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const path = `documents/${filename}`;
      const url = await uploadFile(blob, path);

      await addDocument({
        name: `${form.formType} Legal Notice`,
        type: 'Notice',
        unit: selectedTenant.unit,
        tenantId: selectedTenant.id,
        url,
        storagePath: path,
        size: (blob.size / 1024).toFixed(1) + ' KB',
        ext: 'PDF',
        uploadedBy: userProfile?.name || 'System'
      });

      // Trigger automatic local download for the Landlord to print out
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);

      onToast(`${form.formType} Form Generated and saved to Tenant's Documents!`);
    } catch (e) {
      console.error(e);
      onToast(e.message, 'error');
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
          <Select label="Select Target Tenant *" {...F('tenantId')} options={[{value:'', label:'Select Tenant'}, ...tenants.map(t => ({ value: t.id, label: `${t.name} (Unit ${t.unit})` }))]} />
          
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Select label="Province / Jurisdiction *" {...F('province')} options={[
                {value: 'ON', label: 'Ontario (LTB)'},
                {value: 'BC', label: 'British Columbia (RTB)'},
                {value: 'AB', label: 'Alberta (RTDRS)'}
              ]} 
              onChange={e => {
                const prov = e.target.value;
                setForm(f => ({ ...f, province: prov, formType: REGIONS[prov][0].value }));
              }} />
            </div>
            <div style={{ flex: 2 }}>
              <Select label="Government Form Template *" {...F('formType')} options={REGIONS[form.province]} />
            </div>
          </div>

          <div style={{ padding: 20, background: P.bg, border: `1px dashed ${P.border}`, borderRadius: 12, marginTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: P.textMuted, marginBottom: 12 }}>Dynamic Form Variables</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {(form.formType === 'N4' || form.formType === 'L1' || form.formType === 'RTB30') && (
                <Input label="Total Amount Owed ($)" {...F('amountOwed')} placeholder="0.00" type="number" />
              )}
              {form.formType === 'RTB30' && (
                <Input label="Date Rent Was Due" {...F('dateDue')} type="date" />
              )}
              {(form.formType !== 'L1') && (
                <Input label="Deadline / Termination Date" {...F('deadlineDate')} type="date" />
              )}
              {(form.formType === 'N5' || form.formType === 'RTDRS') && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Input label="Reason / Description of Breach" {...F('reason')} placeholder="Describe the damages, interference, or breach explicitly..." />
                </div>
              )}
            </div>
          </div>

          <Btn onClick={handleGenerate} disabled={generating || !form.tenantId} style={{ marginTop: 10, height: 48, fontSize: 15 }}>
            {generating ? <Spinner size={20} color="#fff" /> : <><Download size={18} /> Generate & Save Legal PDF</>}
          </Btn>
        </div>
      </div>
    </div>
  );
}
