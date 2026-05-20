import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();
const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const AUTH_USER_KEY  = 'authUser';

// Reads from localStorage (remember me) OR sessionStorage (session only)
function readStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || null;
}

function readStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function persistAuth(token, user, remember) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(AUTH_TOKEN_KEY, token);
  store.setItem(AUTH_USER_KEY, JSON.stringify(user));
  // Clear the other store to avoid stale data
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(AUTH_TOKEN_KEY);
  other.removeItem(REFRESH_TOKEN_KEY);
  other.removeItem(AUTH_USER_KEY);
}

function persistRefreshToken(token, remember) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(REFRESH_TOKEN_KEY, token);
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(REFRESH_TOKEN_KEY);
}

function readStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY) || null;
}

function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => readStoredUser());
  const [token, setToken]     = useState(() => readStoredToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, [token]);

  const register = async (email, password, name, role) => {
    try {
      const res = await api.post('/api/auth/register', { email, password, name, role });
      const { token: t, refresh_token: rt, user: u } = res.data;
      setToken(t);
      setUser(u);
      persistAuth(t, u, false); // new registrations: session only until they log in with remember
      if (rt) persistRefreshToken(rt, false);
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Registration failed' };
    }
  };

  // remember=true → localStorage (survives browser close)
  // remember=false → sessionStorage (cleared when tab closes)
  const login = async (email, password, remember = false) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token: t, refresh_token: rt, user: u } = res.data;
      setToken(t);
      setUser(u);
      persistAuth(t, u, remember);
      if (rt) persistRefreshToken(rt, remember);
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Invalid credentials' };
    }
  };

  const logout = async () => {
    const refreshToken = readStoredRefreshToken();
    try {
      if (refreshToken) {
        await api.post('/api/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // no-op
    }
    setUser(null);
    setToken(null);
    clearAuth();
    delete api.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
