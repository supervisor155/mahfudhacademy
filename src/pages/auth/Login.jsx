import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function setMetaDescription(content) {
  let el = document.querySelector('meta[name="description"]');
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'description');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const googleButtonRef = useRef(null);
  const { login, googleAuth } = useAuth();
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    document.title = "Login | Mahfudh Academy";
    setMetaDescription("Login to Mahfudh Academy with email and password.");
  }, []);

  // Google Identity Services button
  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return undefined;

    let cancelled = false;

    const loadScript = () => new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      if (existing) {
        if (window.google?.accounts?.id) return resolve();
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google script failed')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google script failed'));
      document.head.appendChild(script);
    });

    loadScript().then(() => {
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (resp) => {
          const idToken = resp?.credential;
          if (!idToken) return;
          setLoading(true);
          setError('');
          const result = await googleAuth({ idToken });
          if (result.success) {
            navigate('/dashboard');
          } else {
            setError(result.error || 'Google sign-in failed');
          }
          setLoading(false);
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: googleButtonRef.current.offsetWidth || 340,
        logo_alignment: 'left',
      });
    }).catch(() => {
      // Google script failed to load — silent, basic login still works
    });

    return () => { cancelled = true; };
  }, [googleClientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    const result = await login(email, password, remember);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f8ff]" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#a2bcff]/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-[#98e0d5]/40 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6">
        <section className="w-full rounded-[28px] border border-[#dce6ff] bg-white/95 p-7 shadow-[0_20px_50px_rgba(30,64,175,0.12)] sm:p-8">
          <h2 className="text-center text-3xl font-extrabold text-[#1f3a8a]">Sign In</h2>
          <p className="mt-1 text-center text-sm text-slate-500">Mahfudh Academy</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-[#d3daea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5b74c8]"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-[#d3daea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5b74c8]"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-[#1f3a8a]"
              />
              <label htmlFor="remember" className="text-sm text-slate-600">Remember me</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#1f3a8a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1b3276] disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {googleClientId && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs text-slate-400">or continue with</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
                <div ref={googleButtonRef} className="flex w-full justify-center" />
              </>
            )}
          </form>

          {notice && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <p className="mt-5 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <a href="/register" className="font-bold text-[#1f3a8a] hover:underline">Create one</a>
          </p>
        </section>
      </div>
    </div>
  );
}
