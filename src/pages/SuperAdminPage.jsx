import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';
import { P, ROLE_COLORS, Btn, Modal, Input, Select, Spinner, EmptyState, Avatar, StatusBadge } from '../components/UI';
import { Shield, Users, Settings, Trash2, Edit, Plus, RefreshCw, Search, Activity, Database, Lock } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'emperorsrujal@gmail.com';

const ROLE_OPTIONS = [
  { value: 'manager',  label: 'Property Manager' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'tenant',   label: 'Tenant' },
  { value: 'owner',    label: 'Unit Owner' },
];

const STATS_ICONS = { manager: '🏢', landlord: '🏠', tenant: '👤', owner: '🔑' };

export default function SuperAdminPage({ onToast, currentUser }) {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterRole,  setFilterRole]  = useState('all');
  const [activeTab,   setActiveTab]   = useState('users');
  const [editModal,   setEditModal]   = useState(null);
  const [createModal, setCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving,      setSaving]      = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({ name: '', role: 'tenant', unit: '', property: '', superAdmin: false });

  // Create form
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '', role: 'tenant', unit: '', property: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
    } catch (e) { onToast('Failed to load users: ' + e.message, 'error'); }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  // Guard — only super admin can access
  if (currentUser?.email !== SUPER_ADMIN_EMAIL) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, textAlign: 'center' }}>
        <Lock size={48} color={P.danger} style={{ marginBottom: 16, opacity: 0.5 }} />
        <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 22, color: P.text, marginBottom: 8 }}>Access Denied</div>
        <p style={{ color: P.textMuted, fontSize: 14 }}>Only the Super Admin can access this panel.</p>
      </div>
    );
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ = u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.unit?.toLowerCase().includes(q);
    const matchR = filterRole === 'all' || u.role === filterRole;
    return matchQ && matchR;
  });

  // Stats
  const stats = {
    total:    users.length,
    managers: users.filter(u => u.role === 'manager').length,
    landlords:users.filter(u => u.role === 'landlord').length,
    tenants:  users.filter(u => u.role === 'tenant').length,
    owners:   users.filter(u => u.role === 'owner').length,
  };

  const openEdit = (u) => {
    setEditForm({ name: u.name || '', role: u.role || 'tenant', unit: u.unit || '', property: u.property || '', superAdmin: u.superAdmin || false });
    setEditModal(u);
  };

  const handleSaveEdit = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', editModal.id), {
        name:       editForm.name,
        role:       editForm.role,
        unit:       editForm.unit || null,
        property:   editForm.property || null,
        superAdmin: editForm.superAdmin,
        updatedAt:  serverTimestamp(),
      });
      setEditModal(null);
      onToast(`${editForm.name}'s profile updated.`);
      fetchUsers();
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) return onToast('Fill all required fields.', 'error');
    if (createForm.password.length < 6) return onToast('Password must be at least 6 characters.', 'error');
    setSaving(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, createForm.email, createForm.password);
      await setDoc(doc(db, 'users', user.uid), {
        name:      createForm.name,
        email:     createForm.email,
        role:      createForm.role,
        unit:      createForm.unit || null,
        property:  createForm.property || null,
        initials:  createForm.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
        superAdmin: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', role: 'tenant', unit: '', property: '' });
      onToast(`Account created for ${createForm.name}!`);
      fetchUsers();
    } catch (e) {
      onToast(e.code === 'auth/email-already-in-use' ? 'Email already registered.' : e.message, 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (u) => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'users', u.id));
      setDeleteConfirm(null);
      onToast(`${u.name}'s profile removed from Firestore. Note: Firebase Auth account remains — delete manually in Firebase Console if needed.`, 'info');
      fetchUsers();
    } catch (e) { onToast(e.message, 'error'); }
    setSaving(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole, updatedAt: serverTimestamp() });
      onToast('Role updated.');
      fetchUsers();
    } catch (e) { onToast(e.message, 'error'); }
  };

  const EF = (k) => ({ value: editForm[k],   onChange: e => setEditForm(f => ({ ...f, [k]: e.target.value })) });
  const CF = (k) => ({ value: createForm[k], onChange: e => setCreateForm(f => ({ ...f, [k]: e.target.value })) });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={17} color="#fff" />
            </div>
            <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 26, color: P.text, margin: 0 }}>Super Admin Panel</h1>
          </div>
          <p style={{ color: P.textMuted, fontSize: 13, margin: 0 }}>
            Manage all user accounts, roles, and permissions across CondoCore.
            <span style={{ marginLeft: 8, background: '#F0E6FF', color: '#7B2D8B', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>👑 {SUPER_ADMIN_EMAIL}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={fetchUsers}><RefreshCw size={14} /> Refresh</Btn>
          <Btn onClick={() => setCreateModal(true)}><Plus size={15} /> Create Account</Btn>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Users',       value: stats.total,    color: P.navyLight, icon: '👥' },
          { label: 'Managers',          value: stats.managers, color: P.gold,      icon: '🏢' },
          { label: 'Landlords',         value: stats.landlords,color: '#7EB8D4',   icon: '🏠' },
          { label: 'Tenants',           value: stats.tenants,  color: '#82C9A5',   icon: '👤' },
          { label: 'Unit Owners',       value: stats.owners,   color: '#B08FE0',   icon: '🔑' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 120, background: '#fff', borderRadius: 12, padding: '14px 16px', border: `1px solid ${P.border}`, boxShadow: '0 2px 6px rgba(11,30,61,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 22, fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: P.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: P.bg, padding: 4, borderRadius: 11, width: 'fit-content', border: `1px solid ${P.border}` }}>
        {[['users', '👥 Users'], ['activity', '📊 Overview']].map(([id, lbl]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: activeTab === id ? P.navy : 'transparent', color: activeTab === id ? '#fff' : P.textMuted, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{lbl}</button>
        ))}
      </div>

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <>
          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, unit..."
                style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif" }} />
            </div>
            {['all', 'manager', 'landlord', 'tenant', 'owner'].map(r => (
              <button key={r} onClick={() => setFilterRole(r)} style={{ padding: '9px 14px', borderRadius: 9, border: `1.5px solid ${filterRole === r ? P.navy : P.border}`, background: filterRole === r ? P.navy : '#fff', color: filterRole === r ? '#fff' : P.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>
                {r === 'all' ? 'All Roles' : r}
              </button>
            ))}
          </div>

          {loading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>
            : filtered.length === 0
              ? <EmptyState icon="👥" title="No users found" body="No accounts match your search." />
              : (
                <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden', boxShadow: '0 2px 10px rgba(11,30,61,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: P.bg }}>
                        {['User', 'Email', 'Role', 'Unit / Property', 'Status', 'Actions'].map(h => (
                          <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: `1px solid ${P.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((u, i) => {
                        const roleColor = ROLE_COLORS[u.role] || P.textMuted;
                        const isSelf    = u.id === auth.currentUser?.uid;
                        return (
                          <tr key={u.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFD' }}>
                            <td style={{ padding: '13px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar name={u.name} color={roleColor} />
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: P.text }}>{u.name || '—'}</div>
                                  {u.superAdmin && <span style={{ fontSize: 10, fontWeight: 800, color: '#7B2D8B', background: '#F0E6FF', padding: '1px 7px', borderRadius: 10 }}>👑 SUPER ADMIN</span>}
                                  {isSelf && <span style={{ fontSize: 10, fontWeight: 700, color: P.success, background: '#EAF7F2', padding: '1px 7px', borderRadius: 10, marginLeft: 4 }}>You</span>}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: 13, color: P.textMuted }}>{u.email || '—'}</td>
                            <td style={{ padding: '13px 16px' }}>
                              {/* Inline role switcher */}
                              <select value={u.role || 'tenant'} onChange={e => handleRoleChange(u.id, e.target.value)} disabled={isSelf}
                                style={{ padding: '5px 10px', borderRadius: 8, border: `1.5px solid ${roleColor}50`, background: roleColor + '15', color: roleColor, fontSize: 12, fontWeight: 700, cursor: isSelf ? 'not-allowed' : 'pointer', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '13px 16px', fontSize: 13, color: P.textMuted }}>
                              {u.unit ? `Unit ${u.unit}` : '—'}
                              {u.property && <div style={{ fontSize: 11, color: P.textMuted }}>{u.property}</div>}
                            </td>
                            <td style={{ padding: '13px 16px' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: '#EAF7F2', color: P.success }}>Active</span>
                            </td>
                            <td style={{ padding: '13px 16px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => openEdit(u)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer', color: P.text, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Edit size={12} /> Edit
                                </button>
                                {!isSelf && !u.superAdmin && (
                                  <button onClick={() => setDeleteConfirm(u)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#FDECEA', cursor: 'pointer', color: P.danger, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
        </>
      )}

      {/* ── Overview Tab ── */}
      {activeTab === 'activity' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* Role breakdown */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${P.border}`, boxShadow: '0 2px 8px rgba(11,30,61,0.05)' }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: P.text, marginBottom: 18 }}>User Role Breakdown</div>
            {[['manager','Property Managers',P.gold],['landlord','Landlords','#7EB8D4'],['tenant','Tenants','#82C9A5'],['owner','Unit Owners','#B08FE0']].map(([role, label, color]) => {
              const count = users.filter(u => u.role === role).length;
              const pct   = users.length > 0 ? Math.round(count / users.length * 100) : 0;
              return (
                <div key={role} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ color: P.text, fontWeight: 500 }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: P.border, borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent users */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, border: `1px solid ${P.border}`, boxShadow: '0 2px 8px rgba(11,30,61,0.05)' }}>
            <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: P.text, marginBottom: 18 }}>Recently Registered</div>
            {users.slice(0, 6).map(u => {
              const rc = ROLE_COLORS[u.role] || P.textMuted;
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${P.border}` }}>
                  <Avatar name={u.name} color={rc} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: P.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: rc + '18', color: rc, textTransform: 'uppercase', flexShrink: 0 }}>{u.role}</span>
                </div>
              );
            })}
          </div>

          {/* Firebase info */}
          <div style={{ background: 'linear-gradient(135deg, #0B1E3D, #1E3A6B)', borderRadius: 14, padding: 22, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Database size={18} color={P.gold} />
              <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 16, color: '#fff' }}>Firebase Project Info</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                ['Project ID',      'safe-browser-a1acf'],
                ['Firestore',       'Active'],
                ['Storage',         'Active'],
                ['Auth Providers',  'Email/Password'],
                ['Hosting',         'safe-browser-a1acf.web.app'],
                ['Super Admin',     'emperorsrujal@gmail.com'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 9, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editModal && (
        <Modal title={`Edit — ${editModal.name}`} onClose={() => setEditModal(null)}>
          <div style={{ background: P.bg, borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={editModal.name} color={ROLE_COLORS[editModal.role]} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{editModal.name}</div>
              <div style={{ fontSize: 12, color: P.textMuted }}>{editModal.email}</div>
            </div>
          </div>
          <Input label="Full Name *" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          <Select label="Role *" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} options={ROLE_OPTIONS} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Input label="Unit Number" value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. 1204" />
            <Input label="Property" value={editForm.property} onChange={e => setEditForm(f => ({ ...f, property: e.target.value }))} placeholder="e.g. Harborview" />
          </div>
          {/* Super admin toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 14px', background: editForm.superAdmin ? '#F0E6FF' : P.bg, borderRadius: 9, border: `1px solid ${editForm.superAdmin ? '#B08FE0' : P.border}`, marginBottom: 18 }}>
            <div onClick={() => setEditForm(f => ({ ...f, superAdmin: !f.superAdmin }))}
              style={{ width: 38, height: 21, borderRadius: 11, background: editForm.superAdmin ? '#7B2D8B' : P.border, position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 3, left: editForm.superAdmin ? 19 : 3, width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>👑 Super Admin</div>
              <div style={{ fontSize: 11, color: P.textMuted }}>Full system access including this panel</div>
            </div>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={() => setEditModal(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleSaveEdit} disabled={saving} style={{ flex: 2 }}>{saving ? 'Saving...' : 'Save Changes'}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Create Account Modal ── */}
      {createModal && (
        <Modal title="Create New Account" onClose={() => setCreateModal(false)}>
          <div style={{ background: '#EAF0FB', borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: P.navyLight }}>
            ℹ️ This creates a real Firebase Auth account + Firestore profile. The user can log in immediately.
          </div>
          <Input label="Full Name *" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Email Address *" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Password *" type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
          <Select label="Role *" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))} options={ROLE_OPTIONS} />
          {(createForm.role === 'tenant' || createForm.role === 'owner') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Input label="Unit Number" value={createForm.unit} onChange={e => setCreateForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. 1204" />
              <Input label="Property" value={createForm.property} onChange={e => setCreateForm(f => ({ ...f, property: e.target.value }))} placeholder="e.g. Harborview" />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setCreateModal(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleCreate} disabled={saving} style={{ flex: 2 }}>{saving ? 'Creating...' : '✓ Create Account'}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <Modal title="Remove User" onClose={() => setDeleteConfirm(null)} maxWidth={400}>
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 8 }}>Remove {deleteConfirm.name}?</div>
            <p style={{ fontSize: 13, color: P.textMuted, lineHeight: 1.6 }}>
              This removes their Firestore profile. Their Firebase Auth account remains active — delete it manually in Firebase Console if needed.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" onClick={() => setDeleteConfirm(null)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn variant="danger" onClick={() => handleDelete(deleteConfirm)} disabled={saving} style={{ flex: 2 }}>
              {saving ? 'Removing...' : 'Yes, Remove'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
