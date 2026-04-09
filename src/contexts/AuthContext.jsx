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

  // Auto-refresh user data from API on mount (sync quota, request_count, etc.)
  useEffect(() => {
    if (!user) return;
    API.get('/api/user/self', { skipErrorHandler: true }).then(res => {
      if (res.data?.success && res.data.data) {
        const fresh = { ...user, ...stripDangerousKeys(res.data.data) };
        localStorage.setItem('user', JSON.stringify(fresh));
        setUser(fresh);
      }
    }).catch(() => {});
  }, []); // only on mount

  const value = { user, login, logout: logoutFn, updateUser, isLoggedIn: !!user, isAdmin: user?.role >= 10, isRoot: user?.role >= 100 };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
