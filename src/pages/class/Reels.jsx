import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { resolveMediaUrl } from '../../services/media';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaFilm, FaPlus, FaHeart, FaCommentDots, FaShare,
  FaTimes, FaUpload, FaLink, FaTrash, FaPlay, FaPause,
  FaVolumeUp, FaVolumeMute, FaSpinner,
} from 'react-icons/fa';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';

/* â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0].toUpperCase())
    .join('');
}

function fmtCount(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

/* â”€â”€â”€ Single Reel Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ReelCard({ reel, isTeacher, onDelete }) {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.6 });
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(!!reel.liked_by_me);
  const [likeCount, setLikeCount] = useState(Number(reel.like_count) || 0);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isVisible) { vid.play().catch(() => {}); setPlaying(true); }
    else { vid.pause(); setPlaying(false); }
  }, [isVisible]);

  function togglePlay(e) {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) { vid.play(); setPlaying(true); }
    else { vid.pause(); setPlaying(false); }
  }

  function toggleMute(e) {
    e.stopPropagation();
    if (videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted); }
  }

  function handleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      doLike();
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
    }
    lastTap.current = now;
  }

  async function doLike() {
    const next = !liked;
    setLiked(next); setLikeCount((c) => c + (next ? 1 : -1));
    try {
      if (next) await api.post(`/api/reels/${reel.id}/like`);
      else await api.delete(`/api/reels/${reel.id}/like`);
    } catch {
      setLiked(!next); setLikeCount((c) => c + (!next ? 1 : -1));
    }
  }

  async function handleLike(e) { e.stopPropagation(); doLike(); }

  return (
    <div
      ref={ref}
      className="relative w-full snap-start overflow-hidden bg-black"
      style={{ height: '100dvh' }}
      onClick={handleTap}
    >
      {reel.url ? (
        <video
          ref={videoRef}
          src={reel.url}
          className="absolute inset-0 h-full w-full object-cover"
          muted={muted}
          loop
          playsInline
          preload="metadata"
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (v?.duration) setProgress((v.currentTime / v.duration) * 100);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <FaSpinner className="animate-spin text-4xl text-white/30" />
        </div>
      )}

      {/* Gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-60 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      {/* Double-tap heart */}
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
          <FaHeart className="animate-ping text-[80px] text-red-500 opacity-90" />
        </div>
      )}

      {/* Play/pause tap zone */}
      <button className="absolute inset-0 z-10" onClick={togglePlay} aria-label="play/pause">
        {!playing && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
              <FaPlay className="ml-1 text-2xl text-white" />
            </div>
          </div>
        )}
      </button>

      {/* Right action rail */}
      <div className="absolute bottom-28 right-3 z-20 flex flex-col items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#2d5a56] text-sm font-bold text-white shadow-lg">
          {initials(reel.uploader_name)}
        </div>

        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${liked ? 'bg-red-500 text-white scale-110' : 'bg-black/40 text-white backdrop-blur-sm'}`}>
            <FaHeart className="text-xl" />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow">{fmtCount(likeCount)}</span>
        </button>

        <button className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
            <FaCommentDots className="text-xl" />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow">0</span>
        </button>

        <button className="flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
            <FaShare className="text-xl" />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow">Share</span>
        </button>

        <button onClick={toggleMute} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
          {muted ? <FaVolumeMute className="text-lg" /> : <FaVolumeUp className="text-lg" />}
        </button>

        {isTeacher && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(reel.id); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600/70 text-white backdrop-blur-sm"
          >
            <FaTrash className="text-sm" />
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-6 left-4 right-20 z-20 text-white">
        <p className="mb-1 text-sm font-bold drop-shadow">@{reel.uploader_name || 'teacher'}</p>
        <h3 className="mb-1 text-base font-semibold leading-tight line-clamp-2 drop-shadow-md">
          {reel.title || 'Untitled Reel'}
        </h3>
        {reel.description && (
          <p className="text-sm text-white/80 line-clamp-2 drop-shadow">{reel.description}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/20">
        <div className="h-full bg-white/80 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

/* â”€â”€â”€ Upload Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function UploadModal({ classId, onClose, onUploaded }) {
  const fileInputRef = useRef(null);
  const [uploadMode, setUploadMode] = useState('file');
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({ title: '', url: '', description: '' });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (uploadMode === 'file' && !selectedFile) return;
    if (uploadMode === 'url' && !form.url.trim()) return;
    setUploading(true); setProgress(0); setErr('');
    try {
      if (uploadMode === 'file') {
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('class_id', classId);
        if (form.title.trim()) fd.append('title', form.title.trim());
        if (form.description.trim()) fd.append('description', form.description.trim());
        await api.post('/api/reels', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => { if (evt.total) setProgress(Math.round(evt.loaded * 100 / evt.total)); },
        });
      } else {
        await api.post('/api/reels', { class_id: classId, title: form.title.trim(), url: form.url.trim(), description: form.description.trim() });
      }
      onUploaded(); onClose();
    } catch (ex) {
      setErr(ex.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false); setProgress(0);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-[28px] border border-[#dce4de] bg-white shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-[#edf0ed] px-6 py-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Add Reel</h3>
            <p className="mt-0.5 text-sm text-slate-500">Upload a video for your students</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 hover:bg-[#e8eae8]">
            <FaTimes />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="flex gap-2">
            {['file', 'url'].map((mode) => (
              <button key={mode} type="button" onClick={() => setUploadMode(mode)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm font-semibold transition ${uploadMode === mode ? 'border-[#2d5a56] bg-[#2d5a56] text-white' : 'border-[#d7ded9] bg-[#f5f7f5] text-slate-600 hover:bg-white'}`}>
                {mode === 'file' ? <FaUpload /> : <FaLink />}
                {mode === 'file' ? 'Upload File' : 'Video URL'}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="E.g. Surah Al-Fatiha recitation"
              className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none focus:border-[#7ea89c] focus:ring-4 focus:ring-[#dcece6]" />
          </div>
          {uploadMode === 'file' ? (
            <label className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c9d8d4] bg-[#f5f8f6] p-4 hover:border-[#7ea89c]">
              <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f && f.size > 500 * 1024 * 1024) { setErr('File must be under 500 MB'); return; }
                  setSelectedFile(f || null); setErr('');
                }} />
              {selectedFile ? (
                <><FaPlay className="text-3xl text-[#2d5a56]" />
                  <p className="text-sm font-semibold text-slate-800 truncate max-w-[240px]">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB Â· click to change</p></>
              ) : (
                <><FaUpload className="text-3xl text-slate-400" />
                  <p className="text-sm font-semibold text-slate-700">Click to select a video</p>
                  <p className="text-xs text-slate-400">MP4, MOV, WebM â€” max 500 MB</p></>
              )}
            </label>
          ) : (
            <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com/reel.mp4"
              className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none focus:border-[#7ea89c] focus:ring-4 focus:ring-[#dcece6]" required />
          )}
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)"
            className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none focus:border-[#7ea89c] focus:ring-4 focus:ring-[#dcece6]" rows={2} />
          {uploading && uploadMode === 'file' && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500"><span>Uploadingâ€¦</span><span>{progress}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-[#dde4e0]">
                <div className="h-full rounded-full bg-[#2d5a56] transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-3 border-t border-[#edf0ed] pt-4">
            <button type="submit" disabled={uploading || (uploadMode === 'file' && !selectedFile)}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-60">
              {uploading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FaUpload />}
              {uploading ? `Uploading${uploadMode === 'file' ? ` ${progress}%` : 'â€¦'}` : 'Add Reel'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 rounded-2xl border border-[#d7ded9] bg-[#f5f7f5] py-3 text-sm font-semibold text-slate-600 transition hover:bg-white">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function Reels() {
  const { classId } = useParams();
  const { user } = useAuth();
  const isTeacher = ['teacher', 'owner', 'manager'].includes(user?.role);

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const containerRef = useRef(null);

  const fetchReels = useCallback(async (offset = 0) => {
    try {
      if (offset === 0) setLoading(true); else setLoadingMore(true);
      const res = await api.get(`/api/reels?class_id=${classId}&limit=10&offset=${offset}`);
      const data = (res.data?.data || []).map((reel) => ({
        ...reel,
        url: resolveMediaUrl(reel.url),
      }));
      if (offset === 0) setReels(data); else setReels((p) => [...p, ...data]);
      setHasMore(data.length === 10);
    } catch { /* silent */ }
    finally { setLoading(false); setLoadingMore(false); }
  }, [classId]);

  useEffect(() => { fetchReels(0); }, [fetchReels]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onScroll() {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < clientHeight * 2 && hasMore && !loadingMore) {
        fetchReels(reels.length);
      }
    }
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [reels.length, hasMore, loadingMore, fetchReels]);

  async function handleDelete(id) {
    if (!window.confirm('Delete this reel?')) return;
    try { await api.delete(`/api/reels/${id}`); setReels((p) => p.filter((r) => r.id !== id)); } catch { /* no-op */ }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black">
        <FaSpinner className="animate-spin text-4xl text-white/50" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-black text-white">
        <FaFilm className="text-6xl text-white/20" />
        <div className="text-center">
          <p className="text-xl font-bold">No Reels Yet</p>
          <p className="mt-1 text-sm text-white/50">
            {isTeacher ? 'Upload short video reels for your students.' : 'No reels have been uploaded yet.'}
          </p>
        </div>
        {isTeacher && (
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#234946]">
            <FaPlus /> Add First Reel
          </button>
        )}
        {showUpload && <UploadModal classId={classId} onClose={() => setShowUpload(false)} onUploaded={() => fetchReels(0)} />}
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 z-40 overflow-y-scroll snap-y snap-mandatory bg-black"
        style={{ scrollbarWidth: 'none' }}
      >
        <style>{`div::-webkit-scrollbar{display:none}`}</style>
        {reels.map((reel) => (
          <ReelCard key={reel.id} reel={reel} isTeacher={isTeacher} onDelete={handleDelete} />
        ))}
        {loadingMore && (
          <div className="flex snap-start items-center justify-center bg-black" style={{ height: '100dvh' }}>
            <FaSpinner className="animate-spin text-4xl text-white/40" />
          </div>
        )}
      </div>

      {isTeacher && (
        <button onClick={() => setShowUpload(true)}
          className="fixed bottom-6 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#2d5a56] text-white shadow-[0_8px_24px_rgba(45,90,86,0.5)] transition hover:bg-[#234946] active:scale-95"
          aria-label="Add reel">
          <FaPlus className="text-xl" />
        </button>
      )}

      {showUpload && <UploadModal classId={classId} onClose={() => setShowUpload(false)} onUploaded={() => fetchReels(0)} />}
    </>
  );
}
