import { useState, useEffect } from 'react';
import { Send, Mail, Users, Building2, Clock, Trash2, Eye, FileText, Search, ChevronDown, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { subscribeTenants, subscribeProperties, subscribeAllUsers, addEmail, subscribeEmails, deleteEmail, createNotification } from '../firebase';
import { P, Btn, PageHeader, Card, Modal, Input, Select, Textarea, Spinner, EmptyState, Table, TR, TD, StatusBadge, ConfirmModal } from '../components/UI';

// ─── Email Templates ────────────────────────────────────────────────────────
const EMAIL_TEMPLATES = {
  rent_reminder: {
    label: 'Rent Reminder',
    subject: 'Rent Payment Reminder — {month}',
    body: `Dear {name},

This is a friendly reminder that your rent payment of {amount} for {unit} is due on {dueDate}.

Please ensure your payment is submitted on time to avoid any late fees. If you have already made the payment, please disregard this notice.

Payment Methods:
- Online portal
- Direct bank transfer
- Cheque (payable to property management)

If you have any questions or need to discuss payment arrangements, please don't hesitate to reach out.

Thank you,
{sender}
Property Management`,
    fields: ['amount', 'dueDate', 'month']
  },
  maintenance_update: {
    label: 'Maintenance Update',
    subject: 'Maintenance Update — {title}',
    body: `Dear {name},

We would like to update you regarding the maintenance request: {title}.

Status: {status}
Details: {details}

If you have any questions or concerns, please reply to this email or contact the management office.

Thank you for your patience,
{sender}
Property Management`,
    fields: ['title', 'status', 'details']
  },
  welcome: {
    label: 'Welcome New Tenant',
    subject: 'Welcome to {property} — Move-In Information',
    body: `Dear {name},

Welcome to {property}! We're excited to have you as a new resident in Unit {unit}.

Here are some important details for your move-in:

Move-In Date: {moveInDate}
Key Pickup: Please visit the management office during business hours.

Building Amenities:
- Lobby hours: 24/7
- Gym/Fitness Center
- Party Room (booking required)
- Visitor Parking

Important Contacts:
- Management Office: Available during business hours
- Emergency Maintenance: For urgent after-hours issues

Please review your lease agreement and building rules. If you have any questions, don't hesitate to reach out.

Welcome home!
{sender}
Property Management`,
    fields: ['moveInDate']
  },
  general_notice: {
    label: 'General Notice',
    subject: '{subject}',
    body: `Dear {name},

{message}

If you have any questions, please contact the management office.

Regards,
{sender}
Property Management`,
    fields: ['subject', 'message']
  },
  lease_renewal: {
    label: 'Lease Renewal',
    subject: 'Lease Renewal Notice — Unit {unit}',
    body: `Dear {name},

Your current lease for Unit {unit} at {property} is set to expire on {expiryDate}.

We would like to offer you the opportunity to renew your lease. Please review the following renewal terms:

New Lease Term: {newTerm}
New Monthly Rent: {newRent}

Please confirm your intention to renew by {deadline}. If you do not wish to renew, please provide written notice as per your lease agreement.

We value you as a tenant and hope to continue this relationship.

Thank you,
{sender}
Property Management`,
    fields: ['expiryDate', 'newTerm', 'newRent', 'deadline']
  },
  violation_notice: {
    label: 'Violation Notice',
    subject: 'Bylaw Violation Notice — {violationType}',
    body: `Dear {name},

This letter is to inform you of a bylaw violation observed at your unit ({unit}):

Violation: {violationType}
Date Observed: {dateObserved}
Details: {violationDetails}

Please take corrective action within {correctionDays} days of receiving this notice. Failure to comply may result in further action as outlined in the building bylaws.

If you believe this notice was issued in error, please contact the management office to discuss.

Regards,
{sender}
Property Management`,
    fields: ['violationType', 'dateObserved', 'violationDetails', 'correctionDays']
  },
  event_invitation: {
    label: 'Event / Meeting Invitation',
    subject: 'You\'re Invited — {eventName}',
    body: `Dear {name},

You are invited to the following event:

Event: {eventName}
Date: {eventDate}
Time: {eventTime}
Location: {eventLocation}

{eventDetails}

Please RSVP by {rsvpDate} if you plan to attend.

We look forward to seeing you there!

Best regards,
{sender}
Property Management`,
    fields: ['eventName', 'eventDate', 'eventTime', 'eventLocation', 'eventDetails', 'rsvpDate']
  },
  custom: {
    label: 'Custom Email',
    subject: '',
    body: '',
    fields: []
  }
};

const FIELD_LABELS = {
  amount: 'Rent Amount ($)',
  dueDate: 'Due Date',
  month: 'Month (e.g. April 2026)',
  title: 'Request Title',
  status: 'Current Status',
  details: 'Update Details',
  moveInDate: 'Move-In Date',
  subject: 'Email Subject',
  message: 'Email Message',
  expiryDate: 'Lease Expiry Date',
  newTerm: 'New Lease Term (e.g. 12 months)',
  newRent: 'New Monthly Rent ($)',
  deadline: 'Renewal Deadline',
  violationType: 'Violation Type',
  dateObserved: 'Date Observed',
  violationDetails: 'Violation Details',
  correctionDays: 'Days to Correct',
  eventName: 'Event Name',
  eventDate: 'Event Date',
  eventTime: 'Event Time',
  eventLocation: 'Location',
  eventDetails: 'Event Details',
  rsvpDate: 'RSVP Deadline'
};

// ─── Main Component ─────────────────────────────────────────────────────────
const SUPER_ROLES = ['super_admin', 'super-admin'];
const MANAGER_ROLES = ['manager', 'landlord', ...SUPER_ROLES];

export default function EmailPage({ userProfile, onToast }) {
  const [tenants, setTenants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = SUPER_ROLES.includes(userProfile?.role);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [recipientMode, setRecipientMode] = useState('individual'); // individual | property | all
  const [selectedTenantIds, setSelectedTenantIds] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [template, setTemplate] = useState('general_notice');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateFields, setTemplateFields] = useState({});
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // View state
  const [viewEmail, setViewEmail] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [tab, setTab] = useState('compose'); // compose | sent

  // Load data
  useEffect(() => {
    const unsubs = [
      subscribeTenants(data => { setTenants(data); setLoading(false); }),
      subscribeProperties(data => setProperties(data)),
      subscribeEmails(data => setEmails(data))
    ];
    // Super admin also loads all users so they can email anyone
    if (isSuperAdmin) {
      unsubs.push(subscribeAllUsers(data => setAllUsers(data)));
    }
    return () => unsubs.forEach(u => u && u());
  }, [isSuperAdmin]);

  // When template changes, populate subject and body
  useEffect(() => {
    if (template === 'custom') {
      setSubject('');
      setBody('');
      setTemplateFields({});
      return;
    }
    const tpl = EMAIL_TEMPLATES[template];
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
      setTemplateFields({});
    }
  }, [template]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  // For manager/landlord: only tenants and owners (from tenants collection)
  const activeTenants = tenants.filter(t => t.status !== 'inactive' && t.email);

  // For super admin: all users from users collection (managers, landlords, tenants, owners)
  const allActiveUsers = isSuperAdmin
    ? allUsers.filter(u => u.email && u.id !== userProfile?.uid).map(u => ({
        ...u,
        // Normalize fields so the rest of the code works uniformly
        userId: u.id,
        unit: u.unit || tenants.find(t => t.userId === u.id)?.unit || '',
        property: u.property || tenants.find(t => t.userId === u.id)?.property || '',
        propertyId: u.propertyId || tenants.find(t => t.userId === u.id)?.propertyId || '',
      }))
    : [];

  // The recipient pool depends on the role
  const recipientPool = isSuperAdmin ? allActiveUsers : activeTenants;

  const getRecipients = () => {
    if (recipientMode === 'all') return recipientPool;
    if (recipientMode === 'property') return recipientPool.filter(t => t.propertyId === selectedPropertyId || t.property === properties.find(p => p.id === selectedPropertyId)?.name);
    return recipientPool.filter(t => selectedTenantIds.includes(t.id));
  };

  const fillTemplate = (text, tenant) => {
    let filled = text;
    filled = filled.replace(/\{name\}/g, tenant.name || 'Resident');
    filled = filled.replace(/\{unit\}/g, tenant.unit || '');
    filled = filled.replace(/\{property\}/g, tenant.property || '');
    filled = filled.replace(/\{sender\}/g, userProfile?.name || 'Management');
    // Fill custom template fields
    Object.entries(templateFields).forEach(([key, val]) => {
      filled = filled.replace(new RegExp(`\\{${key}\\}`, 'g'), val || `[${key}]`);
    });
    return filled;
  };

  const resetCompose = () => {
    setRecipientMode('individual');
    setSelectedTenantIds([]);
    setSelectedPropertyId('');
    setTemplate('general_notice');
    setSubject('');
    setBody('');
    setTemplateFields({});
    setShowPreview(false);
    setSearchTerm('');
  };

  // ─── Send Emails ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const recipients = getRecipients();
    if (recipients.length === 0) {
      onToast('Please select at least one recipient with an email address.', 'error');
      return;
    }
    if (!subject.trim()) {
      onToast('Please enter a subject line.', 'error');
      return;
    }
    if (!body.trim()) {
      onToast('Please enter an email body.', 'error');
      return;
    }

    setSending(true);
    try {
      // For each recipient, open mailto and log in Firestore
      const emailRecords = [];
      for (const tenant of recipients) {
        const filledSubject = fillTemplate(subject, tenant);
        const filledBody = fillTemplate(body, tenant);
        emailRecords.push({
          to: tenant.email,
          toName: tenant.name,
          recipientId: tenant.id,
          recipientRole: tenant.role || 'tenant',
          unit: tenant.unit || '',
          property: tenant.property || '',
          subject: filledSubject,
          body: filledBody,
          template: template,
          sentBy: userProfile?.uid || userProfile?.name,
          sentByName: userProfile?.name || 'Manager',
          status: 'sent'
        });
      }

      // Batch — open mailto for up to 10, then use BCC for bulk
      if (recipients.length === 1) {
        const r = recipients[0];
        const filledSubject = fillTemplate(subject, r);
        const filledBody = fillTemplate(body, r);
        const mailto = `mailto:${r.email}?subject=${encodeURIComponent(filledSubject)}&body=${encodeURIComponent(filledBody)}`;
        window.open(mailto, '_blank');
      } else {
        // For bulk: open one email with BCC list
        const allEmails = recipients.map(r => r.email).join(',');
        const sampleSubject = fillTemplate(subject, recipients[0]);
        const sampleBody = fillTemplate(body, recipients[0]).replace(/Dear .+,/, 'Dear Resident,');
        const mailto = `mailto:?bcc=${encodeURIComponent(allEmails)}&subject=${encodeURIComponent(sampleSubject)}&body=${encodeURIComponent(sampleBody)}`;
        window.open(mailto, '_blank');
      }

      // Log each email record in Firestore
      for (const record of emailRecords) {
        await addEmail(record);
      }

      // Create in-app notifications for recipients
      for (const tenant of recipients) {
        if (tenant.userId) {
          await createNotification({
            userId: tenant.userId,
            title: 'New Email from Management',
            body: fillTemplate(subject, tenant),
            link: 'messages'
          });
        }
      }

      onToast(`Email sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}! Your email client will open to complete delivery.`, 'success');
      resetCompose();
      setShowCompose(false);
      setTab('sent');
    } catch (err) {
      console.error('Email send error:', err);
      onToast('Failed to send email. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteEmail(id);
    setConfirmDelete(null);
    onToast('Email record deleted.');
  };

  // ─── Filtered recipients for selection ──────────────────────────────────
  const filteredTenants = searchTerm
    ? recipientPool.filter(t =>
        (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.unit || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.property || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.role || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : recipientPool;

  const toggleTenant = (id) => {
    setSelectedTenantIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const allIds = filteredTenants.map(t => t.id);
    const allSelected = allIds.every(id => selectedTenantIds.includes(id));
    if (allSelected) {
      setSelectedTenantIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedTenantIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  // ─── Template fields ─────────────────────────────────────────────────────
  const currentTemplate = EMAIL_TEMPLATES[template];
  const templateFieldKeys = currentTemplate?.fields || [];

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner size={28} /></div>;

  // ─── Stats ────────────────────────────────────────────────────────────────
  const totalSent = emails.length;
  const thisMonth = emails.filter(e => {
    const d = e.createdAt?.toDate ? e.createdAt.toDate() : null;
    if (!d) return false;
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div>
      <PageHeader
        title="Email"
        subtitle="Send emails to tenants, owners, and residents"
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={() => { resetCompose(); setShowCompose(true); }}>
              <Mail size={15} /> Compose Email
            </Btn>
          </div>
        }
      />

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: P.card, borderRadius: 14, padding: '18px 22px', border: `1px solid ${P.border}`, flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>Total Sent</div>
          <div style={{ fontSize: 28, fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: P.text }}>{totalSent}</div>
        </div>
        <div style={{ background: P.card, borderRadius: 14, padding: '18px 22px', border: `1px solid ${P.border}`, flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>This Month</div>
          <div style={{ fontSize: 28, fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: P.info }}>{thisMonth}</div>
        </div>
        <div style={{ background: P.card, borderRadius: 14, padding: '18px 22px', border: `1px solid ${P.border}`, flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>{isSuperAdmin ? 'All Users' : 'Active Recipients'}</div>
          <div style={{ fontSize: 28, fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: P.success }}>{recipientPool.length}</div>
        </div>
        <div style={{ background: P.card, borderRadius: 14, padding: '18px 22px', border: `1px solid ${P.border}`, flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>Properties</div>
          <div style={{ fontSize: 28, fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: P.gold }}>{properties.length}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(EMAIL_TEMPLATES).filter(([k]) => k !== 'custom').map(([key, tpl]) => (
          <button key={key} onClick={() => { resetCompose(); setTemplate(key); setShowCompose(true); }}
            style={{ padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${P.border}`, background: P.card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: P.text, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = P.gold; e.currentTarget.style.background = P.gold + '10'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.background = P.card; }}>
            <Mail size={14} color={P.gold} />
            {tpl.label}
          </button>
        ))}
      </div>

      {/* Sent Emails History */}
      <Card>
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: P.text }}>Sent Emails</div>
          <div style={{ fontSize: 12, color: P.textMuted }}>{emails.length} email{emails.length !== 1 ? 's' : ''}</div>
        </div>

        {emails.length === 0 ? (
          <EmptyState icon={<Mail size={48} />} title="No emails sent yet" body="Compose your first email to get started." />
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: P.bg }}>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: `1px solid ${P.border}` }}>Recipient</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: `1px solid ${P.border}` }}>Subject</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: `1px solid ${P.border}` }}>Property</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: `1px solid ${P.border}` }}>Date</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: `1px solid ${P.border}` }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email, idx) => {
                  const date = email.createdAt?.toDate ? email.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                  const time = email.createdAt?.toDate ? email.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <tr key={email.id} style={{ background: idx % 2 === 0 ? P.card : '#FAFBFD', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#EDF1FA'}
                      onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? P.card : '#FAFBFD'}>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>{email.toName || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: P.textMuted }}>{email.to}</div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: P.text, maxWidth: 280 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.subject}</div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: P.textMuted }}>
                        {email.property || '—'}{email.unit ? ` (${email.unit})` : ''}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontSize: 13, color: P.text }}>{date}</div>
                        <div style={{ fontSize: 11, color: P.textMuted }}>{time}</div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setViewEmail(email)} title="View"
                            style={{ background: P.info + '15', color: P.info, border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Eye size={14} />
                          </button>
                          <button onClick={() => setConfirmDelete(email.id)} title="Delete"
                            style={{ background: P.danger + '15', color: P.danger, border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ─── Compose Modal ──────────────────────────────────────────────────── */}
      {showCompose && (
        <div className="animate-fadeIn" style={{ position: 'fixed', inset: 0, background: 'rgba(11,30,61,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="animate-slideUp" style={{ background: P.card, borderRadius: 18, width: '100%', maxWidth: 720, boxShadow: '0 20px 60px rgba(11,30,61,0.3)', overflow: 'hidden', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ background: P.navy, padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Mail size={18} color={P.gold} />
                <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, color: '#fff' }}>
                  {showPreview ? 'Preview Email' : 'Compose Email'}
                </span>
              </div>
              <button onClick={() => { setShowCompose(false); resetCompose(); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
              {!showPreview ? (
                <>
                  {/* Step 1: Template Selection */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.navy, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: P.gold, color: P.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>1</div>
                      Choose Template
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(EMAIL_TEMPLATES).map(([key, tpl]) => (
                        <button key={key} onClick={() => setTemplate(key)}
                          style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${template === key ? P.gold : P.border}`, background: template === key ? P.gold + '15' : P.card, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: template === key ? P.navy : P.textMuted, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s' }}>
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Recipients */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.navy, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: P.gold, color: P.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>2</div>
                      Select Recipients
                    </div>

                    {/* Mode toggle */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      {[
                        { value: 'individual', label: 'Individual', icon: <Users size={13} /> },
                        { value: 'property', label: 'By Property', icon: <Building2 size={13} /> },
                        { value: 'all', label: isSuperAdmin ? 'All Users' : 'All Tenants', icon: <Mail size={13} /> }
                      ].map(m => (
                        <button key={m.value} onClick={() => { setRecipientMode(m.value); setSelectedTenantIds([]); setSelectedPropertyId(''); }}
                          style={{ padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${recipientMode === m.value ? P.navy : P.border}`, background: recipientMode === m.value ? P.navy : P.card, color: recipientMode === m.value ? '#fff' : P.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>

                    {recipientMode === 'property' && (
                      <Select label="Select Property" value={selectedPropertyId} onChange={e => setSelectedPropertyId(e.target.value)} required
                        options={[{ value: '', label: '— Choose property —' }, ...properties.map(p => ({ value: p.id, label: p.name }))]} />
                    )}

                    {recipientMode === 'individual' && (
                      <div>
                        <div style={{ position: 'relative', marginBottom: 10 }}>
                          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: P.textMuted }} />
                          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, email, unit, or property..."
                            style={{ width: '100%', padding: '10px 14px 10px 34px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif", color: P.text, background: P.card, boxSizing: 'border-box' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: P.textMuted }}>{selectedTenantIds.length} selected</span>
                          <button onClick={selectAllFiltered} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: P.info, fontWeight: 600 }}>
                            {filteredTenants.every(t => selectedTenantIds.includes(t.id)) ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>

                        <div style={{ maxHeight: 180, overflowY: 'auto', border: `1px solid ${P.border}`, borderRadius: 10, background: '#FAFBFD' }}>
                          {filteredTenants.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: P.textMuted }}>No tenants found</div>
                          ) : filteredTenants.map(t => {
                            const selected = selectedTenantIds.includes(t.id);
                            return (
                              <div key={t.id} onClick={() => toggleTenant(t.id)}
                                style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: `1px solid ${P.border}`, background: selected ? P.gold + '12' : 'transparent', transition: 'background 0.1s' }}
                                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#EDF1FA'; }}
                                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>
                                <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${selected ? P.gold : P.border}`, background: selected ? P.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                  {selected && <CheckCircle size={14} color="#fff" />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{t.name}</span>
                                    {t.role && (
                                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: 0.3,
                                        background: t.role === 'manager' ? P.gold + '20' : t.role === 'landlord' ? '#7EB8D420' : t.role === 'owner' ? '#B08FE020' : '#82C9A520',
                                        color: t.role === 'manager' ? P.goldDark : t.role === 'landlord' ? '#5A9AB5' : t.role === 'owner' ? '#8B6EC0' : '#5AAF82'
                                      }}>{t.role}</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11, color: P.textMuted }}>{t.email}{t.property ? ` — ${t.property}` : ''}{t.unit ? ` Unit ${t.unit}` : ''}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {recipientMode === 'all' && (
                      <div style={{ padding: 14, background: P.gold + '10', borderRadius: 10, border: `1px solid ${P.gold}30`, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Mail size={16} color={P.gold} />
                        <span style={{ fontSize: 13, color: P.text }}>
                          {isSuperAdmin
                            ? <>Email will be sent to <strong>{recipientPool.length}</strong> user{recipientPool.length !== 1 ? 's' : ''} (managers, landlords, tenants, and owners)</>
                            : <>Email will be sent to <strong>{recipientPool.length}</strong> active tenant{recipientPool.length !== 1 ? 's' : ''} and owner{recipientPool.length !== 1 ? 's' : ''} across all properties</>
                          }
                        </span>
                      </div>
                    )}

                    {/* Recipient count badge */}
                    {getRecipients().length > 0 && (
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: P.success, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} />
                        {getRecipients().length} recipient{getRecipients().length !== 1 ? 's' : ''} selected
                      </div>
                    )}
                  </div>

                  {/* Step 3: Template Fields */}
                  {templateFieldKeys.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: P.navy, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: P.gold, color: P.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>3</div>
                        Fill Template Details
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: templateFieldKeys.length > 2 ? '1fr 1fr' : '1fr', gap: '0 16px' }}>
                        {templateFieldKeys.map(field => {
                          const isLong = ['details', 'message', 'violationDetails', 'eventDetails'].includes(field);
                          if (isLong) {
                            return (
                              <div key={field} style={{ gridColumn: '1 / -1' }}>
                                <Textarea label={FIELD_LABELS[field] || field} value={templateFields[field] || ''} onChange={e => setTemplateFields(prev => ({ ...prev, [field]: e.target.value }))} rows={3} />
                              </div>
                            );
                          }
                          const isDate = field.toLowerCase().includes('date');
                          return (
                            <Input key={field} label={FIELD_LABELS[field] || field} type={isDate ? 'date' : 'text'} value={templateFields[field] || ''} onChange={e => setTemplateFields(prev => ({ ...prev, [field]: e.target.value }))} />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Subject & Body */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.navy, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: P.gold, color: P.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{templateFieldKeys.length > 0 ? '4' : '3'}</div>
                      Compose Message
                    </div>
                    <Input label="Subject" value={subject} onChange={e => setSubject(e.target.value)} required placeholder="Email subject line..." />
                    <Textarea label="Body" value={body} onChange={e => setBody(e.target.value)} rows={10} helpText="Use {name}, {unit}, {property}, {sender} as placeholders" />
                  </div>
                </>
              ) : (
                /* ─── Preview Mode ──────────────────────────────────────────── */
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Recipients ({getRecipients().length})</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {getRecipients().slice(0, 10).map(r => (
                        <span key={r.id} style={{ padding: '4px 10px', borderRadius: 20, background: P.navy + '10', fontSize: 12, color: P.navy, fontWeight: 500 }}>
                          {r.name} ({r.email})
                        </span>
                      ))}
                      {getRecipients().length > 10 && (
                        <span style={{ padding: '4px 10px', borderRadius: 20, background: P.gold + '20', fontSize: 12, color: P.goldDark, fontWeight: 600 }}>
                          +{getRecipients().length - 10} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ background: '#FAFBFD', borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${P.border}`, background: P.bg }}>
                      <div style={{ fontSize: 11, color: P.textMuted, marginBottom: 4 }}>SUBJECT</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>
                        {fillTemplate(subject, getRecipients()[0] || { name: 'John Doe', unit: '101', property: 'Sample Property' })}
                      </div>
                    </div>
                    <div style={{ padding: '18px 18px', fontSize: 14, color: P.text, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {fillTemplate(body, getRecipients()[0] || { name: 'John Doe', unit: '101', property: 'Sample Property' })}
                    </div>
                  </div>

                  {getRecipients().length > 1 && (
                    <div style={{ marginTop: 14, padding: 12, background: '#FFF9E6', borderRadius: 10, border: `1.5px solid ${P.warning}40`, fontSize: 12, color: '#D45B00', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.4 }}>
                      <AlertTriangle size={16} flexShrink={0} />
                      <div>
                        <strong>Bulk Email Limitation:</strong> Because this email is sent via your default email client (BCC), individual personalization (like unit numbers or rent amounts) will be disabled. All recipients will see the same message.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div style={{ padding: '14px 24px', borderTop: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: P.bg, flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: P.textMuted }}>
                {getRecipients().length > 0 ? `${getRecipients().length} recipient${getRecipients().length > 1 ? 's' : ''}` : 'No recipients selected'}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {showPreview ? (
                  <>
                    <Btn variant="ghost" onClick={() => setShowPreview(false)}>Back to Edit</Btn>
                    <Btn onClick={handleSend} disabled={sending}>
                      {sending ? <><Spinner size={14} /> Sending...</> : <><Send size={14} /> Send Email</>}
                    </Btn>
                  </>
                ) : (
                  <>
                    <Btn variant="ghost" onClick={() => { setShowCompose(false); resetCompose(); }}>Cancel</Btn>
                    <Btn variant="ghost" onClick={() => setShowPreview(true)} disabled={getRecipients().length === 0 || !subject.trim()}>
                      <Eye size={14} /> Preview
                    </Btn>
                    <Btn onClick={handleSend} disabled={sending || getRecipients().length === 0 || !subject.trim()}>
                      {sending ? <><Spinner size={14} /> Sending...</> : <><Send size={14} /> Send</>}
                    </Btn>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── View Email Modal ──────────────────────────────────────────────── */}
      {viewEmail && (
        <Modal title="Email Details" onClose={() => setViewEmail(null)} maxWidth={600}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>To</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>{viewEmail.toName}</div>
                <div style={{ fontSize: 12, color: P.textMuted }}>{viewEmail.to}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Sent By</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>{viewEmail.sentByName || 'Manager'}</div>
                <div style={{ fontSize: 12, color: P.textMuted }}>
                  {viewEmail.createdAt?.toDate ? viewEmail.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
                  {' at '}
                  {viewEmail.createdAt?.toDate ? viewEmail.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
              </div>
              {viewEmail.property && (
                <div>
                  <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Property</div>
                  <div style={{ fontSize: 14, color: P.text }}>{viewEmail.property}{viewEmail.unit ? ` — Unit ${viewEmail.unit}` : ''}</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Template</div>
                <div style={{ fontSize: 14, color: P.text }}>{EMAIL_TEMPLATES[viewEmail.template]?.label || viewEmail.template || 'Custom'}</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#FAFBFD', borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${P.border}`, background: P.bg }}>
              <div style={{ fontSize: 11, color: P.textMuted, marginBottom: 4 }}>SUBJECT</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{viewEmail.subject}</div>
            </div>
            <div style={{ padding: '18px 18px', fontSize: 14, color: P.text, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {viewEmail.body}
            </div>
          </div>

          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn variant="ghost" onClick={() => {
              // Resend — pre-fill compose
              setTemplate(viewEmail.template || 'custom');
              setSubject(viewEmail.subject);
              setBody(viewEmail.body);
              setRecipientMode('individual');
              const tenant = tenants.find(t => t.id === viewEmail.tenantId);
              if (tenant) setSelectedTenantIds([tenant.id]);
              setViewEmail(null);
              setShowCompose(true);
            }}>
              <RefreshCw size={14} /> Resend
            </Btn>
            <Btn variant="ghost" onClick={() => setViewEmail(null)}>Close</Btn>
          </div>
        </Modal>
      )}

      {/* ─── Confirm Delete ────────────────────────────────────────────────── */}
      {confirmDelete && (
        <ConfirmModal
          message="Delete this email record? This cannot be undone."
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
