import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { LanguageProvider } from './contexts/LanguageContext.jsx';
import { HOAModeProvider } from './contexts/HOAModeContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <HOAModeProvider>
          <App />
        </HOAModeProvider>
      </LanguageProvider>
    </AuthProvider>
  </React.StrictMode>
);
