import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  FaCircle,
  FaPaperPlane,
  FaRegSmile,
  FaPhoneAlt,
  FaVideo,
  FaArrowLeft,
  FaComments,
} from 'react-icons/fa';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { createAppSocket } from '../../services/socket';

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x.charAt(0).toUpperCase())
    .join('');
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Chat() {
  const { classId } = useParams();
  const { user, token } = useAuth();

  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const onlineSet = useMemo(() => new Set(onlineUsers.map((u) => u.id)), [onlineUsers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        const res = await api.get(`/api/classes/${classId}/members?limit=100`);
        const data = res.data?.data || res.data || [];
        if (!cancelled) setMembers(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMembers([]);
      }
    }

    loadMembers();
    return () => { cancelled = true; };
  }, [classId]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await api.get(`/api/classes/${classId}/chat/messages?limit=120`);
        const data = res.data?.data || [];
        if (cancelled) return;

        setMessages(
          (Array.isArray(data) ? data : []).map((m, i) => ({
            id: m.id || `${m.user_id}-${m.created_at || i}`,
            from: {
              id: m.user_id,
              name: m.user_name,
              role: m.user_role,
            },
            message: m.message,
            sent_at: m.created_at,
          }))
        );
      } catch {
        if (!cancelled) setMessages([]);
      }
    }

    if (classId) {
      loadHistory();
    }

    return () => {
      cancelled = true;
    };
  }, [classId]);

  useEffect(() => {
    if (!token || !classId) return;

    const socket = createAppSocket(token);

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('chat:join', { class_id: classId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError(err?.message || 'Realtime connection failed');
    });

    socket.on('chat:message', (payload) => {
      setMessages((prev) => [
        ...prev,
        {
          id: payload?.id || `${payload?.from?.id || 'u'}-${payload?.sent_at || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          from: payload?.from,
          message: payload?.message,
          sent_at: payload?.sent_at,
        },
      ]);
    });

    socket.on('chat:online', (payload) => {
      const users = payload?.users || [];
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    socket.on('chat:error', (payload) => {
      setError(payload?.message || 'Class chat failed');
    });

    return () => {
      socket.emit('chat:leave', { class_id: classId });
      socket.disconnect();
    };
  }, [classId, token]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    if (!socketRef.current) {
      setError('Chat is disconnected. Please wait a moment.');
      return;
    }
    socketRef.current.emit('chat:send', { class_id: classId, message: text });
    setInput('');
    setError('');
  }

  const orderedMembers = useMemo(() => {
    const list = Array.isArray(members) ? members : [];
    return [...list].sort((a, b) => {
      const aOn = onlineSet.has(a.user_id || a.id) ? 1 : 0;
      const bOn = onlineSet.has(b.user_id || b.id) ? 1 : 0;
      return bOn - aOn;
    });
  }, [members, onlineSet]);

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="overflow-hidden rounded-[28px] border border-[#202733] bg-[#0e1218] text-white shadow-[0_20px_55px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button className="text-white/80 lg:hidden" aria-label="Back">
              <FaArrowLeft />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff7d1f] text-sm font-bold text-[#1a1a1a]">
              <FaComments />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">Class Chat</p>
              <p className="text-xs text-white/60">
                {connected ? `${onlineUsers.length} online now` : 'Connecting...'}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button className="rounded-full bg-white/5 p-2 text-white/70 transition hover:bg-white/10">
              <FaPhoneAlt className="text-xs" />
            </button>
            <button className="rounded-full bg-white/5 p-2 text-white/70 transition hover:bg-white/10">
              <FaVideo className="text-xs" />
            </button>
          </div>
        </div>

        <div className="grid min-h-[72vh] lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden border-r border-white/10 bg-[#101723] lg:block">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50">Online Users</p>
            </div>
            <div className="max-h-[72vh] overflow-y-auto px-3 py-3">
              {orderedMembers.length === 0 ? (
                <p className="px-2 text-sm text-white/40">No members loaded.</p>
              ) : (
                <div className="space-y-1.5">
                  {orderedMembers.map((m) => {
                    const uid = m.user_id || m.id;
                    const name = m.name || m.user_name || `User ${uid}`;
                    const isOnline = onlineSet.has(uid);
                    return (
                      <div
                        key={uid}
                        className="flex items-center gap-3 rounded-2xl px-2.5 py-2 transition hover:bg-white/5"
                      >
                        <div className="relative">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1f2a3b] text-xs font-bold">
                            {initials(name)}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#101723] ${isOnline ? 'bg-green-400' : 'bg-slate-500'}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{name}</p>
                          <p className={`text-[11px] ${isOnline ? 'text-green-300' : 'text-white/40'}`}>
                            {isOnline ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <div className="flex min-h-[72vh] flex-col bg-linear-to-b from-[#0f141f] to-[#0b1017]">
            <div className="border-b border-white/8 px-4 py-2.5 lg:hidden">
              <div className="flex items-center gap-2 overflow-x-auto">
                {onlineUsers.slice(0, 12).map((u) => (
                  <div key={u.id} className="flex shrink-0 flex-col items-center gap-1">
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#223047] text-[10px] font-bold">
                        {initials(u.name)}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0f141f] bg-green-400" />
                    </div>
                    <span className="max-w-16 truncate text-[10px] text-white/55">{u.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5">
              {messages.length === 0 ? (
                <div className="mx-auto mt-20 max-w-sm rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-center">
                  <p className="text-sm text-white/70">Start the conversation with your class.</p>
                  <p className="mt-1 text-xs text-white/50">Messages appear in real time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const mine = msg?.from?.id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-[20px] px-4 py-3 shadow ${mine ? 'bg-[#355bf3] text-white' : 'bg-[#1b2432] text-white/95'}`}>
                          {!mine && <p className="mb-1 text-[11px] font-bold text-white/70">{msg?.from?.name || 'User'}</p>}
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-white/75' : 'text-white/50'}`}>
                            {formatTime(msg.sent_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-3 sm:p-4">
              {error && <p className="mb-2 text-xs text-red-300">{error}</p>}
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[#0b1320] px-3 py-2.5">
                <button className="text-white/50 transition hover:text-white/80" aria-label="Emoji">
                  <FaRegSmile className="text-lg" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Message..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#355bf3] text-white transition hover:bg-[#2749d8] disabled:opacity-45"
                  aria-label="Send"
                >
                  <FaPaperPlane className="text-xs" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
