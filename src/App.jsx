import { useState, useEffect } from 'react';
import { Building2, LayoutDashboard, Users, DollarSign, Wrench, FileText, Bell, Paperclip, Home, ChevronRight, Search, LogOut, X, Menu, Shield, PieChart, MessageSquare, Key, Package, AlertTriangle, PiggyBank, ClipboardList, Banknote, BookOpen, Calendar, UserPlus, Mail } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { getTenantByUserId, subscribeTenants } from './firebase';
import { P, ROLE_COLORS, Toast, Spinner } from './components/UI';
import { useLanguage } from './contexts/LanguageContext';
import { useHOAMode } from './contexts/HOAModeContext';

import LoginPage         from './pages/LoginPage';
import DashboardPage     from './pages/DashboardPage';
import TenantsPage       from './pages/TenantsPage';
import PaymentsPage      from './pages/PaymentsPage';
import MaintenancePage   from './pages/MaintenancePage';
import DocumentsPage     from './pages/DocumentsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import SuperAdminPage    from './pages/SuperAdminPage';
import PropertiesPage    from './pages/PropertiesPage';
import SettingsPage      from './pages/SettingsPage';
import ReportsPage       from './pages/ReportsPage';
import MessagesPage      from './pages/MessagesPage';
import KeysPage          from './pages/KeysPage';
import PackagesPage      from './pages/PackagesPage';
import DepositsPage      from './pages/DepositsPage';
import LegalFormsPage    from './pages/LegalFormsPage';
import EvictionsPage     from './pages/EvictionsPage';
import ViolationsPage    from './pages/ViolationsPage';
import ReserveFundPage   from './pages/ReserveFundPage';
import BoardMeetingsPage from './pages/BoardMeetingsPage';
import SpecialAssessmentsPage from './pages/SpecialAssessmentsPage';
import AnonymousReportPage from './pages/AnonymousReportPage';
import VendorsPage from './pages/VendorsPage';
import RegistryPage from './pages/RegistryPage';
import MyPropertyPage from './pages/MyPropertyPage';
import AmenityBookingPage from './pages/AmenityBookingPage';
import VisitorManagementPage from './pages/VisitorManagementPage';
import EmailPage from './pages/EmailPage';
import NotificationsMenu from './components/NotificationsMenu';

const SUPER_ADMIN_EMAIL = 'emperorsrujal@gmail.com';

// ─── Nav Config ───────────────────────────────────────────────────────────────
const ALL_PAGES = [
  { id: 'dashboard',     label: 'dashboard',        icon: LayoutDashboard },
  { id: 'properties',    label: 'properties',       icon: Building2 },
  { id: 'tenants',       label: 'tenants',          icon: Users },
  { id: 'rent',          label: 'rent',             icon: DollarSign },
  { id: 'my-payments',   label: 'my_payments',      icon: DollarSign },
  { id: 'deposits',      label: 'deposits',         icon: DollarSign },
  { id: 'maintenance',   label: 'maintenance',      icon: Wrench },
  { id: 'documents',     label: 'documents',        icon: FileText },
  { id: 'my-documents',  label: 'my_documents',     icon: FileText },
  { id: 'announcements', label: 'announcements',    icon: Paperclip },
  { id: 'messages',      label: 'messages',         icon: MessageSquare },
  { id: 'keys',          label: 'keys_access',      icon: Key },
  { id: 'packages',      label: 'packages',         icon: Package },
  { id: 'vendors',       label: 'vendors',          icon: Users },
  { id: 'registry',      label: 'registry',         icon: BookOpen },
  { id: 'legal-forms',   label: 'legal_forms',      icon: FileText },
  { id: 'evictions',     label: 'evictions',        icon: Shield },
  { id: 'violations',    label: 'violations',       icon: AlertTriangle },
  { id: 'reserve-fund',  label: 'reserve_fund',     icon: PiggyBank },
  { id: 'board-meetings', label: 'board_meetings',   icon: ClipboardList },
  { id: 'assessments',   label: 'assessments',      icon: Banknote },
  { id: 'reports',       label: 'reports',          icon: PieChart },
  { id: 'settings',      label: 'settings',         icon: Shield },
  { id: 'amenity-bookings', label: 'amenities',      icon: Calendar },
  { id: 'visitor-management', label: 'visitors',      icon: UserPlus },
  { id: 'email',           label: 'email',            icon: Mail },
  { id: 'my-property',    label: 'my_property',      icon: Home },
  { id: 'super-admin',   label: 'admin_panel',      icon: Shield },
];

const ROLE_NAV = {
  manager:  ['dashboard', 'properties', 'tenants', 'rent', 'maintenance', 'documents', 'announcements', 'messages', 'email', 'reports', 'settings', 'vendors', 'registry', 'amenity-bookings', 'visitor-management'],
  landlord: ['dashboard', 'properties', 'tenants', 'rent', 'maintenance', 'documents', 'announcements', 'messages', 'email', 'reports', 'settings', 'vendors', 'registry', 'amenity-bookings', 'visitor-management'],
  tenant:   ['dashboard', 'maintenance', 'my-documents', 'announcements', 'messages', 'settings', 'amenity-bookings', 'visitor-management'],
  owner:    ['dashboard', 'maintenance', 'my-property', 'announcements', 'messages', 'settings', 'amenity-bookings', 'visitor-management'],
  super_admin: ['dashboard', 'properties', 'tenants', 'rent', 'maintenance', 'documents', 'announcements', 'messages', 'email', 'reports', 'settings', 'vendors', 'registry', 'amenity-bookings', 'visitor-management', 'super-admin'],
  'super-admin': ['dashboard', 'properties', 'tenants', 'rent', 'maintenance', 'documents', 'announcements', 'messages', 'email', 'reports', 'settings', 'vendors', 'registry', 'amenity-bookings', 'visitor-management', 'super-admin'],
};

const ROLE_GROUPS = {
  manager: [
    { label: 'overview',      pages: ['dashboard'] },
    { label: 'tenants',       pages: ['tenants', 'properties'] },
    { label: 'finance',       pages: ['rent', 'deposits', 'reserve-fund', 'assessments', 'reports'] },
    { label: 'operations',    pages: ['maintenance', 'vendors', 'registry', 'legal-forms', 'evictions', 'violations', 'board-meetings', 'keys', 'packages', 'documents'] },
    { label: 'communication', pages: ['messages', 'email', 'announcements', 'amenity-bookings', 'visitor-management'] },
    { label: 'account',       pages: ['settings'] },
    { label: 'system',        pages: ['super-admin'] },
  ],
  landlord: [
    { label: 'overview',      pages: ['dashboard'] },
    { label: 'tenants',       pages: ['tenants', 'properties'] },
    { label: 'finance',       pages: ['rent', 'deposits', 'reserve-fund', 'assessments', 'reports'] },
    { label: 'operations',    pages: ['maintenance', 'vendors', 'registry', 'legal-forms', 'evictions', 'violations', 'board-meetings', 'keys', 'packages', 'documents'] },
    { label: 'communication', pages: ['messages', 'email', 'announcements', 'amenity-bookings', 'visitor-management'] },
    { label: 'account',       pages: ['settings'] },
  ],
  tenant: [
    { label: 'home',      pages: ['dashboard'] },
    { label: 'finance',   pages: ['my-payments', 'deposits'] },
    { label: 'services',  pages: ['maintenance', 'packages', 'my-documents'] },
    { label: 'building',  pages: ['messages', 'announcements', 'amenity-bookings', 'visitor-management'] },
    { label: 'account',   pages: ['settings'] },
  ],
  owner: [
    { label: 'overview', pages: ['dashboard'] },
    { label: 'property', pages: ['maintenance', 'my-property'] },
    { label: 'building', pages: ['messages', 'announcements', 'amenity-bookings', 'visitor-management'] },
    { label: 'account',  pages: ['settings'] },
  ],
  super_admin: [
    { label: 'overview',      pages: ['dashboard'] },
    { label: 'tenants',       pages: ['tenants', 'properties'] },
    { label: 'finance',       pages: ['rent', 'deposits', 'reserve-fund', 'assessments', 'reports'] },
    { label: 'operations',    pages: ['maintenance', 'vendors', 'registry', 'legal-forms', 'evictions', 'violations', 'board-meetings', 'keys', 'packages', 'documents'] },
    { label: 'communication', pages: ['messages', 'email', 'announcements', 'amenity-bookings', 'visitor-management'] },
    { label: 'account',       pages: ['settings'] },
    { label: 'system',        pages: ['super-admin'] },
  ],
  'super-admin': [
    { label: 'overview',      pages: ['dashboard'] },
    { label: 'tenants',       pages: ['tenants', 'properties'] },
    { label: 'finance',       pages: ['rent', 'deposits', 'reserve-fund', 'assessments', 'reports'] },
    { label: 'operations',    pages: ['maintenance', 'vendors', 'registry', 'legal-forms', 'evictions', 'violations', 'board-meetings', 'keys', 'packages', 'documents'] },
    { label: 'communication', pages: ['messages', 'email', 'announcements', 'amenity-bookings', 'visitor-management'] },
    { label: 'account',       pages: ['settings'] },
    { label: 'system',        pages: ['super-admin'] },
  ],
};

const PAGE_TITLES = {
  dashboard: 'dashboard', properties: 'properties', tenants: 'tenants', rent: 'rent',
  'my-payments': 'my_payments', deposits: 'deposits', maintenance: 'maintenance', documents: 'documents',
  'my-documents': 'my_documents', announcements: 'announcements', 'legal-forms': 'legal_forms', evictions: 'evictions',
  violations: 'violations', 'reserve-fund': 'reserve_fund', 'board-meetings': 'board_meetings', assessments: 'assessments',
  messages: 'messages', email: 'email', keys: 'keys_access', packages: 'packages', vendors: 'vendors', registry: 'registry', reports: 'reports', settings: 'settings', 'amenity-bookings': 'amenities', 'visitor-management': 'visitors', 'super-admin': 'admin_panel'
};

// ──────────────────────────────────────────────────────────────────────────────
function Sidebar({ user, userProfile, tab, onNavigate, collapsed, onToggle, onLogout }) {
  const { t } = useLanguage();
  const { label: hoaLabel, isHOAMode } = useHOAMode();
  const roleColor = ROLE_COLORS[userProfile?.role] || P.gold;
  const groups    = (ROLE_GROUPS[userProfile?.role] || []).map(g => ({
    ...g,
    pages: g.pages.filter(p => {
      if (!isHOAMode) {
        const hoaOnly = ['violations', 'reserve-fund', 'board-meetings', 'assessments'];
        if (hoaOnly.includes(p)) return false;
      }
      return true;
    })
  })).filter(g => g.pages.length > 0);
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
            {!collapsed && <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: 1.2, padding: '8px 6px 3px' }}>{hoaLabel(g.label, t(g.label))}</div>}
            {collapsed && gi > 0 && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 3px' }} />}
            {g.pages.map(id => {
              const nav = navLookup[id];
              if (!nav) return null;
              // Super admin panel only visible to super admin
              if (id === 'super-admin' && user?.email !== SUPER_ADMIN_EMAIL) return null;
              const active = tab === id;
              return (
                <button key={id} onClick={() => onNavigate(id)} title={collapsed ? t(nav.label) : ''}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 7px', borderRadius: 8, border: 'none', background: active ? P.gold : 'transparent', color: active ? P.navy : 'rgba(255,255,255,0.55)', cursor: 'pointer', marginBottom: 1, textAlign: 'left', transition: 'all 0.12s', fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 700 : 500, fontSize: 13 }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <nav.icon size={15} style={{ flexShrink: 0 }} />
                  {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hoaLabel(nav.label, t(nav.label))}</span>}
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
          {!collapsed && <span>{t('sign_out')}</span>}
        </button>
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
function TopBar({ userProfile, tab, onLogout, onNavigate }) {
  const { t, locale, setLocale } = useLanguage();
  const { label: hoaLabel } = useHOAMode();
  const roleColor = ROLE_COLORS[userProfile?.role] || P.gold;
  const title     = PAGE_TITLES[tab] || 'dashboard';

  return (
    <div style={{ background: P.card, borderBottom: `1px solid ${P.border}`, padding: '0 22px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{hoaLabel(title, t(title))}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        
        {/* Language Selector */}
        <select value={locale} onChange={e => setLocale(e.target.value)} style={{ padding: '6px 12px', borderRadius: 8, background: P.bg, border: `1px solid ${P.border}`, color: P.textMuted, fontSize: 12, outline: 'none', cursor: 'pointer', fontWeight: 600 }}>
          <option value="en">🇺🇸 EN</option>
          <option value="es">🇪🇸 ES</option>
          <option value="fr">🇫🇷 FR</option>
        </select>

        <NotificationsMenu userProfile={userProfile} onNavigate={onNavigate} />
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

  // Load tenant data if role is tenant or owner
  useEffect(() => {
    if (!currentUser || !['tenant', 'owner'].includes(userProfile?.role)) return;
    const unsub = getTenantByUserId(currentUser.uid, data => setTenantData(data));
    return () => unsub && unsub();
  }, [currentUser, userProfile?.role]);

  // Load tenants for payment page
  // Load tenants for payment page (Manager/Landlord only)
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    const isPrivileged = ['manager', 'landlord', 'super_admin', 'super-admin'].includes(userProfile.role);
    if (!isPrivileged) return;
    
    const unsub = subscribeTenants(data => setTenants(data));
    return () => unsub && unsub();
  }, [currentUser, userProfile]);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const handleLogout = () => logout();
  const navigate = (id) => setTab(id);

  // Public Route Bypass
  if (window.location.pathname === '/report') {
    return <AnonymousReportPage />;
  }

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
      case 'properties':    return <PropertiesPage  {...props} />;
      case 'tenants':       return <TenantsPage   {...props} />;
      case 'rent':          return <PaymentsPage  {...props} tenants={tenants} />;
      case 'my-payments':   return <PaymentsPage  {...props} tenants={tenants} myOnly />;
      case 'maintenance':   return <MaintenancePage {...props} />;
      case 'documents':     return <DocumentsPage     {...props} />;
      case 'my-documents':  return <DocumentsPage     {...props} />;
      case 'my-property':   return <MyPropertyPage    {...props} />;
      case 'announcements': return <AnnouncementsPage {...props} />;
      case 'messages':      return <MessagesPage      {...props} />;
      case 'email':         return <EmailPage         {...props} />;
      case 'keys':          return <KeysPage          {...props} />;
      case 'packages':      return <PackagesPage      {...props} />;
      case 'legal-forms':   return <LegalFormsPage    {...props} />;
      case 'evictions':     return <EvictionsPage     {...props} />;
      case 'violations':    return <ViolationsPage    {...props} />;
      case 'reserve-fund':  return <ReserveFundPage   {...props} />;
      case 'board-meetings': return <BoardMeetingsPage {...props} />;
      case 'assessments':   return <SpecialAssessmentsPage {...props} />;
      case 'deposits':      return <DepositsPage      {...props} />;
      case 'reports':       return <ReportsPage       {...props} />;
      case 'settings':      return <SettingsPage      {...props} />;
      case 'vendors':       return <VendorsPage       {...props} />;
      case 'registry':      return <RegistryPage      {...props} />;
      case 'amenity-bookings': return <AmenityBookingPage {...props} />;
      case 'visitor-management': return <VisitorManagementPage {...props} />;
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
        <TopBar userProfile={userProfile} tab={tab} onLogout={handleLogout} onNavigate={navigate} />
        <div key={tab} className="animate-fadeIn" style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {renderPage()}
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
