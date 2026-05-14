import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';

const LOCAL_KEY = 'mushaf:local:v1';

function readLocalState() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { notes: [], bookmarks: [], progress: {} };
    const parsed = JSON.parse(raw);
    return {
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : {},
    };
  } catch {
    return { notes: [], bookmarks: [], progress: {} };
  }
}

function writeLocalState(next) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

function upsertLocalNote(prevNotes, noteObj) {
  const idx = prevNotes.findIndex((n) => n.id === noteObj.id || n.ayah_id === noteObj.ayah_id);
  if (idx === -1) return [...prevNotes, noteObj];
  const clone = [...prevNotes];
  clone[idx] = { ...clone[idx], ...noteObj };
  return clone;
}

export const useAyahNotes = (surahNumber) => {
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]); // array of ayah_id strings e.g. "2:255"
  const [readingProgress, setReadingProgress] = useState({});
  const [loading, setLoading] = useState(false);

  // ── load notes + bookmarks + progress for this surah ──────────────────────
  const fetchAll = useCallback(async () => {
    if (!surahNumber) return;
    setLoading(true);

    const local = readLocalState();
    const localNotesForSurah = local.notes.filter((n) => String(n.ayah_id || '').startsWith(`${surahNumber}:`));
    setNotes(localNotesForSurah);
    setBookmarks(local.bookmarks);
    setReadingProgress(local.progress);

    try {
      const [notesRes, bmRes, progRes] = await Promise.allSettled([
        API.get(`/api/notes/surah/${surahNumber}`),
        API.get('/api/mushaf/bookmarks'),
        API.get('/api/mushaf/progress'),
      ]);

      if (notesRes.status === 'fulfilled') {
        const apiNotes = notesRes.value.data?.data || [];
        setNotes(apiNotes);
        writeLocalState({
          notes: [...local.notes.filter((n) => !String(n.ayah_id || '').startsWith(`${surahNumber}:`)), ...apiNotes],
          bookmarks: local.bookmarks,
          progress: local.progress,
        });
      }
      if (bmRes.status === 'fulfilled') {
        const allBm = bmRes.value.data?.data || [];
        const bmIds = allBm.map(b => b.ayah_id);
        setBookmarks(bmIds);
        writeLocalState({
          notes: readLocalState().notes,
          bookmarks: bmIds,
          progress: readLocalState().progress,
        });
      }
      if (progRes.status === 'fulfilled') {
        const rows = progRes.value.data?.data || [];
        const map = {};
        rows.forEach(r => { map[r.surah_id] = r.percent; });
        setReadingProgress(map);
        writeLocalState({
          notes: readLocalState().notes,
          bookmarks: readLocalState().bookmarks,
          progress: map,
        });
      }
    } catch { /* silent — non-blocking */ } finally {
      setLoading(false);
    }
  }, [surahNumber]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Notes ──────────────────────────────────────────────────────────────────

  const saveNote = async (ayahNumber, noteText) => {
    const ayah_id = `${surahNumber}:${ayahNumber}`;
    const existing = notes.find(n => n.ayah_id === ayah_id);

    const localBefore = readLocalState();
    const optimistic = {
      id: existing?.id || `local-${ayah_id}`,
      ayah_id,
      note: { text: noteText },
      type: 'text',
    };
    const localNotesNext = upsertLocalNote(localBefore.notes, optimistic);
    writeLocalState({ ...localBefore, notes: localNotesNext });
    setNotes(localNotesNext.filter((n) => String(n.ayah_id || '').startsWith(`${surahNumber}:`)));

    try {
      if (existing) {
        const res = await API.patch(`/api/notes/${existing.id}`, {
          note: { text: noteText },
        });
        const updated = res.data;
        setNotes(prev => prev.map(n => n.id === existing.id ? updated : n));
        const finalLocal = upsertLocalNote(readLocalState().notes, updated);
        writeLocalState({ ...readLocalState(), notes: finalLocal });
        return updated;
      } else {
        const res = await API.post('/api/notes', {
          ayah_id,
          note: { text: noteText },
          type: 'text',
        });
        const created = res.data;
        setNotes(prev => [...prev, created]);
        const finalLocal = upsertLocalNote(readLocalState().notes, created);
        writeLocalState({ ...readLocalState(), notes: finalLocal });
        return created;
      }
    } catch (err) {
      // Keep local copy so users still see their note offline/guest mode.
      return optimistic;
    }
  };

  const deleteNote = async (noteId) => {
    const local = readLocalState();
    const nextNotes = local.notes.filter((n) => n.id !== noteId);
    writeLocalState({ ...local, notes: nextNotes });
    setNotes(nextNotes.filter((n) => String(n.ayah_id || '').startsWith(`${surahNumber}:`)));

    try {
      await API.delete(`/api/notes/${noteId}`);
    } catch {
      // keep local deletion
    }
  };

  const getAyahNote = (ayahNumber) => {
    const ayah_id = `${surahNumber}:${ayahNumber}`;
    return notes.find(n => n.ayah_id === ayah_id) || null;
  };

  // ── Bookmarks ──────────────────────────────────────────────────────────────

  const toggleBookmark = async (ayahNumber) => {
    const ayah_id = `${surahNumber}:${ayahNumber}`;
    const isBookmarked = bookmarks.includes(ayah_id);
    const nextBookmarks = isBookmarked
      ? bookmarks.filter(id => id !== ayah_id)
      : [...bookmarks, ayah_id];

    // Optimistic update
    setBookmarks(nextBookmarks);
    writeLocalState({ ...readLocalState(), bookmarks: nextBookmarks });

    try {
      if (isBookmarked) {
        await API.delete('/api/mushaf/bookmarks', { data: { ayah_id } });
      } else {
        await API.post('/api/mushaf/bookmarks', { ayah_id });
      }
    } catch {
      // Roll back on error
      // Keep local bookmark so it remains visible for returning users.
    }
    return !isBookmarked;
  };

  const isBookmarked = (ayahNumber) => bookmarks.includes(`${surahNumber}:${ayahNumber}`);

  // ── Reading Progress ───────────────────────────────────────────────────────

  const updateProgress = async (ayahNumber, totalAyahs) => {
    const percent = Math.min(100, Math.round((ayahNumber / Math.max(1, totalAyahs)) * 100));
    const nextProgress = { ...readingProgress, [surahNumber]: percent };
    setReadingProgress(nextProgress);
    writeLocalState({ ...readLocalState(), progress: nextProgress });
    try {
      await API.post('/api/mushaf/progress', {
        surah_id: surahNumber,
        last_ayah: ayahNumber,
        total_ayahs: totalAyahs,
      });
    } catch {
      // keep local progress
    }
  };

  const getProgress = () => readingProgress[surahNumber] || 0;

  return {
    notes,
    bookmarks,
    readingProgress,
    loading,
    saveNote,
    deleteNote,
    getAyahNote,
    toggleBookmark,
    isBookmarked,
    getProgress,
    updateProgress,
    refetch: fetchAll,
  };
};
