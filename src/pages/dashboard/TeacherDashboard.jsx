import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaBell,
  FaBook,
  FaBookOpen,
  FaBullhorn,
  FaChartLine,
  FaCheck,
  FaComments,
  FaClock,
  FaCopy,
  FaFilm,
  FaHome,
  FaMoon,
  FaPlus,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaTimes,
  FaUserCircle,
  FaUserPlus,
  FaUsers,
  FaVideo,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ClassCard, { COVERS } from '../../components/dashboard/ClassCard';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import EmptyState from '../../components/dashboard/EmptyState';
import OnboardingChecklistCard from '../../components/dashboard/OnboardingChecklistCard';
import ReelCard from '../../components/dashboard/ReelCard';
import SessionCard from '../../components/dashboard/SessionCard';
import NotificationBell from '../../components/common/NotificationBell';

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = item?.id ?? `${item?.class_id || 'item'}-${item?.title || item?.text || index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [reels, setReels] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', description: '', cover_color: 'teal' });
  const [createdClass, setCreatedClass] = useState(null); // { name, invite_code }  shown after creation
  const [codeCopied, setCodeCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('teacher-dashboard-dark-mode') === 'true'
  );
  const [countdown, setCountdown] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [announceText, setAnnounceText] = useState('');
  const [announceClassId, setAnnounceClassId] = useState('all');
  const [announceSent, setAnnounceSent] = useState(false);

  useEffect(() => {
    localStorage.setItem('teacher-dashboard-dark-mode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    const next = sessions
      .filter((s) => s.status === 'upcoming' || s.status === 'live')
      .sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0))[0];
    const startTime = next?.start_time;
    if (!startTime) { setCountdown(''); return; }
    function tick() {
      const diff = new Date(startTime) - Date.now();
      if (diff <= 0) { setCountdown('Starting now'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `in ${h}h ${m}m` : m > 0 ? `in ${m}m ${s}s` : `in ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessions]);

  async function loadDashboardData(isCancelled = () => false) {
    if (!isCancelled()) {
      setIsDashboardLoading(true);
      setError('');
    }
    try {
      const [classesResult, activityResult] = await Promise.allSettled([
        api.get('/api/classes'),
        api.get('/api/activity'),
      ]);

      const nextClasses =
        classesResult.status === 'fulfilled' ? normalizeList(classesResult.value.data) : [];
      const nextActivity =
        activityResult.status === 'fulfilled' ? normalizeList(activityResult.value.data) : [];

      if (isCancelled()) return;

      setClasses(nextClasses);
      setActivity(nextActivity);

      const classIds = nextClasses.map((cls) => cls.id).filter(Boolean).slice(0, 4);

      if (classIds.length === 0) {
        setReels([]);
        setSessions([]);
      } else {
        const [reelResults, sessionResults] = await Promise.all([
          Promise.allSettled(
            classIds.map((classId) => api.get(`/api/reels?class_id=${classId}&limit=4&offset=0`))
          ),
          Promise.allSettled(
            classIds.map((classId) =>
              api.get(`/api/sessions?class_id=${classId}&limit=4&offset=0`)
            )
          ),
        ]);

        if (isCancelled()) return;

        const nextReels = uniqueById(
          reelResults.flatMap((result, index) => {
            if (result.status !== 'fulfilled') return [];
            return normalizeList(result.value.data).map((reel) => ({
              ...reel,
              class_id: reel.class_id || classIds[index],
              videoUrl: reel.videoUrl || reel.url,
            }));
          })
        );

        const nextSessions = uniqueById(
          sessionResults.flatMap((result, index) => {
            if (result.status !== 'fulfilled') return [];
            return normalizeList(result.value.data).map((session) => ({
              ...session,
              class_id: session.class_id || classIds[index],
            }));
          })
        );

        setReels(nextReels);
        setSessions(nextSessions);
      }

      if (classesResult.status === 'rejected' && activityResult.status === 'rejected') {
        setError('Failed to load dashboard data.');
      } else if (classesResult.status === 'rejected') {
        setError('Classes are temporarily unavailable.');
      }
    } catch (loadError) {
      if (isCancelled()) return;
      setClasses([]);
      setReels([]);
      setSessions([]);
      setActivity([]);
      setError(loadError.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      if (!isCancelled()) setIsDashboardLoading(false);
    }
  }

  useEffect(() => {
    if (authLoading) return undefined;
    let cancelled = false;
    loadDashboardData(() => cancelled);
    return () => { cancelled = true; };
  }, [authLoading]);

  async function handleCreateClass(event) {
    event.preventDefault();
    try {
      const res = await api.post('/api/classes', newClass);
      const created = res.data?.data || res.data;
      setNewClass({ name: '', description: '', cover_color: 'teal' });
      setCreatedClass({ name: created.name, invite_code: created.invite_code });
      await loadDashboardData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create class.');
    }
  }

  function handleCloseCreateModal() {
    setShowCreateModal(false);
    setCreatedClass(null);
    setCodeCopied(false);
    setNewClass({ name: '', description: '', cover_color: 'teal' });
  }

  function handleCopyInviteCode(code) {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  async function handleAnnounce(e) {
    e.preventDefault();
    if (!announceText.trim()) return;
    try {
      const targets = announceClassId === 'all' ? classes.map((c) => c.id) : [Number(announceClassId)];
      await Promise.all(
        targets.map((classId) =>
          api.post('/api/announcements', { class_id: classId, content: announceText.trim() })
        )
      );
      setAnnounceText('');
      setAnnounceSent(true);
      setTimeout(() => setAnnounceSent(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send announcement.');
    }
  }

  const upcomingSessions = sessions
    .filter((s) => s.status === 'upcoming' || s.status === 'live')
    .sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0))
    .slice(0, 3);

  const liveCount = sessions.filter((s) => s.status === 'live').length;
  const totalStudents = classes.reduce((sum, cls) => sum + (Number(cls.memberCount) || 0), 0);
  const featuredSession = upcomingSessions[0] || null;
  const featuredClasses = classes.slice(0, 2);
  const featuredReels = reels.slice(0, 4);
  const userName = user?.name || 'Teacher';
  const userFirstName = userName.split(' ')[0] || userName;
  const notifications = Math.min(9, activity.length + liveCount);
  const onboardingItems = [
    {
      id: 'create-class',
      label: 'Create your first class',
      hint: 'Set up a class and generate an invite code.',
      done: classes.length > 0,
      onClick: () => setShowCreateModal(true),
    },
    {
      id: 'invite-students',
      label: 'Bring in your students',
      hint: 'Share class invite codes and build attendance.',
      done: totalStudents > 0,
      onClick: () => setActiveTab('classes'),
    },
    {
      id: 'schedule-session',
      label: 'Schedule a live session',
      hint: 'Run your first real-time lesson.',
      done: sessions.length > 0,
      onClick: () => setActiveTab('sessions'),
    },
    {
      id: 'publish-reel',
      label: 'Publish a learning reel',
      hint: 'Post a short revision clip for your class.',
      done: reels.length > 0,
      onClick: () => setActiveTab('reels'),
    },
  ];

  const stats = [
    { label: 'Classes Created', value: classes.length, icon: FaBook, tone: 'bg-[#edf3f8] text-[#46698e]' },
    { label: 'Total Students', value: totalStudents, icon: FaUsers, tone: 'bg-[#ebf6ef] text-[#4f775c]' },
    { label: 'Reels Uploaded', value: reels.length, icon: FaFilm, tone: 'bg-[#fff0e7] text-[#c26d32]' },
    { label: 'Live Sessions', value: liveCount, icon: FaVideo, tone: 'bg-[#fdecec] text-[#c45b5b]' },
  ];

  const shellClass = darkMode
    ? 'min-h-screen bg-[#181c1f] text-slate-100'
    : 'min-h-screen bg-[#f7f8f5] text-slate-800';
  const cardClass = darkMode
    ? 'rounded-[30px] border border-[#283038] bg-[#1f262d] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.22)] sm:p-6 lg:p-7'
    : 'rounded-[30px] border border-[#e3e7e3] bg-white p-5 shadow-[0_12px_32px_rgba(17,24,39,0.05)] sm:p-6 lg:p-7';
  const mutedTextClass = darkMode ? 'text-slate-400' : 'text-slate-500';

  const renderSectionCard = (title, description, action, content) => (
    <section className={cardClass}>
      <div
        className={`mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4 ${
          darkMode ? 'border-[#2c353d]' : 'border-[#edf0ed]'
        }`}
      >
        <div>
          <h2
            className={
              darkMode
                ? 'text-2xl font-bold tracking-tight text-white'
                : 'text-2xl font-bold tracking-tight text-slate-900'
            }
          >
            {title}
          </h2>
          {description && <p className={`mt-1 text-sm ${mutedTextClass}`}>{description}</p>}
        </div>
        {action}
      </div>
      {content}
    </section>
  );

  if (authLoading || isDashboardLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8f5]" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="h-36 animate-pulse rounded-4xl bg-gradient-to-br from-[#c8dbd8] to-[#b5ccc8]" />
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-[#dde7e3]" />
            ))}
          </div>
          <div className="h-28 animate-pulse rounded-3xl bg-[#dde7e3]" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]">
            <div className="space-y-4">
              <div className="h-64 animate-pulse rounded-[30px] bg-[#dde7e3]" />
              <div className="h-40 animate-pulse rounded-[30px] bg-[#dde7e3]" />
            </div>
            <div className="space-y-4">
              <div className="h-52 animate-pulse rounded-[30px] bg-[#c8dbd8]" />
              <div className="h-40 animate-pulse rounded-[30px] bg-[#dde7e3]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass} style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={
            darkMode
              ? 'hidden xl:flex xl:w-72 xl:flex-col xl:bg-[#1a232a] xl:px-5 xl:py-6 xl:text-white'
              : 'hidden xl:flex xl:w-72 xl:flex-col xl:bg-[#182c31] xl:px-5 xl:py-6 xl:text-white'
          }
        >
          <div className="mb-8 space-y-1 px-3">
            <div
              className={
                darkMode
                  ? 'text-[32px] font-bold tracking-tight text-[#b6f2d6]'
                  : 'text-[32px] font-bold tracking-tight text-[#d3ece4]'
              }
            >
              Mahfuz
            </div>
            <p className={darkMode ? 'text-sm text-slate-400' : 'text-sm text-slate-300'}>
              Teacher Portal
            </p>
          </div>

          <DashboardSidebar
            activeTab={activeTab}
            onTabChange={(id) => {
              if (id === 'chat') {
                navigate('/chat');
                return;
              }
              setActiveTab(id);
            }}
          />

          <div
            className={
              darkMode
                ? 'mt-auto rounded-3xl border border-white/10 bg-white/5 p-4'
                : 'mt-auto rounded-3xl border border-white/8 bg-white/6 p-4'
            }
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className={
                  darkMode
                    ? 'flex h-12 w-12 items-center justify-center rounded-full bg-[#234946] text-base font-bold text-white'
                    : 'flex h-12 w-12 items-center justify-center rounded-full bg-[#2b5752] text-base font-bold text-white'
                }
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Profile" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span>{userFirstName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{userName}</p>
                <p className={darkMode ? 'text-sm text-slate-400' : 'text-sm text-slate-300'}>
                  Teacher Account
                </p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className={
                darkMode
                  ? 'flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus:outline-none'
                  : 'flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/8 focus:outline-none'
              }
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top Header */}
          <header
            className={`sticky top-0 z-20 border-b ${
              darkMode
                ? 'border-[#23272b] bg-[#181c1f]/95'
                : 'border-[#e4e8e4] bg-[#f7f8f5]/90'
            } backdrop-blur`}
          >
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="min-w-0 xl:hidden flex items-center gap-3">
                <div
                  className={
                    darkMode
                      ? 'text-2xl font-bold tracking-tight text-[#b6f2d6]'
                      : 'text-2xl font-bold tracking-tight text-[#234946]'
                  }
                >
                  Mahfuz
                </div>
                <span className={darkMode ? 'hidden sm:inline text-xs text-slate-400' : 'hidden sm:inline text-xs text-slate-500'}>
                  Teacher Dashboard
                </span>
              </div>

              <div
                className={
                  darkMode
                    ? 'hidden flex-1 md:flex md:max-w-xl md:items-center md:gap-3 md:rounded-full md:border md:border-[#23272b] md:bg-[#23272b] md:px-4 md:py-3 md:shadow-sm'
                    : 'hidden flex-1 md:flex md:max-w-xl md:items-center md:gap-3 md:rounded-full md:border md:border-[#dfe5e0] md:bg-white md:px-4 md:py-3 md:shadow-sm'
                }
              >
                <FaSearch className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search classes, reels, sessions..."
                  className={
                    darkMode
                      ? 'w-full border-0 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400'
                      : 'w-full border-0 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400'
                  }
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileSearchOpen((o) => !o)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition focus:outline-none md:hidden ${
                    darkMode
                      ? 'border-[#23272b] bg-[#23272b] text-slate-300 hover:text-white'
                      : 'border-[#dfe5e0] bg-white text-slate-500 hover:text-[#2d5a56]'
                  }`}
                  aria-label="Toggle search"
                >
                  {mobileSearchOpen ? <FaTimes /> : <FaSearch />}
                </button>
                <button
                  onClick={() => setDarkMode((c) => !c)}
                  className={
                    darkMode
                      ? 'flex h-11 w-11 items-center justify-center rounded-full border border-[#23272b] bg-[#23272b] text-[#b6f2d6] shadow-sm transition hover:text-[#b6f2d6] focus:outline-none'
                      : 'flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe5e0] bg-white text-slate-500 shadow-sm transition hover:text-[#2d5a56] focus:outline-none'
                  }
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? <FaSun /> : <FaMoon />}
                </button>
                <NotificationBell darkMode={darkMode} />
                <button
                  onClick={() => setShowCreateModal(true)}
                  className={
                    darkMode
                      ? 'hidden items-center gap-2 rounded-full bg-[#234946] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(45,90,86,0.22)] transition hover:bg-[#1a232a] sm:inline-flex'
                      : 'hidden items-center gap-2 rounded-full bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(45,90,86,0.22)] transition hover:bg-[#234946] sm:inline-flex'
                  }
                >
                  <FaPlus />
                  New Class
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  title="My Profile"
                  className={
                    darkMode
                      ? 'flex h-11 w-11 items-center justify-center rounded-full bg-[#1a232a] text-sm font-bold text-[#b6f2d6] transition hover:ring-2 hover:ring-[#2d5a56]'
                      : 'flex h-11 w-11 items-center justify-center rounded-full bg-[#dce8e2] text-sm font-bold text-[#234946] transition hover:ring-2 hover:ring-[#2d5a56]'
                  }
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Profile" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <FaUserCircle className="text-2xl" />
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Search Bar */}
          {mobileSearchOpen && (
            <div className={`border-b px-4 py-2 md:hidden ${
              darkMode ? 'border-[#23272b] bg-[#181c1f]' : 'border-[#e4e8e4] bg-[#f7f8f5]'
            }`}>
              <div className={`flex items-center gap-2 rounded-full border px-4 py-2.5 ${
                darkMode ? 'border-[#2c353d] bg-[#1f262d]' : 'border-[#dfe5e0] bg-white'
              }`}>
                <FaSearch className="shrink-0 text-sm text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search classes, sessions, reels..."
                  className={`flex-1 border-0 bg-transparent text-sm outline-none ${
                    darkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'
                  }`}
                />
                <button onClick={() => setMobileSearchOpen(false)} className="text-slate-400 transition hover:text-slate-600">
                  <FaTimes className="text-sm" />
                </button>
              </div>
            </div>
          )}

          {/* Main Body */}
          <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 pb-28 sm:px-6 lg:px-8 xl:pb-8">
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{error}</span>
                <button
                  onClick={() => setError('')}
                  className="font-semibold text-red-500 transition hover:text-red-700"
                >
                  Close
                </button>
              </div>
            )}

            {/* Hero Section */}
            <section
              className={`overflow-hidden rounded-4xl shadow-[0_24px_60px_rgba(31,74,71,0.22)] ${
                darkMode
                  ? 'bg-gradient-to-br from-[#1a2e2b] via-[#132420] to-[#0f1c1a]'
                  : 'bg-gradient-to-br from-[#1f4a47] via-[#2d5a56] to-[#1a3b38]'
              }`}
            >
              <div className="relative overflow-hidden p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -bottom-10 right-32 h-36 w-36 rounded-full bg-white/4" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/15 text-white">
                        {user?.avatarUrl
                          ? <img src={user.avatarUrl} alt="Profile" className="h-16 w-16 object-cover" />
                          : <FaUserCircle className="text-4xl" />}
                      </div>
                      {liveCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg">
                          {liveCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/55" style={{ fontFamily: 'Noto Naskh Arabic, serif' }}> </p>
                      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        Assalamu Alaikum, {userFirstName}
                      </h1>
                      <p className="mt-1 text-sm text-white/60">
                        {classes.length > 0
                          ? `${totalStudents} student${totalStudents !== 1 ? 's' : ''}  ${classes.length} class${classes.length !== 1 ? 'es' : ''}`
                          : 'Create your first class to begin teaching.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#1f4a47] shadow transition hover:bg-[#f0f9f5] active:scale-95"
                    >
                      <FaPlus /> New Class
                    </button>
                    <button
                      onClick={() => setActiveTab('sessions')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                    >
                      <FaVideo /> Sessions
                      {liveCount > 0 && (
                        <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">{liveCount}</span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('classes')}
                      className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                    >
                      <FaBook /> Classes
                    </button>
                    <button
                      onClick={() => navigate('/mushaf')}
                      className="hidden lg:inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                    >
                      <FaBookOpen /> Raise Mushaf
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {stats.map((stat, i) => {
                const Icon = stat.icon;
                const lightGradients = [
                  'from-[#edf3f8] to-[#dce9f5]',
                  'from-[#e8f6ec] to-[#d4edda]',
                  'from-[#fff3e8] to-[#ffe8cf]',
                  'from-[#fdecec] to-[#fad8d8]',
                ];
                const darkGradients = [
                  'from-[#1e3a5f]/50 to-[#162e4a]/50',
                  'from-[#1b3829]/50 to-[#13291f]/50',
                  'from-[#3d2a14]/50 to-[#2e1f0e]/50',
                  'from-[#3d1c1c]/50 to-[#2e1414]/50',
                ];
                const gradClass = darkMode ? darkGradients[i] : lightGradients[i];
                return (
                  <div
                    key={stat.label}
                    className={`rounded-3xl bg-gradient-to-br ${gradClass} p-5 shadow-[0_8px_20px_rgba(17,24,39,0.06)] ${
                      darkMode ? 'border border-[#283038]' : ''
                    }`}
                  >
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${stat.tone}`}>
                      <Icon className="text-base" />
                    </div>
                    <p className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {stat.value}
                    </p>
                    <p className={`mt-1 text-xs font-medium ${mutedTextClass}`}>{stat.label}</p>
                  </div>
                );
              })}
            </section>

            {/* Quick Actions */}
            <section className={`rounded-3xl border ${
              darkMode ? 'border-[#283038] bg-[#1f262d]' : 'border-[#e3e7e3] bg-white'
            } p-5 shadow-[0_8px_20px_rgba(17,24,39,0.04)]`}>
              <p className={`mb-4 text-xs font-semibold uppercase tracking-widest ${mutedTextClass}`}>Quick Actions</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {[
                  { label: 'New Class', icon: FaPlus, action: () => setShowCreateModal(true), accent: 'bg-[#e7f3ef] text-[#234946]' },
                  { label: 'Invite Students', icon: FaUserPlus, action: () => setActiveTab('classes'), accent: 'bg-[#edf3f8] text-[#46698e]' },
                  { label: 'Open Chat', icon: FaComments, action: () => navigate('/chat'), accent: 'bg-[#edf0ff] text-[#3655c9]' },
                  { label: 'Raise Mushaf', icon: FaBookOpen, action: () => navigate('/mushaf'), accent: 'bg-[#f2ebfb] text-[#7d57b1]' },
                  { label: 'View Reels', icon: FaFilm, action: () => setActiveTab('reels'), accent: 'bg-[#fff0e7] text-[#c26d32]' },
                  { label: 'Announce', icon: FaBullhorn, action: () => { setActiveTab('dashboard'); setTimeout(() => document.getElementById('announce-field')?.focus(), 50); }, accent: 'bg-[#fef9c3] text-[#854d0e]' },
                ].map(({ label, icon: Icon, action, accent }) => (
                  <button
                    key={label}
                    onClick={action}
                    className={`flex flex-col items-center gap-2.5 rounded-2xl border ${
                      darkMode ? 'border-[#2c353d] hover:bg-[#252d35]' : 'border-[#eef1ee] hover:bg-[#f8faf8]'
                    } p-4 text-center transition active:scale-95`}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>
                      <Icon className="text-base" />
                    </div>
                    <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]">
                <div className="space-y-6">
                  <OnboardingChecklistCard
                    title="Teacher Launch Checklist"
                    subtitle="Finish these to run your classes smoothly."
                    items={onboardingItems}
                    darkMode={darkMode}
                  />

                  {/* Announce Broadcast */}
                  {classes.length > 0 && (
                    <section className={`rounded-3xl border ${
                      darkMode ? 'border-[#283038] bg-[#1f262d]' : 'border-[#e3e7e3] bg-white'
                    } p-5 shadow-[0_8px_20px_rgba(17,24,39,0.04)]`}>
                      <form onSubmit={handleAnnounce}>
                        <div className="flex gap-3">
                          <div className={`mt-2.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                            darkMode ? 'bg-[#2c353d] text-[#b6f2d6]' : 'bg-[#e7f3ef] text-[#234946]'
                          }`}>
                            <FaBullhorn className="text-sm" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              id="announce-field"
                              type="text"
                              value={announceText}
                              onChange={(e) => setAnnounceText(e.target.value)}
                              placeholder="Post an announcement to your students..."
                              maxLength={300}
                              className={`w-full rounded-2xl border px-4 py-2.5 text-sm outline-none transition ${
                                darkMode
                                  ? 'border-[#2c353d] bg-[#181f25] text-slate-100 placeholder:text-slate-500 focus:border-[#3a5048]'
                                  : 'border-[#dfe5e0] bg-[#f6f8f6] text-slate-800 placeholder:text-slate-400 focus:border-[#7ea89c] focus:bg-white'
                              }`}
                            />
                            <div className="flex items-center gap-2">
                              <select
                                value={announceClassId}
                                onChange={(e) => setAnnounceClassId(e.target.value)}
                                className={`flex-1 rounded-xl border px-3 py-2 text-xs font-medium outline-none ${
                                  darkMode
                                    ? 'border-[#2c353d] bg-[#181f25] text-slate-300'
                                    : 'border-[#dfe5e0] bg-[#f6f8f6] text-slate-600'
                                }`}
                              >
                                <option value="all">All Classes</option>
                                {classes.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                disabled={!announceText.trim()}
                                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-40 ${
                                  announceSent ? 'bg-green-500 text-white' : 'bg-[#2d5a56] text-white hover:bg-[#234946]'
                                }`}
                              >
                                {announceSent ? <FaCheck className="text-[10px]" /> : <FaBullhorn className="text-[10px]" />}
                                {announceSent ? 'Sent!' : 'Send'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>
                    </section>
                  )}

                  {renderSectionCard(
                    'My Classes',
                    'Classes you teach and manage.',
                    <button
                      onClick={() => setActiveTab('classes')}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d5a56] transition hover:text-[#234946]"
                    >
                      View All <FaArrowRight className="text-xs" />
                    </button>,
                    classes.length === 0 ? (
                      <div className="space-y-5 py-2">
                        <p className={`text-sm ${mutedTextClass}`}>Follow these 3 steps to start teaching.</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          {[
                            { step: 1, title: 'Create a Class', desc: 'Set up your first class and receive a unique invite code.', icon: FaBook, cta: 'Create Class', action: () => setShowCreateModal(true) },
                            { step: 2, title: 'Invite Students', desc: 'Share the invite code so your students can join instantly.', icon: FaUserPlus, cta: null, action: null },
                            { step: 3, title: 'Start a Session', desc: 'Schedule a live session and teach in real time.', icon: FaVideo, cta: 'Sessions', action: () => setActiveTab('sessions') },
                          ].map(({ step, title, desc, icon: StepIcon, cta, action }) => (
                            <div key={step} className={`relative rounded-3xl border p-5 ${
                              darkMode ? 'border-[#2c353d] bg-[#181f25]' : 'border-[#eef1ee] bg-[#f8faf8]'
                            }`}>
                              <span className={`mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                darkMode ? 'bg-[#234946] text-[#b6f2d6]' : 'bg-[#e7f3ef] text-[#234946]'
                              }`}>
                                {step}
                              </span>
                              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${
                                darkMode ? 'bg-[#1f2d2b] text-[#5db89a]' : 'bg-white text-[#2d5a56]'
                              } shadow-sm`}>
                                <StepIcon className="text-base" />
                              </div>
                              <h4 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
                              <p className={`mt-1 text-xs leading-5 ${mutedTextClass}`}>{desc}</p>
                              {action && (
                                <button onClick={action} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#2d5a56] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#234946] active:scale-95">
                                  {cta} <FaArrowRight className="text-[9px]" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        {featuredClasses.map((cls) => (
                          <div key={cls.id} className="flex flex-col gap-2">
                            <ClassCard
                              classData={cls}
                              onClick={() => navigate(`/class/${cls.id}`)}
                            />
                            <div className="flex gap-2 px-1">
                              <button
                                onClick={() => navigate(`/class/${cls.id}/members`)}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#d4e4dc] bg-white py-2 text-xs font-semibold text-[#2d5a56] transition hover:bg-[#f0f9f5]" 
                              >
                                <FaUserPlus className="text-[10px]" /> Add Students
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await api.get(`/api/classes/${cls.id}`);
                                    const code = res.data?.invite_code || res.data?.data?.invite_code || '';
                                    if (code) { navigator.clipboard.writeText(code); }
                                  } catch {}
                                }}
                                className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#d4e4dc] bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:bg-[#f5f7f5]"
                                title="Copy invite code"
                              >
                                <FaCopy className="text-[10px]" /> Copy Code
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {renderSectionCard(
                    'My Reels',
                    'Short content you have uploaded for your students.',
                    <button
                      onClick={() => navigate('/reels')}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d5a56] transition hover:text-[#234946]"
                    >
                      Go to Reels <FaArrowRight className="text-xs" />
                    </button>,
                    reels.length === 0 ? (
                      <EmptyState
                        icon={FaFilm}
                        title="No Reels Yet"
                        description="Upload short-form content for your students to watch."
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {featuredReels.map((reel) => (
                          <ReelCard key={reel.id} reel={reel} onClick={() => navigate('/reels')} />
                        ))}
                      </div>
                    )
                  )}
                </div>

                <div className="space-y-6">
                  {/* Upcoming Session Panel */}
                  <section className={`relative overflow-hidden rounded-[30px] shadow-[0_20px_50px_rgba(31,74,71,0.18)] ${
                    darkMode
                      ? 'bg-gradient-to-br from-[#1a2e2b] to-[#0f1c1a]'
                      : 'bg-gradient-to-br from-[#1f4a47] via-[#2d5a56] to-[#1a3b38]'
                  }`}>
                    <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
                    <div className="relative p-6 text-white">
                      <div className="mb-3 flex items-center gap-2">
                        {featuredSession?.status === 'live' ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200 ring-1 ring-red-400/30">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                            LIVE NOW
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                            <FaVideo className="text-[10px]" />
                            Next Session
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                        {featuredSession?.title || 'No Session Scheduled'}
                      </h2>
                      {countdown && featuredSession?.status !== 'live' && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-mono font-semibold text-white/80">
                          <FaClock className="text-[9px]" />
                          {countdown}
                        </div>
                      )}
                      <p className="mt-2 text-sm text-white/60">
                        {featuredSession?.description ||
                          'Schedule a live session to guide your students in real time.'}
                      </p>
                      <button
                        onClick={() => setActiveTab('sessions')}
                        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#1f4a47] transition hover:bg-[#ecf5f2] active:scale-95"
                      >
                        {featuredSession?.status === 'live' ? 'Join Now' : 'Manage Sessions'}
                        <FaArrowRight className="text-xs" />
                      </button>
                    </div>
                  </section>

                  {/* Recent Activity */}
                  {renderSectionCard(
                    'Recent Activity',
                    'Your latest actions and milestones.',
                    null,
                    activity.length === 0 ? (
                      <p className={`text-sm ${mutedTextClass}`}>
                        No recent activity yet. Your teaching actions will appear here.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {activity.slice(0, 5).map((item, index) => (
                          <div
                            key={item.id || `${item.text}-${index}`}
                            className={
                              darkMode
                                ? 'flex items-start gap-3 rounded-2xl border border-[#2c353d] bg-[#181f25] p-4'
                                : 'flex items-start gap-3 rounded-2xl border border-[#eef1ee] bg-[#f8faf8] p-4'
                            }
                          >
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f3ef] text-[#234946]">
                              <FaBookOpen className="text-base" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={
                                  darkMode
                                    ? 'text-sm font-semibold text-white'
                                    : 'text-sm font-semibold text-slate-900'
                                }
                              >
                                {item.text || 'Recent teaching activity'}
                              </p>
                              <p className={`mt-1 text-xs ${mutedTextClass}`}>{item.time || ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}

                  {/* Students Overview Panel */}
                  <section
                    className={
                      darkMode
                        ? 'rounded-[30px] border border-[#283038] bg-[#1f262d] p-6 shadow-[0_12px_30px_rgba(0,0,0,0.18)]'
                        : 'rounded-[30px] border border-[#e3e7e3] bg-[#f1f5ef] p-6 shadow-[0_12px_30px_rgba(17,24,39,0.04)]'
                    }
                  >
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#2d5a56] shadow-sm">
                      <FaUsers className="text-xl" />
                    </div>
                    <h3
                      className={
                        darkMode
                          ? 'text-2xl font-bold tracking-tight text-white'
                          : 'text-2xl font-bold tracking-tight text-slate-900'
                      }
                    >
                      Your Students
                    </h3>
                    <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                      You currently have{' '}
                      <span className="font-semibold text-[#2d5a56]">{totalStudents}</span> students
                      across{' '}
                      <span className="font-semibold text-[#2d5a56]">{classes.length}</span>{' '}
                      {classes.length === 1 ? 'class' : 'classes'}.
                    </p>
                    <button
                      onClick={() => setActiveTab('classes')}
                      className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
                    >
                      View Classes
                      <FaArrowRight className="text-xs" />
                    </button>
                  </section>
                </div>
              </div>
            )}

            {/* Classes Tab */}
            {activeTab === 'classes' &&
              renderSectionCard(
                'My Classes',
                'All classes you teach and manage.',
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
                >
                  <FaPlus /> Create New Class
                </button>,
                classes.length === 0 ? (
                  <EmptyState
                    icon={FaBook}
                    title="No Classes Yet"
                    description="Create a class to start teaching your students."
                    action={
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="rounded-2xl bg-[#2d5a56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
                      >
                        Create Your First Class
                      </button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    {classes.map((cls) => (
                      <div key={cls.id} className="flex flex-col gap-2">
                        <ClassCard
                          classData={cls}
                          onClick={() => navigate(`/class/${cls.id}`)}
                        />
                        <div className="flex gap-2 px-1">
                          <button
                            onClick={() => navigate(`/class/${cls.id}/members`)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-[#d4e4dc] bg-white py-2 text-xs font-semibold text-[#2d5a56] transition hover:bg-[#f0f9f5]"
                          >
                            <FaUserPlus className="text-[10px]" /> Add Students
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.get(`/api/classes/${cls.id}`);
                                const code = res.data?.invite_code || res.data?.data?.invite_code || '';
                                if (code) { navigator.clipboard.writeText(code); }
                              } catch {}
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#d4e4dc] bg-white px-4 py-2 text-xs font-semibold text-slate-500 transition hover:bg-[#f5f7f5]"
                            title="Copy invite code"
                          >
                            <FaCopy className="text-[10px]" /> Copy Code
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

            {/* Reels Tab */}
            {activeTab === 'reels' &&
              renderSectionCard(
                'My Reels',
                'Short-form content you have uploaded for your students.',
                reels.length > 0 ? (
                  <button
                    onClick={() => navigate('/reels')}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d5a56] transition hover:text-[#234946]"
                  >
                    Open Reel Feed <FaArrowRight className="text-xs" />
                  </button>
                ) : null,
                reels.length === 0 ? (
                  <EmptyState
                    icon={FaFilm}
                    title="No Reels Uploaded"
                    description="Upload short-form Quranic content for your students."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {reels.map((reel) => (
                      <ReelCard key={reel.id} reel={reel} onClick={() => navigate('/reels')} />
                    ))}
                  </div>
                )
              )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' &&
              renderSectionCard(
                'Live Sessions',
                'Manage and schedule live sessions for your students.',
                null,
                sessions.length === 0 ? (
                  <EmptyState
                    icon={FaVideo}
                    title="No Sessions Yet"
                    description="Schedule a live session to teach your students in real time."
                  />
                ) : (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onClick={() => {
                          if (session.class_id) navigate(`/class/${session.class_id}`);
                        }}
                      />
                    ))}
                  </div>
                )
              )}

            {activeTab === 'chat' &&
              renderSectionCard(
                'Class Chats',
                'Open a class conversation and see who is online now.',
                null,
                classes.length === 0 ? (
                  <EmptyState
                    icon={FaComments}
                    title="No Class Chats Yet"
                    description="Create a class first, then open chat for that class."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {classes.map((cls) => (
                      <div
                        key={cls.id}
                        className={
                          darkMode
                            ? 'rounded-3xl border border-[#2c353d] bg-[#181f25] p-5'
                            : 'rounded-3xl border border-[#e3e7e3] bg-[#f8faf8] p-5'
                        }
                      >
                        <p className={darkMode ? 'truncate text-lg font-bold text-white' : 'truncate text-lg font-bold text-slate-900'}>
                          {cls.name}
                        </p>
                        <p className={`mt-1 text-sm ${mutedTextClass}`}>
                          Chat with your students from this class room.
                        </p>
                        <button
                          onClick={() => navigate(`/class/${cls.id}/chat`)}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
                        >
                          <FaComments className="text-xs" /> Open Chat
                        </button>
                      </div>
                    ))}
                  </div>
                )
              )}
          </main>
        </div>
      </div>

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-[#dce4de] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.16)]">

            {/*  Step 2: show invite code after creation  */}
            {createdClass ? (
              <>
                <div className="border-b border-[#edf0ed] px-6 py-5">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f3ef]">
                    <FaCheck className="text-xl text-[#2d5a56]" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Class Created!</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    <span className="font-semibold text-slate-700">{createdClass.name}</span> is ready.
                    Share the code below with your students.
                  </p>
                </div>
                <div className="space-y-5 p-6">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Invite Code</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 rounded-2xl border-2 border-[#b8d8ce] bg-[#f2f9f6] px-5 py-4 font-mono text-2xl font-bold tracking-[0.18em] text-[#2d5a56] select-all">
                        {createdClass.invite_code}
                      </div>
                      <button
                        onClick={() => handleCopyInviteCode(createdClass.invite_code)}
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg transition ${
                          codeCopied ? 'bg-green-500 text-white' : 'bg-[#2d5a56] text-white hover:bg-[#234946]'
                        }`}
                        title="Copy code"
                      >
                        {codeCopied ? <FaCheck /> : <FaCopy />}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Students enter this code on their dashboard to join the class.
                      You can also find it anytime in the Members tab.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 border-t border-[#edf0ed] pt-4 sm:flex-row">
                    <button
                      onClick={() => { handleCloseCreateModal(); navigate(`/class/${classes.at(-1)?.id || ''}/members`); }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
                    >
                      <FaUserPlus /> Add Students
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseCreateModal}
                      className="flex-1 rounded-2xl border border-[#d7ded9] bg-[#f5f7f5] px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /*  Step 1: create form  */
              <>
                {/* Cover preview header */}
                <div className={`relative h-24 bg-gradient-to-br ${COVERS[newClass.cover_color]?.bg || COVERS.teal.bg} overflow-hidden`}>
                  <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/8" />
                  <div className="relative flex h-full items-center gap-4 px-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-2xl font-extrabold text-white">
                      {(newClass.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-lg font-bold text-white/90">{newClass.name || 'New Class'}</span>
                  </div>
                </div>
                <div className="border-b border-[#edf0ed] px-6 py-4">
                  <h3 className="text-xl font-bold text-slate-900">Create New Class</h3>
                  <p className="mt-0.5 text-sm text-slate-500">Set up a class and share the invite code with your students.</p>
                </div>
                <form onSubmit={handleCreateClass} className="space-y-5 p-6">
                  {/* Cover color picker */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Cover Color</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(COVERS).map(([key, c]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setNewClass({ ...newClass, cover_color: key })}
                          className={`h-8 w-8 rounded-xl bg-gradient-to-br ${c.bg} transition-all ${
                            newClass.cover_color === key ? 'ring-2 ring-offset-2 ring-[#2d5a56] scale-110' : 'opacity-70 hover:opacity-100'
                          }`}
                          title={key}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Class Name</label>
                    <input
                      type="text"
                      value={newClass.name}
                      onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                      placeholder="e.g., Tajweed Fundamentals"
                      className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                      required
                      maxLength="80"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Description <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      value={newClass.description}
                      onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                      placeholder="Briefly describe what students will learn..."
                      className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                      rows={3}
                      maxLength="300"
                    />
                  </div>
                  <div className="flex flex-col gap-3 border-t border-[#edf0ed] pt-4 sm:flex-row">
                    <button
                      type="submit"
                      className="flex-1 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
                    >
                      Create Class
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseCreateModal}
                      className="flex-1 rounded-2xl border border-[#d7ded9] bg-[#f5f7f5] px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      {/* Bottom nav (mobile / tablet) */}
      <nav className={`fixed inset-x-0 bottom-0 z-30 border-t xl:hidden ${darkMode ? 'border-[#23272b] bg-[#181c1f]/95' : 'border-[#dde4de] bg-white/95'} backdrop-blur-md`}>
        <div className="grid grid-cols-5">
          {[
            { id: 'dashboard', label: 'Home',    icon: FaHome  },
            { id: 'classes',   label: 'Classes', icon: FaBook  },
            { id: 'chat',      label: 'Chat',    icon: FaComments },
            { id: 'sessions',  label: 'Live',    icon: FaVideo },
            { id: 'reels',     label: 'Reels',   icon: FaFilm  },
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
                  ? darkMode ? 'text-[#9fd0c4]' : 'text-[#234946]'
                  : darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`mb-0.5 rounded-xl px-4 py-1 ${activeTab === id ? darkMode ? 'bg-[#1f3a36]' : 'bg-[#e7f3ef]' : ''}`}>
                <Icon className="text-base" />
              </div>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default TeacherDashboard;
