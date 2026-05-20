import { useState, useEffect, useRef, useCallback } from 'react';
import { FaBell, FaCheck, FaCheckDouble } from 'react-icons/fa';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell({ darkMode = false, className = '' }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/api/notifications?limit=20');
      setNotifications(res.data.data || []);
      setUnread(res.data.unread || 0);
    } catch {
      // silent — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const buttonCls = darkMode
    ? 'relative flex h-11 w-11 items-center justify-center rounded-full border border-[#23272b] bg-[#23272b] text-[#b6f2d6] shadow-sm transition hover:text-[#b6f2d6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b6f2d6] focus-visible:ring-offset-2'
    : 'relative flex h-11 w-11 items-center justify-center rounded-full border border-[#dfe5e0] bg-white text-slate-500 shadow-sm transition hover:text-[#2d5a56] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d5a56] focus-visible:ring-offset-2';

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      <button
        className={buttonCls}
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
      >
        <FaBell />
        {unread > 0 && (
          <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {Math.min(unread, 9)}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute right-0 top-14 z-50 w-80 rounded-2xl border shadow-2xl overflow-hidden ${
            darkMode
              ? 'border-[#2e3b3a] bg-[#1a2322] text-slate-100'
              : 'border-[#e3e7e3] bg-white text-slate-800'
          }`}
          style={{ maxHeight: '420px', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-[#2e3b3a]' : 'border-[#e3e7e3]'}`}>
            <span className="text-sm font-bold">Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-[#2d5a56] hover:underline"
              >
                <FaCheckDouble className="text-[10px]" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {loading && notifications.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2d5a56] border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              No notifications yet
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    n.is_read
                      ? darkMode ? 'hover:bg-[#1e2b2a]' : 'hover:bg-slate-50'
                      : darkMode ? 'bg-[#1d2e2c]' : 'bg-[#f0faf5]'
                  }`}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-[#2d5a56]'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{n.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      className="shrink-0 text-[#2d5a56] hover:text-[#234946]"
                      title="Mark read"
                      onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                    >
                      <FaCheck className="text-xs" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
