import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';

export const useAyahNotes = (surahNumber) => {
  const [notes, setNotes] = useState([]);
  const [bookmarks, setBookmarks] = useState([]); // array of ayah_id strings e.g. "2:255"
  const [readingProgress, setReadingProgress] = useState({});
  const [loading, setLoading] = useState(false);

  // ── load notes + bookmarks + progress for this surah ──────────────────────
  const fetchAll = useCallback(async () => {
    if (!surahNumber) return;
    setLoading(true);
    try {
      const [notesRes, bmRes, progRes] = await Promise.allSettled([
        API.get(`/api/notes/surah/${surahNumber}`),
        API.get('/api/mushaf/bookmarks'),
        API.get('/api/mushaf/progress'),
      ]);

      if (notesRes.status === 'fulfilled') {
        setNotes(notesRes.value.data?.data || []);
      }
      if (bmRes.status === 'fulfilled') {
        const allBm = bmRes.value.data?.data || [];
        // Keep only ayah_id strings for current surah
        setBookmarks(allBm.map(b => b.ayah_id));
      }
      if (progRes.status === 'fulfilled') {
        const rows = progRes.value.data?.data || [];
        const map = {};
        rows.forEach(r => { map[r.surah_id] = r.percent; });
        setReadingProgress(map);
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
    try {
      if (existing) {
        const res = await API.patch(`/api/notes/${existing.id}`, {
          note: { text: noteText },
        });
        const updated = res.data;
        setNotes(prev => prev.map(n => n.id === existing.id ? updated : n));
        return updated;
      } else {
        const res = await API.post('/api/notes', {
          ayah_id,
          note: { text: noteText },
          type: 'text',
        });
        const created = res.data;
        setNotes(prev => [...prev, created]);
        return created;
      }
    } catch (err) {
      console.error('Failed to save note:', err);
      throw err;
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await API.delete(`/api/notes/${noteId}`);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
      throw err;
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
    // Optimistic update
    setBookmarks(prev =>
      isBookmarked ? prev.filter(id => id !== ayah_id) : [...prev, ayah_id]
    );
    try {
      if (isBookmarked) {
        await API.delete('/api/mushaf/bookmarks', { data: { ayah_id } });
      } else {
        await API.post('/api/mushaf/bookmarks', { ayah_id });
      }
    } catch (err) {
      // Roll back on error
      console.error('Bookmark sync failed:', err);
      setBookmarks(prev =>
        isBookmarked ? [...prev, ayah_id] : prev.filter(id => id !== ayah_id)
      );
    }
    return !isBookmarked;
  };

  const isBookmarked = (ayahNumber) => bookmarks.includes(`${surahNumber}:${ayahNumber}`);

  // ── Reading Progress ───────────────────────────────────────────────────────

  const updateProgress = async (ayahNumber, totalAyahs) => {
    const percent = Math.min(100, Math.round((ayahNumber / Math.max(1, totalAyahs)) * 100));
    setReadingProgress(prev => ({ ...prev, [surahNumber]: percent }));
    try {
      await API.post('/api/mushaf/progress', {
        surah_id: surahNumber,
        last_ayah: ayahNumber,
        total_ayahs: totalAyahs,
      });
    } catch (err) {
      console.error('Progress sync failed:', err);
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
