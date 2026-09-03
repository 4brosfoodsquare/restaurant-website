import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/apiClient.js';

const SettingsContext = createContext(null);

/**
 * Restaurant info (name, hours, contact, order types, etc.) fetched once and
 * shared across the whole customer site — nothing about the business is
 * hard-coded into components.
 */
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/settings')
      .then((data) => {
        if (!cancelled) {
          setSettings(data);
          setStatus('success');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SettingsContext.Provider value={{ settings, status }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
