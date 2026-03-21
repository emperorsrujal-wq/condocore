import { createContext, useContext, useState, useEffect } from 'react';

const HOAModeContext = createContext();

// These are the label overrides when HOA mode is active
const HOA_LABELS = {
  tenants:     'Homeowners',
  tenant:      'Homeowner',
  rent:        'HOA Dues',
  'my-payments': 'My Dues',
  deposits:    'Trust & Deposits',
  maintenance: 'Work Orders',
  documents:   'Corporation Documents',
  announcements: 'Notices & Announcements',
  messages:    'Messages',
  reports:     'Financial Reports',
  settings:    'Settings',
  properties:  'Buildings & Complexes',
  dashboard:   'HOA Dashboard'
};

export function HOAModeProvider({ children }) {
  const [isHOAMode, setIsHOAMode] = useState(() => {
    try { return localStorage.getItem('condocore_hoa_mode') === 'true'; }
    catch { return false; }
  });

  const toggleMode = () => {
    setIsHOAMode(prev => {
      const next = !prev;
      localStorage.setItem('condocore_hoa_mode', String(next));
      return next;
    });
  };

  // Returns a label — HOA override if active, otherwise returns the default
  const label = (key, defaultLabel) => {
    if (isHOAMode && HOA_LABELS[key]) return HOA_LABELS[key];
    return defaultLabel;
  };

  return (
    <HOAModeContext.Provider value={{ isHOAMode, toggleMode, label }}>
      {children}
    </HOAModeContext.Provider>
  );
}

export const useHOAMode = () => useContext(HOAModeContext);
