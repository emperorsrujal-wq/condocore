import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    dashboard: 'Dashboard',
    properties: 'Properties',
    tenants: 'Tenants & Leases',
    rent: 'Rent & Payments',
    my_payments: 'My Payments',
    maintenance: 'Maintenance',
    documents: 'Documents',
    my_documents: 'My Documents',
    announcements: 'Announcements',
    messages: 'Messages',
    reports: 'Reports',
    settings: 'Settings',
    admin_panel: '👑 Super Admin Panel',
    overview: 'Overview',
    finance: 'Finance',
    operations: 'Operations',
    communication: 'Communication',
    account: 'Account',
    system: 'System',
    home: 'Home',
    services: 'Services',
    building: 'Building',
    sign_out: 'Sign Out',
    lang_en: 'English',
    lang_es: 'Español',
    lang_fr: 'Français',
    keys_access: 'Keys & Access',
    packages: 'Packages & Deliveries',
    deposits: 'Escrow & Deposits',
    legal_forms: 'Legal Forms',
    evictions: 'Eviction Timelines',
    violations: 'Bylaw Violations',
    reserve_fund: 'Reserve Fund',
    board_meetings: 'Board Meetings',
    assessments: 'Special Assessments'
  },
  es: {
    dashboard: 'Panel de Control',
    properties: 'Propiedades',
    tenants: 'Inquilinos y Contratos',
    rent: 'Alquiler y Pagos',
    my_payments: 'Mis Pagos',
    maintenance: 'Mantenimiento',
    documents: 'Documentos',
    my_documents: 'Mis Documentos',
    announcements: 'Anuncios',
    messages: 'Mensajes',
    reports: 'Reportes',
    settings: 'Configuración',
    admin_panel: '👑 Panel de Superadmin',
    overview: 'Resumen',
    finance: 'Finanzas',
    operations: 'Operaciones',
    communication: 'Comunicación',
    account: 'Cuenta',
    system: 'Sistema',
    home: 'Inicio',
    services: 'Servicios',
    building: 'Edificio',
    sign_out: 'Cerrar Sesión',
    lang_en: 'Inglés',
    lang_es: 'Español',
    lang_fr: 'Francés',
    keys_access: 'Llaves y Acceso',
    packages: 'Paquetes y Entregas',
    deposits: 'Depósitos de Garantía',
    legal_forms: 'Formularios Legales',
    evictions: 'Desalojos y Plazos',
    violations: 'Violaciones de Normas',
    reserve_fund: 'Fondo de Reserva',
    board_meetings: 'Reuniones de Junta',
    assessments: 'Cuotas Especiales'
  },
  fr: {
    dashboard: 'Tableau de Bord',
    properties: 'Propriétés',
    tenants: 'Locataires et Baux',
    rent: 'Loyer et Paiements',
    my_payments: 'Mes Paiements',
    maintenance: 'Entretien',
    documents: 'Documents',
    my_documents: 'Mes Documents',
    announcements: 'Annonces',
    messages: 'Messages',
    reports: 'Rapports',
    settings: 'Paramètres',
    admin_panel: '👑 Panneau Super Admin',
    overview: 'Aperçu',
    finance: 'Finances',
    operations: 'Opérations',
    communication: 'Communication',
    account: 'Compte',
    system: 'Système',
    home: 'Accueil',
    services: 'Services',
    building: 'Bâtiment',
    sign_out: 'Déconnexion',
    lang_en: 'Anglais',
    lang_es: 'Espagnol',
    lang_fr: 'Français',
    keys_access: 'Clés et Accès',
    packages: 'Colis et Livraisons',
    deposits: 'Cautions Hautes',
    legal_forms: 'Formulaires Légaux',
    evictions: 'Chronologies d\'Éviction',
    violations: 'Violations des Règlements',
    reserve_fund: 'Fonds de Réserve',
    board_meetings: 'Réunions du Conseil',
    assessments: 'Cotisations Spéciales'
  }
};

const LanguageContext = createContext();

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem('condocore_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('condocore_lang', locale);
  }, [locale]);

  const t = (key) => translations[locale][key] || translations['en'][key] || key;

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
