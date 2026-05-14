import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaPlay, FaClock, FaPlus, FaArrowLeft, FaTrash,
  FaUpload, FaTimes, FaLink, FaEye,
} from 'react-icons/fa';

function formatDuration(secs) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Videos() {
  const { classId } = useParams();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'manager';
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMode, setUploadMode] = useState('file');
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({ title: '', url: '', description: '' });

  useEffect(() => { fetchVideos(); }, [classId]);

  const fetchVideos = async () => {
    try {
      const res = await api.get(`/api/videos?class_id=${classId}`);
      const data = res.data?.data || res.data || [];
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const closeUploadModal = () => {
    setShowUpload(false);
    setSelectedFile(null);
    setUploadProgress(0);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (uploadMode === 'file' && !selectedFile) return;
    if (uploadMode === 'url' && !form.url.trim()) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      if (uploadMode === 'file') {
        const fd = new FormData();
        fd.append('file', selectedFile);
        fd.append('class_id', classId);
        fd.append('title', form.title.trim());
        if (form.description.trim()) fd.append('description', form.description.trim());
        await api.post('/api/videos', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (evt.total) setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
          },
        });
      } else {
        await api.post('/api/videos', {
          class_id: classId,
          title: form.title.trim(),
          url: form.url.trim(),
          description: form.description.trim(),
        });
      }
      setForm({ title: '', url: '', description: '' });
      setSelectedFile(null);
      setShowUpload(false);
      await fetchVideos();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      await api.delete(`/api/videos/${id}`);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      setError('Failed to delete video');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent" />
      </div>
    );
  }

  // Video player view
  if (selected) {
    return (
      <div className="rounded-[28px] border border-[#e3e7e3] bg-white p-6 shadow-[0_10px_30px_rgba(17,24,39,0.05)]">
        <button
          onClick={() => setSelected(null)}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#2d5a56] transition hover:text-[#234946]"
        >
          <FaArrowLeft /> Back to Videos
        </button>
        <div className="overflow-hidden rounded-2xl bg-black mb-5">
          <video
            ref={videoRef}
            src={selected.url}
            controls
            className="w-full max-h-120 object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">{selected.title}</h2>
        {selected.description && (
          <p className="text-slate-500 text-sm leading-relaxed mb-3">{selected.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-slate-400">
          {selected.duration && (
            <span className="flex items-center gap-1.5"><FaClock /> {formatDuration(selected.duration)}</span>
          )}
          {selected.view_count !== undefined && (
            <span className="flex items-center gap-1.5"><FaEye /> {selected.view_count} views</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Class Videos</h2>
          <p className="text-sm text-slate-500 mt-0.5">{videos.length} video{videos.length !== 1 ? 's' : ''} uploaded</p>
        </div>
        {isTeacher && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
          >
            <FaPlus /> Upload Video
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><FaTimes /></button>
        </div>
      )}

      {/* Empty State */}
      {videos.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#ced9d5] bg-[#f5f7f5] p-12 text-center">
          <FaPlay className="mx-auto mb-4 text-5xl text-[#8ba8a3]" />
          <h3 className="mb-2 text-xl font-bold text-slate-900">No Videos Yet</h3>
          <p className="text-slate-500 mb-6">
            {isTeacher ? 'Upload your first video for students to watch.' : 'No videos have been uploaded yet.'}
          </p>
          {isTeacher && (
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-2xl bg-[#2d5a56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
            >
              Upload First Video
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group rounded-3xl border border-[#e3e7e3] bg-white shadow-[0_8px_24px_rgba(17,24,39,0.05)] overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(17,24,39,0.09)]"
            >
              <button
                onClick={() => setSelected(video)}
                className="relative w-full h-40 bg-[#1f4a47] flex items-center justify-center"
              >
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                ) : null}
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white text-xl">
                  <FaPlay />
                </div>
                {video.duration && (
                  <span className="absolute bottom-2 right-2 z-10 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                    {formatDuration(video.duration)}
                  </span>
                )}
              </button>
              <div className="p-4">
                <h3
                  className="font-bold text-slate-900 truncate cursor-pointer hover:text-[#2d5a56] transition"
                  onClick={() => setSelected(video)}
                >
                  {video.title}
                </h3>
                {video.description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{video.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <FaEye /> {video.view_count || 0} views
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f0f4f0] text-[#2d5a56] transition hover:bg-[#e7f3ef]"
                      title="Open URL"
                    >
                      <FaLink className="text-xs" />
                    </a>
                    {isTeacher && (
                      <button
                        onClick={() => handleDelete(video.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-400 transition hover:bg-red-100"
                        title="Delete"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-[#dce4de] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
            <div className="flex items-center justify-between border-b border-[#edf0ed] px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Upload Video</h3>
                <p className="mt-0.5 text-sm text-slate-500">Upload a file or paste a video URL</p>
              </div>
              <button
                onClick={closeUploadModal}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 transition hover:bg-[#e8eae8]"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4 p-6">
              {/* Mode toggle */}
              <div className="flex gap-1 rounded-2xl bg-[#f0f4f0] p-1">
                <button
                  type="button"
                  onClick={() => { setUploadMode('file'); setSelectedFile(null); setForm((f) => ({ ...f, url: '' })); }}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${uploadMode === 'file' ? 'bg-white text-[#2d5a56] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FaUpload className="inline mr-1.5" /> Upload File
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadMode('url'); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${uploadMode === 'url' ? 'bg-white text-[#2d5a56] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <FaLink className="inline mr-1.5" /> Paste URL
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Video Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Surah Al-Fatiha Recitation"
                  className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                  required
                />
              </div>

              {/* File picker or URL input */}
              {uploadMode === 'file' ? (
                <label
                  className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-7 cursor-pointer transition ${
                    selectedFile
                      ? 'border-[#2d5a56] bg-[#e7f3ef]'
                      : 'border-[#d7ded9] bg-[#f6f8f6] hover:border-[#2d5a56] hover:bg-[#f0f7f4]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f && f.size > 500 * 1024 * 1024) { setError('File must be under 500 MB'); return; }
                      setSelectedFile(f || null);
                      setError('');
                    }}
                  />
                  {selectedFile ? (
                    <>
                      <FaPlay className="text-3xl text-[#2d5a56]" />
                      <div className="text-center">
                        <p className="font-semibold text-slate-900 text-sm truncate max-w-60">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                      <span className="text-xs text-[#2d5a56] font-medium">Click to change file</span>
                    </>
                  ) : (
                    <>
                      <FaUpload className="text-3xl text-slate-400" />
                      <div className="text-center">
                        <p className="font-semibold text-slate-700 text-sm">Click to select a video file</p>
                        <p className="text-xs text-slate-400 mt-1">MP4, MOV, WebM — max 500 MB</p>
                      </div>
                    </>
                  )}
                </label>
              ) : (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Video URL *</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://example.com/video.mp4"
                    className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                    required
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the video..."
                  className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                  rows={2}
                />
              </div>

              {/* Progress bar */}
              {uploading && uploadMode === 'file' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#dde4e0]">
                    <div
                      className="h-full rounded-full bg-[#2d5a56] transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 border-t border-[#edf0ed] pt-4">
                <button
                  type="submit"
                  disabled={uploading || (uploadMode === 'file' && !selectedFile) || !form.title.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-60"
                >
                  {uploading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <FaUpload />
                  )}
                  {uploading ? `Uploading${uploadMode === 'file' ? ` ${uploadProgress}%` : '...'}` : 'Upload Video'}
                </button>
                <button
                  type="button"
                  onClick={closeUploadModal}
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
