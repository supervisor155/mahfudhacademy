import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const REGISTER_DRAFT_KEY = 'register:draft:v1';

function readDraft() {
  try {
    const raw = sessionStorage.getItem(REGISTER_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeDraft(next) {
  try {
    sessionStorage.setItem(REGISTER_DRAFT_KEY, JSON.stringify(next));
  } catch {
    // no-op
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(REGISTER_DRAFT_KEY);
  } catch {
    // no-op
  }
}

export default function Register() {
  const draft = readDraft();

  const [name, setName] = useState(draft?.name || '');
  const [email, setEmail] = useState(draft?.email || '');
  const [phone, setPhone] = useState(draft?.phone || '');
  const [password, setPassword] = useState(draft?.password || '');
  const [role, setRole] = useState(draft?.role || 'student');

  const [googleToken, setGoogleToken] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, googleAuth } = useAuth();
  const googleButtonRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const rawStep = String(searchParams.get('step') || 'account').toLowerCase();
  const step = ['account', 'complete'].includes(rawStep) ? rawStep : 'account';

  useEffect(() => {
    document.title = "Create Account | Mahfudh Academy";
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', 'description');
      document.head.appendChild(el);
    }
    el.setAttribute('content', 'Create your Qur\'an Academy account using email or phone OTP verification and start secure Quran learning.');
  }, []);

  useEffect(() => {
    writeDraft({ name, email, phone, password, role });
  }, [name, email, phone, password, role]);

  const goStep = (nextStep) => {
    navigate(`/register?step=${nextStep}`, { replace: true });
  };

  const handleAccountContinue = (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    goStep('complete');
  };

  const handleGoogleIdTokenAuth = async (idToken) => {
    setError('');
    setNotice('');
    setLoading(true);
    const result = await googleAuth({ idToken, role, phone: phone || undefined });
    if (result.success) {
      clearDraft();
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleGoogleAuthManual = async () => {
    setError('');
    setNotice('');
    if (!googleToken.trim()) {
      setError('Paste a Google ID token to continue.');
      return;
    }
    await handleGoogleIdTokenAuth(googleToken.trim());
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    setError('');
    setNotice('');

    const result = await register({
      email,
      phone: phone || undefined,
      password,
      name,
      role,
    });

    if (result.success) {
      clearDraft();
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f8fb]" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-[#b8ccff]/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-8 h-96 w-96 rounded-full bg-[#c0efe6]/45 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6">
        <section className="w-full rounded-[30px] border border-[#d9e1f2] bg-white p-6 shadow-[0_22px_50px_rgba(17,24,39,0.12)] sm:p-8">
          <h2 className="text-center text-4xl font-extrabold text-[#202f56]">Create Account</h2>
          <p className="mt-2 text-center text-sm text-slate-500">Mahfudh Academy</p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
            <div className={`rounded-xl px-3 py-2 text-center ${step === 'account' ? 'bg-[#eef3ff] text-[#3b4b78]' : 'bg-slate-100 text-slate-500'}`}>1. Account</div>
            <div className={`rounded-xl px-3 py-2 text-center ${step === 'complete' ? 'bg-[#f2f0ff] text-[#5f3cc1]' : 'bg-slate-100 text-slate-500'}`}>2. Complete</div>
          </div>

          {step === 'account' && (
            <form onSubmit={handleAccountContinue} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-xl border border-[#d3daea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5b74c8]"
                  required
                />
              </div>

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
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full rounded-xl border border-[#d3daea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5b74c8]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#d3daea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5b74c8]"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-[#d3daea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5b74c8]"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>

              <button type="submit" className="w-full rounded-2xl bg-[#5f3cc1] px-4 py-3 text-base font-bold text-white transition hover:bg-[#5333aa]">
                Continue
              </button>
            </form>
          )}

          {step === 'complete' && (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-[#e3e8f2] bg-[#fbf9ff] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Sign Up Options</p>
                <div ref={googleButtonRef} className="mb-3 flex justify-center" />
                {!googleClientId && <p className="mb-3 text-xs text-amber-700">Set VITE_GOOGLE_CLIENT_ID to enable Google signup.</p>}
                {googleClientId && !googleReady && <p className="mb-3 text-xs text-slate-500">Loading Google sign-in...</p>}

                <details className="rounded-xl border border-[#e0e5f2] bg-white p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-600">Use manual Google token</summary>
                  <div className="mt-3 space-y-2">
                    <input
                      type="text"
                      value={googleToken}
                      onChange={(e) => setGoogleToken(e.target.value)}
                      placeholder="Paste Google ID token"
                      className="w-full rounded-xl border border-[#d3daea] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#5b74c8]"
                    />
                    <button
                      type="button"
                      onClick={handleGoogleAuthManual}
                      disabled={loading}
                      className="w-full rounded-xl border border-[#c9dbd6] bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-[#edf7f5]"
                    >
                      Continue with Google Token
                    </button>
                  </div>
                </details>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => goStep('account')} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={loading}
                  className="rounded-xl bg-[#5f3cc1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5333aa] disabled:opacity-60"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </div>
          )}

          {notice && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <p className="mt-5 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-[#5f3cc1] hover:underline">Sign In</a>
          </p>
        </section>
      </div>
    </div>
  );
}
