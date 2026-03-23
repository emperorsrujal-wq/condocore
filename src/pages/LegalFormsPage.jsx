import { useState, useEffect } from 'react';
import { FileSignature, Download, CheckCircle, Clock, AlertTriangle, Shield, Scale, Info, Building2 } from 'lucide-react';
import { subscribeTenants, subscribeProperties, subscribeDocuments, updateDocument } from '../firebase';
import { generateLegalNoticePDF } from '../utils/pdfGenerator';
import { P, Btn, Input, Select, PageHeader, Spinner, Modal } from '../components/UI';

// ─── Form metadata: explainer, copies required, service method ───────────────
const FORM_INFO = {
  // ONTARIO
  N4:   { copies: 2, explain: 'Notifies a tenant that they owe rent and must pay within 14 days or vacate. The notice is void if paid in full before the termination date.', service: 'Serve personally, by mail (+5 days), or slide under door.' },
  N12:  { copies: 2, explain: 'Used when the landlord or a purchaser needs the unit for personal residential use. Requires 60 days notice and one month rent compensation.', service: 'Serve personally or by mail (+5 days). Must end on last day of rental period.' },
  N5:   { copies: 2, explain: 'Addresses tenant interference, damage, or overcrowding. First N5 gives 7 days to correct the issue. A second N5 within 6 months cannot be voided.', service: 'Serve personally, by mail (+5 days), or slide under door.' },
  L1:   { copies: 3, explain: 'Application filed with the Landlord and Tenant Board (LTB) to evict for non-payment after an N4 has been served. Must be filed within 30 days of termination date.', service: 'File with LTB. Serve copy to tenant. Keep one copy.' },
  // BC
  RTB30:{ copies: 2, explain: 'Gives tenant 10 days to pay overdue rent or vacate. Tenant has 5 days to dispute through the Residential Tenancy Branch.', service: 'Serve personally. Keep proof of service.' },
  RTB1: { copies: 2, explain: 'General notice to end a tenancy with at least one month notice. Reason must be specified per BC Residential Tenancy Act.', service: 'Serve personally or by registered mail.' },
  // ALBERTA
  RTDRS:{ copies: 2, explain: 'Notice for substantial breach of tenancy. 14-day notice period. Tenant can dispute through RTDRS or Provincial Court.', service: 'Serve personally or by registered mail.' },
  // QUEBEC
  TAL_NP:  { copies: 2, explain: 'Formal demand for unpaid rent. Landlord may apply to TAL for lease resiliation if rent is unpaid for more than 3 weeks per Civil Code art. 1971.', service: 'Serve by registered mail or bailiff.' },
  TAL_REP: { copies: 2, explain: 'Notice of repossession for landlord personal use. Must be given at least 6 months before lease expiry. Tenant has 1 month to respond.', service: 'Serve by registered mail or bailiff.' },
  // MANITOBA
  RTB_TERM:{ copies: 2, explain: 'General termination notice under Manitoba Residential Tenancies Act. Notice period varies by reason.', service: 'Serve personally or by registered mail.' },
  // SASKATCHEWAN
  SK_TERM:   { copies: 2, explain: 'General tenancy termination notice. Reason and applicable notice period must be specified per Saskatchewan RTA.', service: 'Serve personally or by registered mail.' },
  SK_NONPAY: { copies: 2, explain: 'Gives tenant 15 days to pay arrears of rent or vacate. Can be disputed through the Office of Residential Tenancies.', service: 'Serve personally or by registered mail.' },
  // NOVA SCOTIA
  NS_QUIT: { copies: 2, explain: 'Notice to quit for non-payment (15 days) or breach. Notice period varies by reason under NS Residential Tenancies Act.', service: 'Serve personally, by registered mail, or post on door.' },
  // NEW BRUNSWICK
  NB_TERM: { copies: 2, explain: 'Notice to vacate under NB Residential Tenancies Act. Must specify reason and comply with required notice period.', service: 'Serve personally or by registered mail.' },
  // NEW YORK
  NY_14DAY:{ copies: 2, explain: 'Demands payment of overdue rent within 14 days or surrender of premises. Required before filing a summary proceeding under RPAPL Article 7.', service: 'Serve personally or by "nail and mail" (affix to door + mail copy).' },
  NY_HOLD: { copies: 2, explain: 'Initiates holdover proceedings when a tenant stays past lease expiration without consent. Filed under RPAPL §713.', service: 'Serve personally or by substituted service per court rules.' },
  // CALIFORNIA
  CA_3DAY: { copies: 2, explain: 'Demands rent payment within 3 days or tenant must quit. Only unpaid rent can be included — no late fees or utilities per CCP §1161(2).', service: 'Serve personally, by substituted service, or post and mail.' },
  CA_30DAY:{ copies: 2, explain: 'Terminates month-to-month tenancy with 30 days notice (60 days if tenant occupied for 1+ year). Just cause required under AB 1482 for covered properties.', service: 'Serve personally or by mail (+extra days for mailing).' },
  // FLORIDA
  FL_3DAY: { copies: 2, explain: 'Gives tenant 3 business days (excluding weekends/holidays) to pay rent or vacate per FL Statutes §83.56(3).', service: 'Serve personally, by mail, or post on premises.' },
  // TEXAS
  TX_3DAY: { copies: 2, explain: 'Gives tenant 3 days to vacate for non-payment per TX Property Code §24.005. The 3-day minimum applies unless the lease specifies otherwise.', service: 'Serve personally, by mail, or post on inside of main entry door.' },
  // ILLINOIS
  IL_5DAY: { copies: 2, explain: 'Demands rent within 5 days or lease is terminated per 735 ILCS 5/9-209. Landlord may recover possession, rent, and attorney fees.', service: 'Serve personally or by certified/registered mail.' },
  IL_10DAY:{ copies: 2, explain: 'Gives tenant 10 days to cure a lease violation. If not cured, lease is terminated per 735 ILCS 5/9-210.', service: 'Serve personally or by certified/registered mail.' },
  // NEW JERSEY
  NJ_QUIT: { copies: 2, explain: 'Demand for rent payment. NJ requires court order for eviction — no self-help. Month-to-month requires one full month notice.', service: 'Serve personally or by certified mail with return receipt.' },
  NJ_CEASE:{ copies: 2, explain: 'Orders tenant to stop a lease violation immediately. If the violation continues, landlord may serve Notice to Quit under NJSA 2A:18-61.1(c).', service: 'Serve personally or by certified mail with return receipt.' },
  // PENNSYLVANIA
  PA_10DAY:{ copies: 2, explain: 'Gives tenant 10 days for non-payment (30 days for leases of 1+ year) per 68 PS §250.501(b). Filed with Magisterial District Judge.', service: 'Serve personally or by certified mail.' },
  PA_15DAY:{ copies: 2, explain: 'Terminates month-to-month tenancy with 15 days notice under Pennsylvania Landlord and Tenant Act.', service: 'Serve personally or by certified mail.' },
  // OHIO
  OH_3DAY: { copies: 2, explain: 'Gives tenant 3 days to leave premises for non-payment per ORC §1923.04. Filed as forcible entry and detainer in Municipal Court.', service: 'Serve personally, by leaving at residence, or by certified mail.' },
  // GEORGIA
  GA_DEMAND:{ copies: 2, explain: 'Demand for immediate possession. Georgia requires only a demand (no waiting period) before filing a dispossessory proceeding in Magistrate Court.', service: 'Serve personally or by leaving at residence with a person of suitable age.' },
  // WASHINGTON
  WA_14DAY:{ copies: 2, explain: 'Gives tenant 14 days to pay rent or vacate per RCW 59.18.057. Tenant may have additional protections under local ordinances.', service: 'Serve personally, by leaving with person of suitable age, or post and mail.' },
  WA_10DAY:{ copies: 2, explain: 'Gives tenant 10 days to cure a lease violation or vacate per RCW 59.12.030(4).', service: 'Serve personally or by post and mail.' }
};

// Forms requiring amountOwed field
const AMOUNT_FORMS = ['N4','L1','RTB30','NY_14DAY','CA_3DAY','FL_3DAY','TX_3DAY','IL_5DAY','PA_10DAY','OH_3DAY','GA_DEMAND','WA_14DAY','NJ_QUIT','TAL_NP','SK_NONPAY'];
// Forms requiring reason/description field
const REASON_FORMS = ['N5','RTDRS','RTB1','TAL_NP','TAL_REP','RTB_TERM','NY_HOLD','CA_30DAY','NJ_CEASE','SK_TERM','NS_QUIT','NB_TERM','IL_10DAY','WA_10DAY'];
// Forms that do NOT need deadline date
const NO_DEADLINE_FORMS = ['L1'];

const REGIONS = {
  ON: [
    { value: 'N4', label: 'N4 - End Tenancy for Non-payment (14-day notice)' },
    { value: 'N12', label: 'N12 - End Tenancy for Landlord Own Use (60-day notice)' },
    { value: 'N5', label: 'N5 - End Tenancy for Interference/Damage (20-day notice)' },
    { value: 'L1', label: 'L1 - Application to LTB to Evict (Non-payment)' },
  ],
  BC: [
    { value: 'RTB30', label: 'RTB-30 - 10 Day Notice for Unpaid Rent' },
    { value: 'RTB1', label: 'RTB-1 - Termination of Tenancy (1 month notice)' }
  ],
  AB: [{ value: 'RTDRS', label: 'RTDRS - Notice to Vacate / Substantial Breach (14-day)' }],
  QC: [
    { value: 'TAL_NP', label: 'TAL - Notice for Non-payment of Rent' },
    { value: 'TAL_REP', label: 'TAL - Notice of Repossession (6-month notice)' }
  ],
  MB: [{ value: 'RTB_TERM', label: 'RTB - Notice of Termination' }],
  SK: [
    { value: 'SK_TERM', label: 'Notice of Termination (Saskatchewan)' },
    { value: 'SK_NONPAY', label: 'Notice for Non-payment (15-day)' }
  ],
  NS: [{ value: 'NS_QUIT', label: 'Notice to Quit (Nova Scotia - 15-day)' }],
  NB: [{ value: 'NB_TERM', label: 'Notice to Vacate (New Brunswick)' }],
  NY: [
    { value: 'NY_14DAY', label: '14-Day Notice to Pay Rent or Quit' },
    { value: 'NY_HOLD', label: 'Holdover Proceeding Notice (RPAPL §713)' }
  ],
  CA: [
    { value: 'CA_3DAY', label: '3-Day Notice to Pay Rent or Quit (CCP §1161)' },
    { value: 'CA_30DAY', label: '30-Day Notice to Terminate Month-to-Month (CCP §1946.1)' }
  ],
  FL: [{ value: 'FL_3DAY', label: '3-Day Notice for Non-payment (FL Stat §83.56)' }],
  TX: [{ value: 'TX_3DAY', label: '3-Day Notice to Vacate (TX Prop Code §24.005)' }],
  IL: [
    { value: 'IL_5DAY', label: '5-Day Notice to Pay Rent or Quit (735 ILCS 5/9-209)' },
    { value: 'IL_10DAY', label: '10-Day Notice for Lease Violation (735 ILCS 5/9-210)' }
  ],
  NJ: [
    { value: 'NJ_QUIT', label: 'Notice to Quit for Non-payment (NJSA 2A:18-61.2)' },
    { value: 'NJ_CEASE', label: 'Notice to Cease (Lease Violation)' }
  ],
  PA: [
    { value: 'PA_10DAY', label: '10-Day Notice for Non-payment (68 PS §250.501)' },
    { value: 'PA_15DAY', label: '15-Day Notice to Quit (Month-to-Month)' }
  ],
  OH: [{ value: 'OH_3DAY', label: '3-Day Notice to Leave Premises (ORC §1923.04)' }],
  GA: [{ value: 'GA_DEMAND', label: 'Demand for Possession (OCGA §44-7-50)' }],
  WA: [
    { value: 'WA_14DAY', label: '14-Day Notice to Pay or Vacate (RCW 59.12.030)' },
    { value: 'WA_10DAY', label: '10-Day Notice for Lease Violation (RCW 59.12.030)' }
  ]
};

const PROVINCE_LABELS = {
  ON: 'Ontario (LTB)', BC: 'British Columbia (RTB)', AB: 'Alberta (RTDRS)', QC: 'Quebec (TAL)',
  MB: 'Manitoba (RTB)', SK: 'Saskatchewan (ORT)', NS: 'Nova Scotia', NB: 'New Brunswick',
  NY: 'New York', CA: 'California', FL: 'Florida', TX: 'Texas', IL: 'Illinois',
  NJ: 'New Jersey', PA: 'Pennsylvania', OH: 'Ohio', GA: 'Georgia', WA: 'Washington'
};

// ─── Legal Consent Modal ─────────────────────────────────────────────────────
function LegalConsentModal({ onAccept, onDecline }) {
  const [checks, setChecks] = useState({ draft: false, lawyer: false, liability: false, accuracy: false });
  const allChecked = checks.draft && checks.lawyer && checks.liability && checks.accuracy;
  const cbs = { width: 18, height: 18, accentColor: P.gold, cursor: 'pointer', flexShrink: 0, marginTop: 2 };
  const ls = { fontSize: 13, color: P.text, lineHeight: 1.5, cursor: 'pointer' };

  return (
    <div className="animate-fadeIn" style={{ position: 'fixed', inset: 0, background: 'rgba(11,30,61,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20 }}>
      <div className="animate-slideUp" style={{ background: P.card, borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(11,30,61,0.4)', overflow: 'hidden' }}>
        <div style={{ background: '#1a1a2e', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={24} color={P.gold} />
          </div>
          <div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, color: '#fff', fontWeight: 700 }}>Legal Document Disclaimer</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Please read and acknowledge before proceeding</div>
          </div>
        </div>
        <div style={{ margin: '20px 24px 0', padding: '14px 16px', background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={20} color="#F57F17" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: '#5D4037', lineHeight: 1.6 }}>
            <strong>Important:</strong> CondoCore generates legal document <em>templates</em> based on publicly available government forms. These are <strong>not</strong> a substitute for professional legal advice.
          </div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={checks.draft} onChange={e => setChecks(c => ({ ...c, draft: e.target.checked }))} style={cbs} />
            <span style={ls}>I understand that all generated documents are <strong>DRAFT templates only</strong> and are marked as such.</span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={checks.lawyer} onChange={e => setChecks(c => ({ ...c, lawyer: e.target.checked }))} style={cbs} />
            <span style={ls}>I agree to have all documents <strong>reviewed by a qualified legal professional</strong> before serving them to any tenant.</span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={checks.accuracy} onChange={e => setChecks(c => ({ ...c, accuracy: e.target.checked }))} style={cbs} />
            <span style={ls}>I am <strong>solely responsible for verifying</strong> the accuracy of all information, dates, amounts, and statutory references.</span>
          </label>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={checks.liability} onChange={e => setChecks(c => ({ ...c, liability: e.target.checked }))} style={cbs} />
            <span style={ls}><strong>CondoCore assumes no liability</strong> for any legal consequences arising from the use of these documents.</span>
          </label>
        </div>
        <div style={{ borderTop: `1px solid ${P.border}`, margin: '0 24px' }} />
        <div style={{ padding: '16px 24px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={onDecline} style={{ fontSize: 13 }}>I Do Not Agree</Btn>
          <Btn onClick={onAccept} disabled={!allChecked} style={{ fontSize: 13, opacity: allChecked ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={16} /> I Understand & Accept
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Form Explainer Card ─────────────────────────────────────────────────────
function FormExplainer({ formType }) {
  const info = FORM_INFO[formType];
  if (!info) return null;
  return (
    <div style={{ padding: '14px 16px', background: '#F0F4FF', border: '1px solid #C5D3F0', borderRadius: 10, marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
        <Info size={16} color={P.navyLight} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12.5, color: P.text, lineHeight: 1.6 }}>{info.explain}</div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: P.navyLight, textTransform: 'uppercase', letterSpacing: 0.5 }}>Copies Required:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: P.text, background: '#E8EDF5', padding: '2px 8px', borderRadius: 6 }}>
            {info.copies === 2 ? '2 copies (landlord + tenant)' : '3 copies (LTB + landlord + tenant)'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: P.navyLight, textTransform: 'uppercase', letterSpacing: 0.5 }}>Service:</span>
          <span style={{ fontSize: 11.5, color: P.textMuted }}>{info.service}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LegalFormsPage({ userProfile, onToast }) {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [allDocs, setAllDocs] = useState([]);
  const [consentGiven, setConsentGiven] = useState(() => sessionStorage.getItem('legal_consent') === 'true');
  const [showConsentModal, setShowConsentModal] = useState(false);

  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [detectedProvince, setDetectedProvince] = useState('');

  const [form, setForm] = useState({
    tenantId: '',
    province: '',
    formType: '',
    amountOwed: '',
    deadlineDate: '',
    dateDue: '',
    reason: ''
  });

  useEffect(() => {
    let loaded = { t: false, p: false, d: false };
    const checkDone = () => { if (loaded.t && loaded.p && loaded.d) setLoading(false); };
    const unsubT = subscribeTenants(data => { setTenants(data); loaded.t = true; checkDone(); });
    const unsubP = subscribeProperties(data => { setProperties(data); loaded.p = true; checkDone(); });
    const unsubD = subscribeDocuments(data => { setAllDocs(data); loaded.d = true; checkDone(); });
    return () => { unsubT(); unsubP(); unsubD(); };
  }, []);

  // When property is selected, auto-set province and filter tenants
  const handlePropertyChange = (propId) => {
    setSelectedPropertyId(propId);
    const prop = properties.find(p => p.id === propId);
    if (prop?.province && REGIONS[prop.province]) {
      setDetectedProvince(prop.province);
      setForm(f => ({
        ...f,
        province: prop.province,
        formType: REGIONS[prop.province][0].value,
        tenantId: '' // reset tenant
      }));
    } else {
      setDetectedProvince('');
      setForm(f => ({ ...f, province: '', formType: '', tenantId: '' }));
    }
  };

  // Filter tenants by selected property
  const filteredTenants = selectedPropertyId
    ? tenants.filter(t => t.propertyId === selectedPropertyId || t.property === properties.find(p => p.id === selectedPropertyId)?.name)
    : tenants;

  const F = (k) => ({ value: form[k], onChange: e => setForm(f => ({ ...f, [k]: e.target.value })) });

  const handleGenerateClick = () => {
    if (!form.tenantId) return onToast('Please select a tenant.', 'error');
    if (!form.province || !form.formType) return onToast('Please select jurisdiction and form type.', 'error');
    if (!consentGiven) { setShowConsentModal(true); return; }
    doGenerate();
  };

  const handleConsentAccept = () => {
    setConsentGiven(true);
    sessionStorage.setItem('legal_consent', 'true');
    setShowConsentModal(false);
    doGenerate();
  };

  const doGenerate = async () => {
    const selectedTenant = tenants.find(t => t.id === form.tenantId);
    if (!selectedTenant) return onToast('Selected tenant not found.', 'error');

    // Enrich tenant with property address for PDF
    const prop = properties.find(p => p.id === selectedPropertyId);
    const enrichedTenant = {
      ...selectedTenant,
      address: prop?.address || selectedTenant.address || '',
      propertyAddress: prop?.address || ''
    };

    setGenerating(true);
    try {
      const blob = await generateLegalNoticePDF(enrichedTenant, form.province, form.formType, form, userProfile?.name);
      if (!blob || blob.size === 0) throw new Error('Failed to generate PDF content.');
      const copies = FORM_INFO[form.formType]?.copies || 2;
      const filename = `${form.formType}_Notice_${selectedTenant.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(localUrl); }, 100);
      onToast(`${form.formType} Draft Generated! Print ${copies} copies.`);
    } catch (e) {
      console.error('PDF Generation Error:', e);
      onToast(`Failed to generate notice: ${e.message}`, 'error');
    }
    setGenerating(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  const currentForms = form.province && REGIONS[form.province] ? REGIONS[form.province] : [];

  return (
    <div>
      <PageHeader title="Government Forms & Legal Notices" subtitle="Auto-generate jurisdiction-specific compliance templates pre-filled with tenant data" />

      {/* Legal Disclaimer Banner */}
      <div style={{ maxWidth: 720, marginBottom: 20, padding: '14px 18px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 12, border: '1px solid rgba(212,175,55,0.3)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Shield size={20} color={P.gold} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.gold, marginBottom: 4 }}>Draft Templates — Legal Review Required</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            All documents are draft templates. You must have them reviewed by a qualified legal professional before service.
            {consentGiven && <span style={{ color: P.gold, marginLeft: 6 }}>✓ Consent acknowledged</span>}
          </div>
        </div>
      </div>

      <div style={{ background: P.card, borderRadius: 16, padding: '32px', border: `1px solid ${P.border}`, maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${P.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSignature size={22} color={P.gold} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>Legal Form Generator</div>
            <div style={{ fontSize: 13, color: P.textMuted }}>Select a property to auto-detect jurisdiction, then choose the form type and fill in details.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Step 1: Select Property */}
          <div style={{ padding: '16px 18px', background: P.bg, borderRadius: 12, border: `1px solid ${P.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: P.gold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={14} /> Step 1 — Select Property
            </div>
            <Select
              label="Property / Building *"
              helpText="The jurisdiction will be auto-detected from the property's province/state."
              value={selectedPropertyId}
              onChange={e => handlePropertyChange(e.target.value)}
              options={[
                { value: '', label: 'Select a property...' },
                ...properties.map(p => ({ value: p.id, label: `${p.name}${p.province ? ` (${p.province})` : ''} — ${p.address || 'No address'}` }))
              ]}
            />
            {detectedProvince && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#E8F5E9', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <CheckCircle size={16} color={P.success} />
                <span style={{ color: '#1B5E20', fontWeight: 600 }}>Jurisdiction auto-detected: <strong>{PROVINCE_LABELS[detectedProvince] || detectedProvince}</strong></span>
              </div>
            )}
            {selectedPropertyId && !detectedProvince && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#FFF8E1', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <AlertTriangle size={16} color="#F57F17" />
                <span style={{ color: '#5D4037' }}>No province/state set for this property. Please update it in <strong>Property Portfolio</strong> or select jurisdiction manually below.</span>
              </div>
            )}
          </div>

          {/* Step 2: Tenant + Form Type */}
          <div style={{ padding: '16px 18px', background: P.bg, borderRadius: 12, border: `1px solid ${P.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: P.gold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileSignature size={14} /> Step 2 — Tenant & Form
            </div>

            <Select
              label="Select Tenant *"
              helpText={selectedPropertyId ? `Showing tenants for selected property (${filteredTenants.length} found)` : 'Select a property first to filter tenants'}
              {...F('tenantId')}
              options={[
                { value: '', label: selectedPropertyId ? 'Select Tenant...' : '— Select a property first —' },
                ...filteredTenants.map(t => ({ value: t.id, label: `${t.name} (Unit ${t.unit})` }))
              ]}
            />

            {/* Show province selector only if not auto-detected */}
            {!detectedProvince && (
              <Select
                label="Province / Jurisdiction *"
                helpText="Select manually since property has no province set."
                value={form.province}
                onChange={e => {
                  const prov = e.target.value;
                  if (!prov || !REGIONS[prov]) return;
                  setForm(f => ({ ...f, province: prov, formType: REGIONS[prov][0].value }));
                }}
                options={[
                  { value: '', label: 'Select jurisdiction...' },
                  { value: '', label: '── CANADA ──', disabled: true },
                  ...['ON','BC','AB','QC','MB','SK','NS','NB'].map(k => ({ value: k, label: PROVINCE_LABELS[k] })),
                  { value: '', label: '── UNITED STATES ──', disabled: true },
                  ...['NY','CA','FL','TX','IL','NJ','PA','OH','GA','WA'].map(k => ({ value: k, label: PROVINCE_LABELS[k] }))
                ]}
              />
            )}

            {currentForms.length > 0 && (
              <Select
                label="Government Form Template *"
                helpText="Select the specific legal notice required."
                {...F('formType')}
                options={currentForms}
              />
            )}

            {/* Form Explainer */}
            {form.formType && <FormExplainer formType={form.formType} />}
          </div>

          {/* Step 3: Form Variables */}
          {form.formType && (
            <div style={{ padding: '16px 18px', background: P.bg, borderRadius: 12, border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.gold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Step 3 — Form Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {AMOUNT_FORMS.includes(form.formType) && (
                  <Input label="Total Amount Owed ($)" helpText="The total outstanding balance." {...F('amountOwed')} placeholder="0.00" type="number" />
                )}
                {form.formType === 'RTB30' && (
                  <Input label="Date Rent Was Due" helpText="The day the payment became late." {...F('dateDue')} type="date" />
                )}
                {form.formType === 'L1' && (
                  <Input label="Date N4 Was Served" helpText="The date the N4 was given to the tenant." {...F('dateDue')} type="date" />
                )}
                {!NO_DEADLINE_FORMS.includes(form.formType) && (
                  <Input label="Deadline / Termination Date" helpText="The date the tenant must comply or vacate." {...F('deadlineDate')} type="date" />
                )}
                {REASON_FORMS.includes(form.formType) && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Input label="Reason / Description of Breach" helpText="Specific details about the violation." {...F('reason')} placeholder="Describe the damages, interference, or breach..." />
                  </div>
                )}
              </div>
            </div>
          )}

          <Btn onClick={handleGenerateClick} disabled={generating || !form.tenantId || !form.formType} style={{ marginTop: 6, height: 48, fontSize: 15 }}>
            {generating ? <Spinner size={20} color="#fff" /> : <><Download size={18} /> Generate Draft Notice</>}
          </Btn>
        </div>
      </div>

      {/* Pending Approvals */}
      <div style={{ marginTop: 32, maxWidth: 720 }}>
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
                    try { await updateDocument(d.id, { status: 'approved' }); onToast('Notice approved!'); }
                    catch (e) { onToast(e.message, 'error'); }
                  }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: P.success, cursor: 'pointer', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                    <CheckCircle size={14} /> Approve & Send
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showConsentModal && (
        <LegalConsentModal onAccept={handleConsentAccept} onDecline={() => setShowConsentModal(false)} />
      )}
    </div>
  );
}
