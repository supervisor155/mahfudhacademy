import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaTasks, FaPlus, FaTimes, FaTrash, FaUpload,
  FaCalendarAlt, FaUsers, FaCheck, FaStar,
  FaFileAlt, FaChevronDown, FaChevronUp, FaDownload,
} from 'react-icons/fa';

function formatDeadline(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diff = d - now;
  const isOverdue = diff < 0;
  const days = Math.floor(Math.abs(diff) / 86400000);
  const formatted = d.toLocaleDateString(undefined, { dateStyle: 'medium' }) +
    ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
  return { formatted, isOverdue, daysLeft: isOverdue ? -days : days };
}

export default function Assignments() {
  const { classId } = useParams();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'manager';
  const fileInputRef = useRef(null);

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);   // expanded assignment
  const [submissions, setSubmissions] = useState([]); // teacher: list of submissions
  const [mySubmission, setMySubmission] = useState(null); // student: own submission
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitFile, setSubmitFile] = useState(null);
  const [submitText, setSubmitText] = useState('');
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [gradeForm, setGradeForm] = useState({});   // { [student_id]: { grade, feedback } }
  const [submissionMap, setSubmissionMap] = useState({}); // student: { [assignmentId]: submission }

  const [form, setForm] = useState({
    title: '', description: '', due_date: '', max_points: '100',
  });

  useEffect(() => { fetchAssignments(); }, [classId]);

  const fetchAssignments = async () => {
    try {
      const res = await api.get(`/api/assignments?class_id=${classId}`);
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setAssignments(list);
      // For students, bulk-load submission statuses
      if (!isTeacher && list.length > 0) {
        const results = await Promise.allSettled(
          list.map((a) => api.get(`/api/assignments/${a.id}/my-submission`))
        );
        const map = {};
        list.forEach((a, i) => {
          if (results[i].status === 'fulfilled') {
            map[a.id] = results[i].value.data || null;
          }
        });
        setSubmissionMap(map);
      }
    } catch {
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/api/assignments', {
        class_id: classId,
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_date || null,
        max_points: Number(form.max_points) || 100,
      });
      setForm({ title: '', description: '', due_date: '', max_points: '100' });
      setShowCreate(false);
      await fetchAssignments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment and all submissions?')) return;
    try {
      await api.delete(`/api/assignments/${id}`);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      setError('Failed to delete assignment');
    }
  };

  const openAssignment = async (a) => {
    setSelected(selected?.id === a.id ? null : a);
    setSubmitText('');
    setSubmitFile(null);
    setError('');
    if (selected?.id === a.id) return;
    try {
      if (isTeacher) {
        const res = await api.get(`/api/assignments/${a.id}/submissions`);
        setSubmissions(res.data?.data || []);
      } else {
        const res = await api.get(`/api/assignments/${a.id}/my-submission`);
        setMySubmission(res.data || null);
      }
    } catch {
      setSubmissions([]);
      setMySubmission(null);
    }
  };

  const handleSubmit = async (assignmentId) => {
    if (!submitText.trim() && !submitFile) {
      setError('Provide text or upload a file');
      return;
    }
    setSubmitting(true);
    setSubmitProgress(0);
    setError('');
    try {
      const fd = new FormData();
      fd.append('assignment_id', assignmentId);
      if (submitText.trim()) fd.append('content', submitText.trim());
      if (submitFile) fd.append('file', submitFile);
      const res = await api.post(`/api/assignments/${assignmentId}/submit`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setSubmitProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      });
      setMySubmission(res.data);
      setSubmitText('');
      setSubmitFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
      setSubmitProgress(0);
    }
  };

  const handleGrade = async (assignmentId, studentId) => {
    const gf = gradeForm[studentId] || {};
    if (gf.grade === undefined || gf.grade === '') return;
    try {
      await api.patch(`/api/assignments/${assignmentId}/grade`, {
        student_id: studentId,
        grade: Number(gf.grade),
        feedback: gf.feedback || '',
      });
      const res = await api.get(`/api/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data?.data || []);
      setGradeForm((prev) => { const n = { ...prev }; delete n[studentId]; return n; });
    } catch {
      setError('Grading failed');
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
          <h2 className="text-2xl font-bold text-slate-900">Assignments</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isTeacher
              ? `${assignments.length} assignment${assignments.length !== 1 ? 's' : ''} in this class`
              : 'Your homework and tasks'}
          </p>
        </div>
        {isTeacher && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
          >
            <FaPlus /> Create Assignment
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#ced9d5] bg-[#f5f7f5] p-12 text-center">
          <FaTasks className="mx-auto mb-4 text-5xl text-[#8ba8a3]" />
          <h3 className="mb-2 text-xl font-bold text-slate-900">No Assignments Yet</h3>
          <p className="text-slate-500 mb-6">
            {isTeacher
              ? 'Create your first assignment for students to complete.'
              : 'No assignments have been posted yet.'}
          </p>
          {isTeacher && (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-2xl bg-[#2d5a56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
            >
              Create First Assignment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const deadline = formatDeadline(a.due_date);
            const isOpen = selected?.id === a.id;
            return (
              <div
                key={a.id}
                className="overflow-hidden rounded-3xl border border-[#e3e7e3] bg-white shadow-[0_6px_20px_rgba(17,24,39,0.05)] transition hover:border-[#c7d6d2]"
              >
                {/* Assignment header — clickable */}
                <button
                  onClick={() => openAssignment(a)}
                  className="w-full text-left px-6 py-5 flex items-start gap-4"
                >
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e7f3ef] text-[#2d5a56] text-lg">
                    <FaFileAlt />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900">{a.title}</h3>
                      {!isTeacher && (() => {
                        const sub = submissionMap[a.id];
                        if (!sub) return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Not Submitted</span>;
                        if (sub.grade !== null && sub.grade !== undefined) return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Graded {sub.grade}/{a.max_points}</span>;
                        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">Submitted</span>;
                      })()}
                      {deadline && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          deadline.isOverdue
                            ? 'bg-red-100 text-red-600'
                            : deadline.daysLeft <= 3
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-[#e7f3ef] text-[#2d5a56]'
                        }`}>
                          {deadline.isOverdue
                            ? `Overdue by ${-deadline.daysLeft}d`
                            : deadline.daysLeft === 0
                            ? 'Due today'
                            : `${deadline.daysLeft}d left`}
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-sm text-slate-500 truncate">{a.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      {deadline && (
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt /> Due: {deadline.formatted}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FaStar /> {a.max_points} pts
                      </span>
                      {isTeacher && (
                        <span className="flex items-center gap-1">
                          <FaUsers /> {a.submission_count || 0} submissions
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-400">
                    {isOpen ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </button>

                {/* Expanded panel */}
                {isOpen && (
                  <div className="border-t border-[#edf0ed] px-6 pb-6 pt-5">
                    {a.description && (
                      <p className="text-slate-600 text-sm leading-relaxed mb-5 whitespace-pre-wrap">{a.description}</p>
                    )}

                    {/* Teacher: submissions list */}
                    {isTeacher ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-slate-800">
                            Submissions ({submissions.length})
                          </h4>
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-100"
                          >
                            <FaTrash /> Delete Assignment
                          </button>
                        </div>
                        {submissions.length === 0 ? (
                          <p className="text-sm text-slate-400 italic">No submissions yet</p>
                        ) : (
                          <div className="space-y-3">
                            {submissions.map((sub) => (
                              <div key={sub.id} className="rounded-2xl border border-[#e3e7e3] bg-[#f8faf8] p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-slate-800 text-sm">{sub.student_name}</p>
                                    <p className="text-xs text-slate-400">{sub.email} · {new Date(sub.submitted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                  </div>
                                  {sub.status === 'graded' && (
                                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                      {sub.grade}/{a.max_points}
                                    </span>
                                  )}
                                </div>
                                {sub.content && (
                                  <p className="text-sm text-slate-600 mb-2 whitespace-pre-wrap">{sub.content}</p>
                                )}
                                {sub.file_url && (
                                  <a
                                    href={sub.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-[#2d5a56] font-semibold underline mb-3"
                                  >
                                    <FaDownload /> Download submission file
                                  </a>
                                )}
                                {/* Grade form */}
                                {sub.status !== 'graded' && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max={a.max_points}
                                      placeholder={`Grade /${a.max_points}`}
                                      value={gradeForm[sub.student_id]?.grade ?? ''}
                                      onChange={(e) => setGradeForm((prev) => ({ ...prev, [sub.student_id]: { ...prev[sub.student_id], grade: e.target.value } }))}
                                      className="w-28 rounded-xl border border-[#d7ded9] bg-white px-3 py-2 text-sm outline-none focus:border-[#7ea89c] focus:ring-2 focus:ring-[#dcece6]"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Feedback (optional)"
                                      value={gradeForm[sub.student_id]?.feedback ?? ''}
                                      onChange={(e) => setGradeForm((prev) => ({ ...prev, [sub.student_id]: { ...prev[sub.student_id], feedback: e.target.value } }))}
                                      className="flex-1 rounded-xl border border-[#d7ded9] bg-white px-3 py-2 text-sm outline-none focus:border-[#7ea89c] focus:ring-2 focus:ring-[#dcece6]"
                                    />
                                    <button
                                      onClick={() => handleGrade(a.id, sub.student_id)}
                                      className="flex items-center gap-1.5 rounded-xl bg-[#2d5a56] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#234946]"
                                    >
                                      <FaCheck /> Grade
                                    </button>
                                  </div>
                                )}
                                {sub.status === 'graded' && sub.feedback && (
                                  <p className="text-xs text-slate-500 italic mt-1">Feedback: {sub.feedback}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Student: submit or see grade */
                      <div>
                        {mySubmission ? (
                          <div className="rounded-2xl border border-[#e3e7e3] bg-[#f8faf8] p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                <FaCheck className="text-green-500" /> Submitted
                              </p>
                              {mySubmission.status === 'graded' ? (
                                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-bold text-green-700">
                                  {mySubmission.grade}/{a.max_points} pts
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#e7f3ef] px-3 py-1 text-xs font-semibold text-[#2d5a56]">
                                  Pending review
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mb-2">
                              Submitted {new Date(mySubmission.submitted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                            {mySubmission.content && (
                              <p className="text-sm text-slate-600 whitespace-pre-wrap">{mySubmission.content}</p>
                            )}
                            {mySubmission.file_url && (
                              <a
                                href={mySubmission.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#2d5a56] font-semibold underline mt-2"
                              >
                                <FaDownload /> Your submitted file
                              </a>
                            )}
                            {mySubmission.feedback && (
                              <div className="mt-3 rounded-xl bg-[#e7f3ef] px-4 py-3">
                                <p className="text-xs font-semibold text-[#234946] mb-1">Teacher Feedback</p>
                                <p className="text-sm text-slate-700">{mySubmission.feedback}</p>
                              </div>
                            )}
                            {/* Allow resubmission */}
                            <button
                              onClick={() => setMySubmission(null)}
                              className="mt-3 text-xs text-[#2d5a56] font-semibold underline"
                            >
                              Submit again
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="font-bold text-slate-800 text-sm">Your Submission</h4>
                            <textarea
                              value={submitText}
                              onChange={(e) => setSubmitText(e.target.value)}
                              placeholder="Type your answer here..."
                              className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                              rows={3}
                            />
                            <label
                              className={`flex items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 cursor-pointer transition ${
                                submitFile
                                  ? 'border-[#2d5a56] bg-[#e7f3ef]'
                                  : 'border-[#d7ded9] bg-[#f6f8f6] hover:border-[#2d5a56]'
                              }`}
                            >
                              <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                onChange={(e) => setSubmitFile(e.target.files[0] || null)}
                              />
                              <FaUpload className={submitFile ? 'text-[#2d5a56]' : 'text-slate-400'} />
                              <span className="text-sm text-slate-600">
                                {submitFile ? submitFile.name : 'Attach a file (optional)'}
                              </span>
                            </label>
                            {submitting && (
                              <div className="space-y-1">
                                <div className="h-2 overflow-hidden rounded-full bg-[#dde4e0]">
                                  <div className="h-full rounded-full bg-[#2d5a56] transition-all" style={{ width: `${submitProgress}%` }} />
                                </div>
                                <p className="text-xs text-slate-400">Uploading {submitProgress}%</p>
                              </div>
                            )}
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            <button
                              onClick={() => handleSubmit(a.id)}
                              disabled={submitting || (!submitText.trim() && !submitFile)}
                              className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-60"
                            >
                              {submitting ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : <FaCheck />}
                              {submitting ? 'Submitting...' : 'Submit Assignment'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-[#dce4de] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
            <div className="flex items-center justify-between border-b border-[#edf0ed] px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Create Assignment</h3>
                <p className="mt-0.5 text-sm text-slate-500">Students will see this and submit their work</p>
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
                <label className="mb-2 block text-sm font-semibold text-slate-700">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Memorize Surah Al-Mulk"
                  className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Instructions <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe what students need to do..."
                  className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Due Date <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Max Points</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={form.max_points}
                    onChange={(e) => setForm({ ...form, max_points: e.target.value })}
                    className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-3 text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 border-t border-[#edf0ed] pt-4">
                <button
                  type="submit"
                  disabled={saving || !form.title.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : <FaTasks />}
                  {saving ? 'Creating...' : 'Create Assignment'}
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
