import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBell, FaBook, FaBookOpen, FaChalkboardTeacher,
  FaChartLine, FaHistory, FaMoon, FaSearch, FaSignOutAlt,
  FaSun, FaUserCircle, FaUsers, FaUserGraduate,
  FaVideo, FaArrowRight,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';
import OnboardingChecklistCard from '../../components/dashboard/OnboardingChecklistCard';

//  Helpers 

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const AVATAR_COLORS = [
  'bg-[#e7f3ef] text-[#234946]', 'bg-[#edf3f8] text-[#3a66b8]',
  'bg-[#f3effd] text-[#7d57b1]', 'bg-[#fff8e7] text-[#c26d32]',
  'bg-[#fdf0f0] text-[#c45b5b]',
];
function avatarLetter(name) { return (name || '?')[0].toUpperCase(); }
function avatarColor(name) {
  return AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length];
}

const ACTION_LABELS = {
  create: 'Created', update: 'Updated', delete: 'Deleted',
  join: 'Joined', leave: 'Left', upload: 'Uploaded',
  submit: 'Submitted', grade: 'Graded', approve: 'Approved',
  start_session: 'Started session', end_session: 'Ended session',
};

//  User table sub-component 

function UserTable({ users, roleLabel, cardBg, text, muted, divider, darkMode }) {
  if (users.length === 0) {
    return (
      <div className={`rounded-[28px] border border-dashed p-12 text-center ${darkMode ? 'border-[#2c353d]' : 'border-[#ced9d5]'}`}>
        <FaUsers className={`mx-auto mb-3 text-4xl ${muted}`} />
        <p className={`font-semibold ${text}`}>No {roleLabel.toLowerCase()}s found</p>
      </div>
    );
  }
  return (
    <div className={`rounded-[28px] border shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
      <div className={`grid grid-cols-[1fr_1fr_auto] gap-4 border-b px-6 py-3 text-xs font-semibold uppercase tracking-wide ${muted} ${divider}`}>
        <span>Name</span>
        <span className="hidden sm:block">Email</span>
        <span>Joined</span>
      </div>
      <div className="divide-y">
        {users.map((u, i) => {
          const color = AVATAR_COLORS[(u.name || '').charCodeAt(0) % AVATAR_COLORS.length];
          return (
            <div key={u.id} className={`grid grid-cols-[1fr_1fr_auto] items-center gap-4 px-6 py-4 ${i === users.length - 1 ? 'rounded-b-[28px]' : ''} ${darkMode ? 'hover:bg-white/3' : 'hover:bg-[#f9faf9]'} transition`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${color}`}>
                  {avatarLetter(u.name)}
                </div>
                <p className={`truncate text-sm font-semibold ${text}`}>{u.name}</p>
              </div>
              <p className={`hidden truncate text-sm sm:block ${muted}`}>{u.email}</p>
              <p className={`shrink-0 text-xs ${muted}`}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

//  Main component 

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('manager-dashboard-dark-mode') === 'true'
  );

  const [stats, setStats] = useState({ classes: 0, teachers: 0, students: 0, activeSessions: 0 });
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    localStorage.setItem('manager-dashboard-dark-mode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    if (!authLoading) loadAll();
  }, [authLoading]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [statsRes, classesRes, teachersRes, studentsRes, auditRes] = await Promise.allSettled([
        api.get('/api/auth/stats'),
        api.get('/api/classes?limit=100'),
        api.get('/api/auth/users?role=teacher&limit=100'),
        api.get('/api/auth/users?role=student&limit=100'),
        api.get('/api/audit?limit=30'),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (classesRes.status === 'fulfilled') setClasses(normalizeList(classesRes.value.data));
      if (teachersRes.status === 'fulfilled') setTeachers(normalizeList(teachersRes.value.data));
      if (studentsRes.status === 'fulfilled') setStudents(normalizeList(studentsRes.value.data));
      if (auditRes.status === 'fulfilled') setAuditLogs(normalizeList(auditRes.value.data));
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const userName = user?.name || 'Manager';
  const userFirstName = userName.split(' ')[0];

  const filteredClasses = classes.filter((c) =>
    !classSearch || c.name?.toLowerCase().includes(classSearch.toLowerCase())
  );
  const filteredTeachers = teachers.filter((t) =>
    !userSearch || t.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    t.email?.toLowerCase().includes(userSearch.toLowerCase())
  );
  const filteredStudents = students.filter((s) =>
    !userSearch || s.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(userSearch.toLowerCase())
  );
  const onboardingItems = [
    {
      id: 'overview-classes',
      label: 'Validate class roster',
      hint: 'Confirm classes are listed and accessible.',
      done: classes.length > 0,
      onClick: () => setActiveTab('classes'),
    },
    {
      id: 'overview-teachers',
      label: 'Review teacher accounts',
      hint: 'Make sure active teachers are onboarded.',
      done: teachers.length > 0,
      onClick: () => setActiveTab('teachers'),
    },
    {
      id: 'overview-students',
      label: 'Review student enrollment',
      hint: 'Check student growth and readiness.',
      done: students.length > 0,
      onClick: () => setActiveTab('students'),
    },
    {
      id: 'overview-audit',
      label: 'Check audit activity',
      hint: 'Scan recent platform actions for anomalies.',
      done: auditLogs.length > 0,
      onClick: () => setActiveTab('activity'),
    },
  ];

  //  Styles 
  const bg      = darkMode ? 'bg-[#13181d]' : 'bg-[#f4f6f4]';
  const cardBg  = darkMode ? 'bg-[#1f262d] border-[#283038]' : 'bg-white border-[#e3e7e3]';
  const text    = darkMode ? 'text-slate-100' : 'text-slate-900';
  const muted   = darkMode ? 'text-slate-400' : 'text-slate-500';
  const divider = darkMode ? 'border-[#2c353d]' : 'border-[#edf0ed]';
  const inputBg = darkMode
    ? 'bg-[#23272b] border-[#2c353d] text-slate-100 placeholder:text-slate-500 focus:border-[#3d6660]'
    : 'bg-[#f6f8f6] border-[#d7ded9] text-slate-800 placeholder:text-slate-400 focus:border-[#7ea89c] focus:bg-white';

  const statCards = [
    { label: 'Total Classes',  value: stats.classes,        icon: FaBook,             tone: 'bg-[#e7f3ef] text-[#234946]' },
    { label: 'Teachers',       value: stats.teachers,       icon: FaChalkboardTeacher, tone: 'bg-[#edf3f8] text-[#3a66b8]' },
    { label: 'Students',       value: stats.students,       icon: FaUserGraduate,      tone: 'bg-[#fff8e7] text-[#c26d32]' },
    { label: 'Live Sessions',  value: stats.activeSessions, icon: FaVideo,             tone: 'bg-[#fdf0f0] text-[#c45b5b]' },
  ];

  const tabs = [
    { id: 'overview',  label: 'Overview',      icon: FaChartLine },
    { id: 'classes',   label: 'Classes',       icon: FaBook },
    { id: 'teachers',  label: 'Teachers',      icon: FaChalkboardTeacher },
    { id: 'students',  label: 'Students',      icon: FaUserGraduate },
    { id: 'activity',  label: 'Activity Log',  icon: FaHistory },
  ];

  if (authLoading || loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${bg}`} style={{ fontFamily: 'Sora, Manrope, system-ui, sans-serif' }}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent" />
          <p className={`text-lg font-semibold ${text}`}>Loading Manager Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-hidden ${bg} ${text}`} style={{ fontFamily: 'Sora, Manrope, system-ui, sans-serif' }}>
      <div className={`pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full blur-3xl ${darkMode ? 'bg-[#2d5a56]/25' : 'bg-[#9fd0c4]/35'}`} />
      <div className={`pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full blur-3xl ${darkMode ? 'bg-[#2f3f59]/30' : 'bg-[#d8e6ff]/55'}`} />
      <div className="flex min-h-screen">

        {/*  Sidebar  */}
        <aside className={`hidden xl:flex xl:w-72 xl:flex-col xl:px-5 xl:py-6 ${darkMode ? 'xl:bg-[#1a232a]' : 'xl:bg-[#182c31]'} xl:text-white`}>
          <div className="mb-8 space-y-1 px-3">
            <div className="text-[32px] font-bold tracking-tight text-[#d3ece4]">Mahfuz</div>
            <p className="text-sm text-slate-300">Manager Portal</p>
          </div>
          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`}
              >
                <tab.icon className="shrink-0" /> {tab.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-3xl border border-white/10 p-4 bg-white/6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2b5752] text-base font-bold text-white">
                {userFirstName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{userName}</p>
                <p className="text-sm text-slate-300">Manager</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </aside>

        {/*  Main  */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Header */}
          <header className={`sticky top-0 z-20 border-b ${darkMode ? 'border-[#23272b] bg-[#13181d]/90' : 'border-[#e4e8e4] bg-[#f4f6f4]/82'} backdrop-blur-xl`}>
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="xl:hidden">
                <div className={`text-2xl font-bold ${darkMode ? 'text-[#b6f2d6]' : 'text-[#234946]'}`}>Mahfuz</div>
              </div>
              <div className={`hidden flex-1 md:flex md:max-w-xl md:items-center md:gap-3 md:rounded-full md:border md:px-4 md:py-3 md:shadow-sm ${darkMode ? 'md:border-[#23272b] md:bg-[#23272b]' : 'md:border-[#dfe5e0] md:bg-white'}`}>
                <FaSearch className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search classes, users"
                  value={classSearch}
                  onChange={(e) => { setClassSearch(e.target.value); setUserSearch(e.target.value); }}
                  className={`w-full border-0 bg-transparent text-sm outline-none ${darkMode ? 'text-slate-100 placeholder:text-slate-400' : 'text-slate-600 placeholder:text-slate-400'}`}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDarkMode((d) => !d)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition ${darkMode ? 'border-[#23272b] bg-[#23272b] text-[#b6f2d6]' : 'border-[#dfe5e0] bg-white text-slate-500 hover:text-[#2d5a56]'}`}
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? <FaSun /> : <FaMoon />}
                </button>
                <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${darkMode ? 'bg-[#1a232a] text-[#b6f2d6]' : 'bg-[#dce8e2] text-[#234946]'}`}>
                  <FaUserCircle className="text-2xl" />
                </div>
              </div>
            </div>

            {/* Mobile tab bar */}
            <div className={`flex gap-1 overflow-x-auto border-t px-4 py-2 xl:hidden ${divider}`}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? darkMode ? 'bg-[#234946] text-white' : 'bg-[#2d5a56] text-white'
                      : darkMode ? 'text-slate-400 hover:bg-[#23272b]' : 'text-slate-500 hover:bg-[#edf1ed]'
                  }`}
                >
                  <tab.icon /> {tab.label}
                </button>
              ))}
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              {/*  OVERVIEW  */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <div className={`relative overflow-hidden rounded-[30px] border p-6 sm:p-7 ${darkMode ? 'border-[#2a323b] bg-linear-to-br from-[#1d252d] via-[#1a2128] to-[#1a2026]' : 'border-[#dbe5e0] bg-linear-to-br from-[#edf5f2] via-[#f4f8f6] to-[#edf1f8]'}`}>
                      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${darkMode ? 'bg-white/6' : 'bg-white/80'}`} />
                      <div className="relative">
                        <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.2em] ${muted}`}>Manager Command Center</p>
                        <h1 className={`text-3xl font-extrabold sm:text-4xl ${text}`}>
                          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {userFirstName}
                        </h1>
                        <p className={`mt-2 max-w-2xl text-sm ${muted}`}>Here is your system pulse across classes, staff, and learner engagement.</p>
                        <div className="mt-5 flex flex-wrap gap-2.5">
                          <button onClick={() => setActiveTab('classes')} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${darkMode ? 'bg-[#2d5a56] text-white hover:bg-[#356a64]' : 'bg-[#2d5a56] text-white hover:bg-[#244b47]'}`}>
                            Manage Classes
                          </button>
                          <button onClick={() => setActiveTab('activity')} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${darkMode ? 'border-[#3a434d] text-slate-200 hover:bg-white/6' : 'border-[#c8d7d1] text-[#234946] hover:bg-white'}`}>
                            Open Activity Log
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <OnboardingChecklistCard
                    title="Manager Launch Checklist"
                    subtitle="Track operational readiness in one view."
                    items={onboardingItems}
                    darkMode={darkMode}
                  />

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {statCards.map((s) => (
                      <div key={s.label} className={`rounded-[28px] border p-5 shadow-[0_8px_24px_rgba(17,24,39,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(17,24,39,0.08)] ${cardBg}`}>
                        <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${s.tone}`}>
                          <s.icon className="text-lg" />
                        </div>
                        <p className={`text-3xl font-bold ${text}`}>{s.value}</p>
                        <p className={`mt-0.5 text-xs font-medium ${muted}`}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Two-col: recent classes + recent activity */}
                  <div className="grid gap-6 lg:grid-cols-2">

                    <div className={`rounded-[28px] border p-6 shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                      <div className={`mb-5 flex items-center justify-between border-b pb-4 ${divider}`}>
                        <h2 className={`text-lg font-bold ${text}`}>Recent Classes</h2>
                        <button onClick={() => setActiveTab('classes')} className={`flex items-center gap-1 text-xs font-semibold ${darkMode ? 'text-[#7ecec0]' : 'text-[#2d5a56]'} hover:underline`}>
                          See all <FaArrowRight className="text-[10px]" />
                        </button>
                      </div>
                      {classes.length === 0 ? (
                        <p className={`text-sm ${muted}`}>No classes yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {classes.slice(0, 5).map((cls) => (
                            <button key={cls.id} onClick={() => navigate(`/class/${cls.id}`)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${darkMode ? 'hover:bg-white/5' : 'hover:bg-[#f5f8f5]'}`}>
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f3ef] text-sm font-bold text-[#234946]">
                                {avatarLetter(cls.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`truncate text-sm font-semibold ${text}`}>{cls.name}</p>
                                <p className={`truncate text-xs ${muted}`}>{cls.description || 'No description'}</p>
                              </div>
                              <FaArrowRight className={`shrink-0 text-xs ${muted}`} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`rounded-[28px] border p-6 shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                      <div className={`mb-5 flex items-center justify-between border-b pb-4 ${divider}`}>
                        <h2 className={`text-lg font-bold ${text}`}>Recent Activity</h2>
                        <button onClick={() => setActiveTab('activity')} className={`flex items-center gap-1 text-xs font-semibold ${darkMode ? 'text-[#7ecec0]' : 'text-[#2d5a56]'} hover:underline`}>
                          See all <FaArrowRight className="text-[10px]" />
                        </button>
                      </div>
                      {auditLogs.length === 0 ? (
                        <p className={`text-sm ${muted}`}>No activity recorded yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {auditLogs.slice(0, 6).map((log) => (
                            <div key={log.id} className="flex items-start gap-3">
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${avatarColor(log.actor_name)}`}>
                                {avatarLetter(log.actor_name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm ${text}`}>
                                  <span className="font-semibold">{log.actor_name || 'Unknown'}</span>
                                  {' '}<span className={muted}>{ACTION_LABELS[log.action] || log.action}</span>
                                  {' '}<span className="font-medium">{log.target_table}</span>
                                </p>
                                <p className={`text-xs ${muted}`}>{timeAgo(log.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Platform breakdown */}
                  <div className={`rounded-[28px] border p-6 shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                    <h2 className={`mb-5 text-lg font-bold ${text}`}>Platform Breakdown</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        { label: 'Total Users',   value: stats.teachers + stats.students, bar: 'bg-[#2d5a56]' },
                        { label: 'Teachers',       value: stats.teachers,                  bar: 'bg-[#3a66b8]' },
                        { label: 'Students',       value: stats.students,                  bar: 'bg-[#c26d32]' },
                        { label: 'Active Sessions', value: stats.activeSessions,           bar: 'bg-[#c45b5b]' },
                      ].map((item) => (
                        <div key={item.label} className={`rounded-2xl p-4 ${darkMode ? 'bg-white/5' : 'bg-[#f5f8f5]'}`}>
                          <div className={`mb-2 h-1.5 w-12 rounded-full ${item.bar}`} />
                          <p className={`text-2xl font-bold ${text}`}>{item.value}</p>
                          <p className={`text-xs ${muted}`}>{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/*  CLASSES  */}
              {activeTab === 'classes' && (
                <div className="space-y-5">
                  <div>
                    <h2 className={`text-2xl font-bold ${text}`}>All Classes</h2>
                    <p className={`text-sm ${muted}`}>{classes.length} class{classes.length !== 1 ? 'es' : ''} on the platform</p>
                  </div>
                  <div className="relative">
                    <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${muted}`} />
                    <input type="text" placeholder="Search classes" value={classSearch} onChange={(e) => setClassSearch(e.target.value)}
                      className={`w-full rounded-2xl border pl-10 pr-4 py-3 text-sm outline-none transition focus:ring-4 focus:ring-[#dcece6] ${inputBg}`} />
                  </div>
                  {filteredClasses.length === 0 ? (
                    <div className={`rounded-[28px] border border-dashed p-12 text-center ${darkMode ? 'border-[#2c353d]' : 'border-[#ced9d5]'}`}>
                      <FaBook className={`mx-auto mb-3 text-4xl ${muted}`} />
                      <p className={`font-semibold ${text}`}>No classes found</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredClasses.map((cls) => (
                        <button key={cls.id} onClick={() => navigate(`/class/${cls.id}`)}
                          className={`rounded-[28px] border p-5 text-left shadow-[0_4px_16px_rgba(17,24,39,0.05)] transition hover:shadow-[0_8px_24px_rgba(17,24,39,0.10)] ${cardBg}`}>
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f3ef] text-base font-bold text-[#234946]">
                            {avatarLetter(cls.name)}
                          </div>
                          <p className={`font-bold ${text}`}>{cls.name}</p>
                          <p className={`mt-1 line-clamp-2 text-xs ${muted}`}>{cls.description || 'No description'}</p>
                          <div className={`mt-3 flex items-center gap-1 text-xs ${muted}`}>
                            <FaUsers className="text-[10px]" />
                            <span>{cls.memberCount ?? ''} members</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/*  TEACHERS  */}
              {activeTab === 'teachers' && (
                <div className="space-y-5">
                  <div>
                    <h2 className={`text-2xl font-bold ${text}`}>Teachers</h2>
                    <p className={`text-sm ${muted}`}>{teachers.length} teacher{teachers.length !== 1 ? 's' : ''} registered</p>
                  </div>
                  <div className="relative">
                    <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${muted}`} />
                    <input type="text" placeholder="Search teachers" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                      className={`w-full rounded-2xl border pl-10 pr-4 py-3 text-sm outline-none transition focus:ring-4 focus:ring-[#dcece6] ${inputBg}`} />
                  </div>
                  <UserTable users={filteredTeachers} roleLabel="Teacher" cardBg={cardBg} text={text} muted={muted} divider={divider} darkMode={darkMode} />
                </div>
              )}

              {/*  STUDENTS  */}
              {activeTab === 'students' && (
                <div className="space-y-5">
                  <div>
                    <h2 className={`text-2xl font-bold ${text}`}>Students</h2>
                    <p className={`text-sm ${muted}`}>{students.length} student{students.length !== 1 ? 's' : ''} registered</p>
                  </div>
                  <div className="relative">
                    <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${muted}`} />
                    <input type="text" placeholder="Search students" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                      className={`w-full rounded-2xl border pl-10 pr-4 py-3 text-sm outline-none transition focus:ring-4 focus:ring-[#dcece6] ${inputBg}`} />
                  </div>
                  <UserTable users={filteredStudents} roleLabel="Student" cardBg={cardBg} text={text} muted={muted} divider={divider} darkMode={darkMode} />
                </div>
              )}

              {/*  ACTIVITY LOG  */}
              {activeTab === 'activity' && (
                <div className="space-y-5">
                  <div>
                    <h2 className={`text-2xl font-bold ${text}`}>Activity Log</h2>
                    <p className={`text-sm ${muted}`}>Platform-wide audit trail  last 30 actions</p>
                  </div>
                  {auditLogs.length === 0 ? (
                    <div className={`rounded-[28px] border border-dashed p-12 text-center ${darkMode ? 'border-[#2c353d]' : 'border-[#ced9d5]'}`}>
                      <FaHistory className={`mx-auto mb-3 text-4xl ${muted}`} />
                      <p className={`font-semibold ${text}`}>No activity recorded yet</p>
                    </div>
                  ) : (
                    <div className={`rounded-[28px] border shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                      <div className="divide-y">
                        {auditLogs.map((log, i) => (
                          <div key={log.id || i} className={`flex items-start gap-4 px-6 py-4 ${i === 0 ? 'rounded-t-[28px]' : ''} ${i === auditLogs.length - 1 ? 'rounded-b-[28px]' : ''} ${darkMode ? 'hover:bg-white/3' : 'hover:bg-[#f9faf9]'} transition`}>
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarColor(log.actor_name)}`}>
                              {avatarLetter(log.actor_name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm ${text}`}>
                                <span className="font-semibold">{log.actor_name || 'System'}</span>
                                {' '}<span className={muted}>{ACTION_LABELS[log.action] || log.action}</span>
                                {' '}<span className="font-medium">{log.target_table}</span>
                                {log.target_id ? <span className={`ml-1 text-xs ${muted}`}>#{log.target_id}</span> : null}
                              </p>
                              {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <p className={`mt-0.5 text-xs ${muted} truncate`}>{JSON.stringify(log.metadata).slice(0, 80)}</p>
                              )}
                            </div>
                            <span className={`shrink-0 text-xs ${muted}`}>{timeAgo(log.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
