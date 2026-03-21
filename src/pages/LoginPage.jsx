import { useState } from 'react';
import { Building2, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { P } from '../components/UI';

export default function LoginPage() {
  const { login, createAccount } = useAuth();
  const [mode, setMode]         = useState('login'); // 'login' | 'register' | 'reset'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState('');

  // Register form
  const [regName,     setRegName]     = useState('');
  const [regRole,     setRegRole]     = useState('tenant');
  const [regUnit,     setRegUnit]     = useState('');
  const [regProperty, setRegProperty] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' ? 'Invalid email or password.' : err.message);
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await createAccount(email, password, {
        name: regName, role: regRole,
        unit: regUnit || null,
        property: regProperty || null,
        initials: regName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      });
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? 'This email is already registered.' : err.message);
    }
    setLoading(false);
  };

  const ROLE_INFO = [
    { role: 'manager',  label: 'Property Manager', desc: 'Full access to all properties & tenants',  color: P.gold },
    { role: 'landlord', label: 'Landlord',          desc: 'Manage your rental properties',           color: '#7EB8D4' },
    { role: 'tenant',   label: 'Tenant',            desc: 'View lease, pay rent, submit requests',   color: '#82C9A5' },
    { role: 'owner',    label: 'Unit Owner',         desc: 'Condo fees, amenities, board matters',    color: '#B08FE0' },
  ];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Left Panel */}
      <div style={{ width: '42%', background: P.navy, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 44px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(200,169,110,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 240, height: 240, borderRadius: '50%', background: 'rgba(200,169,110,0.05)' }} />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 56 }}>
            <div style={{ width: 40, height: 40, background: P.gold, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} color={P.navy} />
            </div>
            <div>
              <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, color: '#fff', fontWeight: 700 }}>CondoCore</div>
              <div style={{ fontSize: 10, color: P.gold, letterSpacing: 2, textTransform: 'uppercase' }}>Management Suite</div>
            </div>
          </div>
          <h2 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 32, color: '#fff', lineHeight: 1.25, margin: '0 0 14px' }}>
            Property management,<br /><span style={{ color: P.gold }}>simplified.</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
            One platform for managers, landlords, owners, and tenants — from leases and rent to maintenance and board meetings.
          </p>
        </div>

        <div>
          <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>User Roles</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROLE_INFO.map(r => (
              <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid rgba(255,255,255,0.08)` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, background: P.bg }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Login */}
          {mode === 'login' && (
            <>
              <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, color: P.text, margin: '0 0 6px' }}>Sign in</h1>
              <p style={{ color: P.textMuted, margin: '0 0 32px', fontSize: 14 }}>Welcome back to CondoCore</p>
              {error && <div style={{ background: '#FDECEA', border: `1px solid ${P.danger}30`, borderRadius: 10, padding: '11px 14px', marginBottom: 18, fontSize: 13, color: P.danger }}>{error}</div>}
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif", color: P.text }}
                    onFocus={e => e.target.style.borderColor = P.navyLight} onBlur={e => e.target.style.borderColor = P.border} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                      style={{ width: '100%', padding: '12px 44px 12px 14px', borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
                      onFocus={e => e.target.style.borderColor = P.navyLight} onBlur={e => e.target.style.borderColor = P.border} />
                    <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: P.textMuted }}>
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginBottom: 24 }}>
                  <button type="button" onClick={() => setMode('reset')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: P.info }}>Forgot password?</button>
                </div>
                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: loading ? P.navyLight : P.navy, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {loading ? <><span className="spinning" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} />Signing in...</> : <><Lock size={16} />Sign In</>}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 22, fontSize: 14, color: P.textMuted }}>
                Don't have an account? <button onClick={() => setMode('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.navy, fontWeight: 700, fontSize: 14 }}>Register</button>
              </div>
            </>
          )}

          {/* Register */}
          {mode === 'register' && (
            <>
              <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, color: P.text, margin: '0 0 6px' }}>Create Account</h1>
              <p style={{ color: P.textMuted, margin: '0 0 28px', fontSize: 14 }}>Join CondoCore today</p>
              {error && <div style={{ background: '#FDECEA', border: `1px solid ${P.danger}30`, borderRadius: 10, padding: '11px 14px', marginBottom: 16, fontSize: 13, color: P.danger }}>{error}</div>}
              <form onSubmit={handleRegister}>
                {[
                  { label: 'Full Name', type: 'text', val: regName, set: setRegName },
                  { label: 'Email Address', type: 'email', val: email, set: setEmail },
                  { label: 'Password', type: 'password', val: password, set: setPassword },
                ].map(({ label, type, val, set }) => (
                  <div key={label} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>{label}</label>
                    <input type={type} value={val} onChange={e => set(e.target.value)} required
                      style={{ width: '100%', padding: '11px 13px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }}
                      onFocus={e => e.target.style.borderColor = P.navyLight} onBlur={e => e.target.style.borderColor = P.border} />
                  </div>
                ))}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Role</label>
                  <select value={regRole} onChange={e => setRegRole(e.target.value)}
                    style={{ width: '100%', padding: '11px 13px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', fontFamily: "'DM Sans', sans-serif", color: P.text }}>
                    {ROLE_INFO.map(r => <option key={r.role} value={r.role}>{r.label}</option>)}
                  </select>
                </div>
                {(regRole === 'tenant' || regRole === 'owner') && (
                  <>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Unit Number</label>
                      <input type="text" value={regUnit} onChange={e => setRegUnit(e.target.value)} placeholder="e.g. 1204"
                        style={{ width: '100%', padding: '11px 13px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Property Name</label>
                      <input type="text" value={regProperty} onChange={e => setRegProperty(e.target.value)} placeholder="e.g. Harborview Condominiums"
                        style={{ width: '100%', padding: '11px 13px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
                    </div>
                  </>
                )}
                <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 8, padding: '13px', borderRadius: 11, border: 'none', background: loading ? P.navyLight : P.navy, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: P.textMuted }}>
                Already have an account? <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.navy, fontWeight: 700, fontSize: 14 }}>Sign in</button>
              </div>
            </>
          )}

          {/* Reset Password */}
          {mode === 'reset' && (
            <>
              <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 28, color: P.text, margin: '0 0 6px' }}>Reset Password</h1>
              <p style={{ color: P.textMuted, margin: '0 0 28px', fontSize: 14 }}>We'll send you a reset link</p>
              {success && <div style={{ background: '#EAF7F2', border: `1px solid ${P.success}30`, borderRadius: 10, padding: '11px 14px', marginBottom: 16, fontSize: 13, color: P.success }}>{success}</div>}
              {error && <div style={{ background: '#FDECEA', border: `1px solid ${P.danger}30`, borderRadius: 10, padding: '11px 14px', marginBottom: 16, fontSize: 13, color: P.danger }}>{error}</div>}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
              </div>
              <button onClick={async () => { setError(''); setLoading(true); try { const { resetPassword } = useAuth(); await resetPassword(email); setSuccess('Reset email sent! Check your inbox.'); } catch(e){ setError(e.message); } setLoading(false); }} disabled={loading}
                style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: P.navy, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 15, fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>
                Send Reset Email
              </button>
              <div style={{ textAlign: 'center' }}>
                <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.navy, fontWeight: 600, fontSize: 14 }}>← Back to sign in</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
