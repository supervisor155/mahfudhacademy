import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaLayerGroup, FaPlus, FaTimes, FaTrash, FaVideo,
  FaFilm, FaGripVertical, FaPen, FaCheck,
} from 'react-icons/fa';

export default function Curriculum() {
  const { classId } = useParams();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'manager';

  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);   // module id being edited
  const [editTitle, setEditTitle] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchModules(); }, [classId]);

  const fetchModules = async () => {
    try {
      const res = await api.get(`/api/curriculum?class_id=${classId}`);
      const data = res.data?.data || res.data || [];
      setModules(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/api/curriculum', {
        class_id: classId,
        title: newTitle.trim(),
        sort_order: modules.length,
      });
      setNewTitle('');
      setShowCreate(false);
      await fetchModules();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create module');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (id) => {
    if (!editTitle.trim()) return;
    try {
      await api.patch(`/api/curriculum/${id}`, { title: editTitle.trim() });
      setEditing(null);
      await fetchModules();
    } catch {
      setError('Failed to update module');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this module? Videos and reels inside will become unorganised.')) return;
    try {
      await api.delete(`/api/curriculum/${id}`);
      setModules((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError('Failed to delete module');
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Curriculum</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isTeacher
              ? 'Organise your course into modules and lessons'
              : 'Course structure and lesson plan'}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
          >
            <FaPlus /> Add Module
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      {modules.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#ced9d5] bg-[#f5f7f5] p-12 text-center">
          <FaLayerGroup className="mx-auto mb-4 text-5xl text-[#8ba8a3]" />
          <h3 className="mb-2 text-xl font-bold text-slate-900">No Modules Yet</h3>
          <p className="text-slate-500 mb-6">
            {isTeacher
              ? 'Create modules to organise your course content (e.g. "Week 1: Surah Al-Fatiha").'
              : 'The teacher has not set up a curriculum yet.'}
          </p>
          {isTeacher && (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-[#2d5a56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
            >
              Create First Module
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {modules.map((mod, idx) => (
            <div
              key={mod.id}
              className="overflow-hidden rounded-[22px] border border-[#e3e7e3] bg-white shadow-[0_6px_20px_rgba(17,24,39,0.05)] transition hover:border-[#c7d6d2]"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Index badge */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e7f3ef] text-sm font-bold text-[#2d5a56]">
                  {idx + 1}
                </div>

                {/* Title / edit */}
                {editing === mod.id ? (
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 rounded-xl border border-[#d7ded9] bg-[#f6f8f6] px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#7ea89c] focus:bg-white focus:ring-2 focus:ring-[#dcece6]"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(mod.id);
                        if (e.key === 'Escape') setEditing(null);
                      }}
                    />
                    <button
                      onClick={() => handleEditSave(mod.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2d5a56] text-white transition hover:bg-[#234946]"
                    >
                      <FaCheck className="text-xs" />
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 transition hover:bg-[#e8eae8]"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{mod.title}</h3>
                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                      {Number(mod.video_count) > 0 && (
                        <span className="flex items-center gap-1">
                          <FaVideo className="text-[#3a66b8]" /> {mod.video_count} video{mod.video_count !== '1' ? 's' : ''}
                        </span>
                      )}
                      {Number(mod.reel_count) > 0 && (
                        <span className="flex items-center gap-1">
                          <FaFilm className="text-orange-500" /> {mod.reel_count} reel{mod.reel_count !== '1' ? 's' : ''}
                        </span>
                      )}
                      {Number(mod.video_count) === 0 && Number(mod.reel_count) === 0 && (
                        <span className="italic">No content yet</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isTeacher && editing !== mod.id && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditing(mod.id); setEditTitle(mod.title); }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 transition hover:bg-[#e8eae8]"
                      title="Rename"
                    >
                      <FaPen className="text-xs" />
                    </button>
                    <button
                      onClick={() => handleDelete(mod.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-400 transition hover:bg-red-100"
                      title="Delete"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Module Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-[#dce4de] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
            <div className="flex items-center justify-between border-b border-[#edf0ed] px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Add Module</h3>
                <p className="mt-0.5 text-sm text-slate-500">e.g. "Week 1: Introduction to Tajweed"</p>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 transition hover:bg-[#e8eae8]"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Module Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Week 1: Surah Al-Fatiha"
                  className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 border-t border-[#edf0ed] pt-4">
                <button
                  type="submit"
                  disabled={saving || !newTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : <FaLayerGroup />}
                  {saving ? 'Adding...' : 'Add Module'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
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
