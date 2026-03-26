import { useState } from 'react';
import { User, Shield, Bell, Lock, Mail, Phone, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHOAMode } from '../contexts/HOAModeContext';
import { P, Btn, Card, Input, PageHeader, Spinner } from '../components/UI';

const ROLE_LABELS = { manager: 'Property Manager', landlord: 'Landlord', tenant: 'Tenant', owner: 'Unit Owner', super_admin: 'Super Administrator', 'super-admin': 'Super Administrator' };

export default function SettingsPage({ onToast }) {
  const { userProfile, updateUserPassword, updateProfile } = useAuth();
  const { isHOAMode, toggleMode } = useHOAMode();
  const isManager = ['manager', 'landlord', 'super_admin', 'super-admin'].includes(userProfile?.role);
  const [profileForm, setProfileForm] = useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
  });
  const [passForm, setPassForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [notifs, setNotifs] = useState({
    emailAnnounce: userProfile?.notifs?.emailAnnounce !== false,
    emailMaint: userProfile?.notifs?.emailMaint !== false,
    smsUrgent: userProfile?.notifs?.smsUrgent || false
  });
  
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass]       = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name) return onToast('Name is required.', 'error');
    setSavingProfile(true);
    try {
      const initials = profileForm.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      await updateProfile({ ...profileForm, initials });
      onToast('Profile updated successfully.');
    } catch (e) { onToast(e.message, 'error'); }
    setSavingProfile(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passForm.new !== passForm.confirm) return onToast('New passwords do not match.', 'error');
    if (passForm.new.length < 6) return onToast('Password must be at least 6 characters.', 'error');
    setSavingPass(true);
    try {
      await updateUserPassword(passForm.new);
      setPassForm({ current: '', new: '', confirm: '' });
      onToast('Password updated successfully.');
    } catch (e) { 
      if (e.code === 'auth/requires-recent-login') {
        onToast('For security, please sign out and sign back in before changing your password.', 'error');
      } else {
        onToast(e.message, 'error'); 
      }
    }
    setSavingPass(false);
  };

  const Section = ({ title, icon: Icon, children }) => (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={P.navyLight} />
        </div>
        <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, color: P.text, margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ maxWidth: 800 }}>
      <PageHeader title="Account Settings" subtitle="Manage your profile, security, and preferences" />

      {/* Profile Section */}
      <Section title="Profile Information" icon={User}>
        <Card style={{ padding: 24 }}>
          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Input label="Full Name" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email Address</label>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: `1.5px solid ${P.border}`, color: P.textMuted, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Mail size={14} /> {userProfile?.email}
                  <span style={{ fontSize: 10, background: '#E0E7FF', color: '#4338CA', padding: '2px 6px', borderRadius: 4, fontWeight: 700, marginLeft: 'auto' }}>OFFICIAL</span>
                </div>
              </div>
              <Input label="Phone Number" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. +1 555-0123" />
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Role</label>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: '#F8FAFC', border: `1.5px solid ${P.border}`, color: P.textMuted, fontSize: 14 }}>
                   {ROLE_LABELS[userProfile?.role] || userProfile?.role || 'Unknown'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn type="submit" disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Changes'}</Btn>
            </div>
          </form>
        </Card>
      </Section>

      {/* Security Section */}
      <Section title="Security" icon={Shield}>
        <Card style={{ padding: 24 }}>
          <form onSubmit={handleUpdatePassword}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <Input label="New Password" type="password" value={passForm.new} onChange={e => setPassForm(f => ({ ...f, new: e.target.value }))} placeholder="At least 6 characters" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <Input label="Confirm New Password" type="password" value={passForm.confirm} onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))} />
              </div>
            </div>
            <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 9, padding: '12px 14px', marginBottom: 20, display: 'flex', gap: 10 }}>
              <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                For your security, changing your password may require you to have logged in recently. If you receive an error, please sign out and sign back in.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn type="submit" variant="ghost" disabled={savingPass} style={{ border: `1.5px solid ${P.navy}`, color: P.navy }}>
                {savingPass ? 'Updating...' : 'Update Password'}
              </Btn>
            </div>
          </form>
        </Card>
      </Section>

      {/* Notifications Section */}
      <Section title="Notifications" icon={Bell}>
        <Card style={{ padding: '12px 0' }}>
          {[
            { id: 'emailAnnounce', label: 'Email Announcements', desc: 'Receive building-wide news and notices via email.' },
            { id: 'emailMaint',    label: 'Maintenance Updates', desc: 'Get notified when your service requests change status.' },
            { id: 'smsUrgent',     label: 'Urgent SMS Alerts',   desc: 'Critical building alerts sent directly to your phone.' },
          ].map((n, i) => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: i < 2 ? `1px solid ${P.border}` : 'none' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>{n.label}</div>
                <div style={{ fontSize: 12, color: P.textMuted }}>{n.desc}</div>
              </div>
              <div onClick={() => { const updated = { ...notifs, [n.id]: !notifs[n.id] }; setNotifs(updated); updateProfile({ notifs: updated }).catch(() => {}); }}
                style={{ width: 44, height: 24, borderRadius: 12, background: notifs[n.id] ? P.success : P.border, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 3, left: notifs[n.id] ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
              </div>
            </div>
          ))}
        </Card>
      </Section>

      {/* HOA Mode Toggle — Manager/Landlord only */}
      {isManager && (
        <Section title="Property Type" icon={Shield}>
          <Card style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>HOA / Condominium Corporation Mode</div>
                <div style={{ fontSize: 12, color: P.textMuted, marginTop: 3 }}>
                  {isHOAMode
                    ? '✓ Active — UI labels show Homeowners, HOA Dues, Work Orders'
                    : 'Inactive — Using standard Rental PM labels (Tenants, Rent)'}
                </div>
              </div>
              <div onClick={toggleMode}
                style={{ width: 52, height: 28, borderRadius: 14, background: isHOAMode ? P.navy : P.border, position: 'relative', cursor: 'pointer', transition: 'background 0.25s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 4, left: isHOAMode ? 28 : 4, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
              </div>
            </div>
          </Card>
        </Section>
      )}
    </div>
  );
}
