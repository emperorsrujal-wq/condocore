import { useState, useEffect } from 'react';
import { Building2, LayoutDashboard, Users, DollarSign, Wrench, FileText, Bell, Paperclip, Home, ChevronRight, Search, LogOut, X, Menu, Shield } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { getTenantByUserId } from './firebase';
import { P, ROLE_COLORS, Toast, Spinner } from './components/UI';

import LoginPage         from './pages/LoginPage';
import DashboardPage     from './pages/DashboardPage';
import TenantsPage       from './pages/TenantsPage';
import PaymentsPage      from './pages/PaymentsPage';
import MaintenancePage   from './pages/MaintenancePage';
import DocumentsPage     from './pages/DocumentsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import SuperAdminPage    from './pages/SuperAdminPage';

const SUPER_ADMIN_EMAIL = 'emperorsrujal@gmail.com';

// ─── Nav Config ───────────────────────────────────────────────────────────────
const ALL_PAGES = [
  { id: 'dashboard',     label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'tenants',       label: 'Tenants & Leases',  icon: Users },
  { id: 'rent',          label: 'Rent & Payments',   icon: DollarSign },
  { id: 'my-payments',   label: 'My Payments',        icon: DollarSign },
  { id: 'maintenance',   label: 'Maintenance',        icon: Wrench },
  { id: 'documents',     label: 'Documents',          icon: FileText },
  { id: 'my-documents',  label: 'My Documents',       icon: FileText },
  { id: 'announcements', label: 'Announcements',      icon: Paperclip },
  { id: 'super-admin',   label: 'Admin Panel',        icon: Shield },
];

const ROLE_NAV = {
  manager:  ['dashboard', 'tenants', 'rent', 'maintenance', 'documents', 'announcements'],
  landlord: ['dashboard', 'tenants', 'rent', 'maintenance', 'documents', 'announcements'],
  tenant:   ['dashboard', 'maintenance', 'my-documents', 'announcements'],
  owner:    ['dashboard', 'announcements'],
};

const ROLE_GROUPS = {
  manager: [
    { label: 'Overview',      pages: ['dashboard'] },
    { label: 'Tenants',       pages: ['tenants'] },
    { label: 'Finance',       pages: ['rent'] },
    { label: 'Operations',    pages: ['maintenance', 'documents'] },
    { label: 'Communication', pages: ['announcements'] },
    { label: 'System',        pages: ['super-admin'] },
  ],
  landlord: [
    { label: 'Overview',      pages: ['dashboard'] },
    { label: 'Tenants',       pages: ['tenants'] },
    { label: 'Finance',       pages: ['rent'] },
    { label: 'Operations',    pages: ['maintenance', 'documents'] },
    { label: 'Communication', pages: ['announcements'] },
  ],
  tenant: [
    { label: 'Home',      pages: ['dashboard'] },
    { label: 'Services',  pages: ['maintenance', 'my-documents'] },
    { label: 'Building',  pages: ['announcements'] },
  ],
  owner: [
    { label: 'Home',     pages: ['dashboard'] },
    { label: 'Building', pages: ['announcements'] },
  ],
};

const PAGE_TITLES = {
  dashboard: 'Dashboard', tenants: 'Tenants & Leases', rent: 'Rent & Payments',
  'my-payments': 'My Payments', maintenance: 'Maintenance', documents: 'Documents',
  'my-documents': 'My Documents', announcements: 'Announcements',
  'super-admin': '👑 Super Admin Panel',
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, userProfile, tab, onNavigate, collapsed, onToggle, onLogout }) {
  const roleColor = ROLE_COLORS[userProfile?.role] || P.gold;
  const groups    = ROLE_GROUPS[userProfile?.role] || [];
  const navLookup = Object.fromEntries(ALL_PAGES.map(p => [p.id, p]));

  return (
    <div style={{ width: collapsed ? 62 : 234, background: P.navy, display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', flexShrink: 0, overflow: 'hidden', boxShadow: '2px 0 12px rgba(11,30,61,0.15)', zIndex: 10 }}>

      {/* Logo */}
      <div style={{ padding: '16px 12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
          <div style={{ width: 30, height: 30, background: P.gold, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={16} color={P.navy} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 14, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>CondoCore</div>
              <div style={{ fontSize: 8, color: P.gold, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 1 }}>Management Suite</div>
            </div>
          )}
        </div>
        <button onClick={onToggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 3, borderRadius: 5, display: 'flex', flexShrink: 0 }}
          onMouseEnter={e => e.target.style.color = '#fff'} onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>
          {collapsed ? <Menu size={15} /> : <X size={15} />}
        </button>
      </div>

      {/* User pill */}
      <div style={{ padding: '8px 8px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: `1px solid ${roleColor}22` }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: roleColor + '30', border: `2px solid ${roleColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColor, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
            {userProfile?.initials || '?'}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userProfile?.name}</div>
              <div style={{ fontSize: 9, color: roleColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{userProfile?.role}</div>
            </div>
          )}
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '4px 6px', overflowY: 'auto' }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 2 }}>
            {!collapsed && <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: 1.2, padding: '8px 6px 3px' }}>{g.label}</div>}
            {collapsed && gi > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 3px' }} />}
            {g.pages.map(id => {
              const nav = navLookup[id];
              if (!nav) return null;
              // Super admin panel only visible to super admin
              if (id === 'super-admin' && user?.email !== SUPER_ADMIN_EMAIL) return null;
              const active = tab === id;
              return (
                <button key={id} onClick={() => onNavigate(id)} title={collapsed ? nav.label : ''}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 7px', borderRadius: 8, border: 'none', background: active ? P.gold : 'transparent', color: active ? P.navy : 'rgba(255,255,255,0.55)', cursor: 'pointer', marginBottom: 1, textAlign: 'left', transition: 'all 0.12s', fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 700 : 500, fontSize: 13 }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <nav.icon size={15} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nav.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '6px 6px 10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={onLogout} title="Sign out"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 7px', borderRadius: 8, border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif", transition: 'all 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,0.12)'; e.currentTarget.style.color = '#FF8A80'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
          <LogOut size={14} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
function TopBar({ userProfile, tab, onLogout }) {
  const roleColor = ROLE_COLORS[userProfile?.role] || P.gold;
  const title     = PAGE_TITLES[tab] || 'CondoCore';

  return (
    <div style={{ background: P.card, borderBottom: `1px solid ${P.border}`, padding: '0 22px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ padding: '3px 10px', borderRadius: 20, background: roleColor + '18', border: `1px solid ${roleColor}35`, fontSize: 11, fontWeight: 700, color: roleColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {userProfile?.role}
        </div>
        <div style={{ width: 1, height: 22, background: P.border }} />
        <div style={{ fontSize: 12, color: P.textMuted, fontWeight: 500 }}>{userProfile?.name}</div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const { currentUser, userProfile, loading, logout } = useAuth();
  const [tab, setTab]             = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast]         = useState(null);
  const [tenants, setTenants]     = useState([]);
  const [tenantData, setTenantData] = useState(null);

  // Load tenant data if role is tenant
  useEffect(() => {
    if (!currentUser || userProfile?.role !== 'tenant') return;
    const unsub = getTenantByUserId(currentUser.uid, data => setTenantData(data));
    return () => unsub && unsub();
  }, [currentUser, userProfile?.role]);

  // Load tenants for payment page
  useEffect(() => {
    if (!currentUser) return;
    import('./firebase').then(({ subscribeTenants }) => {
      const unsub = subscribeTenants(data => setTenants(data));
      return () => unsub();
    });
  }, [currentUser]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleLogout = async () => {
    await logout();
    setTab('dashboard');
  };

  const navigate = (id) => setTab(id);

  // Auth guard
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: P.bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, background: P.gold, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Building2 size={20} color={P.navy} />
          </div>
          <Spinner size={24} />
        </div>
      </div>
    );
  }

  if (!currentUser || !userProfile) return <LoginPage />;

  // Render current page
  const renderPage = () => {
    const props = { onToast: showToast, userProfile, tenantData, onNavigate: navigate };
    switch (tab) {
      case 'dashboard':     return <DashboardPage {...props} onNavigate={navigate} />;
      case 'tenants':       return <TenantsPage   {...props} />;
      case 'rent':          return <PaymentsPage  {...props} tenants={tenants} />;
      case 'my-payments':   return <PaymentsPage  {...props} tenants={tenants} myOnly />;
      case 'maintenance':   return <MaintenancePage {...props} />;
      case 'documents':     return <DocumentsPage  {...props} />;
      case 'my-documents':  return <DocumentsPage  {...props} />;
      case 'announcements': return <AnnouncementsPage {...props} />;
      case 'super-admin':   return <SuperAdminPage    {...props} currentUser={currentUser} />;
      default:              return <DashboardPage {...props} onNavigate={navigate} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: P.bg, fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      <Sidebar
        user={currentUser}
        userProfile={userProfile}
        tab={tab}
        onNavigate={navigate}
        collapsed={collapsed}
        onToggle={() => setCollapsed(v => !v)}
        onLogout={handleLogout}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar userProfile={userProfile} tab={tab} onLogout={handleLogout} />
        <div key={tab} className="animate-fadeIn" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {renderPage()}
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
