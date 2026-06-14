import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaBell,
  FaBook,
  FaBookOpen,
  FaChartLine,
  FaCheckCircle,
  FaChevronRight,
  FaComments,
  FaFilm,
  FaHome,
  FaMoon,
  FaPlus,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaUserCircle,
  FaVideo,
  FaWifi,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ClassCard from '../../components/dashboard/ClassCard';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import EmptyState from '../../components/dashboard/EmptyState';
import OnboardingChecklistCard from '../../components/dashboard/OnboardingChecklistCard';
import ReelCard from '../../components/dashboard/ReelCard';
import SessionCard from '../../components/dashboard/SessionCard';
import NotificationBell from '../../components/common/NotificationBell';

//  helpers 

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item, i) => {
    const key = item?.id ?? `${item?.class_id || 'x'}-${i}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatCountdown(ts) {
  if (!ts) return null;
  const diff = new Date(ts).getTime() - Date.now();
  if (diff <= 0) return 'Starting now';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

//  component 

function StudentDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [reels, setReels]           = useState([]);
  const [sessions, setSessions]     = useState([]);
  const [activity, setActivity]     = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState('');
  const [activeTab, setActiveTab]   = useState('home');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode]     = useState('');
  const [joining, setJoining]       = useState(false);
  const [joinError, setJoinError]   = useState('');
  const [darkMode, setDarkMode]     = useState(() => localStorage.getItem('student-dm') === '1');

  useEffect(() => {
    localStorage.setItem('student-dm', darkMode ? '1' : '0');
  }, [darkMode]);

  //  data loading 
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const [clsRes, actRes] = await Promise.allSettled([
          api.get('/api/classes'),
          api.get('/api/activity'),
        ]);
        if (cancelled) return;

        const nextClasses  = clsRes.status === 'fulfilled' ? normalizeList(clsRes.value.data) : [];
        const nextActivity = actRes.status === 'fulfilled' ? normalizeList(actRes.value.data) : [];
        setClasses(nextClasses);
        setActivity(nextActivity);

        const ids = nextClasses.map(c => c.id).filter(Boolean).slice(0, 4);
        if (ids.length > 0) {
          const [reelResults, sesResults] = await Promise.all([
            Promise.allSettled(ids.map(id => api.get(`/api/reels?class_id=${id}&limit=4`))),
            Promise.allSettled(ids.map(id => api.get(`/api/sessions?class_id=${id}&limit=6`))),
          ]);
          if (cancelled) return;
          setReels(uniqueById(reelResults.flatMap((r, i) =>
            r.status === 'fulfilled'
              ? normalizeList(r.value.data).map(x => ({ ...x, class_id: x.class_id || ids[i], videoUrl: x.videoUrl || x.url }))
              : []
          )));
          setSessions(uniqueById(sesResults.flatMap((r, i) =>
            r.status === 'fulfilled'
              ? normalizeList(r.value.data).map(x => ({ ...x, class_id: x.class_id || ids[i] }))
              : []
          )));
        }
      } catch {
        if (!cancelled) setError('Failed to load your dashboard. Please refresh.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [authLoading]);

  //  derived 
  const liveSessions     = sessions.filter(s => s.status === 'live');
  const upcomingSessions = sessions
    .filter(s => s.status === 'upcoming')
    .sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0));
  const nextSession      = liveSessions[0] || upcomingSessions[0] || null;
  const userName         = user?.name || 'Student';
  const firstName        = userName.split(' ')[0];
  const onboardingItems = [
    {
      id: 'join-class',
      label: 'Join your first class',
      hint: 'Use your teacher invite code to enroll.',
      done: classes.length > 0,
      onClick: () => setShowJoinModal(true),
    },
    {
      id: 'see-sessions',
      label: 'Check your live sessions',
      hint: 'See upcoming and active classes.',
      done: sessions.length > 0,
      onClick: () => setActiveTab('sessions'),
    },
    {
      id: 'watch-reel',
      label: 'Watch a learning reel',
      hint: 'Short revision clips from your classes.',
      done: reels.length > 0,
      onClick: () => setActiveTab('reels'),
    },
    {
      id: 'open-mushaf',
      label: 'Open digital mushaf',
      hint: 'Continue recitation from your dashboard.',
      done: false,
      onClick: () => navigate('/mushaf'),
    },
  ];

  //  join class 
  async function handleJoinClass(e) {
    e.preventDefault();
    setJoining(true);
    setJoinError('');
    try {
      await api.post('/api/classes/join', { invite_code: joinCode.trim() });
      setJoinCode('');
      setShowJoinModal(false);
      setActiveTab('classes');
      const res = await api.get('/api/classes');
      setClasses(normalizeList(res.data));
    } catch (err) {
      setJoinError(err.response?.data?.message || 'Invalid code. Please try again.');
    } finally {
      setJoining(false);
    }
  }

  //  theme tokens 
  const dm        = darkMode;
  const bg        = dm ? 'bg-[#0f1419]'                          : 'bg-[#f4f6f3]';
  const sidebarBg = dm ? 'bg-[#0d1117]'                          : 'bg-[#1a3530]';
  const headerBg  = dm ? 'bg-[#0f1419]/95 border-[#1e2730]'      : 'bg-[#f4f6f3]/95 border-[#dde4de]';
  const card      = dm ? 'bg-[#161d24] border-[#1f2a34]'         : 'bg-white border-[#e3e8e3]';
  const cardHover = dm ? 'hover:bg-[#1a2330]'                    : 'hover:bg-[#f8faf8]';
  const text      = dm ? 'text-slate-100'                        : 'text-slate-900';
  const muted     = dm ? 'text-slate-400'                        : 'text-slate-500';
  const divider   = dm ? 'border-[#1e2730]'                      : 'border-[#e8ece8]';

  //  loading 
  if (authLoading || isLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${bg}`} style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent" />
          <p className={`text-lg font-semibold ${text}`}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  //  render 
  return (
    <div className={`min-h-screen ${bg} ${text}`} style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <div className="flex min-h-screen">

        {/*  Sidebar (xl+)  */}
        <aside className={`hidden xl:flex xl:w-64 xl:shrink-0 xl:flex-col ${sidebarBg} xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto xl:px-4 xl:py-6`}>
          <div className="mb-8 px-2">
            <div className="text-2xl font-bold tracking-tight text-[#cce7dd]">Mahfuz</div>
            <p className="mt-0.5 text-xs text-slate-400">Student Dashboard</p>
          </div>

          <DashboardSidebar
            activeTab={activeTab === 'home' ? 'dashboard' : activeTab}
            onTabChange={(id) => {
              if (id === 'chat') {
                navigate('/chat');
                return;
              }
              setActiveTab(id === 'dashboard' ? 'home' : id);
            }}
          />

          <div className="mt-auto rounded-2xl border border-white/8 bg-white/5 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2b5752] text-sm font-bold text-white">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{userName}</p>
                <p className="text-xs text-slate-400">Student</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              <FaSignOutAlt /> Sign Out
            </button>
          </div>
        </aside>

        {/*  Main column  */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/*  Header  */}
          <header className={`sticky top-0 z-20 border-b ${headerBg} backdrop-blur-md`}>
            <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
              <span className={`text-xl font-bold tracking-tight xl:hidden ${dm ? 'text-[#b6f2d6]' : 'text-[#234946]'}`}>
                Mahfuz
              </span>

              <div className={`hidden flex-1 items-center gap-2 rounded-full border px-4 py-2 md:flex ${dm ? 'border-[#1e2730] bg-[#161d24]' : 'border-[#dde4de] bg-white'}`}>
                <FaSearch className={`shrink-0 text-sm ${muted}`} />
                <input
                  type="text"
                  placeholder="Search classes, sessions..."
                  className={`w-full bg-transparent text-sm outline-none ${text} placeholder:text-slate-400`}
                />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setDarkMode(v => !v)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${dm ? 'border-[#1e2730] bg-[#161d24] text-[#b6f2d6]' : 'border-[#dde4de] bg-white text-slate-500 hover:text-[#2d5a56]'}`}
                  aria-label="Toggle dark mode"
                >
                  {dm ? <FaSun className="text-sm" /> : <FaMoon className="text-sm" />}
                </button>

                <NotificationBell darkMode={dm} />

                <button
                  onClick={() => navigate('/mushaf')}
                  className={`hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition sm:inline-flex ${dm ? 'bg-[#234946] hover:bg-[#1a3530]' : 'bg-[#2d5a56] hover:bg-[#234946]'}`}
                >
                  <FaBookOpen className="text-xs" /> Mushaf
                </button>

                <button
                  onClick={() => navigate('/profile')}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition hover:ring-2 hover:ring-[#2d5a56] ${dm ? 'bg-[#1f2c3a] text-[#b6f2d6]' : 'bg-[#d8e8e4] text-[#234946]'}`}
                  title="My Profile"
                >
                  {user?.avatarUrl
                    ? <img src={user.avatarUrl} alt="Profile" className="h-9 w-9 rounded-full object-cover" />
                    : <FaUserCircle className="text-xl" />}
                </button>
              </div>
            </div>
          </header>

          {/*  Page content  */}
          <main className="mx-auto w-full max-w-6xl flex-1 space-y-5 px-4 py-5 pb-28 sm:px-6 xl:pb-8">

            {error && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{error}</span>
                <button onClick={() => setError('')} className="font-semibold text-red-500 hover:text-red-700">x</button>
              </div>
            )}

            {/*  HOME tab  */}
            {activeTab === 'home' && (
              <>
                                {/* Hero Banner */}
                <section className={`overflow-hidden rounded-4xl shadow-[0_24px_60px_rgba(31,74,71,0.20)] ${dm ? 'bg-gradient-to-br from-[#1a2e2b] via-[#132420] to-[#0f1c1a]' : 'bg-gradient-to-br from-[#1f4a47] via-[#2d5a56] to-[#1a3b38]'}`}>
                  <div className="relative overflow-hidden px-6 py-7 sm:px-8">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
                    <div className="pointer-events-none absolute -bottom-8 right-28 h-32 w-32 rounded-full bg-white/4" />
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                          {user?.avatarUrl
                            ? <img src={user.avatarUrl} alt="Profile" className="h-14 w-14 rounded-full object-cover" />
                            : <FaUserCircle className="text-3xl" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          </p>
                          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            Assalamu Alaikum, {firstName}
                          </h1>
                          <p className="mt-1 text-sm text-white/60">
                            {classes.length === 0
                              ? 'Join a class to begin your Quranic journey.'
                              : `${classes.length} class${classes.length !== 1 ? 'es' : ''} enrolled`}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          onClick={() => navigate('/mushaf')}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                        >
                          <FaBookOpen className="text-xs" /> Mu&#7779;&#7717;af
                        </button>
                        <button
                          onClick={() => setShowJoinModal(true)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-[#1f4a47] shadow transition hover:bg-[#f0f9f5] active:scale-95"
                        >
                          <FaPlus className="text-xs" /> Join Class
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {[
                    { label: 'My Classes',    value: classes.length,         icon: FaBook,      gradient: dm ? 'from-[#1e3a5f]/50 to-[#162e4a]/50' : 'from-[#edf3f8] to-[#dce9f5]', tone: 'bg-[#edf3f8] text-[#46698e]',   action: () => setActiveTab('classes')  },
                    { label: 'Live Sessions', value: liveSessions.length || upcomingSessions.length, icon: FaVideo, gradient: dm ? 'from-[#3d1c1c]/50 to-[#2e1414]/50' : 'from-[#fdecec] to-[#fad8d8]', tone: 'bg-[#fdecec] text-[#c45b5b]', action: () => setActiveTab('sessions') },
                    { label: 'Short Reels',   value: reels.length,           icon: FaFilm,      gradient: dm ? 'from-[#3d2a14]/50 to-[#2e1f0e]/50' : 'from-[#fff3e8] to-[#ffe8cf]', tone: 'bg-[#fff0e7] text-[#c26d32]',   action: () => setActiveTab('reels')    },
                    { label: 'Activity',      value: activity.length,        icon: FaChartLine, gradient: dm ? 'from-[#1b3829]/50 to-[#13291f]/50' : 'from-[#e8f6ec] to-[#d4edda]', tone: 'bg-[#ebf6ef] text-[#4f775c]',   action: null },
                  ].map((s) => (
                    <div
                      key={s.label}
                      onClick={s.action || undefined}
                      className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-5 shadow-[0_8px_20px_rgba(17,24,39,0.06)] ${dm ? 'border border-[#283038]' : ''} ${s.action ? 'cursor-pointer transition hover:shadow-[0_12px_28px_rgba(17,24,39,0.10)] active:scale-[0.98]' : ''}`}
                    >
                      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${s.tone}`}>
                        <s.icon className="text-sm" />
                      </div>
                      <p className={`text-2xl font-bold tracking-tight ${dm ? 'text-white' : 'text-slate-900'}`}>{s.value}</p>
                      <p className={`mt-0.5 text-xs font-medium ${muted}`}>{s.label}</p>
                    </div>
                  ))}
                </div>{/* Live session banner */}
                {liveSessions.length > 0 && (
                  <section
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/class/${liveSessions[0].class_id}/live`)}
                    onKeyDown={e => e.key === 'Enter' && navigate(`/class/${liveSessions[0].class_id}/live`)}
                    className="flex cursor-pointer items-center justify-between gap-4 rounded-3xl bg-linear-to-r from-red-600 to-red-500 px-5 py-4 shadow-[0_8px_24px_rgba(196,58,58,0.28)] transition hover:opacity-90"
                  >
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
                      </span>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-red-100">Live Now</p>
                        <p className="font-semibold text-white">{liveSessions[0].title || 'Live Session in Progress'}</p>
                      </div>
                    </div>
                    <button className="shrink-0 rounded-2xl bg-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/30">
                      Join <FaArrowRight className="ml-1 inline text-xs" />
                    </button>
                  </section>
                )}

                {/* Today at a glance */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Next session */}
                  <section className={`rounded-3xl border p-5 ${card}`}>
                    <p className={`mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${muted}`}>
                      <FaVideo className="text-[#2d5a56]" /> Next Session
                    </p>
                    {nextSession ? (
                      <div>
                        <p className={`font-semibold leading-snug ${text}`}>{nextSession.title || 'Untitled Session'}</p>
                        <p className={`mt-1 text-sm ${muted}`}>{nextSession.instructorName || 'Your teacher'}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className={`rounded-xl px-3 py-1 text-xs font-semibold ${nextSession.status === 'live' ? 'bg-red-100 text-red-700' : dm ? 'bg-[#1f3a36] text-[#9fd0c4]' : 'bg-[#e7f3ef] text-[#234946]'}`}>
                            {nextSession.status === 'live' ? ' Live' : formatCountdown(nextSession.start_time) || 'Upcoming'}
                          </span>
                          <button
                            onClick={() => navigate(`/class/${nextSession.class_id}/live`)}
                            className="text-xs font-semibold text-[#2d5a56] hover:underline"
                          >
                            Open <FaChevronRight className="inline text-[10px]" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className={`text-sm ${muted}`}>No sessions scheduled yet.</p>
                    )}
                  </section>

                  {/* Quick actions */}
                  <section className={`rounded-3xl border p-5 ${card}`}>
                    <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${muted}`}>Quick Access</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'My Classes',   icon: FaBook,      action: () => setActiveTab('classes'),  color: dm ? 'bg-[#1a2f2c] text-[#9fd0c4]' : 'bg-[#e7f3ef] text-[#234946]' },
                        { label: 'Live',         icon: FaWifi,      action: () => setActiveTab('sessions'), color: dm ? 'bg-[#2a1f1f] text-[#e8a0a0]' : 'bg-[#fdeaea] text-[#c45b5b]' },
                        { label: 'Chat',         icon: FaComments,  action: () => navigate('/chat'),       color: dm ? 'bg-[#1f263a] text-[#9fb6ff]' : 'bg-[#edf0ff] text-[#3655c9]' },
                        { label: 'Reels',        icon: FaFilm,      action: () => navigate('/reels'),       color: dm ? 'bg-[#1e1f2a] text-[#a0a8e8]' : 'bg-[#eeeffe] text-[#5b5bc4]' },
                        { label: 'Holy Mushaf',  icon: FaBookOpen,  action: () => navigate('/mushaf'),      color: dm ? 'bg-[#1f2e1f] text-[#9fd09f]' : 'bg-[#edf6ee] text-[#4f775c]' },
                      ].map(q => (
                        <button
                          key={q.label}
                          onClick={q.action}
                          className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition hover:opacity-80 ${q.color}`}
                        >
                          <q.icon className="shrink-0" />
                          <span className="leading-tight">{q.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <OnboardingChecklistCard
                  title="Student Launch Checklist"
                  subtitle="Complete these steps to unlock your full learning flow."
                  items={onboardingItems}
                  className={dm ? 'border-[#1f2a34] bg-[#161d24]' : ''}
                />

                {/* Classes grid */}
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className={`text-lg font-bold ${text}`}>My Classes</h2>
                    {classes.length > 4 && (
                      <button
                        onClick={() => setActiveTab('classes')}
                        className="flex items-center gap-1 text-sm font-semibold text-[#2d5a56] hover:underline"
                      >
                        View all <FaArrowRight className="text-xs" />
                      </button>
                    )}
                  </div>

                  {classes.length === 0 ? (
                    <div className={`rounded-3xl border p-8 text-center ${card}`}>
                      <FaBook className="mx-auto mb-3 text-3xl text-[#2d5a56] opacity-40" />
                      <p className={`font-semibold ${text}`}>No Classes Yet</p>
                      <p className={`mt-1 text-sm ${muted}`}>Join a class using an invite code from your teacher.</p>
                      <button
                        onClick={() => setShowJoinModal(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
                      >
                        <FaPlus /> Join Your First Class
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {classes.slice(0, 4).map(cls => (
                        <ClassCard key={cls.id} classData={cls} onClick={() => navigate(`/class/${cls.id}`)} />
                      ))}
                    </div>
                  )}
                </section>

                {/* Recent activity */}
                {activity.length > 0 && (
                  <section className={`rounded-3xl border ${card}`}>
                    <div className={`border-b px-5 py-4 ${divider}`}>
                      <h2 className={`font-bold ${text}`}>Recent Activity</h2>
                    </div>
                    <ul className="px-3 py-2">
                      {activity.slice(0, 5).map((item, i) => (
                        <li key={item.id || i} className={`flex items-start gap-3 rounded-2xl px-3 py-3 transition ${cardHover}`}>
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${dm ? 'bg-[#1f3a36] text-[#9fd0c4]' : 'bg-[#e7f3ef] text-[#234946]'}`}>
                            <FaCheckCircle className="text-sm" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium ${text}`}>{item.text || 'Activity recorded'}</p>
                            <p className={`text-xs ${muted}`}>{timeAgo(item.time)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}

            {/*  CLASSES tab  */}
            {activeTab === 'classes' && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className={`text-xl font-bold ${text}`}>My Classes</h2>
                    <p className={`text-sm ${muted}`}>{classes.length} enrolled class{classes.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
                  >
                    <FaPlus /> Join Class
                  </button>
                </div>

                {classes.length === 0 ? (
                  <EmptyState
                    icon={FaBook}
                    title="No Classes Yet"
                    description="Join a class using an invite code from your teacher."
                    action={
                      <button
                        onClick={() => setShowJoinModal(true)}
                        className="rounded-2xl bg-[#2d5a56] px-6 py-3 text-sm font-semibold text-white hover:bg-[#234946]"
                      >
                        Join Your First Class
                      </button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {classes.map(cls => (
                      <ClassCard key={cls.id} classData={cls} onClick={() => navigate(`/class/${cls.id}`)} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/*  REELS tab  */}
            {activeTab === 'reels' && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className={`text-xl font-bold ${text}`}>Learning Reels</h2>
                    <p className={`text-sm ${muted}`}>Short lessons from your classes</p>
                  </div>
                  <button
                    onClick={() => navigate('/reels')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d5a56] hover:underline"
                  >
                    Full Feed <FaArrowRight className="text-xs" />
                  </button>
                </div>

                {reels.length === 0 ? (
                  <EmptyState icon={FaFilm} title="No Reels Available" description="Reels from your enrolled classes will appear here." />
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {reels.map(reel => (
                      <ReelCard key={reel.id} reel={reel} onClick={() => navigate('/reels')} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/*  SESSIONS tab  */}
            {activeTab === 'sessions' && (
              <section>
                <div className="mb-4">
                  <h2 className={`text-xl font-bold ${text}`}>Live Sessions</h2>
                  <p className={`text-sm ${muted}`}>Scheduled and ongoing sessions from your classes</p>
                </div>

                {sessions.length === 0 ? (
                  <EmptyState icon={FaVideo} title="No Sessions Scheduled" description="Live sessions will appear here when your teacher schedules them." />
                ) : (
                  <div className="space-y-4">
                    {sessions.map(session => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onClick={() => session.class_id && navigate(`/class/${session.class_id}`)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'chat' && (
              <section>
                <div className="mb-4">
                  <h2 className={`text-xl font-bold ${text}`}>Class Chats</h2>
                  <p className={`text-sm ${muted}`}>Open any class chat and see who is online.</p>
                </div>

                {classes.length === 0 ? (
                  <EmptyState icon={FaComments} title="No Class Chats Yet" description="Join a class first to access class chat." />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {classes.map((cls) => (
                      <div key={cls.id} className={`rounded-3xl border p-5 ${card}`}>
                        <p className={`truncate text-lg font-bold ${text}`}>{cls.name}</p>
                        <p className={`mt-1 text-sm ${muted}`}>Chat with teachers and classmates in real time.</p>
                        <button
                          onClick={() => navigate(`/class/${cls.id}/chat`)}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
                        >
                          <FaComments className="text-xs" /> Open Chat
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

          </main>
        </div>
      </div>

      {/*  Bottom nav (mobile / tablet)  */}
      <nav className={`fixed inset-x-0 bottom-0 z-30 border-t xl:hidden ${dm ? 'border-[#1e2730] bg-[#0f1419]/95' : 'border-[#dde4de] bg-white/95'} backdrop-blur-md`}>
        <div className="grid grid-cols-5">
          {[
            { id: 'home',     label: 'Home',    icon: FaHome },
            { id: 'classes',  label: 'Classes', icon: FaBook },
            { id: 'chat',     label: 'Chat',    icon: FaComments },
            { id: 'reels',    label: 'Reels',   icon: FaFilm },
            { id: 'sessions', label: 'Live',    icon: FaVideo },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id === 'chat') {
                  navigate('/chat');
                  return;
                }
                setActiveTab(id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-semibold transition ${
                activeTab === id
                  ? dm ? 'text-[#9fd0c4]' : 'text-[#234946]'
                  : dm ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`mb-0.5 rounded-xl px-4 py-1 ${activeTab === id ? dm ? 'bg-[#1f3a36]' : 'bg-[#e7f3ef]' : ''}`}>
                <Icon className="text-base" />
              </div>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/*  Join modal  */}
      {showJoinModal && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center">
          <div className={`w-full overflow-hidden rounded-t-[28px] border sm:max-w-md sm:rounded-[28px] ${dm ? 'border-[#1f2a34] bg-[#161d24]' : 'border-[#dce4de] bg-white'}`}>
            <div className={`border-b px-6 py-5 ${divider}`}>
              <h3 className={`text-xl font-bold ${text}`}>Join a Class</h3>
              <p className={`mt-1 text-sm ${muted}`}>Enter the invite code your teacher shared.</p>
            </div>
            <form onSubmit={handleJoinClass} className="space-y-4 p-6">
              <div>
                <label className={`mb-2 block text-sm font-semibold ${text}`}>Invite Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
                  placeholder="e.g., e.g., a3f2b1c8..."
                  className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition focus:ring-4 ${dm ? 'border-[#1f2a34] bg-[#0f1419] text-slate-100 focus:border-[#3a6b62] focus:ring-[#1a3530]' : 'border-[#d7ded9] bg-[#f6f8f6] text-slate-800 focus:border-[#7ea89c] focus:ring-[#dcece6]'}`}
                  required
                  autoFocus
                />
              </div>
              {joinError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{joinError}</div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={joining || !joinCode.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-60"
                >
                  {joining && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {joining ? 'Joining...' : 'Join Class'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinError(''); }}
                  className={`rounded-2xl border px-5 py-3 text-sm font-semibold transition ${dm ? 'border-[#1f2a34] text-slate-300 hover:bg-[#1f2a34]' : 'border-[#d7ded9] text-slate-600 hover:bg-[#f5f7f5]'}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;