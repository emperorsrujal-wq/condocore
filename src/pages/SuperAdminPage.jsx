import { useState, useEffect } from 'react';
import { subscribeAllUsers, updateUserRole } from '../firebase';
import { P, PageHeader, Table, TR, TD, Spinner, EmptyState, Avatar, StatusBadge } from '../components/UI';
import { Users, Shield, ShieldAlert, Key } from 'lucide-react';

export default function SuperAdminPage({ onToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAllUsers(data => {
      const sorted = [...data].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(sorted);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleRoleChange = async (uid, newRole, name) => {
    if (!confirm(`Are you sure you want to change ${name}'s role to ${newRole.toUpperCase()}?`)) return;
    try {
      await updateUserRole(uid, newRole);
      onToast(`Role updated to ${newRole}`, 'success');
    } catch (e) {
      onToast(`Failed to update role: ${e.message}`, 'error');
    }
  };

  const ROLE_COLORS = {
    'super_admin': P.danger,
    'manager': P.gold,
    'landlord': '#7EB8D4',
    'tenant': '#82C9A5',
    'owner': '#B08FE0'
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader 
        title="Super Admin Core" 
        subtitle="Master User Management & Role Escalation" 
      />

      <div style={{ background: '#FDECEA', border: `1px solid ${P.danger}30`, borderRadius: 10, padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 14, alignItems: 'center' }}>
        <ShieldAlert size={24} color={P.danger} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: P.danger, marginBottom: 2 }}>God Mode Active</div>
          <div style={{ fontSize: 13, color: '#b95147' }}>You have absolute authority to promote or demote any account in the database. Changes process in real-time.</div>
        </div>
      </div>

      <div style={{ background: P.bg, borderRadius: 12, padding: 24, border: `1px solid ${P.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Users size={18} color={P.navy} />
          <h3 style={{ margin: 0, color: P.text, fontSize: 16 }}>Registered End-Users ({users.length})</h3>
        </div>

        {users.length === 0 ? (
          <EmptyState icon="👻" title="No users found" body="The database is empty." />
        ) : (
          <Table headers={['Account', 'Contact', 'Current Role', 'Force Promotion']}>
            {users.map((u, i) => (
              <TR key={u.id} idx={i} style={{ cursor: 'default' }}>
                <TD>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={u.name} color={ROLE_COLORS[u.role] || P.navy} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: P.text }}>{u.name || 'Unnamed'}</div>
                      <div style={{ fontSize: 11, color: P.textMuted }}>ID: {u.id.substring(0,8)}...</div>
                    </div>
                  </div>
                </TD>
                <TD muted>{u.email}</TD>
                <TD>
                  <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 6, background: `${ROLE_COLORS[u.role] || P.navy}15`, color: ROLE_COLORS[u.role] || P.navy, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                    {u.role}
                  </div>
                </TD>
                <TD>
                  <select 
                    value={u.role} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value, u.name)}
                    disabled={u.email === 'emperorsrujal@gmail.com'}
                    style={{ 
                      padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${P.border}`, 
                      fontSize: 12, background: u.email === 'emperorsrujal@gmail.com' ? '#f0f0f0' : '#fff', cursor: 'pointer', outline: 'none', fontWeight: 600
                    }}
                  >
                    <option value="tenant">Demote to Tenant</option>
                    <option value="owner">Demote to Owner</option>
                    <option value="manager">Promote to Manager</option>
                    <option value="landlord">Promote to Landlord</option>
                  </select>
                </TD>
              </TR>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
