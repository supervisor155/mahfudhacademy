import React, { useState, useEffect, useRef } from 'react';
import { useParams, Outlet, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../services/socket';
import { COVERS } from '../../components/dashboard/ClassCard';
import {
  FaVideo, FaFilm, FaClock, FaUsers, FaArrowLeft,
  FaBookOpen, FaPaperclip, FaStickyNote, FaComments,
  FaInvision, FaCopy, FaCheck, FaBullhorn, FaLayerGroup,
  FaTasks, FaCalendarAlt, FaChevronRight, FaUserGraduate,
  FaLock, FaChalkboardTeacher, FaTimes, FaThumbtack, FaCheckCircle,
  FaStickyNote as FaNotes, FaMoon, FaSun,
} from 'react-icons/fa';

export default function ClassHome() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'manager';

  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [mushafBanner, setMushafBanner] = useState(null); // { surah_id, ayah_number, surah_name }
  const [liveCountdown, setLiveCountdown] = useState(null);
  const [, setLiveTick] = useState(Date.now());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!liveCountdown?.scheduled_start) return;
    const id = setInterval(() => setLiveTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [liveCountdown?.scheduled_start]);

  //  Socket: listen for teacher "Raise Mushaf" events 
  useEffect(() => {
    if (!token || !classId) return;
    const socket = getSocket(token);
    socketRef.current = socket;
    socket.emit('class:join', { class_id: classId });
    const onMushafRaised = (data) => setMushafBanner(data);
    const onMushafLowered = () => setMushafBanner(null);
    const onCountdownScheduled = (payload) => setLiveCountdown(payload);
    const onCountdownCancelled = () => setLiveCountdown(null);
    socket.on('mushaf:raised', onMushafRaised);
    socket.on('mushaf:lowered', onMushafLowered);
    socket.on('live:countdown:scheduled', onCountdownScheduled);
    socket.on('live:countdown:cancelled', onCountdownCancelled);
    return () => {
      socket.emit('class:leave', { class_id: classId });
      socket.off('mushaf:raised', onMushafRaised);
      socket.off('mushaf:lowered', onMushafLowered);
      socket.off('live:countdown:scheduled', onCountdownScheduled);
      socket.off('live:countdown:cancelled', onCountdownCancelled);
    };
  }, [classId, token]);

  // Dark mode  persisted in localStorage
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('classDarkMode') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('classDarkMode', darkMode); } catch {}
  }, [darkMode]);
  const dm = darkMode;

  // Overview data
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [studentSubmissionMap, setStudentSubmissionMap] = useState({}); // { [assignmentId]: submission }
  const [memberCount, setMemberCount] = useState(0);
  const [videoCount, setVideoCount] = useState(null);
  const [fileCount, setFileCount] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  // Tab badge counts
  const [tabBadges, setTabBadges] = useState({ assignments: 0, live: 0 });

  useEffect(() => { fetchClass(); }, [classId]);

  const fetchClass = async () => {
    try {
      const res = await api.get(`/api/classes/${classId}`);
      setClassData(res.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        setAccessDenied(true);
      } else {
        setError('Failed to load class');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    setRequesting(true);
    setRequestError('');
    try {
      await api.post(`/api/classes/${classId}/request-access`);
      setRequestSent(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send request';
      if (msg.includes('already')) setRequestSent(true);
      else setRequestError(msg);
    } finally {
      setRequesting(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      await api.post('/api/classes/join', { invite_code: joinCode.trim() });
      window.location.reload();
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid code';
      if (msg.toLowerCase().includes('already')) window.location.reload();
      else setJoinError(msg);
    } finally {
      setJoining(false);
    }
  };

  const basePath = `/class/${classId}`;
  const currentSub = location.pathname.replace(basePath, '').replace(/^\//, '') || 'overview';

  const allTabs = [
    { id: 'overview',       label: 'Overview',       icon: <FaBookOpen />,    badge: 0 },
    { id: 'announcements',  label: 'Announcements',  icon: <FaBullhorn />,    badge: 0 },
    { id: 'curriculum',     label: 'Lessons',        icon: <FaLayerGroup />,  badge: 0 },
    { id: 'assignments',    label: 'Assignments',    icon: <FaTasks />,       badge: tabBadges.assignments },
    { id: 'videos',         label: 'Videos',         icon: <FaVideo />,       badge: 0 },
    { id: 'reels',          label: 'Reels',          icon: <FaFilm />,        badge: 0 },
    { id: 'live',           label: 'Live',           icon: <FaClock />,       badge: tabBadges.live },
    { id: 'files',          label: 'Files',          icon: <FaPaperclip />,   badge: 0 },
    { id: 'notes',          label: 'Notes',          icon: <FaStickyNote />,  badge: 0 },
    { id: 'members',        label: 'Members',        icon: <FaUsers />,       badge: 0 },
    { id: 'chat',           label: 'Chat',           icon: <FaComments />,    badge: 0 },
  ];

  const tabs = allTabs;

  function goTab(id) {
    if (id === 'overview') { navigate(basePath); }
    else { navigate(`${basePath}/${id}`); }
  }

  function copyCode() {
    navigator.clipboard.writeText(classData?.invite_code || classData?.inviteCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Load overview data when on overview
  useEffect(() => {
    if (currentSub !== 'overview') return;
    setOverviewLoading(true);
    Promise.allSettled([
      api.get(`/api/announcements?class_id=${classId}`),
      api.get(`/api/assignments?class_id=${classId}`),
      api.get(`/api/classes/${classId}/members?limit=1`),
      api.get(`/api/videos?class_id=${classId}`),
      api.get(`/api/attachments?class_id=${classId}`),
    ]).then(async ([annRes, assRes, memRes, vidRes, fileRes]) => {
      if (annRes.status === 'fulfilled') {
        const d = annRes.value.data?.data || annRes.value.data || [];
        setRecentAnnouncements(d.slice(0, 4));
      }
      if (assRes.status === 'fulfilled') {
        const d = assRes.value.data?.data || assRes.value.data || [];
        const now = new Date();
        const upcoming = d
          .filter((a) => !a.due_date || new Date(a.due_date) >= now)
          .slice(0, 3);
        setUpcomingAssignments(upcoming);
        // Tab badge: overdue assignments for students
        if (!isTeacher) {
          const overdue = d.filter((a) => a.due_date && new Date(a.due_date) < now);
          setTabBadges((prev) => ({ ...prev, assignments: overdue.length }));
          // Load submission status for each upcoming assignment
          if (upcoming.length > 0) {
            const subResults = await Promise.allSettled(
              upcoming.map((a) => api.get(`/api/assignments/${a.id}/my-submission`))
            );
            const map = {};
            upcoming.forEach((a, i) => {
              if (subResults[i].status === 'fulfilled') {
                map[a.id] = subResults[i].value.data || null;
              }
            });
            setStudentSubmissionMap(map);
          }
        }
      }
      if (memRes.status === 'fulfilled') {
        const d = memRes.value.data?.data || memRes.value.data || [];
        setMemberCount(classData?.memberCount || d.length);
      }
      if (vidRes.status === 'fulfilled') {
        const d = vidRes.value.data?.data || vidRes.value.data || [];
        setVideoCount(Array.isArray(d) ? d.length : 0);
      }
      if (fileRes.status === 'fulfilled') {
        const d = fileRes.value.data?.data || fileRes.value.data || [];
        setFileCount(Array.isArray(d) ? d.length : 0);
      }
    }).finally(() => setOverviewLoading(false));

    // Load live session badge
    api.get(`/api/sessions?class_id=${classId}`).then((res) => {
      const sessions = res.data?.data || res.data || [];
      const live = (Array.isArray(sessions) ? sessions : []).filter(
        (s) => s.status === 'live' || s.status === 'active'
      ).length;
      setTabBadges((prev) => ({ ...prev, live }));

      const nextUpcoming = (Array.isArray(sessions) ? sessions : [])
        .filter((s) => s.status === 'upcoming' && s.start_time)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];

      if (nextUpcoming) {
        setLiveCountdown({
          class_id: classId,
          session_id: nextUpcoming.id,
          title: nextUpcoming.title,
          scheduled_start: nextUpcoming.start_time,
        });
      } else {
        setLiveCountdown(null);
      }
    }).catch(() => {});
  }, [currentSub, classId]);

  if (accessDenied) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f8f5] p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <FaLock className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-800">Class Not Found</h2>
        <p className="mb-6 text-sm text-slate-500">This class doesn't exist or has been removed.</p>
        <button
          onClick={() => navigate(`/dashboard/${user.role}`, { replace: true })}
          className="rounded-xl bg-[#2d5a56] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#234946] transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Non-member preview  user can see class info and request access
  if (classData?.isPreview) {
    const cover = COVERS[classData.cover_color] || COVERS.teal;
    const initial = (classData.name || '?').charAt(0).toUpperCase();
    return (
      <div className="flex min-h-screen flex-col bg-[#f7f8f5]">
        {/* Cover banner */}
        <div className={`relative h-48 bg-gradient-to-br ${cover.bg} overflow-hidden`}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
          <div className="relative flex h-full flex-col items-center justify-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-extrabold text-white shadow-lg">
              {initial}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">{classData.name}</h2>
              <p className="mt-1 text-sm text-white/60">{classData.memberCount ?? 0} member{classData.memberCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md px-4 py-8">
          <div className="overflow-hidden rounded-3xl border border-[#e3e7e3] bg-white shadow-[0_8px_32px_rgba(17,24,39,0.08)]">
            {/* Join by invite code */}
            <div className="border-b border-[#edf0ed] p-6">
              <h3 className="mb-1 text-lg font-bold text-slate-900">Have an invite code?</h3>
              <p className="mb-4 text-sm text-slate-500">Enter the code your teacher shared to join instantly.</p>
              <form onSubmit={handleJoinByCode} className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter invite code..."
                  className="flex-1 rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-2.5 font-mono text-sm tracking-widest text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white uppercase"
                  maxLength={20}
                />
                <button
                  type="submit"
                  disabled={joining || !joinCode.trim()}
                  className="shrink-0 rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-50 active:scale-95"
                >
                  {joining ? '...' : 'Join'}
                </button>
              </form>
              {joinError && <p className="mt-2 text-xs font-medium text-red-600">{joinError}</p>}
            </div>

            {/* Or request access */}
            <div className="p-6">
              {classData.description && (
                <p className="mb-4 text-sm leading-relaxed text-slate-500">{classData.description}</p>
              )}
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You are not a member of this class. You can request access and wait for the teacher to approve.
              </div>
              {requestError && <p className="mb-3 text-sm text-red-600">{requestError}</p>}
              {requestSent ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-[#e7f3ef] px-5 py-3 text-sm font-semibold text-[#2d5a56]">
                  <FaCheck /> Request sent! Waiting for teacher approval.
                </div>
              ) : (
                <button
                  onClick={handleRequestAccess}
                  disabled={requesting}
                  className="w-full rounded-2xl border border-[#d7ded9] bg-[#f5f7f5] px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60 active:scale-95"
                >
                  {requesting ? 'Sending' : 'Request Access'}
                </button>
              )}
              <button
                onClick={() => navigate(`/dashboard/${user.role}`)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
              >
                <FaArrowLeft className="text-xs" /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5]" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Loading class...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5]">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  // Dark mode theme tokens
  const bg       = dm ? 'bg-[#0f1419]'           : 'bg-[#f7f8f5]';
  const textMain = dm ? 'text-slate-100'          : 'text-slate-800';
  const card     = dm ? 'bg-[#161d24] border-[#1f2a34]' : 'bg-white border-[#e3e7e3]';
  const cardSub  = dm ? 'bg-[#1a2330]'            : 'bg-[#f8faf8]';
  const muted    = dm ? 'text-slate-400'          : 'text-slate-500';
  const divider  = dm ? 'border-[#1e2730]'        : 'border-[#e8ece8]';
  const tabBg    = dm ? 'bg-[#161d24] border-[#1f2a34]' : 'bg-white border-[#e3e7e3]';
  const tabActive = dm ? 'bg-[#1f3a36] text-[#9fd0c4]' : 'bg-[#e7f3ef] text-[#234946]';
  const tabInactive = dm ? 'text-slate-500 hover:bg-[#1a2330] hover:text-slate-300' : 'text-slate-500 hover:bg-[#f3f6f4] hover:text-slate-700';
  const mobileNavBg = dm ? 'bg-[#0f1419]/95 border-[#1e2730]' : 'bg-white/95 border-[#dde5e0]';
  const infoBarBg   = dm ? 'bg-[#161d24] border-[#1f2a34]' : 'bg-white border-[#e3e7e3]';

  const recentActivity = [
    ...recentAnnouncements.map((ann) => ({
      id: `ann-${ann.id}`,
      type: 'announcement',
      tab: 'announcements',
      title: ann.title || 'Announcement posted',
      subtitle: ann.pinned ? 'Pinned announcement' : 'Class announcement',
      ts: ann.created_at ? new Date(ann.created_at).getTime() : 0,
      dateRaw: ann.created_at,
      icon: <FaBullhorn className="text-[#2d5a56]" />,
      iconBg: dm ? 'bg-[#1a2f2c]' : 'bg-[#e7f3ef]',
    })),
    ...upcomingAssignments.map((a) => ({
      id: `ass-${a.id}`,
      type: 'assignment',
      tab: 'assignments',
      title: a.title || 'Assignment updated',
      subtitle: a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}` : 'Assignment activity',
      ts: (a.created_at || a.updated_at || a.due_date) ? new Date(a.created_at || a.updated_at || a.due_date).getTime() : 0,
      dateRaw: a.created_at || a.updated_at || a.due_date,
      icon: <FaTasks className="text-[#3a66b8]" />,
      iconBg: dm ? 'bg-[#1a2338]' : 'bg-[#edf3f8]',
    })),
  ]
    .filter((item) => item.ts > 0)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5);

  const userInitials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  function formatCountdown(iso) {
    if (!iso) return '';
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'Starting now';
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `starts in ${h}h ${m}m`;
    if (m > 0) return `starts in ${m}m ${s}s`;
    return `starts in ${s}s`;
  }

  return (
    <div className={`min-h-screen ${bg} ${textMain}`} style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>

      {/* Teacher raised Mushaf banner */}
      {mushafBanner && (
        <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
          <div className="flex w-full max-w-lg items-center gap-3 rounded-2xl border border-[#c8dcd9] bg-[#2d5a56] px-5 py-3.5 text-white shadow-2xl">
            <FaChalkboardTeacher className="shrink-0 text-lg text-teal-200" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Teacher is showing the Muaf</p>
              <p className="truncate text-xs text-teal-200">
                {mushafBanner.surah_name ? `Surah ${mushafBanner.surah_name}` : `Surah ${mushafBanner.surah_id}`}
                {mushafBanner.ayah_number > 1 ? `  Ayah ${mushafBanner.ayah_number}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigate(`/mushaf/${mushafBanner.surah_id}?classId=${classId}`);
                  setMushafBanner(null);
                }}
                className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25"
              >
                Open
              </button>
              <button
                onClick={() => setMushafBanner(null)}
                className="rounded-xl p-1.5 text-teal-200 transition hover:text-white"
                aria-label="Dismiss"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming live countdown banner */}
      {liveCountdown?.scheduled_start && (
        <div className="fixed inset-x-0 top-0 z-40 mt-16 flex justify-center px-4 pt-2">
          <button
            onClick={() => goTab('live')}
            className="flex w-full max-w-lg items-center justify-between gap-3 rounded-2xl border border-[#b8d4cf] bg-[#e7f3ef] px-4 py-2.5 text-left shadow-lg transition hover:bg-[#ddede8]"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#2d5a56]">Upcoming Live Session</p>
              <p className="text-sm font-semibold text-[#234946]">{liveCountdown.title || 'Live session'}</p>
            </div>
            <span className="rounded-xl bg-[#2d5a56] px-2.5 py-1 text-xs font-bold text-white">
              {formatCountdown(liveCountdown.scheduled_start)}
            </span>
          </button>
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl px-4 py-8 xl:max-w-7xl 2xl:max-w-[1440px]">

        {/* Header Card */}
        <section className="mb-6 overflow-hidden rounded-4xl shadow-[0_20px_55px_rgba(17,24,39,0.10)]">
          {/* Cover gradient banner */}
          {(() => {
            const cover = COVERS[classData?.cover_color] || COVERS.teal;
            const initial = (classData?.name || '?')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join('');
            return (
              <div className={`relative h-32 bg-gradient-to-br ${cover.bg} overflow-hidden`}>
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex h-full items-center gap-4 px-7">
                  <div className="relative shrink-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 text-xl font-extrabold text-white shadow-xl ring-2 ring-white/20 backdrop-blur-sm sm:h-16 sm:w-16 sm:text-2xl">
                      {initial || '?'}
                    </div>
                    <span className="absolute -bottom-1 -right-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/30 bg-[#173632]/90 px-1.5 text-[10px] font-bold text-teal-100 shadow-sm">
                      {classData?.memberCount || 0}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">{classData?.name}</h1>
                    {classData?.description && (
                      <p className="mt-0.5 line-clamp-1 text-sm text-white/60">{classData.description}</p>
                    )}
                  </div>
                  <span className={`shrink-0 hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white`}>
                    {isTeacher ? <FaChalkboardTeacher className="text-[11px]" /> : <FaUserGraduate className="text-[11px]" />}
                    {isTeacher ? 'Teacher' : 'Student'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Info bar */}
          <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3 ${infoBarBg}`}>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate(`/dashboard/${user?.role || 'student'}`)}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#2d5a56] transition hover:text-[#1f4a47]"
              >
                <FaArrowLeft className="text-xs" /> Dashboard
              </button>
              <span className={dm ? 'text-slate-600' : 'text-slate-300'}>|</span>
              <span className={`flex items-center gap-1.5 text-sm ${muted}`}>
                <FaUsers className="text-[#2d5a56]" /> {classData?.memberCount || 0} members
              </span>
              {/* Student progress bar */}
              {!isTeacher && classData?.progress !== undefined && (
                <>
                  <span className={dm ? 'text-slate-600' : 'text-slate-300'}>|</span>
                  <div className="flex items-center gap-2">
                    <div className={`h-1.5 w-24 overflow-hidden rounded-full ${dm ? 'bg-[#1f2a34]' : 'bg-[#dde4e0]'}`}>
                      <div
                        className="h-full rounded-full bg-[#2f5e58] transition-all"
                        style={{ width: `${Math.min(100, Number(classData.progress) || 0)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold ${muted}`}>{Math.min(100, Number(classData.progress) || 0)}%</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className={`hidden items-center gap-2 rounded-2xl border px-2.5 py-1.5 sm:flex ${dm ? 'border-[#1f2a34] bg-[#0f1419]' : 'border-[#dfe5e0] bg-[#f5f7f5]'}`}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2d5a56] text-[10px] font-bold text-white">
                  {userInitials || '?'}
                </span>
                <span className={`max-w-[90px] truncate text-xs font-semibold ${muted}`}>{user?.name || 'User'}</span>
              </div>
              {(classData?.invite_code || classData?.inviteCode) && isTeacher && (
                <button
                  onClick={copyCode}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${dm ? 'border-[#1f2a34] bg-[#0f1419] text-slate-300 hover:bg-[#1a2330]' : 'border-[#dfe5e0] bg-[#f5f7f5] text-slate-600 hover:bg-white'}`}
                >
                  {copied ? <FaCheck className="text-green-500" /> : <FaCopy />}
                  {copied ? 'Copied!' : `Code: ${classData?.invite_code || classData?.inviteCode}`}
                </button>
              )}
              <button
                onClick={() => setDarkMode(v => !v)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition ${dm ? 'border-[#1f2a34] bg-[#0f1419] text-[#9fd0c4]' : 'border-[#dfe5e0] bg-[#f5f7f5] text-slate-500 hover:text-[#2d5a56]'}`}
                aria-label="Toggle dark mode"
              >
                {dm ? <FaSun className="text-xs" /> : <FaMoon className="text-xs" />}
              </button>
            </div>
          </div>
        </section>

        {/* Navigation Tabs  desktop */}
        <nav className={`mb-6 hidden gap-1 overflow-x-auto rounded-3xl border px-3 py-2 shadow-sm sm:flex lg:flex-wrap lg:overflow-visible ${tabBg}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => goTab(tab.id)}
              className={`relative flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap lg:min-w-[126px] lg:justify-center ${
                currentSub === tab.id ? tabActive : tabInactive
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sticky bottom nav  mobile */}
        <nav className={`fixed inset-x-0 bottom-0 z-30 border-t pb-safe shadow-[0_-10px_30px_rgba(17,24,39,0.08)] backdrop-blur sm:hidden ${mobileNavBg}`}>
          {/* Back button row */}
          <div className={`flex items-center gap-3 border-b px-3 py-2 ${divider}`}>
            <button
              onClick={() => navigate(`/dashboard/${user?.role || 'student'}`)}
              className="flex items-center gap-1.5 rounded-xl bg-[#2d5a56] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
            >
              <FaArrowLeft className="text-[10px]" /> Dashboard
            </button>
            <span className={`flex-1 truncate text-xs font-semibold ${textMain}`}>{classData?.name}</span>
            <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-semibold ${tabActive}`}>
              {currentSub === 'overview' ? 'Overview' : tabs.find(t => t.id === currentSub)?.label || ''}
            </span>
          </div>

          {/* Tabs  scroll horizontally */}
          <div
            className="flex overflow-x-auto py-2 px-2 gap-1"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => goTab(tab.id)}
                className={`relative flex h-14 shrink-0 min-w-[84px] max-w-[84px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-all ${
                  currentSub === tab.id ? tabActive : tabInactive
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="w-full px-0.5 leading-tight text-center break-words line-clamp-2">{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="absolute right-1 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="mb-36 sm:mb-8">
          {currentSub === 'overview' ? (
            <div className="space-y-5">

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Students',    value: classData?.memberCount ?? '', icon: <FaUserGraduate />, tab: 'members',    accent: dm ? '#9fd0c4' : '#2d5a56', bg: dm ? 'bg-[#1a2f2c]' : 'bg-[#e7f3ef]', text: dm ? 'text-[#9fd0c4]' : 'text-[#234946]' },
                  { label: 'Assignments', value: upcomingAssignments.length || '', icon: <FaTasks />,   tab: 'assignments', accent: dm ? '#7baee8' : '#3a66b8', bg: dm ? 'bg-[#1a2338]' : 'bg-[#edf3f8]', text: dm ? 'text-[#7baee8]' : 'text-[#3a66b8]' },
                  { label: 'Videos',      value: videoCount ?? '',              icon: <FaVideo />,       tab: 'videos',      accent: dm ? '#e8a07a' : '#c26d32', bg: dm ? 'bg-[#2a1f14]' : 'bg-[#fff0e7]', text: dm ? 'text-[#e8a07a]' : 'text-[#c26d32]' },
                  { label: 'Files',       value: fileCount ?? '',               icon: <FaPaperclip />,   tab: 'files',       accent: dm ? '#b09fe8' : '#7d57b1', bg: dm ? 'bg-[#22193a]' : 'bg-[#f3effd]', text: dm ? 'text-[#b09fe8]' : 'text-[#7d57b1]' },
                ].map((s) => (
                  <button
                    key={s.tab}
                    onClick={() => goTab(s.tab)}
                    className={`group rounded-[22px] border p-5 text-left shadow-[0_4px_16px_rgba(17,24,39,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(17,24,39,0.10)] ${card}`}
                  >
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${s.bg} ${s.text}`}>
                      {s.icon}
                    </div>
                    <p className={`text-3xl font-extrabold tabular-nums ${textMain}`}>
                      {overviewLoading && s.value === '' ? (
                        <span className={`inline-block h-7 w-10 animate-pulse rounded-lg ${dm ? 'bg-[#1f2a34]' : 'bg-slate-200'}`} />
                      ) : s.value !== '' ? s.value : <span className={`inline-block h-7 w-10 animate-pulse rounded-lg ${dm ? 'bg-[#1f2a34]' : 'bg-slate-200'}`} />}
                    </p>
                    <p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${muted}`}>{s.label}</p>
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <section className={`rounded-[28px] border p-5 shadow-[0_6px_24px_rgba(17,24,39,0.05)] ${card}`}>
                <h2 className={`mb-3 text-xs font-bold uppercase tracking-widest ${muted}`}>
                  {isTeacher ? 'Quick Actions' : 'Quick Access'}
                </h2>
                <div className={`grid gap-2 ${isTeacher ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
                  {isTeacher ? [
                    { label: 'Post Announcement', icon: <FaBullhorn />, tab: 'announcements', bg: dm ? 'bg-[#1a2f2c] text-[#9fd0c4]' : 'bg-[#e7f3ef] text-[#234946]' },
                    { label: 'Create Assignment', icon: <FaTasks />,    tab: 'assignments',   bg: dm ? 'bg-[#1a2338] text-[#7baee8]' : 'bg-[#edf3f8] text-[#3a66b8]' },
                    { label: 'Upload Video',       icon: <FaVideo />,    tab: 'videos',        bg: dm ? 'bg-[#2a1f14] text-[#e8a07a]' : 'bg-[#fff0e7] text-[#c26d32]' },
                    { label: 'Class Chat',         icon: <FaComments />, tab: 'chat',          bg: dm ? 'bg-[#1f263a] text-[#9fb6ff]' : 'bg-[#edf0ff] text-[#3655c9]' },
                    { label: 'Start Live',         icon: <FaClock />,    tab: 'live',          bg: dm ? 'bg-[#22193a] text-[#b09fe8]' : 'bg-[#f3effd] text-[#7d57b1]' },
                  ] : [
                    { label: 'Lessons',     icon: <FaLayerGroup />, tab: 'curriculum',  bg: dm ? 'bg-[#1a2f2c] text-[#9fd0c4]' : 'bg-[#e7f3ef] text-[#234946]' },
                    { label: 'Assignments', icon: <FaTasks />,      tab: 'assignments', bg: dm ? 'bg-[#1a2338] text-[#7baee8]' : 'bg-[#edf3f8] text-[#3a66b8]' },
                    { label: 'Class Chat',  icon: <FaComments />,   tab: 'chat',        bg: dm ? 'bg-[#22193a] text-[#b09fe8]' : 'bg-[#f3effd] text-[#7d57b1]' },
                    { label: 'My Notes',    icon: <FaStickyNote />, tab: 'notes',       bg: dm ? 'bg-[#2a2218] text-[#e8d07a]' : 'bg-[#fefce8] text-[#a16207]' },
                  ].map((item) => (
                    <button
                      key={item.tab}
                      onClick={() => goTab(item.tab)}
                      className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-80 active:scale-95 ${item.bg}`}
                    >
                      <span className="shrink-0 text-lg">{item.icon}</span>
                      <span className="leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Two-column layout on larger screens: Activity feed + Announcements/Assignments */}
              <div className="grid gap-5 lg:grid-cols-5">

                {/* Left: Recent Activity feed */}
                <section className={`rounded-[28px] border p-6 shadow-[0_6px_24px_rgba(17,24,39,0.05)] lg:col-span-2 ${card}`}>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className={`flex items-center gap-2 text-sm font-bold ${textMain}`}>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs ${dm ? 'bg-[#1a2f2c] text-[#9fd0c4]' : 'bg-[#e7f3ef] text-[#2d5a56]'}`}>
                        <FaCheckCircle />
                      </span>
                      Recent Activity
                    </h2>
                  </div>
                  {overviewLoading ? (
                    <div className="space-y-3">
                      {[1,2,3].map(i => (
                        <div key={i} className={`h-14 animate-pulse rounded-2xl ${dm ? 'bg-[#1a2330]' : 'bg-slate-100'}`} />
                      ))}
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-10 text-center ${muted}`}>
                      <FaCheckCircle className="mb-2 text-3xl opacity-20" />
                      <p className="text-sm">No activity yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => goTab(item.tab)}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:opacity-80 active:scale-[0.98] ${dm ? 'bg-[#1a2330]' : 'bg-[#f8faf8]'}`}
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${item.iconBg}`}>
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-semibold ${textMain}`}>{item.title}</p>
                            <p className={`text-xs ${muted}`}>{item.subtitle}</p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-medium ${muted}`}>
                            {item.dateRaw ? new Date(item.dateRaw).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {/* Right: Announcements + Assignments stacked */}
                <div className="space-y-5 lg:col-span-3">

                  {/* Announcements */}
                  <section className={`rounded-[28px] border p-6 shadow-[0_6px_24px_rgba(17,24,39,0.05)] ${card}`}>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className={`flex items-center gap-2 text-sm font-bold ${textMain}`}>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs ${dm ? 'bg-[#1a2f2c] text-[#9fd0c4]' : 'bg-[#e7f3ef] text-[#2d5a56]'}`}>
                          <FaBullhorn />
                        </span>
                        Announcements
                      </h2>
                      <button
                        onClick={() => goTab('announcements')}
                        className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 ${dm ? 'bg-[#1a2f2c] text-[#9fd0c4]' : 'bg-[#e7f3ef] text-[#234946]'}`}
                      >
                        View all <FaChevronRight className="text-[10px]" />
                      </button>
                    </div>
                    {overviewLoading ? (
                      <div className="space-y-2">
                        {[1,2].map(i => (
                          <div key={i} className={`h-12 animate-pulse rounded-2xl ${dm ? 'bg-[#1a2330]' : 'bg-slate-100'}`} />
                        ))}
                      </div>
                    ) : recentAnnouncements.length === 0 ? (
                      <div className={`flex flex-col items-center justify-center py-8 text-center ${muted}`}>
                        <FaBullhorn className="mb-2 text-2xl opacity-20" />
                        <p className="text-sm">{isTeacher ? 'Post your first announcement' : 'No announcements yet'}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentAnnouncements.map((ann) => (
                          <div
                            key={ann.id}
                            className={`rounded-2xl px-4 py-3 ${
                              ann.pinned
                                ? dm ? 'border border-[#2d5a56]/50 bg-[#1a2f2c]' : 'border border-[#c8dcd9] bg-[#f0faf7]'
                                : dm ? 'bg-[#1a2330]' : 'bg-[#f8faf8]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {ann.pinned && <FaThumbtack className="shrink-0 text-[#2d5a56] text-[10px] rotate-45" />}
                              <p className={`truncate text-sm font-semibold ${textMain}`}>{ann.title}</p>
                              {ann.pinned && (
                                <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${dm ? 'bg-[#2d5a56]/40 text-[#9fd0c4]' : 'bg-[#2d5a56]/10 text-[#234946]'}`}>Pinned</span>
                              )}
                            </div>
                            {ann.body && <p className={`mt-1 line-clamp-2 text-xs leading-relaxed ${muted}`}>{ann.body}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Upcoming Assignments */}
                  <section className={`rounded-[28px] border p-6 shadow-[0_6px_24px_rgba(17,24,39,0.05)] ${card}`}>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className={`flex items-center gap-2 text-sm font-bold ${textMain}`}>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs ${dm ? 'bg-[#1a2338] text-[#7baee8]' : 'bg-[#edf3f8] text-[#3a66b8]'}`}>
                          <FaTasks />
                        </span>
                        Assignments
                      </h2>
                      <button
                        onClick={() => goTab('assignments')}
                        className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 ${dm ? 'bg-[#1a2338] text-[#7baee8]' : 'bg-[#edf3f8] text-[#3a66b8]'}`}
                      >
                        View all <FaChevronRight className="text-[10px]" />
                      </button>
                    </div>
                    {overviewLoading ? (
                      <div className="space-y-2">
                        {[1,2].map(i => (
                          <div key={i} className={`h-12 animate-pulse rounded-2xl ${dm ? 'bg-[#1a2330]' : 'bg-slate-100'}`} />
                        ))}
                      </div>
                    ) : upcomingAssignments.length === 0 ? (
                      <div className={`flex flex-col items-center justify-center py-8 text-center ${muted}`}>
                        <FaTasks className="mb-2 text-2xl opacity-20" />
                        <p className="text-sm">{isTeacher ? 'No assignments yet' : 'No upcoming assignments'}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {upcomingAssignments.map((a) => {
                          const sub = !isTeacher ? studentSubmissionMap[a.id] : undefined;
                          const isGraded = sub && sub.grade !== null && sub.grade !== undefined;
                          const isSubmitted = sub && !isGraded;
                          return (
                            <button
                              key={a.id}
                              onClick={() => goTab('assignments')}
                              className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:opacity-80 active:scale-[0.98] ${dm ? 'bg-[#1a2330]' : 'bg-[#f8faf8]'}`}
                            >
                              <div className="min-w-0">
                                <p className={`truncate text-sm font-semibold ${textMain}`}>{a.title}</p>
                                {a.due_date && (
                                  <p className={`mt-0.5 flex items-center gap-1 text-xs ${muted}`}>
                                    <FaCalendarAlt className="text-[10px]" />
                                    Due {new Date(a.due_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-1.5">
                                {!isTeacher && (
                                  isGraded
                                    ? <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold text-green-700">Graded {sub.grade}/{a.max_points}</span>
                                    : isSubmitted
                                    ? <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-700">Submitted</span>
                                    : <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${dm ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>Pending</span>
                                )}
                                {a.max_points > 0 && (
                                  <span className={`rounded-xl px-2 py-0.5 text-[10px] font-bold ${dm ? 'bg-[#1f2a34] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{a.max_points}pt</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>

                </div>
              </div>

            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}

