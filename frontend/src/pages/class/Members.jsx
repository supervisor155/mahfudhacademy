import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaUsers, FaUserGraduate, FaChalkboardTeacher,
  FaTimes, FaTrash, FaSearch, FaCrown,
  FaLink, FaRedo, FaUserPlus, FaCheck, FaCopy,
  FaEnvelope, FaBell, FaCheckCircle, FaTimesCircle,
} from 'react-icons/fa';

function avatarLetter(name) {
  return (name || '?')[0].toUpperCase();
}

function avatarColor(name) {
  const colors = [
    'bg-[#e7f3ef] text-[#234946]',
    'bg-[#edf3f8] text-[#3a66b8]',
    'bg-[#f3effd] text-[#7d57b1]',
    'bg-[#fff8e7] text-[#c26d32]',
    'bg-[#fdf0f0] text-[#c45b5b]',
  ];
  const idx = (name || '').charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function Members() {
  const { classId } = useParams();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'manager';

  const [members, setMembers] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState(null);

  // Invite code copy state
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Add by email state
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Access requests (teacher only)
  const [accessRequests, setAccessRequests] = useState([]);
  const [resolvingRequest, setResolvingRequest] = useState(null);

  useEffect(() => {
    fetchMembers();
    fetchClass();
    if (isTeacher) fetchAccessRequests();
  }, [classId]);

  const fetchAccessRequests = async () => {
    try {
      const res = await api.get(`/api/classes/${classId}/access-requests`);
      setAccessRequests(res.data?.data || []);
    } catch {}
  };

  const handleApproveRequest = async (requestId, userName) => {
    setResolvingRequest(requestId);
    try {
      await api.post(`/api/classes/${classId}/access-requests/${requestId}/approve`);
      setAccessRequests((prev) => prev.filter((r) => r.id !== requestId));
      await fetchMembers();
    } catch {
      setError(`Failed to approve ${userName}'s request`);
    } finally {
      setResolvingRequest(null);
    }
  };

  const handleDeclineRequest = async (requestId, userName) => {
    setResolvingRequest(requestId);
    try {
      await api.post(`/api/classes/${classId}/access-requests/${requestId}/decline`);
      setAccessRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      setError(`Failed to decline ${userName}'s request`);
    } finally {
      setResolvingRequest(null);
    }
  };

  const fetchClass = async () => {
    try {
      const res = await api.get(`/api/classes/${classId}`);
      setInviteCode(res.data?.invite_code || '');
    } catch {}
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/api/classes/${classId}/members`);
      const data = res.data?.data || res.data || [];
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Generate a new invite code? The old code will stop working immediately.')) return;
    setRegenerating(true);
    try {
      const res = await api.post(`/api/classes/${classId}/regenerate-code`);
      setInviteCode(res.data?.invite_code || '');
    } catch {
      setError('Failed to regenerate code');
    } finally {
      setRegenerating(false);
    }
  };

  const handleAddByEmail = async (e) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAdding(true);
    setAddError('');
    setAddSuccess('');
    try {
      await api.post(`/api/classes/${classId}/members`, { email: addEmail.trim() });
      setAddSuccess(`Student added successfully`);
      setAddEmail('');
      await fetchMembers();
      setTimeout(() => setAddSuccess(''), 3000);
    } catch (err) {
      setAddError(err.response?.data?.message || 'Failed to add student');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this class?`)) return;
    setRemoving(memberId);
    try {
      await api.delete(`/api/classes/${classId}/members/${memberId}`);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch {
      setError('Failed to remove member');
    } finally {
      setRemoving(null);
    }
  };

  const filtered = members.filter((m) =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const teachers = filtered.filter((m) => m.class_role !== 'student' || m.role !== 'student');
  const students = filtered.filter((m) => m.class_role === 'student' && m.role === 'student');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Class Members</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''} enrolled
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      {/* Teacher: Invite Panel */}
      {isTeacher && (
        <div className="rounded-[28px] border border-[#d4e8e0] bg-linear-to-br from-[#e7f3ef] to-[#f2f8f5] p-6 shadow-[0_6px_20px_rgba(45,90,86,0.08)]">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-[#234946]">
            <FaLink /> Invite Students to This Class
          </h3>

          {/* Invite code display */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Class Invite Code</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-2xl border-2 border-[#b8d8ce] bg-white px-5 py-4 font-mono text-2xl font-bold tracking-[0.15em] text-[#2d5a56] select-all">
                {inviteCode || '—'}
              </div>
              <button
                onClick={handleCopyCode}
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg transition ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-[#2d5a56] text-white hover:bg-[#234946]'
                }`}
                title="Copy code"
              >
                {copied ? <FaCheck /> : <FaCopy />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Share this code with students. They enter it on their dashboard to join.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mb-5">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 rounded-2xl border border-[#b8d8ce] bg-white px-4 py-2.5 text-sm font-semibold text-[#2d5a56] transition hover:bg-[#f0f9f5] disabled:opacity-60"
            >
              {regenerating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2d5a56] border-t-transparent" />
              ) : <FaRedo className="text-xs" />}
              Regenerate Code
            </button>
          </div>

          {/* Divider */}
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#c8ddd7]" />
            <span className="text-xs font-semibold text-slate-400 uppercase">or add directly by email</span>
            <div className="h-px flex-1 bg-[#c8ddd7]" />
          </div>

          {/* Add by email */}
          <form onSubmit={handleAddByEmail} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="email"
                value={addEmail}
                onChange={(e) => { setAddEmail(e.target.value); setAddError(''); setAddSuccess(''); }}
                placeholder="student@email.com"
                className="w-full rounded-2xl border border-[#b8d8ce] bg-white pl-10 pr-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#7ea89c] focus:ring-4 focus:ring-[#dcece6]"
              />
            </div>
            <button
              type="submit"
              disabled={adding || !addEmail.trim()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-60 sm:w-auto w-full"
            >
              {adding ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : <FaUserPlus />}
              Add Student
            </button>
          </form>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
          {addSuccess && (
            <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-green-700">
              <FaCheck /> {addSuccess}
            </p>
          )}
        </div>
      )}

      {/* Access Requests — teacher only */}
      {isTeacher && accessRequests.length > 0 && (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
            <FaBell className="text-amber-500" />
            Join Requests
            <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {accessRequests.length}
            </span>
          </h3>
          <div className="space-y-2">
            {accessRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${avatarColor(req.name)}`}>
                    {avatarLetter(req.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{req.name}</p>
                    <p className="truncate text-xs text-slate-400">{req.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApproveRequest(req.id, req.name)}
                    disabled={resolvingRequest === req.id}
                    title="Approve"
                    className="flex items-center gap-1.5 rounded-xl bg-[#2d5a56] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#234946] disabled:opacity-50 transition-colors"
                  >
                    <FaCheckCircle /> Approve
                  </button>
                  <button
                    onClick={() => handleDeclineRequest(req.id, req.name)}
                    disabled={resolvingRequest === req.id}
                    title="Decline"
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    <FaTimesCircle /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] pl-10 pr-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white focus:ring-4 focus:ring-[#dcece6]"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <FaTimes className="text-xs" />
          </button>
        )}
      </div>

      {members.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#ced9d5] bg-[#f5f7f5] p-12 text-center">
          <FaUsers className="mx-auto mb-4 text-5xl text-[#8ba8a3]" />
          <h3 className="mb-2 text-xl font-bold text-slate-900">No Members Yet</h3>
          <p className="text-slate-500">
            {isTeacher ? 'Share the invite code above or add students by email.' : 'No students enrolled yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Instructors */}
          {teachers.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-500 uppercase tracking-wider">
                <FaChalkboardTeacher className="text-[#2d5a56]" /> Instructors ({teachers.length})
              </h3>
              <div className="space-y-2">
                {teachers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 rounded-[20px] border border-[#e3e7e3] bg-white p-4 shadow-[0_4px_12px_rgba(17,24,39,0.04)]"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-bold ${avatarColor(m.name)}`}>
                      {avatarLetter(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{m.name}</p>
                        {m.role === 'owner' && (
                          <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                            <FaCrown className="text-[10px]" /> Owner
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{m.email}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#e7f3ef] px-3 py-1 text-xs font-semibold text-[#234946]">
                      {m.class_role || m.role}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Students */}
          {students.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 mb-3 text-sm font-bold text-slate-500 uppercase tracking-wider">
                <FaUserGraduate className="text-[#2d5a56]" /> Students ({students.length})
              </h3>
              <div className="space-y-2">
                {students.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 rounded-[20px] border border-[#e3e7e3] bg-white p-4 shadow-[0_4px_12px_rgba(17,24,39,0.04)] transition hover:border-[#c7d6d2]"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-bold ${avatarColor(m.name)}`}>
                      {avatarLetter(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-400 truncate">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="hidden text-xs text-slate-400 sm:block">
                        Joined {new Date(m.joined_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                      {isTeacher && m.id !== user?.id && (
                        <button
                          onClick={() => handleRemove(m.id, m.name)}
                          disabled={removing === m.id}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-400 transition hover:bg-red-100 disabled:opacity-50"
                          title="Remove student"
                        >
                          {removing === m.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                          ) : (
                            <FaTrash className="text-xs" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {filtered.length === 0 && search && (
            <p className="text-center text-slate-400 text-sm py-8">No members match "{search}"</p>
          )}
        </div>
      )}
    </div>
  );
}

