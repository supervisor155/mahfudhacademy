import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FaArrowLeft,
  FaCircle,
  FaPaperPlane,
  FaPen,
  FaPhone,
  FaPhoneAlt,
  FaPhoneSlash,
  FaSearch,
  FaTimes,
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
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

function formatAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  return `${day}d`;
}

function buildCallIceServers() {
  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const url = import.meta.env.VITE_TURN_URL;
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (url && username && credential) servers.push({ urls: url, username, credential });
  return servers;
}

function CallVideoPlayer({ stream, muted = false, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream || null;
    if (stream) {
      el.play().catch(() => {});

      // Listen for dynamic track modifications on the same stream instance
      const handleTrackChange = () => {
        el.srcObject = null;
        el.srcObject = stream;
        el.play().catch(() => {});
      };

      stream.addEventListener('addtrack', handleTrackChange);
      stream.addEventListener('removetrack', handleTrackChange);
      return () => {
        stream.removeEventListener('addtrack', handleTrackChange);
        stream.removeEventListener('removetrack', handleTrackChange);
      };
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

export default function InboxChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();

  const [contacts, setContacts] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [socketError, setSocketError] = useState('');
  const [onlineMap, setOnlineMap] = useState({});
  const [lastMessageMap, setLastMessageMap] = useState({});
  const [unreadMap, setUnreadMap] = useState({});

  // call state
  const [call, setCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callMicOn, setCallMicOn] = useState(true);
  const [callCamOn, setCallCamOn] = useState(true);

  const socketRef = useRef(null);
  const endRef = useRef(null);
  const selectedPeerRef = useRef(null);
  const callRef = useRef(null);
  const callPcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  useEffect(() => { selectedPeerRef.current = selectedPeer; }, [selectedPeer]);
  useEffect(() => { callRef.current = call; }, [call]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ─── WebRTC helpers ──────────────────────────────────────────────────────────

  function cleanupCall() {
    callPcRef.current?.close();
    callPcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingIceCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCall(null);
    callRef.current = null;
    setCallMicOn(true);
    setCallCamOn(true);
  }

  function createCallPc(callId, peerId) {
    const pc = new RTCPeerConnection({ iceServers: buildCallIceServers() });

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !socketRef.current) return;
      socketRef.current.emit('dm:call:signal', {
        call_id: callId,
        to_user_id: peerId,
        signal: { type: 'ice-candidate', candidate: candidate.toJSON() },
      });
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || (() => {
        const s = remoteStreamRef.current || new MediaStream();
        s.addTrack(event.track);
        return s;
      })();
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        endCall();
      }
    };

    callPcRef.current = pc;
    return pc;
  }

  function startCall(peer, callType) {
    if (callRef.current) return;
    const callId = `call:${user.id}:${peer.id}:${Date.now()}`;
    const next = { callId, peer, callType, state: 'outgoing' };
    setCall(next);
    callRef.current = next;
    socketRef.current?.emit('dm:call:request', {
      to_user_id: peer.id,
      call_id: callId,
      call_type: callType,
    });
  }

  async function acceptCall() {
    const c = callRef.current;
    if (!c || c.state !== 'incoming') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: c.callType === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const next = { ...c, state: 'active' };
      setCall(next);
      callRef.current = next;
      socketRef.current?.emit('dm:call:accept', { call_id: c.callId, to_user_id: c.peer.id });
      createCallPc(c.callId, c.peer.id);
    } catch {
      rejectCall();
    }
  }

  function rejectCall() {
    const c = callRef.current;
    if (!c) return;
    socketRef.current?.emit('dm:call:reject', { call_id: c.callId, to_user_id: c.peer.id });
    cleanupCall();
  }

  function endCall() {
    const c = callRef.current;
    if (!c) return;
    socketRef.current?.emit('dm:call:end', { call_id: c.callId, to_user_id: c.peer.id });
    cleanupCall();
  }

  async function handleCallAccepted(payload) {
    const c = callRef.current;
    if (!c || c.state !== 'outgoing' || c.callId !== payload?.call_id) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: c.callType === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      const next = { ...c, state: 'active' };
      setCall(next);
      callRef.current = next;
      const pc = createCallPc(c.callId, c.peer.id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('dm:call:signal', {
        call_id: c.callId,
        to_user_id: c.peer.id,
        signal: { type: 'offer', sdp: offer.sdp },
      });
    } catch {
      endCall();
    }
  }

  async function handleCallSignal(payload) {
    const c = callRef.current;
    if (!c || !callPcRef.current || c.callId !== payload?.call_id) return;
    const { signal } = payload;
    if (!signal) return;
    try {
      const pc = callPcRef.current;
      if (signal.type === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        await flushCallIceCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit('dm:call:signal', {
          call_id: c.callId,
          to_user_id: payload.from_user_id,
          signal: { type: 'answer', sdp: answer.sdp },
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        await flushCallIceCandidates(pc);
      } else if (signal.type === 'ice-candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (!pc.remoteDescription) {
          pendingIceCandidatesRef.current.push(candidate);
        } else {
          await pc.addIceCandidate(candidate);
        }
      }
    } catch {
      // ignore transient ICE errors
    }
  }

  function toggleCallMic() {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !callMicOn; });
    setCallMicOn((v) => !v);
  }

  function toggleCallCam() {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !callCamOn; });
    setCallCamOn((v) => !v);
  }

  async function flushCallIceCandidates(pc) {
    const queued = pendingIceCandidatesRef.current;
    pendingIceCandidatesRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // ignore invalid candidates
      }
    }
  }

  // ─── Socket setup ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;

    const socket = createAppSocket(token);
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      setSocketError(err?.message || 'Realtime connection failed');
    });

    socket.on('chat:users:presence', (payload) => {
      const next = {};
      (payload?.users || []).forEach((u) => {
        const id = Number(u.user_id);
        if (!id) return;
        next[id] = !!u.online;
      });
      setOnlineMap((prev) => ({ ...prev, ...next }));
    });

    socket.on('chat:user:presence', (payload) => {
      const id = Number(payload?.user_id);
      if (!id) return;
      setOnlineMap((prev) => ({ ...prev, [id]: !!payload.online }));
    });

    socket.on('chat:dm:message', (payload) => {
      setSocketError('');
      const fromId = Number(payload?.from?.id);
      const toId = Number(payload?.to_user_id);
      if (!fromId || !toId) return;

      const peerId = fromId === user?.id ? toId : fromId;
      setLastMessageMap((prev) => ({
        ...prev,
        [peerId]: { text: payload.message, sent_at: payload.sent_at },
      }));

      setContacts((prev) => {
        const existing = prev.find((c) => c.id === peerId);
        if (existing) return prev;
        return [
          {
            id: peerId,
            name: payload?.from?.id === peerId ? payload?.from?.name || `User ${peerId}` : `User ${peerId}`,
            role: payload?.from?.id === peerId ? payload?.from?.role || 'student' : 'student',
          },
          ...prev,
        ];
      });

      if (selectedPeerRef.current && peerId === selectedPeerRef.current.id) {
        setMessages((prev) => [
          ...prev,
          { ...payload, id: payload.id || `${payload.sent_at || Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
        ]);
        if (fromId !== user?.id) setUnreadMap((prev) => ({ ...prev, [peerId]: 0 }));
      } else if (fromId !== user?.id) {
        setUnreadMap((prev) => ({ ...prev, [peerId]: (prev[peerId] || 0) + 1 }));
      }
    });

    socket.on('chat:dm:error', (payload) => {
      setSocketError(payload?.message || 'Direct messaging failed');
    });

    // call events
    socket.on('dm:call:incoming', (payload) => {
      if (callRef.current) {
        socket.emit('dm:call:reject', { call_id: payload.call_id, to_user_id: payload.from?.id });
        return;
      }
      const next = { callId: payload.call_id, peer: payload.from, callType: payload.call_type, state: 'incoming' };
      setCall(next);
      callRef.current = next;
    });

    socket.on('dm:call:accepted', (payload) => { handleCallAccepted(payload); });
    socket.on('dm:call:signal', (payload) => { handleCallSignal(payload); });

    socket.on('dm:call:rejected', (payload) => {
      if (callRef.current?.callId === payload?.call_id) cleanupCall();
    });
    socket.on('dm:call:cancelled', (payload) => {
      if (callRef.current?.callId === payload?.call_id) cleanupCall();
    });
    socket.on('dm:call:ended', (payload) => {
      if (callRef.current?.callId === payload?.call_id) cleanupCall();
    });

    return () => {
      cleanupCall();
      socket.disconnect();
    };
  }, [token, user?.id]);

  // auto-start a call when navigated here with ?call=userId&type=audio|video
  useEffect(() => {
    const callUserId = Number(searchParams.get('call'));
    const callType = searchParams.get('type') === 'video' ? 'video' : 'audio';
    if (!callUserId || !socketRef.current || callRef.current) return;

    setContacts((prev) => {
      const existing = prev.find((c) => c.id === callUserId);
      const peer = existing || { id: callUserId, name: `User ${callUserId}`, role: 'student' };
      setSelectedPeer(peer);
      setTimeout(() => startCall(peer, callType), 500);
      return prev;
    });
  }, [searchParams, contacts]);

  // load conversations
  useEffect(() => {
    let cancelled = false;
    async function loadConversations() {
      try {
        const convRes = await api.get('/api/dm/conversations?limit=50');
        const convData = convRes.data?.data || [];
        const list = (Array.isArray(convData) ? convData : []).map((c) => ({
          id: Number(c.peer_id),
          name: c.peer_name || `User ${c.peer_id}`,
          role: c.peer_role || 'student',
        }));
        const nextLast = {};
        const nextUnread = {};
        (Array.isArray(convData) ? convData : []).forEach((c) => {
          const peerId = Number(c.peer_id);
          if (!peerId) return;
          nextLast[peerId] = { text: c.message, sent_at: c.created_at };
          nextUnread[peerId] = Number(c.unread_count) || 0;
        });
        if (!cancelled) {
          setContacts(list);
          setLastMessageMap(nextLast);
          setUnreadMap(nextUnread);
          if (list[0] && !selectedPeerRef.current) setSelectedPeer(list[0]);
        }
      } catch {
        if (!cancelled) setContacts([]);
      }
    }
    loadConversations();
    return () => { cancelled = true; };
  }, [user?.id]);

  // search users
  useEffect(() => {
    let cancelled = false;
    const q = search.trim();
    if (!q) return undefined;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/api/users/search?q=${encodeURIComponent(q)}&limit=30`);
        const users = res.data?.data || [];
        if (cancelled) return;
        setContacts((prev) => {
          const map = new Map(prev.map((x) => [x.id, x]));
          (Array.isArray(users) ? users : []).forEach((u) => {
            const uid = Number(u?.id);
            if (!uid || uid === Number(user?.id)) return;
            map.set(uid, { id: uid, name: u.name || `User ${uid}`, role: u.role || 'student' });
          });
          return Array.from(map.values());
        });
      } catch {
        // keep previous contacts
      }
    }, 260);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, user?.id]);

  // load DM history for selected peer
  useEffect(() => {
    if (!selectedPeer) return;
    let cancelled = false;
    async function loadConversation() {
      try {
        const res = await api.get(`/api/dm/${selectedPeer.id}?limit=100`);
        const list = res.data?.data || [];
        if (cancelled) return;
        setMessages(
          (Array.isArray(list) ? list : []).map((m, i) => ({
            id: m.id || `${m.created_at || i}-${i}`,
            from: { id: m.from_user, name: m.from_name, role: m.from_role },
            to_user_id: m.to_user,
            message: m.message,
            sent_at: m.created_at,
          }))
        );
        setUnreadMap((prev) => ({ ...prev, [selectedPeer.id]: 0 }));
      } catch {
        if (!cancelled) setMessages([]);
      }
    }
    loadConversation();
    if (socketRef.current) socketRef.current.emit('chat:dm:open', { peer_id: selectedPeer.id });
    return () => { cancelled = true; };
  }, [selectedPeer]);

  // presence polling
  useEffect(() => {
    const q = search.trim().toLowerCase();
    const list = q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
    const ids = list.map((c) => Number(c.id)).filter(Boolean);
    if (!ids.length || !socketRef.current) return;
    socketRef.current.emit('chat:users:presence:get', { user_ids: ids });
  }, [contacts, search]);

  function sendMessage() {
    const text = input.trim();
    if (!text || !selectedPeer || !socketRef.current) return;
    socketRef.current.emit('chat:dm:send', { to_user_id: selectedPeer.id, message: text });
    setInput('');
  }

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
    return [...list].sort((a, b) => {
      const aOn = onlineMap[a.id] ? 1 : 0;
      const bOn = onlineMap[b.id] ? 1 : 0;
      if (aOn !== bOn) return bOn - aOn;
      const at = new Date(lastMessageMap[a.id]?.sent_at || 0).getTime();
      const bt = new Date(lastMessageMap[b.id]?.sent_at || 0).getTime();
      if (at !== bt) return bt - at;
      return a.name.localeCompare(b.name);
    });
  }, [contacts, search, onlineMap, lastMessageMap]);

  // ─── Call Overlays ────────────────────────────────────────────────────────────

  function renderCallOverlay() {
    if (!call) return null;

    if (call.state === 'incoming') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-80 rounded-3xl border border-white/10 bg-[#0d1520] px-6 py-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#1a2a40] text-2xl font-bold ring-4 ring-green-400/40 animate-pulse">
              {initials(call.peer?.name)}
            </div>
            <p className="mb-1 text-lg font-bold text-white">{call.peer?.name}</p>
            <p className="mb-6 text-sm text-white/60">
              Incoming {call.callType === 'video' ? 'video' : 'audio'} call...
            </p>
            <div className="flex justify-center gap-6">
              <button
                onClick={rejectCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
              >
                <FaPhoneSlash className="text-xl" />
              </button>
              <button
                onClick={acceptCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
              >
                <FaPhone className="text-xl" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (call.state === 'outgoing') {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-80 rounded-3xl border border-white/10 bg-[#0d1520] px-6 py-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#1a2a40] text-2xl font-bold ring-4 ring-blue-400/40 animate-pulse">
              {initials(call.peer?.name)}
            </div>
            <p className="mb-1 text-lg font-bold text-white">{call.peer?.name}</p>
            <p className="mb-6 text-sm text-white/60">
              Calling{call.callType === 'video' ? ' (video)' : ''}...
            </p>
            <button
              onClick={() => {
                socketRef.current?.emit('dm:call:cancel', { call_id: call.callId, to_user_id: call.peer.id });
                cleanupCall();
              }}
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
            >
              <FaPhoneSlash className="text-xl" />
            </button>
          </div>
        </div>
      );
    }

    if (call.state === 'active') {
      const isVideo = call.callType === 'video';
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#060c16]">
          {/* Remote stream */}
          <div className="relative flex-1 bg-black">
            {isVideo && remoteStream ? (
              <CallVideoPlayer stream={remoteStream} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#1a2a40] text-3xl font-bold text-white">
                    {initials(call.peer?.name)}
                  </div>
                  <p className="text-lg font-semibold text-white">{call.peer?.name}</p>
                  <p className="mt-1 text-sm text-white/60">Call in progress</p>
                </div>
              </div>
            )}

            {/* Local stream pip */}
            {isVideo && localStream && (
              <div className="absolute bottom-4 right-4 h-28 w-20 overflow-hidden rounded-2xl border border-white/20 shadow-lg">
                <CallVideoPlayer stream={localStream} muted className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 bg-[#0a1020] py-6">
            <button
              onClick={toggleCallMic}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition ${callMicOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
              {callMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>
            {isVideo && (
              <button
                onClick={toggleCallCam}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition ${callCamOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >
                {callCamOn ? <FaVideo /> : <FaVideoSlash />}
              </button>
            )}
            <button
              onClick={endCall}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
            >
              <FaPhoneSlash className="text-xl" />
            </button>
          </div>
        </div>
      );
    }

    return null;
  }

  // ─── Main UI ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#060c16] text-white" style={{ fontFamily: 'Manrope, system-ui, sans-serif' }}>
      {renderCallOverlay()}

      <div className="mx-auto w-full max-w-7xl px-0 sm:px-4 sm:py-4">
        <div className="overflow-hidden border border-[#1a2231] bg-[#070d18] shadow-[0_20px_55px_rgba(0,0,0,0.45)] sm:rounded-[28px]">
          <div className="grid min-h-screen sm:min-h-[86vh] md:grid-cols-[360px_minmax(0,1fr)]">

            {/* Sidebar */}
            <aside className={`border-r border-[#182132] ${selectedPeer ? 'hidden md:block' : 'block'}`}>
              <div className="border-b border-[#182132] px-4 py-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <button onClick={() => navigate(-1)} className="rounded-full p-2 text-white/80 hover:bg-white/10">
                    <FaArrowLeft />
                  </button>
                  <p className="text-xl font-bold">Chats</p>
                  <button className="rounded-full p-2 text-white/80 hover:bg-white/10">
                    <FaPen />
                  </button>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2.5">
                  <FaSearch className="text-xs text-white/60" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-white/45"
                  />
                </div>
              </div>

              <div className="max-h-[calc(100vh-120px)] overflow-y-auto sm:max-h-[calc(86vh-120px)]">
                {filteredContacts.map((c) => {
                  const last = lastMessageMap[c.id];
                  const isActive = selectedPeer?.id === c.id;
                  const online = !!onlineMap[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedPeer(c)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${isActive ? 'bg-[#1a2335]' : 'hover:bg-[#141d2c]'}`}
                    >
                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e2a41] text-sm font-bold">
                          {initials(c.name)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[#070d18] ${online ? 'bg-green-400' : 'bg-slate-500'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">{c.name}</p>
                        <p className="truncate text-sm text-white/60">{last?.text || `${c.role} in your classes`}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xs text-white/45">{formatAgo(last?.sent_at)}</div>
                        {(unreadMap[c.id] || 0) > 0 && (
                          <span className="rounded-full bg-[#3b63ff] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {unreadMap[c.id]}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Chat panel */}
            <section className={`${selectedPeer ? 'flex' : 'hidden'} min-h-screen flex-col sm:min-h-[86vh] md:flex`}>
              {selectedPeer ? (
                <>
                  {socketError && (
                    <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                      {socketError}
                    </div>
                  )}

                  {/* Chat header with call buttons */}
                  <div className="flex items-center justify-between border-b border-[#182132] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <button onClick={() => setSelectedPeer(null)} className="rounded-full p-2 md:hidden hover:bg-white/10">
                        <FaArrowLeft />
                      </button>
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e2a41] text-xs font-bold">
                          {initials(selectedPeer.name)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#070d18] ${onlineMap[selectedPeer.id] ? 'bg-green-400' : 'bg-slate-500'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold">{selectedPeer.name}</p>
                        <p className="text-xs text-white/60">
                          {onlineMap[selectedPeer.id] ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>

                    {/* Call buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startCall(selectedPeer, 'audio')}
                        disabled={!!call}
                        title="Audio call"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-green-600 hover:text-white disabled:opacity-30"
                      >
                        <FaPhoneAlt className="text-xs" />
                      </button>
                      <button
                        onClick={() => startCall(selectedPeer, 'video')}
                        disabled={!!call}
                        title="Video call"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition hover:bg-blue-600 hover:text-white disabled:opacity-30"
                      >
                        <FaVideo className="text-xs" />
                      </button>
                      <button onClick={() => setSelectedPeer(null)} className="rounded-full p-2 text-white/75 hover:bg-white/10">
                        <FaTimes />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto bg-linear-to-b from-[#0b1220] to-[#090f1a] px-4 py-4">
                    {messages.length === 0 ? (
                      <div className="mx-auto mt-20 max-w-sm rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-center text-sm text-white/70">
                        Start chatting with {selectedPeer.name}.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {messages.map((msg) => {
                          const mine = msg.from?.id === user?.id;
                          return (
                            <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[78%] rounded-[20px] px-4 py-2.5 ${mine ? 'bg-[#3b63ff]' : 'bg-[#1a2335]'}`}>
                                <p className="text-sm leading-relaxed">{msg.message}</p>
                                <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-white/70">
                                  <span>{formatAgo(msg.sent_at)}</span>
                                  {mine && <FaCircle className="text-[6px]" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={endRef} />
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="border-t border-[#182132] px-3 py-3">
                    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[#0a1220] px-3 py-2.5">
                      <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                        placeholder="Message..."
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/45"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!input.trim()}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3b63ff] text-white transition hover:bg-[#2749d8] disabled:opacity-45"
                      >
                        <FaPaperPlane className="text-xs" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="hidden flex-1 items-center justify-center text-center text-white/50 md:flex">
                  <div>
                    <p className="text-base font-semibold text-white/70">Tap a user from the list to start chatting</p>
                    <p className="mt-1 text-sm text-white/50">Use search to find users quickly, then tap once.</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
