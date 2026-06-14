import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaArrowRight,
  FaBook,
  FaChartLine,
  FaCheck,
  FaHistory,
  FaMoon,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaCog,
  FaSun,
  FaDownload,
  FaTrash,
  FaUserGraduate,
  FaUserTie,
  FaUsers,
  FaVideo,
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import OnboardingChecklistCard from '../../components/dashboard/OnboardingChecklistCard';

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

function avatarLetter(name) {
  return (name || '?').charAt(0).toUpperCase();
}

const ACTION_LABELS = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  join: 'Joined',
  leave: 'Left',
  upload: 'Uploaded',
  submit: 'Submitted',
  grade: 'Graded',
  approve: 'Approved',
  start_session: 'Started session',
  end_session: 'Ended session',
  role_change: 'Changed role on',
  permissions_update: 'Updated permissions on',
  platform_wipe_prepare: 'Prepared platform wipe',
  platform_wipe: 'Executed platform wipe',
  security_ticket: 'Opened security ticket for',
};

const FEATURE_LABELS = {
  manage_classes: 'Manage classes',
  manage_users: 'Manage users',
  view_audit_logs: 'View audit logs',
  manage_content: 'Manage content',
  manage_live_sessions: 'Manage live sessions',
  moderate_chat: 'Moderate chat',
  platform_settings: 'Platform settings',
};

function ticketMeta(ticket) {
  const raw = ticket?.metadata;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function toDateTimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('owner-dashboard-dark-mode') === 'true'
  );

  const [stats, setStats] = useState({ classes: 0, teachers: 0, students: 0, activeSessions: 0 });
  const [classes, setClasses] = useState([]);
  const [managers, setManagers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [ownerActions, setOwnerActions] = useState([]);
  const [securityStatus, setSecurityStatus] = useState(null);
  const [securityTickets, setSecurityTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState('open');
  const [owners, setOwners] = useState([]);
  const [ticketDraftMap, setTicketDraftMap] = useState({});
  const [featureCatalog, setFeatureCatalog] = useState([]);
  const [featureDocs, setFeatureDocs] = useState({});
  const [featureMapByUser, setFeatureMapByUser] = useState({});
  const [roleDraftMap, setRoleDraftMap] = useState({});
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');
  const [wipeReason, setWipeReason] = useState('');
  const [wipePrepareConfirm, setWipePrepareConfirm] = useState('');
  const [wipeConfirm, setWipeConfirm] = useState('');
  const [wipeSecondConfirm, setWipeSecondConfirm] = useState('');
  const [wipeRequestData, setWipeRequestData] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem('owner-dashboard-dark-mode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [authLoading]);

  async function loadData() {
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const [statsRes, classesRes, managersRes, teachersRes, studentsRes, ownersRes, auditRes, featureCatalogRes, ownerActionsRes, securityStatusRes, ticketsRes] = await Promise.allSettled([
        api.get('/api/auth/stats'),
        api.get('/api/classes?limit=120'),
        api.get('/api/auth/users?role=manager&limit=120'),
        api.get('/api/auth/users?role=teacher&limit=120'),
        api.get('/api/auth/users?role=student&limit=120'),
        api.get('/api/auth/users?role=owner&limit=30'),
        api.get('/api/audit?limit=30'),
        api.get('/api/auth/features/catalog'),
        api.get('/api/auth/owner/actions?limit=80'),
        api.get('/api/auth/security/status'),
        api.get('/api/auth/security/tickets?status=all&limit=80'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
      if (classesRes.status === 'fulfilled') setClasses(normalizeList(classesRes.value.data));
      if (managersRes.status === 'fulfilled') setManagers(normalizeList(managersRes.value.data));
      if (teachersRes.status === 'fulfilled') setTeachers(normalizeList(teachersRes.value.data));
      if (studentsRes.status === 'fulfilled') setStudents(normalizeList(studentsRes.value.data));
      if (ownersRes.status === 'fulfilled') setOwners(normalizeList(ownersRes.value.data));
      if (auditRes.status === 'fulfilled') setAuditLogs(normalizeList(auditRes.value.data));
      if (ownerActionsRes.status === 'fulfilled') setOwnerActions(normalizeList(ownerActionsRes.value.data));
      if (securityStatusRes.status === 'fulfilled') setSecurityStatus(securityStatusRes.value.data?.data || null);
      if (ticketsRes.status === 'fulfilled') {
        const rows = normalizeList(ticketsRes.value.data);
        setSecurityTickets(rows);
        const drafts = {};
        rows.forEach((ticket) => {
          const meta = ticketMeta(ticket);
          drafts[ticket.id] = {
            assignee_id: meta.assignee_id || '',
            due_at: toDateTimeLocalValue(meta.due_at),
            severity: meta.severity || 'high',
            tags_text: Array.isArray(meta.tags) ? meta.tags.join(', ') : '',
          };
        });
        setTicketDraftMap(drafts);
      }
      if (featureCatalogRes.status === 'fulfilled') {
        const catalog = normalizeList(featureCatalogRes.value.data);
        setFeatureCatalog(catalog.map((x) => x.feature_key).filter(Boolean));
        const docs = {};
        catalog.forEach((item) => {
          if (item?.feature_key) docs[item.feature_key] = item;
        });
        setFeatureDocs(docs);
      }

      const nextRoleDraft = {};
      [...
        managersRes.status === 'fulfilled' ? normalizeList(managersRes.value.data) : [],
        teachersRes.status === 'fulfilled' ? normalizeList(teachersRes.value.data) : [],
        studentsRes.status === 'fulfilled' ? normalizeList(studentsRes.value.data) : [],
      ].forEach((u) => {
        nextRoleDraft[u.id] = u.role;
      });
      setRoleDraftMap(nextRoleDraft);
    } catch {
      setError('Failed to load owner dashboard');
    } finally {
      setLoading(false);
    }
  }

  function askStepUp(defaultReason) {
    const ownerPassword = window.prompt('Owner confirmation: enter your password');
    if (!ownerPassword) return null;

    const reason = window.prompt('Reason for this action', defaultReason || 'Owner governance action');
    if (!reason || reason.trim().length < 8) {
      setError('A clear reason (at least 8 chars) is required for governance actions.');
      return null;
    }

    return { owner_password: ownerPassword, reason: reason.trim() };
  }

  async function handleRoleUpdate(targetUser) {
    const nextRole = roleDraftMap[targetUser.id] || targetUser.role;
    if (nextRole === targetUser.role) return;

    const stepUp = askStepUp(`Change role of ${targetUser.name} to ${nextRole}`);
    if (!stepUp) return;

    setBusyAction(`role-${targetUser.id}`);
    try {
      await api.patch(`/api/auth/users/${targetUser.id}/role`, {
        role: nextRole,
        ...stepUp,
      });
      setNotice(`${targetUser.name}'s role changed to ${nextRole}.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update role');
    } finally {
      setBusyAction('');
    }
  }

  async function toggleFeaturesPanel(userId) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);
    if (featureMapByUser[userId]) return;

    setBusyAction(`features-load-${userId}`);
    try {
      const res = await api.get(`/api/auth/users/${userId}/features`);
      const rows = normalizeList(res.data);
      const map = {};
      featureCatalog.forEach((key) => { map[key] = false; });
      rows.forEach((row) => {
        map[row.feature_key] = !!row.can_access;
      });
      setFeatureMapByUser((prev) => ({ ...prev, [userId]: map }));
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load feature permissions');
    } finally {
      setBusyAction('');
    }
  }

  function setFeatureToggle(userId, key, value) {
    setFeatureMapByUser((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [key]: value,
      },
    }));
  }

  async function saveFeatures(userId, userName) {
    const map = featureMapByUser[userId] || {};
    const stepUp = askStepUp(`Update feature grants for ${userName}`);
    if (!stepUp) return;

    const permissions = featureCatalog.map((feature_key) => ({
      feature_key,
      can_access: !!map[feature_key],
    }));

    setBusyAction(`features-save-${userId}`);
    try {
      await api.put(`/api/auth/users/${userId}/features`, { permissions, ...stepUp });
      setNotice(`Feature access saved for ${userName}.`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save feature permissions');
    } finally {
      setBusyAction('');
    }
  }

  async function removeUser(targetUser) {
    const ok = window.confirm(`Remove ${targetUser.name} from the platform?`);
    if (!ok) return;

    const stepUp = askStepUp(`Remove user ${targetUser.name}`);
    if (!stepUp) return;

    setBusyAction(`delete-${targetUser.id}`);
    try {
      await api.delete(`/api/auth/users/${targetUser.id}`, { data: stepUp });
      setNotice(`${targetUser.name} was removed.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to remove user');
    } finally {
      setBusyAction('');
    }
  }

  async function prepareWipe() {
    if (wipePrepareConfirm !== 'PREPARE WIPE') {
      setError('Type PREPARE WIPE exactly to prepare the wipe');
      return;
    }

    if (!wipeReason || wipeReason.trim().length < 8) {
      setError('A clear wipe reason is required (at least 8 chars).');
      return;
    }

    const ownerPassword = window.prompt('Owner confirmation: enter password to prepare wipe');
    if (!ownerPassword) return;

    setBusyAction('wipe-prepare');
    try {
      const res = await api.post('/api/auth/system/wipe/prepare', {
        confirm_text: 'PREPARE WIPE',
        reason: wipeReason.trim(),
        owner_password: ownerPassword,
      });

      const data = res.data?.data;
      setWipeRequestData(data || null);
      setWipePrepareConfirm('');
      setNotice('Wipe prepared. Cooldown started. Use the returned token path to execute final step.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to prepare wipe');
    } finally {
      setBusyAction('');
    }
  }

  async function wipePlatform() {
    if (!wipeRequestData?.request_id || !wipeRequestData?.wipe_token) {
      setError('Prepare wipe first before final execution.');
      return;
    }
    if (wipeConfirm !== 'WIPE PLATFORM' || wipeSecondConfirm !== 'FINAL CONFIRM') {
      setError('Type WIPE PLATFORM and FINAL CONFIRM exactly to execute wipe.');
      return;
    }

    const ok = window.confirm('Final warning: this will delete platform data and deactivate users. Continue?');
    if (!ok) return;

    const ownerPassword = window.prompt('Owner confirmation: enter password to execute final wipe');
    if (!ownerPassword) return;

    setBusyAction('wipe-platform');
    try {
      await api.post('/api/auth/system/wipe', {
        request_id: wipeRequestData.request_id,
        wipe_token: wipeRequestData.wipe_token,
        confirm_text: 'WIPE PLATFORM',
        second_confirm: 'FINAL CONFIRM',
        owner_password: ownerPassword,
        keep_other_owners: true,
      });
      setWipeRequestData(null);
      setWipeReason('');
      setWipePrepareConfirm('');
      setWipeConfirm('');
      setWipeSecondConfirm('');
      setNotice('Platform wipe completed. Data was reset.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to wipe platform');
    } finally {
      setBusyAction('');
    }
  }

  async function exportOwnerActions() {
    try {
      const response = await api.get('/api/auth/owner/actions/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'owner-actions.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to export owner actions');
    }
  }

  async function updateTicketStatus(ticket, status) {
    const note = window.prompt(`Optional note for moving ticket #${ticket.id} to ${status}`, '') || '';
    setBusyAction(`ticket-${ticket.id}-${status}`);
    try {
      await api.patch(`/api/auth/security/tickets/${ticket.id}`, {
        status,
        note: note.trim(),
      });
      setNotice(`Ticket #${ticket.id} moved to ${status}.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update security ticket');
    } finally {
      setBusyAction('');
    }
  }

  function setTicketDraft(ticketId, key, value) {
    setTicketDraftMap((prev) => ({
      ...prev,
      [ticketId]: {
        ...(prev[ticketId] || {}),
        [key]: value,
      },
    }));
  }

  async function saveTicketDetails(ticket) {
    const draft = ticketDraftMap[ticket.id] || {};
    const assigneeId = draft.assignee_id ? Number(draft.assignee_id) : null;
    const dueAt = draft.due_at ? new Date(draft.due_at).toISOString() : null;
    const tags = String(draft.tags_text || '')
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);

    setBusyAction(`ticket-save-${ticket.id}`);
    try {
      await api.patch(`/api/auth/security/tickets/${ticket.id}`, {
        assignee_id: assigneeId,
        due_at: dueAt,
        severity: draft.severity || 'high',
        tags,
      });
      setNotice(`Ticket #${ticket.id} details saved.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save ticket details');
    } finally {
      setBusyAction('');
    }
  }

  const userName = user?.name || 'Owner';
  const firstName = userName.split(' ')[0];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaChartLine },
    { id: 'classes', label: 'Classes', icon: FaBook },
    { id: 'users', label: 'Users', icon: FaUsers },
    { id: 'activity', label: 'Activity', icon: FaHistory },
    { id: 'settings', label: 'Settings', icon: FaCog },
  ];

  const bg = darkMode ? 'bg-[#0e141d]' : 'bg-[#f5f6fa]';
  const cardBg = darkMode ? 'bg-[#141c27] border-[#253246]' : 'bg-white border-[#dfe5ef]';
  const text = darkMode ? 'text-slate-100' : 'text-slate-900';
  const muted = darkMode ? 'text-slate-400' : 'text-slate-500';
  const divider = darkMode ? 'border-[#253246]' : 'border-[#e8edf5]';
  const inputBg = darkMode
    ? 'bg-[#111a25] border-[#253246] text-slate-100 placeholder:text-slate-500 focus:border-[#4c6fb8]'
    : 'bg-[#f7f9fd] border-[#d8e0ec] text-slate-800 placeholder:text-slate-400 focus:border-[#4c6fb8] focus:bg-white';

  const totalUsers = (stats.teachers || 0) + (stats.students || 0) + managers.length + 1;

  const searchedClasses = useMemo(() => classes.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${c.name || ''} ${c.description || ''}`.toLowerCase().includes(q);
  }), [classes, search]);

  const searchedUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...managers, ...teachers, ...students];
    if (!q) return list;
    return list.filter((u) => `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q));
  }, [managers, teachers, students, search]);

  const openSecurityTickets = Array.isArray(securityStatus?.open_security_tickets)
    ? securityStatus.open_security_tickets
    : [];
  const onboardingItems = [
    {
      id: 'security-overview',
      label: 'Review security status',
      hint: 'Check lockouts, bans, and active restrictions.',
      done: Boolean(securityStatus),
      onClick: () => setActiveTab('overview'),
    },
    {
      id: 'security-ticket-triage',
      label: 'Triage open security tickets',
      hint: 'Move critical tickets into in-progress or resolved.',
      done: openSecurityTickets.length === 0,
      onClick: () => setActiveTab('activity'),
    },
    {
      id: 'user-governance',
      label: 'Validate role governance',
      hint: 'Ensure managers and teachers are correctly assigned.',
      done: managers.length > 0 && teachers.length > 0,
      onClick: () => setActiveTab('users'),
    },
    {
      id: 'audit-review',
      label: 'Review owner action log',
      hint: 'Confirm privileged changes are auditable.',
      done: ownerActions.length > 0,
      onClick: () => setActiveTab('activity'),
    },
  ];
  const filteredTickets = securityTickets.filter((ticket) => {
    if (ticketFilter === 'all') return true;
    return (ticketMeta(ticket).status || 'open') === ticketFilter;
  });

  if (authLoading || loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${bg}`} style={{ fontFamily: 'Sora, Manrope, system-ui, sans-serif' }}>
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#4c6fb8] border-t-transparent" />
          <p className={`text-lg font-semibold ${text}`}>Loading Owner Dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen overflow-hidden ${bg} ${text}`} style={{ fontFamily: 'Sora, Manrope, system-ui, sans-serif' }}>
      <div className={`pointer-events-none absolute -left-20 top-16 h-72 w-72 rounded-full blur-3xl ${darkMode ? 'bg-[#203a72]/35' : 'bg-[#d6e5ff]/65'}`} />
      <div className={`pointer-events-none absolute right-8 top-8 h-64 w-64 rounded-full blur-3xl ${darkMode ? 'bg-[#364568]/35' : 'bg-[#e9efff]/85'}`} />

      <div className="flex min-h-screen">
        <aside className={`hidden xl:flex xl:w-72 xl:flex-col xl:px-5 xl:py-6 ${darkMode ? 'xl:bg-[#101927]' : 'xl:bg-[#111b2e]'} xl:text-white`}>
          <div className="mb-8 space-y-1 px-3">
            <div className="text-[32px] font-bold tracking-tight text-[#dce8ff]">Mahfuz</div>
            <p className="text-sm text-slate-300">Owner Console</p>
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

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/6 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#314b86] text-base font-bold text-white">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{userName}</p>
                <p className="text-sm text-slate-300">Owner</p>
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

        <div className="flex min-w-0 flex-1 flex-col">
          <header className={`sticky top-0 z-20 border-b ${darkMode ? 'border-[#202d42] bg-[#0e141d]/92' : 'border-[#dfe7f3] bg-[#f5f6fa]/86'} backdrop-blur-xl`}>
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="xl:hidden">
                <div className={`text-2xl font-bold ${darkMode ? 'text-[#dce8ff]' : 'text-[#1d355f]'}`}>Mahfuz</div>
              </div>

              <div className={`hidden flex-1 md:flex md:max-w-xl md:items-center md:gap-3 md:rounded-full md:border md:px-4 md:py-3 md:shadow-sm ${darkMode ? 'md:border-[#202d42] md:bg-[#111a27]' : 'md:border-[#d7e0ec] md:bg-white'}`}>
                <FaSearch className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search across classes and users"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full border-0 bg-transparent text-sm outline-none ${darkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'}`}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setDarkMode((d) => !d)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition ${darkMode ? 'border-[#253246] bg-[#111a27] text-[#bcd2ff]' : 'border-[#d7e0ec] bg-white text-slate-600 hover:text-[#1d355f]'}`}
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? <FaSun /> : <FaMoon />}
                </button>
              </div>
            </div>

            <div className={`flex gap-1 overflow-x-auto border-t px-4 py-2 xl:hidden ${divider}`}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    activeTab === tab.id
                      ? darkMode ? 'bg-[#314b86] text-white' : 'bg-[#2c4d90] text-white'
                      : darkMode ? 'text-slate-400 hover:bg-[#111a27]' : 'text-slate-500 hover:bg-[#ebf0f9]'
                  }`}
                >
                  <tab.icon /> {tab.label}
                </button>
              ))}
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {notice && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {notice}
                </div>
              )}

              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <section className={`relative overflow-hidden rounded-[30px] border p-6 sm:p-7 ${darkMode ? 'border-[#253246] bg-linear-to-br from-[#151f2f] via-[#111a27] to-[#121b29]' : 'border-[#dfe7f3] bg-linear-to-br from-[#ebf1fc] via-[#f5f8ff] to-[#edf2fb]'}`}>
                    <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${darkMode ? 'bg-white/7' : 'bg-white/90'}`} />
                    <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.22em] ${muted}`}>Owner Control Layer</p>
                    <h1 className={`text-3xl font-extrabold sm:text-4xl ${text}`}>Welcome back, {firstName}</h1>
                    <p className={`mt-2 max-w-2xl text-sm ${muted}`}>Platform governance, user growth, and system activity in one command surface.</p>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                      <button onClick={() => setActiveTab('users')} className="rounded-full bg-[#2c4d90] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#223d72]">
                        Open User Registry
                      </button>
                      <button onClick={() => setActiveTab('activity')} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${darkMode ? 'border-[#33435f] text-slate-200 hover:bg-white/7' : 'border-[#c8d6ec] text-[#233d70] hover:bg-white'}`}>
                        View Audit Stream
                      </button>
                    </div>
                  </section>

                  <OnboardingChecklistCard
                    title="Owner Launch Checklist"
                    subtitle="Governance and security controls before full rollout."
                    items={onboardingItems}
                    darkMode={darkMode}
                  />

                  <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[
                      { label: 'Total Classes', value: stats.classes || 0, icon: FaBook, tone: 'bg-[#e9f0ff] text-[#2d4e92]' },
                      { label: 'Total Users', value: totalUsers, icon: FaUsers, tone: 'bg-[#eaf7f4] text-[#236052]' },
                      { label: 'Managers', value: managers.length, icon: FaUserTie, tone: 'bg-[#fff2e8] text-[#b15f28]' },
                      { label: 'Active Sessions', value: stats.activeSessions || 0, icon: FaVideo, tone: 'bg-[#f0edff] text-[#5a4ab8]' },
                    ].map((s) => (
                      <div key={s.label} className={`rounded-[28px] border p-5 shadow-[0_8px_24px_rgba(17,24,39,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(17,24,39,0.08)] ${cardBg}`}>
                        <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${s.tone}`}>
                          <s.icon className="text-lg" />
                        </div>
                        <p className={`text-3xl font-bold ${text}`}>{s.value}</p>
                        <p className={`mt-0.5 text-xs font-medium ${muted}`}>{s.label}</p>
                      </div>
                    ))}
                  </section>

                  <section className="grid gap-6 lg:grid-cols-2">
                    <div className={`rounded-[28px] border p-6 shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                      <div className={`mb-5 flex items-center justify-between border-b pb-4 ${divider}`}>
                        <h2 className={`text-lg font-bold ${text}`}>Security Center</h2>
                        <button onClick={() => setActiveTab('activity')} className={`flex items-center gap-1 text-xs font-semibold ${darkMode ? 'text-[#9fb8ed]' : 'text-[#2d4e92]'} hover:underline`}>
                          Review incidents <FaArrowRight className="text-[10px]" />
                        </button>
                      </div>

                      {!securityStatus ? (
                        <p className={`text-sm ${muted}`}>Security status is loading.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`rounded-2xl border p-3 ${darkMode ? 'border-[#33435f] bg-white/3' : 'border-[#dce4f2] bg-[#f7faff]'}`}>
                              <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Active Socket Bans</p>
                              <p className={`mt-1 text-2xl font-bold ${text}`}>{securityStatus?.socket_abuse_guard?.active_bans || 0}</p>
                            </div>
                            <div className={`rounded-2xl border p-3 ${darkMode ? 'border-[#33435f] bg-white/3' : 'border-[#dce4f2] bg-[#f7faff]'}`}>
                              <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Chat Restrictions</p>
                              <p className={`mt-1 text-2xl font-bold ${text}`}>{securityStatus?.socket_abuse_guard?.active_chat_restrictions || 0}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className={`rounded-2xl border p-3 ${darkMode ? 'border-[#33435f] bg-white/3' : 'border-[#dce4f2] bg-[#f7faff]'}`}>
                              <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Locked Identities</p>
                              <p className={`mt-1 text-2xl font-bold ${text}`}>{securityStatus?.login_guard?.locked_now || 0}</p>
                            </div>
                            <div className={`rounded-2xl border p-3 ${darkMode ? 'border-[#33435f] bg-white/3' : 'border-[#dce4f2] bg-[#f7faff]'}`}>
                              <p className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Open Tickets</p>
                              <p className={`mt-1 text-2xl font-bold ${text}`}>{openSecurityTickets.length}</p>
                            </div>
                          </div>

                          <div className={`rounded-2xl border p-3 ${darkMode ? 'border-[#33435f] bg-white/3' : 'border-[#dce4f2] bg-[#f7faff]'}`}>
                            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${muted}`}>Latest Open Tickets</p>
                            {openSecurityTickets.length === 0 ? (
                              <p className={`text-xs ${muted}`}>No open high-priority tickets.</p>
                            ) : (
                              <div className="space-y-2">
                                {openSecurityTickets.slice(0, 4).map((ticket) => (
                                  <div key={ticket.id} className={`rounded-xl border px-3 py-2 ${darkMode ? 'border-[#3a4a68]' : 'border-[#dbe4f3]'}`}>
                                    <p className={`text-xs font-semibold ${text}`}>{ticket?.metadata?.title || 'Security ticket'}</p>
                                    <p className={`mt-1 text-[11px] ${muted}`}>{timeAgo(ticket.created_at)}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`rounded-[28px] border p-6 shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                      <div className={`mb-5 flex items-center justify-between border-b pb-4 ${divider}`}>
                        <h2 className={`text-lg font-bold ${text}`}>Recent Classes</h2>
                        <button onClick={() => setActiveTab('classes')} className={`flex items-center gap-1 text-xs font-semibold ${darkMode ? 'text-[#9fb8ed]' : 'text-[#2d4e92]'} hover:underline`}>
                          See all <FaArrowRight className="text-[10px]" />
                        </button>
                      </div>
                      {classes.length === 0 ? (
                        <p className={`text-sm ${muted}`}>No classes yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {classes.slice(0, 5).map((cls) => (
                            <button key={cls.id} onClick={() => navigate(`/class/${cls.id}`)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${darkMode ? 'hover:bg-white/5' : 'hover:bg-[#f6f8fd]'}`}>
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9f0ff] text-sm font-bold text-[#2d4e92]">
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
                        <h2 className={`text-lg font-bold ${text}`}>Audit Highlights</h2>
                        <button onClick={() => setActiveTab('activity')} className={`flex items-center gap-1 text-xs font-semibold ${darkMode ? 'text-[#9fb8ed]' : 'text-[#2d4e92]'} hover:underline`}>
                          Full log <FaArrowRight className="text-[10px]" />
                        </button>
                      </div>
                      {auditLogs.length === 0 ? (
                        <p className={`text-sm ${muted}`}>No activity recorded yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {auditLogs.slice(0, 6).map((log) => (
                            <div key={log.id} className="flex items-start gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e9f0ff] text-xs font-bold text-[#2d4e92]">
                                {avatarLetter(log.actor_name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm ${text}`}>
                                  <span className="font-semibold">{log.actor_name || 'System'}</span>
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
                  </section>
                </div>
              )}

              {activeTab === 'classes' && (
                <div className="space-y-5">
                  <div>
                    <h2 className={`text-2xl font-bold ${text}`}>Class Registry</h2>
                    <p className={`text-sm ${muted}`}>{searchedClasses.length} class{searchedClasses.length !== 1 ? 'es' : ''} matched</p>
                  </div>

                  <div className="relative max-w-xl">
                    <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${muted}`} />
                    <input
                      type="text"
                      placeholder="Search class by name or description"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={`w-full rounded-2xl border py-3 pl-10 pr-4 text-sm outline-none transition focus:ring-4 focus:ring-[#dbe5fb] ${inputBg}`}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {searchedClasses.map((cls) => (
                      <button key={cls.id} onClick={() => navigate(`/class/${cls.id}`)} className={`rounded-[28px] border p-5 text-left shadow-[0_4px_16px_rgba(17,24,39,0.05)] transition hover:shadow-[0_10px_24px_rgba(17,24,39,0.09)] ${cardBg}`}>
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f0ff] text-base font-bold text-[#2d4e92]">
                          {avatarLetter(cls.name)}
                        </div>
                        <p className={`font-bold ${text}`}>{cls.name}</p>
                        <p className={`mt-1 line-clamp-2 text-xs ${muted}`}>{cls.description || 'No description'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="space-y-5">
                  <div>
                    <h2 className={`text-2xl font-bold ${text}`}>User Registry</h2>
                    <p className={`text-sm ${muted}`}>{searchedUsers.length} user{searchedUsers.length !== 1 ? 's' : ''} matched</p>
                  </div>

                  <div className="relative max-w-xl">
                    <FaSearch className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${muted}`} />
                    <input
                      type="text"
                      placeholder="Search by name or email"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={`w-full rounded-2xl border py-3 pl-10 pr-4 text-sm outline-none transition focus:ring-4 focus:ring-[#dbe5fb] ${inputBg}`}
                    />
                  </div>

                  <div className="space-y-3">
                    {searchedUsers.slice(0, 120).map((u) => (
                      <div key={u.id} className={`rounded-3xl border p-4 shadow-[0_6px_18px_rgba(17,24,39,0.05)] ${cardBg}`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9f0ff] text-xs font-bold text-[#2d4e92]">
                              {avatarLetter(u.name)}
                            </div>
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${text}`}>{u.name}</p>
                              <p className={`truncate text-xs ${muted}`}>{u.email}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={roleDraftMap[u.id] || u.role}
                              onChange={(e) => setRoleDraftMap((prev) => ({ ...prev, [u.id]: e.target.value }))}
                              className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-wide outline-none ${inputBg}`}
                            >
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="manager">Manager</option>
                              <option value="owner">Owner</option>
                            </select>

                            <button
                              onClick={() => handleRoleUpdate(u)}
                              disabled={busyAction === `role-${u.id}` || (roleDraftMap[u.id] || u.role) === u.role}
                              className="rounded-xl bg-[#2c4d90] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#223d72] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyAction === `role-${u.id}` ? 'Saving...' : 'Save Role'}
                            </button>

                            <button
                              onClick={() => toggleFeaturesPanel(u.id)}
                              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${darkMode ? 'border-[#33435f] text-slate-200 hover:bg-white/7' : 'border-[#c8d6ec] text-[#233d70] hover:bg-[#f1f5ff]'}`}
                            >
                              Features
                            </button>

                            <button
                              onClick={() => removeUser(u)}
                              disabled={busyAction === `delete-${u.id}`}
                              className="rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busyAction === `delete-${u.id}` ? 'Removing...' : (
                                <span className="inline-flex items-center gap-1.5"><FaTrash /> Remove</span>
                              )}
                            </button>
                          </div>
                        </div>

                        {expandedUserId === u.id && (
                          <div className={`mt-4 rounded-2xl border p-3 ${darkMode ? 'border-[#33435f] bg-white/3' : 'border-[#dce4f2] bg-[#f7faff]'}`}>
                            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${muted}`}>Feature access grants</p>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {featureCatalog.map((featureKey) => {
                                const checked = !!featureMapByUser[u.id]?.[featureKey];
                                return (
                                  <label key={featureKey} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs ${darkMode ? 'border-[#33435f]' : 'border-[#d8e2f3]'}`}>
                                    <span className={text}>{featureDocs[featureKey]?.label || FEATURE_LABELS[featureKey] || featureKey}</span>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => setFeatureToggle(u.id, featureKey, e.target.checked)}
                                    />
                                  </label>
                                );
                              })}
                            </div>

                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={() => saveFeatures(u.id, u.name)}
                                disabled={busyAction === `features-save-${u.id}` || busyAction === `features-load-${u.id}`}
                                className="rounded-xl bg-[#2c4d90] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#223d72] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busyAction === `features-save-${u.id}` ? 'Saving...' : (
                                  <span className="inline-flex items-center gap-1.5"><FaCheck /> Save Features</span>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className={`rounded-3xl border p-5 ${darkMode ? 'border-red-900/40 bg-red-950/15' : 'border-red-200 bg-red-50/70'}`}>
                    <p className={`text-sm font-bold ${darkMode ? 'text-red-200' : 'text-red-700'}`}>Danger Zone: Wipe platform data</p>
                    <p className={`mt-1 text-xs ${darkMode ? 'text-red-200/80' : 'text-red-700/85'}`}>
                      This removes classes, content, chat history, activity logs, and deactivates non-owner accounts. Prepare first, wait cooldown, then execute.
                    </p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={wipeReason}
                        onChange={(e) => setWipeReason(e.target.value)}
                        placeholder="Reason for wipe (required)"
                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                      />
                      <input
                        type="text"
                        value={wipePrepareConfirm}
                        onChange={(e) => setWipePrepareConfirm(e.target.value)}
                        placeholder="Type PREPARE WIPE"
                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={prepareWipe}
                        disabled={busyAction === 'wipe-prepare' || wipePrepareConfirm !== 'PREPARE WIPE' || wipeReason.trim().length < 8}
                        className="rounded-xl border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyAction === 'wipe-prepare' ? 'Preparing...' : 'Prepare Wipe'}
                      </button>
                      {wipeRequestData?.request_id && (
                        <span className={`text-xs ${darkMode ? 'text-red-200/85' : 'text-red-700/85'}`}>
                          Prepared request #{wipeRequestData.request_id}. Earliest run: {new Date(wipeRequestData.execute_after).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={wipeConfirm}
                        onChange={(e) => setWipeConfirm(e.target.value)}
                        placeholder="Type WIPE PLATFORM"
                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                      />
                      <input
                        type="text"
                        value={wipeSecondConfirm}
                        onChange={(e) => setWipeSecondConfirm(e.target.value)}
                        placeholder="Type FINAL CONFIRM"
                        className={`w-full rounded-xl border px-3 py-2 text-sm outline-none ${inputBg}`}
                      />
                    </div>

                    <div className="mt-3">
                      <button
                        onClick={wipePlatform}
                        disabled={
                          busyAction === 'wipe-platform' ||
                          wipeConfirm !== 'WIPE PLATFORM' ||
                          wipeSecondConfirm !== 'FINAL CONFIRM' ||
                          !wipeRequestData?.request_id
                        }
                        className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyAction === 'wipe-platform' ? 'Wiping...' : 'Execute Final Wipe'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                    <h2 className={`text-2xl font-bold ${text}`}>System Activity Stream</h2>
                    <p className={`text-sm ${muted}`}>Latest 30 events across the platform</p>
                    </div>
                    <button
                      onClick={exportOwnerActions}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#2c4d90] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#223d72]"
                    >
                      <FaDownload /> Export Owner Actions CSV
                    </button>
                  </div>

                  <div className={`rounded-[28px] border shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                    <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4 ${divider}`}>
                      <div>
                        <h3 className={`text-base font-bold ${text}`}>Security Ticket Queue</h3>
                        <p className={`text-xs ${muted}`}>Acknowledge and resolve automated incident tickets.</p>
                      </div>
                      <select
                        value={ticketFilter}
                        onChange={(e) => setTicketFilter(e.target.value)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none ${inputBg}`}
                      >
                        <option value="open">Open</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="resolved">Resolved</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    <div className="divide-y">
                      {filteredTickets.length === 0 ? (
                        <p className={`px-6 py-5 text-sm ${muted}`}>No tickets in this filter.</p>
                      ) : filteredTickets.map((ticket) => {
                        const meta = ticketMeta(ticket);
                        const status = meta.status || 'open';
                        const draft = ticketDraftMap[ticket.id] || {
                          assignee_id: meta.assignee_id || '',
                          due_at: toDateTimeLocalValue(meta.due_at),
                          severity: meta.severity || 'high',
                          tags_text: Array.isArray(meta.tags) ? meta.tags.join(', ') : '',
                        };
                        const busyAck = busyAction === `ticket-${ticket.id}-acknowledged`;
                        const busyResolve = busyAction === `ticket-${ticket.id}-resolved`;
                        const busySave = busyAction === `ticket-save-${ticket.id}`;
                        return (
                          <div key={ticket.id} className={`px-6 py-4 ${darkMode ? 'hover:bg-white/3' : 'hover:bg-[#f7f9fd]'} transition`}>
                            <div className="flex flex-col gap-3">
                              <div className="min-w-0">
                                <p className={`text-sm font-semibold ${text}`}>{meta.title || `Security ticket #${ticket.id}`}</p>
                                <p className={`mt-1 text-xs ${muted}`}>Severity: {meta.severity || 'high'}  Status: {status}  {timeAgo(ticket.created_at)}</p>
                                {meta.details ? (
                                  <p className={`mt-1 truncate text-xs ${muted}`}>{JSON.stringify(meta.details).slice(0, 140)}</p>
                                ) : null}
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <select
                                  value={draft.assignee_id}
                                  onChange={(e) => setTicketDraft(ticket.id, 'assignee_id', e.target.value)}
                                  className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none ${inputBg}`}
                                >
                                  <option value="">Unassigned</option>
                                  {owners.map((owner) => (
                                    <option key={owner.id} value={owner.id}>{owner.name}</option>
                                  ))}
                                </select>
                                <input
                                  type="datetime-local"
                                  value={draft.due_at}
                                  onChange={(e) => setTicketDraft(ticket.id, 'due_at', e.target.value)}
                                  className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none ${inputBg}`}
                                />
                                <select
                                  value={draft.severity || 'high'}
                                  onChange={(e) => setTicketDraft(ticket.id, 'severity', e.target.value)}
                                  className={`rounded-xl border px-3 py-2 text-xs font-semibold outline-none ${inputBg}`}
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                  <option value="critical">Critical</option>
                                </select>
                                <input
                                  type="text"
                                  value={draft.tags_text || ''}
                                  onChange={(e) => setTicketDraft(ticket.id, 'tags_text', e.target.value)}
                                  placeholder="tags: auth, abuse"
                                  className={`rounded-xl border px-3 py-2 text-xs outline-none ${inputBg}`}
                                />
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => saveTicketDetails(ticket)}
                                  disabled={busySave}
                                  className="rounded-xl border border-[#c8d6ec] px-3 py-2 text-xs font-semibold text-[#233d70] transition hover:bg-[#f1f5ff] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busySave ? 'Saving...' : 'Save Fields'}
                                </button>
                                <button
                                  onClick={() => updateTicketStatus(ticket, 'acknowledged')}
                                  disabled={busyAck || status === 'acknowledged' || status === 'resolved'}
                                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${darkMode ? 'border-[#33435f] text-slate-200 hover:bg-white/7' : 'border-[#c8d6ec] text-[#233d70] hover:bg-[#f1f5ff]'} disabled:cursor-not-allowed disabled:opacity-50`}
                                >
                                  {busyAck ? 'Saving...' : 'Acknowledge'}
                                </button>
                                <button
                                  onClick={() => updateTicketStatus(ticket, 'resolved')}
                                  disabled={busyResolve || status === 'resolved'}
                                  className="rounded-xl bg-[#2c4d90] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#223d72] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busyResolve ? 'Saving...' : 'Resolve'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className={`rounded-[28px] border shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                    <div className="divide-y">
                      {auditLogs.map((log, i) => (
                        <div key={log.id || i} className={`flex items-start gap-4 px-6 py-4 ${i === 0 ? 'rounded-t-[28px]' : ''} ${i === auditLogs.length - 1 ? 'rounded-b-[28px]' : ''} ${darkMode ? 'hover:bg-white/3' : 'hover:bg-[#f7f9fd]'} transition`}>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9f0ff] text-sm font-bold text-[#2d4e92]">
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
                              <p className={`mt-0.5 truncate text-xs ${muted}`}>{JSON.stringify(log.metadata).slice(0, 90)}</p>
                            )}
                          </div>
                          <span className={`shrink-0 text-xs ${muted}`}>{timeAgo(log.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-[28px] border shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                    <div className={`flex items-center justify-between border-b px-6 py-4 ${divider}`}>
                      <h3 className={`text-base font-bold ${text}`}>Owner Governance Timeline</h3>
                      <span className={`text-xs ${muted}`}>{ownerActions.length} events</span>
                    </div>
                    <div className="divide-y">
                      {ownerActions.length === 0 ? (
                        <p className={`px-6 py-5 text-sm ${muted}`}>No owner governance events yet.</p>
                      ) : ownerActions.map((event, i) => (
                        <div key={event.id || i} className={`flex items-start gap-4 px-6 py-4 ${darkMode ? 'hover:bg-white/3' : 'hover:bg-[#f7f9fd]'} transition`}>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e9f0ff] text-xs font-bold text-[#2d4e92]">
                            {avatarLetter(event.actor_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${text}`}>
                              <span className="font-semibold">{event.actor_name || 'Owner'}</span>
                              {' '}<span className={muted}>{ACTION_LABELS[event.action] || event.action}</span>
                              {' '}<span className="font-medium">{event.target_table}</span>
                            </p>
                            {event.metadata && (
                              <p className={`mt-0.5 truncate text-xs ${muted}`}>{JSON.stringify(event.metadata).slice(0, 120)}</p>
                            )}
                          </div>
                          <span className={`shrink-0 text-xs ${muted}`}>{timeAgo(event.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="space-y-5">
                  <div>
                    <h2 className={`text-2xl font-bold ${text}`}>Owner Settings</h2>
                    <p className={`text-sm ${muted}`}>Feature catalog with delegation guidance and route-level impact.</p>
                  </div>

                  <div className={`rounded-[28px] border p-6 shadow-[0_8px_24px_rgba(17,24,39,0.05)] ${cardBg}`}>
                    <h3 className={`text-lg font-bold ${text}`}>Delegation Workflow</h3>
                    <p className={`mt-2 text-sm ${muted}`}>
                      Choose a manager in the Users tab, toggle feature grants, and save. Enforcement applies directly on backend routes.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => setActiveTab('users')}
                        className="rounded-full bg-[#2c4d90] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#223d72]"
                      >
                        Open User Delegation
                      </button>
                      <button
                        onClick={() => setActiveTab('activity')}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${darkMode ? 'border-[#33435f] text-slate-200 hover:bg-white/7' : 'border-[#c8d6ec] text-[#233d70] hover:bg-white'}`}
                      >
                        Review Owner Timeline
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {featureCatalog.map((featureKey) => {
                      const doc = featureDocs[featureKey] || {};
                      const routes = Array.isArray(doc.route_impacts) ? doc.route_impacts : [];
                      return (
                        <div key={featureKey} className={`rounded-3xl border p-5 shadow-[0_6px_18px_rgba(17,24,39,0.05)] ${cardBg}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-base font-bold ${text}`}>{doc.label || FEATURE_LABELS[featureKey] || featureKey}</p>
                              <p className={`mt-1 text-xs ${muted}`}>{featureKey}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'bg-white/8 text-slate-200' : 'bg-[#edf2ff] text-[#2c4d90]'}`}>
                              Delegatable
                            </span>
                          </div>

                          <p className={`mt-3 text-sm ${muted}`}>
                            {doc.description || 'No description available.'}
                          </p>

                          <div className={`mt-4 rounded-2xl border p-3 ${darkMode ? 'border-[#33435f] bg-white/3' : 'border-[#dce4f2] bg-[#f7faff]'}`}>
                            <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${muted}`}>Route Impact</p>
                            {routes.length === 0 ? (
                              <p className={`text-xs ${muted}`}>No mapped routes.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {routes.map((routeLine) => (
                                  <p key={routeLine} className={`text-xs ${text}`}>{routeLine}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={`rounded-2xl border p-4 ${cardBg}`}>
                <div className="flex items-center gap-2">
                  <FaShieldAlt className={`${darkMode ? 'text-[#9fb8ed]' : 'text-[#2d4e92]'}`} />
                  <p className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Governance Snapshot</p>
                </div>
                <p className={`mt-2 text-sm ${muted}`}>System health is stable. Keep monitoring manager approvals and class growth trends for governance quality.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
