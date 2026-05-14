import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  FaStickyNote, FaPlus, FaTrash, FaSave, FaTimes,
  FaThumbtack, FaShare, FaSearch, FaPen, FaCheck,
  FaEllipsisV,
} from 'react-icons/fa';

const NOTE_COLORS = [
  { key: 'green',  bg: 'bg-[#e7f3ef]', border: 'border-[#b6d9cc]', dot: 'bg-[#2d5a56]' },
  { key: 'yellow', bg: 'bg-[#fff8e7]', border: 'border-[#f0d9a0]', dot: 'bg-[#c26d32]' },
  { key: 'blue',   bg: 'bg-[#edf3f8]', border: 'border-[#b8cfe0]', dot: 'bg-[#3a66b8]' },
  { key: 'purple', bg: 'bg-[#f3effd]', border: 'border-[#cfc0f0]', dot: 'bg-[#7d57b1]' },
  { key: 'red',    bg: 'bg-[#fdf0f0]', border: 'border-[#f0c0c0]', dot: 'bg-[#c45b5b]' },
];

function colorFor(key) {
  return NOTE_COLORS.find((c) => c.key === key) || NOTE_COLORS[0];
}

function formatRelative(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notes() {
  const { classId } = useParams();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'manager';
  const editorRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null); // null = new note
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const [form, setForm] = useState({
    title: '',
    body: '',
    color: 'green',
  });

  // Load class notes from localStorage (keyed by class + user)
  const storageKey = `class-notes-${classId}-${user?.id}`;

  useEffect(() => {
    loadNotes();
  }, [classId]);

  // Also try to load shared notes from API
  async function loadNotes() {
    setLoading(true);
    // First load local notes
    const local = getLocalNotes();
    setNotes(local);

    // Then try to merge shared notes from API
    try {
      const res = await api.get(`/api/notes/class/${classId}/shared`);
      const shared = Array.isArray(res.data) ? res.data : [];
      // Merge: keep local notes, add shared notes that aren't already local
      const localIds = new Set(local.map((n) => n.id));
      const merged = [
        ...local,
        ...shared.filter((n) => !localIds.has(n.id)).map((n) => ({
          id: n.id,
          title: n.note?.split('\n')[0]?.slice(0, 60) || 'Shared Note',
          body: n.note || '',
          color: n.color || 'green',
          pinned: !!n.pinned,
          shared: true,
          author: n.user_id !== user?.id,
          created_at: n.created_at,
          updated_at: n.updated_at,
        })),
      ];
      setNotes(merged);
    } catch {
      // API notes unavailable, local notes already shown
    } finally {
      setLoading(false);
    }
  }

  function getLocalNotes() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveLocalNotes(nextNotes) {
    localStorage.setItem(storageKey, JSON.stringify(nextNotes));
    setNotes(nextNotes);
  }

  function openNew() {
    setForm({ title: '', body: '', color: 'green' });
    setEditingNote(null);
    setShowEditor(true);
    setTimeout(() => editorRef.current?.focus(), 100);
  }

  function openEdit(note) {
    if (note.author) return; // can't edit other people's notes
    setForm({ title: note.title || '', body: note.body || '', color: note.color || 'green' });
    setEditingNote(note);
    setShowEditor(true);
  }

  function handleSave(e) {
    e?.preventDefault();
    if (!form.body.trim() && !form.title.trim()) return;
    setSaving(true);

    const localNotes = getLocalNotes();

    if (editingNote && !editingNote.shared) {
      // Update existing local note
      const updated = localNotes.map((n) =>
        n.id === editingNote.id
          ? { ...n, title: form.title, body: form.body, color: form.color, updated_at: new Date().toISOString() }
          : n
      );
      saveLocalNotes(updated);
    } else if (!editingNote) {
      // New note
      const newNote = {
        id: `local-${Date.now()}`,
        title: form.title,
        body: form.body,
        color: form.color,
        pinned: false,
        shared: false,
        author: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveLocalNotes([newNote, ...localNotes]);
    }

    setShowEditor(false);
    setEditingNote(null);
    setSaving(false);
  }

  function handleDelete(note) {
    if (note.shared && !note.author === false) return; // can't delete others' notes
    const local = getLocalNotes().filter((n) => n.id !== note.id);
    saveLocalNotes(local);
    // Merge back shared notes
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    setOpenMenu(null);
  }

  function handlePin(note) {
    const local = getLocalNotes().map((n) =>
      n.id === note.id ? { ...n, pinned: !n.pinned } : n
    );
    saveLocalNotes(local);
    setOpenMenu(null);
  }

  async function handleShare(note) {
    // Share to API as a class note (uses ayah_id=1 as a placeholder for class notes)
    try {
      const res = await api.post('/api/notes', {
        ayah_id: 1,
        note: `${note.title ? note.title + '\n' : ''}${note.body}`,
        color: note.color,
        type: 'class',
      });
      await api.post(`/api/notes/${res.data.id}/share`);
      // Mark local note as shared
      const local = getLocalNotes().map((n) =>
        n.id === note.id ? { ...n, shared: true } : n
      );
      saveLocalNotes(local);
      setOpenMenu(null);
    } catch {
      setError('Failed to share note.');
    }
  }

  const filtered = notes
    .filter((n) => {
      const q = search.toLowerCase();
      return (
        !q ||
        n.title?.toLowerCase().includes(q) ||
        n.body?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Class Notes</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {notes.length} note{notes.length !== 1 ? 's' : ''} · Saved locally
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
        >
          <FaPlus /> New Note
        </button>
      </div>

      {/* Search */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#dfe5e0] bg-white px-4 py-3 shadow-sm">
        <FaSearch className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
            <FaTimes className="text-xs" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      {/* Notes grid */}
      {filtered.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#ced9d5] bg-[#f5f7f5] p-12 text-center">
          <FaStickyNote className="mx-auto mb-4 text-5xl text-[#8ba8a3]" />
          <h3 className="mb-2 text-xl font-bold text-slate-900">
            {search ? 'No matching notes' : 'No Notes Yet'}
          </h3>
          <p className="text-slate-500 mb-6">
            {search
              ? 'Try a different search term.'
              : 'Create notes to capture lessons, observations, and ideas.'}
          </p>
          {!search && (
            <button
              onClick={openNew}
              className="rounded-2xl bg-[#2d5a56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
            >
              Create First Note
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => {
            const c = colorFor(note.color);
            return (
              <div
                key={note.id}
                className={`relative rounded-3xl border p-5 shadow-[0_6px_20px_rgba(17,24,39,0.05)] transition hover:shadow-[0_12px_30px_rgba(17,24,39,0.09)] ${c.bg} ${c.border}`}
              >
                {/* Pin indicator */}
                {note.pinned && (
                  <div className="absolute top-3 right-10 text-[#2d5a56]">
                    <FaThumbtack className="text-sm rotate-45" />
                  </div>
                )}

                {/* Menu */}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => setOpenMenu(openMenu === note.id ? null : note.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-slate-500 transition hover:bg-white"
                  >
                    <FaEllipsisV className="text-xs" />
                  </button>
                  {openMenu === note.id && (
                    <div className="absolute right-0 top-9 z-10 min-w-40 overflow-hidden rounded-2xl border border-[#e3e7e3] bg-white shadow-[0_16px_40px_rgba(17,24,39,0.12)]">
                      {!note.author && (
                        <button
                          onClick={() => { openEdit(note); setOpenMenu(null); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#f5f7f5]"
                        >
                          <FaPen className="text-[#2d5a56]" /> Edit
                        </button>
                      )}
                      <button
                        onClick={() => handlePin(note)}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#f5f7f5]"
                      >
                        <FaThumbtack className={`${note.pinned ? 'text-[#2d5a56]' : 'text-slate-400'}`} />
                        {note.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      {!note.shared && !note.author && (
                        <button
                          onClick={() => handleShare(note)}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#f5f7f5]"
                        >
                          <FaShare className="text-[#3a66b8]" /> Share with class
                        </button>
                      )}
                      {note.shared && (
                        <div className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400">
                          <FaCheck className="text-green-500" /> Shared
                        </div>
                      )}
                      {!note.author && (
                        <button
                          onClick={() => handleDelete(note)}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <FaTrash /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div
                  className="cursor-pointer pr-6"
                  onClick={() => { if (!note.author) openEdit(note); }}
                >
                  {note.title && (
                    <h3 className="font-bold text-slate-900 text-base mb-2 line-clamp-2">{note.title}</h3>
                  )}
                  <p className="text-sm text-slate-700 leading-relaxed line-clamp-5 whitespace-pre-wrap">{note.body}</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{formatRelative(note.updated_at || note.created_at)}</span>
                  <div className="flex items-center gap-1">
                    {note.author && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 font-medium">shared</span>
                    )}
                    {note.shared && !note.author && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600 font-medium flex items-center gap-1">
                        <FaCheck className="text-[9px]" /> shared
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note editor modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-[#dce4de] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
            <div className="flex items-center justify-between border-b border-[#edf0ed] px-6 py-5">
              <h3 className="text-xl font-bold text-slate-900">
                {editingNote ? 'Edit Note' : 'New Note'}
              </h3>
              <button
                onClick={() => { setShowEditor(false); setEditingNote(null); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 transition hover:bg-[#e8eae8]"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Title */}
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Note title (optional)"
                className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 font-semibold text-base outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
              />

              {/* Body */}
              <textarea
                ref={editorRef}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Write your note here..."
                className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6] resize-none"
                rows={7}
              />

              {/* Color picker */}
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Note color</p>
                <div className="flex gap-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.key })}
                      className={`h-8 w-8 rounded-full border-2 transition ${c.bg} ${
                        form.color === c.key ? 'border-slate-700 scale-110' : 'border-transparent'
                      }`}
                    >
                      <span className={`block h-4 w-4 rounded-full mx-auto ${c.dot}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 border-t border-[#edf0ed] pt-4">
                <button
                  type="submit"
                  disabled={saving || (!form.body.trim() && !form.title.trim())}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-50"
                >
                  <FaSave />
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditor(false); setEditingNote(null); }}
                  className="flex-1 rounded-2xl border border-[#d7ded9] bg-[#f5f7f5] px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {openMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}
