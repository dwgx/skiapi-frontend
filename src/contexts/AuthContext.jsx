import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../api';
import { safeJsonParse, stripDangerousKeys } from '../utils/security';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => safeJsonParse(localStorage.getItem('user'), null));

  const login = useCallback((userData) => {
    const clean = stripDangerousKeys(userData);
    localStorage.setItem('user', JSON.stringify(clean));
    setUser(clean);
  }, []);

  const updateUser = useCallback((partial) => {
    const clean = stripDangerousKeys(partial);
    setUser(prev => {
      const next = { ...prev, ...clean };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const logoutFn = useCallback(async () => {
    try { await API.get('/api/user/logout', { skipErrorHandler: true }); } catch {}
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Auto-refresh user data whenever the logged-in identity changes.
  // IMPORTANT: backend /api/user/login only returns {id, username, display_name,
  // role, status, group} — it does NOT include quota/used_quota/request_count.
  // We must re-fetch /api/user/self after every login so Dashboard/TopUp don't
  // render zeros. Dep on user?.id (not []) ensures this runs on fresh login too.
  useEffect(() => {
    if (!user?.id) return;
    API.get('/api/user/self', { skipErrorHandler: true }).then(res => {
      if (res.data?.success && res.data.data) {
        const clean = stripDangerousKeys(res.data.data);
        setUser(prev => {
          const next = { ...prev, ...clean };
          localStorage.setItem('user', JSON.stringify(next));
          return next;
        });
      }
    }).catch(() => {});
  }, [user?.id]);

  const value = { user, login, logout: logoutFn, updateUser, isLoggedIn: !!user, isAdmin: user?.role >= 10, isRoot: user?.role >= 100 };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
