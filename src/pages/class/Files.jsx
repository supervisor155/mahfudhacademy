import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaPaperclip, FaPlus, FaTrash, FaTimes, FaUpload,
  FaDownload, FaFilePdf, FaFileWord, FaFileImage,
  FaFileVideo, FaFileAudio, FaFile,
} from 'react-icons/fa';

function getFileIcon(mimeType) {
  if (!mimeType) return FaFile;
  if (mimeType.includes('pdf')) return FaFilePdf;
  if (mimeType.includes('word') || mimeType.includes('document')) return FaFileWord;
  if (mimeType.startsWith('image/')) return FaFileImage;
  if (mimeType.startsWith('video/')) return FaFileVideo;
  if (mimeType.startsWith('audio/')) return FaFileAudio;
  return FaFile;
}

function getFileIconColor(mimeType) {
  if (!mimeType) return 'bg-[#f0f0f0] text-slate-500';
  if (mimeType.includes('pdf')) return 'bg-red-50 text-red-500';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'bg-blue-50 text-blue-600';
  if (mimeType.startsWith('image/')) return 'bg-purple-50 text-purple-500';
  if (mimeType.startsWith('video/')) return 'bg-orange-50 text-orange-500';
  if (mimeType.startsWith('audio/')) return 'bg-green-50 text-green-600';
  return 'bg-[#e7f3ef] text-[#234946]';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function Files() {
  const { classId } = useParams();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'manager';
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { fetchFiles(); }, [classId]);

  const fetchFiles = async () => {
    try {
      const res = await api.get(`/api/attachments?class_id=${classId}`);
      const data = res.data?.data || res.data || [];
      setFiles(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (file && file.size > 100 * 1024 * 1024) {
      setError('File size must be under 100 MB');
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('class_id', classId);

    try {
      await api.post('/api/attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
          }
        },
      });
      setSelectedFile(null);
      setShowUpload(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchFiles();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await api.delete(`/api/attachments/${id}`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setError('Failed to delete file');
    }
  };

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { handleFileSelect(file); setShowUpload(true); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent" />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (isTeacher) setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Class Files</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {files.length} file{files.length !== 1 ? 's' : ''}
            {isTeacher && '  Drag & drop to upload'}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
          >
            <FaPlus /> Upload File
          </button>
        )}
      </div>

      {dragOver && (
        <div className="mb-4 rounded-3xl border-2 border-dashed border-[#2d5a56] bg-[#e7f3ef] px-6 py-8 text-center text-[#2d5a56] font-semibold">
          Drop file here to upload
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#ced9d5] bg-[#f5f7f5] p-12 text-center">
          <FaPaperclip className="mx-auto mb-4 text-5xl text-[#8ba8a3]" />
          <h3 className="mb-2 text-xl font-bold text-slate-900">No Files Yet</h3>
          <p className="text-slate-500 mb-6">
            {isTeacher
              ? 'Upload PDFs, slides, and resources for your students.'
              : 'No files have been uploaded yet.'}
          </p>
          {isTeacher && (
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-2xl bg-[#2d5a56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
            >
              Upload First File
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => {
            const Icon = getFileIcon(file.mime_type);
            const iconColor = getFileIconColor(file.mime_type);
            return (
              <div
                key={file.id}
                className="flex items-center gap-4 rounded-[20px] border border-[#e3e7e3] bg-white p-4 shadow-[0_4px_12px_rgba(17,24,39,0.04)] transition hover:border-[#c7d6d2] hover:shadow-[0_8px_20px_rgba(17,24,39,0.07)]"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg ${iconColor}`}>
                  <Icon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">
                    {file.filename || file.name || 'Unnamed file'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {[formatSize(file.size_bytes), formatDate(file.created_at)].filter(Boolean).join('  ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={file.url}
                    download={file.filename || true}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e7f3ef] text-[#2d5a56] transition hover:bg-[#d4ece3]"
                    title="Download"
                  >
                    <FaDownload className="text-sm" />
                  </a>
                  {isTeacher && (
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-400 transition hover:bg-red-100"
                      title="Delete"
                    >
                      <FaTrash className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[30px] border border-[#dce4de] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
            <div className="flex items-center justify-between border-b border-[#edf0ed] px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Upload File</h3>
                <p className="mt-0.5 text-sm text-slate-500">PDFs, slides, images, audio  max 100 MB</p>
              </div>
              <button
                onClick={() => { setShowUpload(false); setSelectedFile(null); setError(''); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 transition hover:bg-[#e8eae8]"
              >
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {/* Drop zone */}
              <label
                className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition ${
                  selectedFile
                    ? 'border-[#2d5a56] bg-[#e7f3ef]'
                    : 'border-[#d7ded9] bg-[#f6f8f6] hover:border-[#2d5a56] hover:bg-[#f0f7f4]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                {selectedFile ? (
                  <>
                    <FaFile className="text-3xl text-[#2d5a56]" />
                    <div className="text-center">
                      <p className="font-semibold text-slate-900 text-sm truncate max-w-60">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatSize(selectedFile.size)}</p>
                    </div>
                    <span className="text-xs text-[#2d5a56] font-medium">Click to change file</span>
                  </>
                ) : (
                  <>
                    <FaUpload className="text-3xl text-slate-400" />
                    <div className="text-center">
                      <p className="font-semibold text-slate-700 text-sm">Click to select or drop a file</p>
                      <p className="text-xs text-slate-400 mt-1">Any file type up to 100 MB</p>
                    </div>
                  </>
                )}
              </label>

              {/* Progress bar */}
              {uploading && (
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
                  disabled={!selectedFile || uploading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : <FaUpload />}
                  {uploading ? `Uploading ${uploadProgress}%` : 'Upload File'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowUpload(false); setSelectedFile(null); setError(''); }}
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
