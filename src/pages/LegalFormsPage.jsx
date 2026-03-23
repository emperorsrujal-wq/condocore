import { useState, useEffect } from 'react';
import { FileSignature, Download, ChevronRight, CheckCircle, Clock, AlertTriangle, Shield, Scale } from 'lucide-react';
import { subscribeTenants, uploadFile, addDocument, subscribeDocuments, updateDocument } from '../firebase';
import { generateLegalNoticePDF } from '../utils/pdfGenerator';
import { P, Btn, Input, Select, PageHeader, Spinner, Modal } from '../components/UI';

// Forms requiring amountOwed field
const AMOUNT_FORMS = ['N4','L1','RTB30','NY_14DAY','CA_3DAY','FL_3DAY','TX_3DAY','IL_5DAY','PA_10DAY','OH_3DAY','GA_DEMAND','WA_14DAY','NJ_QUIT','TAL_NP','SK_NONPAY'];
// Forms requiring reason/description field
const REASON_FORMS = ['N5','RTDRS','RTB1','TAL_NP','TAL_REP','RTB_TERM','NY_HOLD','CA_30DAY','NJ_CEASE','SK_TERM','NS_QUIT','NB_TERM','IL_10DAY','WA_10DAY'];
// Forms that do NOT need deadline date (application forms)
const NO_DEADLINE_FORMS = ['L1'];

const REGIONS = {
  // ─── CANADA ───
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
  AB: [
    { value: 'RTDRS', label: 'RTDRS - Notice to Vacate / Substantial Breach (14-day)' }
  ],
  QC: [
    { value: 'TAL_NP', label: 'TAL - Notice for Non-payment of Rent' },
    { value: 'TAL_REP', label: 'TAL - Notice of Repossession (6-month notice)' }
  ],
  MB: [
    { value: 'RTB_TERM', label: 'RTB - Notice of Termination' }
  ],
  SK: [
    { value: 'SK_TERM', label: 'Notice of Termination (Saskatchewan)' },
    { value: 'SK_NONPAY', label: 'Notice for Non-payment (15-day)' }
  ],
  NS: [
    { value: 'NS_QUIT', label: 'Notice to Quit (Nova Scotia - 15-day)' }
  ],
  NB: [
    { value: 'NB_TERM', label: 'Notice to Vacate (New Brunswick)' }
  ],
  // ─── USA ───
  NY: [
    { value: 'NY_14DAY', label: '14-Day Notice to Pay Rent or Quit' },
    { value: 'NY_HOLD', label: 'Holdover Proceeding Notice (RPAPL §713)' }
  ],
  CA: [
    { value: 'CA_3DAY', label: '3-Day Notice to Pay Rent or Quit (CCP §1161)' },
    { value: 'CA_30DAY', label: '30-Day Notice to Terminate Month-to-Month (CCP §1946.1)' }
  ],
  FL: [
    { value: 'FL_3DAY', label: '3-Day Notice for Non-payment (FL Stat §83.56)' }
  ],
  TX: [
    { value: 'TX_3DAY', label: '3-Day Notice to Vacate (TX Prop Code §24.005)' }
  ],
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
  OH: [
    { value: 'OH_3DAY', label: '3-Day Notice to Leave Premises (ORC §1923.04)' }
  ],
  GA: [
    { value: 'GA_DEMAND', label: 'Demand for Possession (OCGA §44-7-50)' }
  ],
  WA: [
    { value: 'WA_14DAY', label: '14-Day Notice to Pay or Vacate (RCW 59.12.030)' },
    { value: 'WA_10DAY', label: '10-Day Notice for Lease Violation (RCW 59.12.030)' }
  ]
};

// ─── Legal Consent Modal ─────────────────────────────────────────────────────
function LegalConsentModal({ onAccept, onDecline }) {
  const [checks, setChecks] = useState({ draft: false, lawyer: false, liability: false, accuracy: false });
  const allChecked = checks.draft && checks.lawyer && checks.liability && checks.accuracy;

  const checkboxStyle = { width: 18, height: 18, accentColor: P.gold, cursor: 'pointer', flexShrink: 0, marginTop: 2 };
  const labelStyle = { fontSize: 13, color: P.text, lineHeight: 1.5, cursor: 'pointer' };

  return (
    <div className="animate-fadeIn" style={{ position: 'fixed', inset: 0, background: 'rgba(11,30,61,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20 }}>
      <div className="animate-slideUp" style={{ background: P.card, borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(11,30,61,0.4)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#1a1a2e', padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={24} color={P.gold} />
          </div>
          <div>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, color: '#fff', fontWeight: 700 }}>Legal Document Disclaimer</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Please read and acknowledge before proceeding</div>
          </div>
        </div>

        {/* Warning Banner */}
        <div style={{ margin: '20px 24px 0', padding: '14px 16px', background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={20} color="#F57F17" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: '#5D4037', lineHeight: 1.6 }}>
            <strong>Important:</strong> CondoCore generates legal document <em>templates</em> based on publicly available government forms. These are <strong>not</strong> a substitute for professional legal advice. Laws vary by jurisdiction, change frequently, and individual circumstances may require specific modifications.
          </div>
        </div>

        {/* Checkboxes */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={checks.draft} onChange={e => setChecks(c => ({ ...c, draft: e.target.checked }))} style={checkboxStyle} />
            <span style={labelStyle}>I understand that all generated documents are <strong>DRAFT templates only</strong> and are marked as such. They are not finalized legal documents until reviewed and approved.</span>
          </label>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={checks.lawyer} onChange={e => setChecks(c => ({ ...c, lawyer: e.target.checked }))} style={checkboxStyle} />
            <span style={labelStyle}>I agree to have all documents <strong>reviewed by a qualified legal professional</strong> (lawyer, paralegal, or licensed advocate) in my jurisdiction before serving them to any tenant or filing with any tribunal or court.</span>
          </label>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={checks.accuracy} onChange={e => setChecks(c => ({ ...c, accuracy: e.target.checked }))} style={checkboxStyle} />
            <span style={labelStyle}>I understand that I am <strong>solely responsible for verifying</strong> the accuracy of all information, dates, amounts, notice periods, and statutory references contained in these documents. Incorrect details may render the notice invalid.</span>
          </label>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={checks.liability} onChange={e => setChecks(c => ({ ...c, liability: e.target.checked }))} style={checkboxStyle} />
            <span style={labelStyle}>I acknowledge that <strong>CondoCore and its developers assume no liability</strong> for any legal consequences arising from the use of these generated documents. By proceeding, I accept full responsibility for their use and any outcomes.</span>
          </label>
        </div>

        {/* Separator */}
        <div style={{ borderTop: `1px solid ${P.border}`, margin: '0 24px' }} />

        {/* Actions */}
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

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LegalFormsPage({ userProfile, onToast }) {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [allDocs, setAllDocs] = useState([]);
  const [consentGiven, setConsentGiven] = useState(() => sessionStorage.getItem('legal_consent') === 'true');
  const [showConsentModal, setShowConsentModal] = useState(false);

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

  const handleGenerateClick = () => {
    if (!form.tenantId) return onToast('Please select a tenant.', 'error');
    if (!form.province || !form.formType) return onToast('Please select province and form type.', 'error');

    // If consent not yet given this session, show the modal first
    if (!consentGiven) {
      setShowConsentModal(true);
      return;
    }

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

    setGenerating(true);
    try {
      const blob = await generateLegalNoticePDF(selectedTenant, form.province, form.formType, form, userProfile?.name);
      if (!blob || blob.size === 0) throw new Error('Failed to generate PDF content.');

      const filename = `${form.formType}_Notice_${selectedTenant.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
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

      onToast(`${form.formType} Draft Notice Generated & Downloaded!`);
    } catch (e) {
      console.error('PDF Generation Error:', e);
      onToast(`Failed to generate notice: ${e.message}`, 'error');
    }
    setGenerating(false);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title="Government Forms & Legal Notices" subtitle="Auto-generate jurisdiction-specific compliance templates pre-filled with tenant data — 17 jurisdictions across Canada & USA" />

      {/* Legal Disclaimer Banner — always visible */}
      <div style={{ maxWidth: 700, marginBottom: 20, padding: '14px 18px', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 12, border: '1px solid rgba(212,175,55,0.3)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Shield size={20} color={P.gold} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.gold, marginBottom: 4 }}>Legal Notice Templates — Draft Use Only</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            All documents generated by CondoCore are <strong style={{ color: '#fff' }}>draft templates</strong> intended for review by a qualified legal professional before service.
            CondoCore does not provide legal advice. You are responsible for verifying all content, dates, amounts, and compliance with your local laws.
            {consentGiven && <span style={{ color: P.gold, marginLeft: 6 }}>✓ Consent acknowledged this session</span>}
          </div>
        </div>
      </div>

      <div style={{ background: P.card, borderRadius: 16, padding: '32px', border: `1px solid ${P.border}`, maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${P.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileSignature size={22} color={P.gold} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>Legal Form Generator</div>
            <div style={{ fontSize: 13, color: P.textMuted }}>Select jurisdiction, form type, and populate required fields. Generated documents will be watermarked as DRAFT.</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Select label="Select Target Tenant *" helpText="The resident who will receive this legal notice." {...F('tenantId')} options={[{value:'', label:'Select Tenant'}, ...tenants.map(t => ({ value: t.id, label: `${t.name} (Unit ${t.unit})` }))]} />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Select label="Province / Jurisdiction *" helpText="Determines the legal template used (LTB, RTB, etc.)" {...F('province')} options={[
                {value: '', label: '── CANADA ──', disabled: true},
                {value: 'ON', label: 'Ontario (LTB)'},
                {value: 'BC', label: 'British Columbia (RTB)'},
                {value: 'AB', label: 'Alberta (RTDRS)'},
                {value: 'QC', label: 'Quebec (TAL)'},
                {value: 'MB', label: 'Manitoba (RTB)'},
                {value: 'SK', label: 'Saskatchewan (ORT)'},
                {value: 'NS', label: 'Nova Scotia (RAT)'},
                {value: 'NB', label: 'New Brunswick (RTT)'},
                {value: '', label: '── UNITED STATES ──', disabled: true},
                {value: 'NY', label: 'New York'},
                {value: 'CA', label: 'California'},
                {value: 'FL', label: 'Florida'},
                {value: 'TX', label: 'Texas'},
                {value: 'IL', label: 'Illinois'},
                {value: 'NJ', label: 'New Jersey'},
                {value: 'PA', label: 'Pennsylvania'},
                {value: 'OH', label: 'Ohio'},
                {value: 'GA', label: 'Georgia'},
                {value: 'WA', label: 'Washington'}
              ]}
              onChange={e => {
                const prov = e.target.value;
                if (!prov || !REGIONS[prov]) return;
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
              {AMOUNT_FORMS.includes(form.formType) && (
                <Input label="Total Amount Owed ($)" helpText="The total outstanding balance including utilities if applicable." {...F('amountOwed')} placeholder="0.00" type="number" />
              )}
              {form.formType === 'RTB30' && (
                <Input label="Date Rent Was Due" helpText="The specific day the payment became late." {...F('dateDue')} type="date" />
              )}
              {form.formType === 'L1' && (
                <Input label="Date N4 Was Served" helpText="The date the N4 notice was given to the tenant." {...F('dateDue')} type="date" />
              )}
              {!NO_DEADLINE_FORMS.includes(form.formType) && (
                <Input label="Deadline / Termination Date" helpText="The date by which the tenant must comply or vacate." {...F('deadlineDate')} type="date" />
              )}
              {REASON_FORMS.includes(form.formType) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <Input label="Reason / Description of Breach" helpText="Provide specific details about the damage, interference, or violation." {...F('reason')} placeholder="Describe the damages, interference, or breach explicitly..." />
                </div>
              )}
            </div>
          </div>

          <Btn onClick={handleGenerateClick} disabled={generating || !form.tenantId} style={{ marginTop: 10, height: 48, fontSize: 15 }}>
            {generating ? <Spinner size={20} color="#fff" /> : <><Download size={18} /> Generate Draft Notice</>}
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

      {/* Consent Modal */}
      {showConsentModal && (
        <LegalConsentModal
          onAccept={handleConsentAccept}
          onDecline={() => setShowConsentModal(false)}
        />
      )}
    </div>
  );
}
