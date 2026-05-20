import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaBullhorn, FaPlus, FaTimes, FaThumbtack, FaTrash,
  FaPen, FaCheck, FaCircle, FaVideo,
} from 'react-icons/fa';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function Announcements() {
  const { classId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'manager';

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', pinned: false });
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
    fetchActiveSession();
  }, [classId]);

  const fetchActiveSession = async () => {
    try {
      const res = await api.get(`/api/sessions?class_id=${classId}`);
      const sessions = res.data?.data || res.data || [];
      const active = (Array.isArray(sessions) ? sessions : []).find(
        (s) => s.class_id === Number(classId) && !s.ended_at
      );
      setActiveSession(active || null);
    } catch {
      // silently fail — banner is optional
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get(`/api/announcements?class_id=${classId}`);
      const data = res.data?.data || res.data || [];
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/api/announcements', {
        class_id: classId,
        title: form.title.trim(),
        body: form.body.trim(),
        pinned: form.pinned,
      });
      setForm({ title: '', body: '', pinned: false });
      setShowForm(false);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (ann) => {
    try {
      await api.patch(`/api/announcements/${ann.id}`, { pinned: !ann.pinned });
      await fetchAnnouncements();
    } catch {
      setError('Failed to update announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/api/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Failed to delete announcement');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Live session banner */}
      {activeSession && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <FaCircle className="animate-pulse text-red-500 text-xs" />
            <div>
              <p className="text-sm font-bold text-red-800">Live Session in Progress</p>
              <p className="text-xs text-red-600">
                {activeSession.title || 'Your teacher has started a live session'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/class/${classId}/live`)}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors shrink-0"
          >
            <FaVideo /> Join Now
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Announcements</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isTeacher ? 'Post updates for your students' : 'Class updates from your teacher'}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
          >
            <FaPlus /> New Announcement
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      {/* Empty state */}
      {announcements.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#ced9d5] bg-[#f5f7f5] p-12 text-center">
          <FaBullhorn className="mx-auto mb-4 text-5xl text-[#8ba8a3]" />
          <h3 className="mb-2 text-xl font-bold text-slate-900">No Announcements Yet</h3>
          <p className="text-slate-500 mb-6">
            {isTeacher
              ? 'Post your first announcement to keep students informed.'
              : 'Your teacher has not posted any announcements yet.'}
          </p>
          {isTeacher && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-2xl bg-[#2d5a56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
            >
              Post First Announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`rounded-3xl border bg-white p-6 shadow-[0_6px_20px_rgba(17,24,39,0.05)] transition ${
                ann.pinned
                  ? 'border-[#2d5a56] ring-1 ring-[#2d5a56]/20'
                  : 'border-[#e3e7e3] hover:border-[#c7d6d2]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {ann.pinned && (
                      <span className="flex items-center gap-1 rounded-full bg-[#e7f3ef] px-2 py-0.5 text-xs font-semibold text-[#2d5a56]">
                        <FaThumbtack className="text-[10px]" /> Pinned
                      </span>
                    )}
                    <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{ann.body}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                    <span className="font-medium text-slate-500">{ann.author_name || 'Teacher'}</span>
                    <span>·</span>
                    <span>{timeAgo(ann.created_at)}</span>
                  </div>
                </div>

                {isTeacher && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTogglePin(ann)}
                      title={ann.pinned ? 'Unpin' : 'Pin to top'}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                        ann.pinned
                          ? 'bg-[#e7f3ef] text-[#2d5a56] hover:bg-[#d4ece3]'
                          : 'bg-[#f3f4f3] text-slate-400 hover:bg-[#e8eae8]'
                      }`}
                    >
                      <FaThumbtack className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-400 transition hover:bg-red-100"
                      title="Delete"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-[#dce4de] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
            <div className="flex items-center justify-between border-b border-[#edf0ed] px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">New Announcement</h3>
                <p className="mt-0.5 text-sm text-slate-500">This will be visible to all students in the class</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 transition hover:bg-[#e8eae8]"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handlePost} className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Class tomorrow is cancelled"
                  className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Message *</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Write your announcement here..."
                  className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                  rows={4}
                  required
                />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3">
                <span
                  onClick={() => setForm({ ...form, pinned: !form.pinned })}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                    form.pinned
                      ? 'border-[#2d5a56] bg-[#2d5a56] text-white'
                      : 'border-[#c7cfc9] bg-white'
                  }`}
                >
                  {form.pinned && <FaCheck className="text-xs" />}
                </span>
                <div onClick={() => setForm({ ...form, pinned: !form.pinned })}>
                  <p className="text-sm font-semibold text-slate-700">Pin this announcement</p>
                  <p className="text-xs text-slate-400">Pinned announcements stay at the top</p>
                </div>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 border-t border-[#edf0ed] pt-4">
                <button
                  type="submit"
                  disabled={saving || !form.title.trim() || !form.body.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : <FaBullhorn />}
                  {saving ? 'Posting...' : 'Post Announcement'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-2xl border border-[#d7ded9] bg-[#f5f7f5] px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
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
