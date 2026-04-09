import React, { createContext, useContext, useState, useEffect } from 'react';
import { API } from '../api';
import { stripDangerousKeys } from '../utils/security';

const StatusContext = createContext(null);

export function StatusProvider({ children }) {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/api/status').then(res => {
      if (res.data.success) {
        const s = stripDangerousKeys(res.data.data);
        setStatus(s);
        // Sync to localStorage for sidebar visibility
        if (s.chat_link) localStorage.setItem('chats', s.chat_link);
        if (s.chats) localStorage.setItem('chats', JSON.stringify(s.chats));
        if (s.enable_drawing !== undefined) localStorage.setItem('enable_drawing', String(s.enable_drawing));
        if (s.enable_task !== undefined) localStorage.setItem('enable_task', String(s.enable_task));
        if (s.enable_data_export !== undefined) localStorage.setItem('enable_data_export', String(s.enable_data_export));
        if (s.quota_per_unit) localStorage.setItem('quota_per_unit', String(s.quota_per_unit));
        // Prefer explicit quota_display_type (USD/CNY/CUSTOM/TOKENS); fall back to legacy display_in_currency boolean.
        if (s.quota_display_type) localStorage.setItem('quota_display_type', s.quota_display_type);
        else if (s.display_in_currency !== undefined) localStorage.setItem('quota_display_type', s.display_in_currency ? 'USD' : 'TOKENS');
        localStorage.setItem('status', JSON.stringify(s));

        // Setup check: redirect to /setup if not initialized
        if (s.setup === false && window.location.pathname !== '/setup') {
          window.location.href = '/setup';
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return <StatusContext.Provider value={{ status, loading, setStatus }}>{children}</StatusContext.Provider>;
}

export function useStatus() {
  const ctx = useContext(StatusContext);
  if (!ctx) throw new Error('useStatus must be inside StatusProvider');
  return ctx;
}
