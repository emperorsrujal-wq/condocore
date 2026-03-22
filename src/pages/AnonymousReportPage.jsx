import { useState, useEffect } from 'react';
import { P, Btn, Input, Select, Spinner } from '../components/UI';
import { subscribeProperties, addMaintenanceRequest, uploadFile } from '../firebase';
import { ShieldAlert, CheckCircle2, Upload } from 'lucide-react';

export default function AnonymousReportPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    propertyId: '',
    unit: '',
    title: '',
    description: '',
    photoFile: null
  });

  useEffect(() => {
    // We can subscribe to properties without auth thanks to the new rules!
    const unsub = subscribeProperties(data => {
      const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setProperties(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.propertyId || !form.title || !form.description) {
      return setError('Please fill in Property, Title, and Description.');
    }

    setSaving(true);
    try {
      let photoUrl = null;
      if (form.photoFile) {
        const ext = form.photoFile.name.split('.').pop();
        const filename = `maintenance/anon_${Date.now()}.${ext}`;
        photoUrl = await uploadFile(form.photoFile, filename);
      }

      await addMaintenanceRequest({
        title: form.title,
        description: form.description,
        propertyId: form.propertyId,
        unit: form.unit || 'Common Area',
        photo: photoUrl,
        status: 'open',
        priority: 'medium',
        isAnonymous: true,
        tenantId: null,
        userId: null,
        reporterName: 'Anonymous Guest'
      });

      setSubmitted(true);
    } catch (e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setForm({ ...form, photoFile: e.target.files[0] });
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><Spinner size={40} /></div>;

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: P.card, borderRadius: 16, padding: 40, width: '100%', maxWidth: 440, border: `1px solid ${P.border}`, textAlign: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}>
          <CheckCircle2 size={60} color={P.success} style={{ marginBottom: 20 }} />
          <div style={{ fontSize: 24, fontWeight: 700, color: P.text, marginBottom: 10 }}>Report Submitted</div>
          <div style={{ fontSize: 14, color: P.textMuted, lineHeight: 1.5, marginBottom: 30 }}>
            Thank you for bringing this to our attention. Management has been notified and will review the issue shortly.
          </div>
          <Btn onClick={() => window.location.reload()} style={{ width: '100%' }}>Submit Another Report</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: P.card, borderRadius: 16, padding: '32px 36px', width: '100%', maxWidth: 500, border: `1px solid ${P.border}`, boxShadow: '0 12px 32px rgba(0,0,0,0.1)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `${P.gold}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} color={P.gold} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: P.text }}>Public Issue Report</div>
            <div style={{ fontSize: 13, color: P.textMuted }}>No account required. Report building or unit issues directly to management.</div>
          </div>
        </div>

        {error && <div style={{ background: '#FDECEA', color: P.danger, padding: '12px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <Select label="Property / Building *" value={form.propertyId} onChange={e => setForm({...form, propertyId: e.target.value})} options={[{value:'', label:'Select Building...'}, ...properties.map(p => ({ value: p.id, label: p.name }))]} />
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Unit (Optional)" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="e.g. 4B" />
            </div>
          </div>
          
          <Input label="Issue Title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Hallway light out on 3rd floor" />
          
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: P.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description *</div>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Please provide specific details..."
              style={{ width: '100%', height: 100, padding: 12, borderRadius: 10, border: `1.5px solid ${P.border}`, background: P.bg, color: P.text, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, border: `1.5px dashed ${P.border}`, background: P.bg, cursor: 'pointer', transition: 'all 0.2s' }}>
            <Upload size={18} color={P.navy} />
            <div style={{ flex: 1, fontSize: 13, color: form.photoFile ? P.text : P.textMuted, fontWeight: form.photoFile ? 600 : 400 }}>
              {form.photoFile ? form.photoFile.name : 'Attach a Photo (Optional)'}
            </div>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          </label>

          <Btn type="submit" disabled={saving} style={{ marginTop: 10, height: 44, fontSize: 15 }}>
            {saving ? 'Submitting Report...' : 'Submit Issue Anonymously'}
          </Btn>
        </form>

      </div>
    </div>
  );
}
