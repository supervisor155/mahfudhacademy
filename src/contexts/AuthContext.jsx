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

  const requestRegistrationOtp = async ({ channel, email, phone }) => {
    try {
      const res = await api.post('/api/auth/register/request-otp', { channel, email, phone });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to send OTP' };
    }
  };

  const verifyRegistrationOtp = async ({ channel, email, phone, code }) => {
    try {
      const res = await api.post('/api/auth/register/verify-otp', { channel, email, phone, code });
      return {
        success: true,
        token: res.data?.registration_verification_token,
        data: res.data,
      };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'OTP verification failed' };
    }
  };

  const register = async ({ email, phone, password, name, role, registrationVerificationToken }) => {
    try {
      const payload = {
        email,
        phone,
        password,
        name,
        role,
      };

      if (registrationVerificationToken) {
        payload.registration_verification_token = registrationVerificationToken;
      }

      const res = await api.post('/api/auth/register', payload);
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

  const requestLoginOtp = async (email) => {
    try {
      const res = await api.post('/api/auth/login/request-otp', { email });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to send login OTP' };
    }
  };

  const verifyLoginOtp = async ({ email, code, password = '', remember = false }) => {
    try {
      const res = await api.post('/api/auth/login/verify-otp', { email, code, password });
      const { token: t, refresh_token: rt, user: u } = res.data;
      setToken(t);
      setUser(u);
      persistAuth(t, u, remember);
      if (rt) persistRefreshToken(rt, remember);
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'OTP verification failed' };
    }
  };

  // remember=true → localStorage (survives browser close)
  // remember=false → sessionStorage (cleared when tab closes)
  const login = async (identifier, password, remember = false) => {
    try {
      const res = await api.post('/api/auth/login', { identifier, password });
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

  const googleAuth = async ({ idToken, role = 'student', phone }) => {
    try {
      const res = await api.post('/api/auth/google', { id_token: idToken, role, phone });
      const { token: t, refresh_token: rt, user: u } = res.data;
      setToken(t);
      setUser(u);
      persistAuth(t, u, false);
      if (rt) persistRefreshToken(rt, false);
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Google authentication failed' };
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
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        logout,
        requestRegistrationOtp,
        verifyRegistrationOtp,
        requestLoginOtp,
        verifyLoginOtp,
        googleAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
