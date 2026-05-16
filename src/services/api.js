import axios from "axios";

const NETWORK_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000"
).trim().replace(/\/$/, '');

const API = axios.create({ 
  baseURL: API_BASE_URL,
  timeout: NETWORK_TIMEOUT_MS,
});

const ACCESS_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

function readStoredToken(key) {
  return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
}

function persistToken(key, value) {
  if (localStorage.getItem(key)) {
    localStorage.setItem(key, value);
  } else if (sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, value);
  } else {
    sessionStorage.setItem(key, value);
  }
}

let refreshPromise = null;

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = readStoredToken(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No refresh token');

    const response = await axios.post(`${API.defaults.baseURL}/api/auth/refresh`, {
      refresh_token: refreshToken,
    });

    const nextAccess = response.data?.access_token || response.data?.token;
    const nextRefresh = response.data?.refresh_token;
    if (!nextAccess || !nextRefresh) throw new Error('Invalid refresh response');

    persistToken(ACCESS_TOKEN_KEY, nextAccess);
    persistToken(REFRESH_TOKEN_KEY, nextRefresh);
    API.defaults.headers.common['Authorization'] = `Bearer ${nextAccess}`;
    return nextAccess;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function shouldRetry(error) {
  const method = (error.config?.method || 'get').toLowerCase();
  const status = error.response?.status;
  const retriableMethods = ['get', 'head', 'options'];
  const retriableStatuses = [408, 425, 429, 500, 502, 503, 504];

  if (!retriableMethods.includes(method)) return false;
  if (!status && error.code) return true;
  return retriableStatuses.includes(status);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Interceptor to add auth token to all requests
API.interceptors.request.use((config) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.reject(new axios.AxiosError('No internet connection', 'ERR_NETWORK_OFFLINE', config));
  }

  const token = readStoredToken(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error.config;
    if (!cfg) throw error;

    const status = error.response?.status;
    const isAuthRoute = String(cfg.url || '').includes('/api/auth/login') || String(cfg.url || '').includes('/api/auth/register') || String(cfg.url || '').includes('/api/auth/refresh');
    if (status === 401 && !cfg.__isRetryAfterRefresh && !isAuthRoute) {
      cfg.__isRetryAfterRefresh = true;
      try {
        const nextAccess = await refreshAccessToken();
        cfg.headers = cfg.headers || {};
        cfg.headers.Authorization = `Bearer ${nextAccess}`;
        return API(cfg);
      } catch {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    }

    cfg.__retryCount = cfg.__retryCount || 0;
    if (cfg.__retryCount >= MAX_RETRIES || !shouldRetry(error)) {
      throw error;
    }

    cfg.__retryCount += 1;
    const backoff = 400 * Math.pow(2, cfg.__retryCount - 1);
    await wait(backoff);
    return API(cfg);
  }
);

export default API;

export const fetchClasses = () => API.get("/api/classes");
export const fetchVideos = (classId) => API.get(`/api/videos?classId=${classId}`);
export const fetchMushafAyah = (ayahId) => API.get(`/api/notes/ayah/${ayahId}`);
