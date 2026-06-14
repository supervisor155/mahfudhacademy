import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../services/socket';
import {
  FaClock, FaPlus, FaTimes, FaDesktop, FaStopCircle,
  FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaUsers, FaCircle, FaComments, FaPaperPlane, FaPlayCircle,
} from 'react-icons/fa';

function formatTime(iso) {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function buildIceServers() {
  const servers = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  const url = import.meta.env.VITE_TURN_URL;
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;
  if (url && username && credential) {
    servers.push({ urls: url, username, credential });
  }
  return servers;
}

function StreamPlayer({ stream, muted = false, className }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream || null;
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted={muted} className={className} />;
}

export default function LiveSessions() {
  const { classId } = useParams();
  const { user, token } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'manager';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStart, setShowStart] = useState(false);
  const [preJoinSession, setPreJoinSession] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [scheduleMinutes, setScheduleMinutes] = useState(10);
  const [nowTick, setNowTick] = useState(Date.now());
  const [sessionMessages, setSessionMessages] = useState([]);
  const [sessionOnline, setSessionOnline] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatClosedNotice, setChatClosedNotice] = useState('');
  const [remotePeers, setRemotePeers] = useState([]);

  // Screen share / media state
  const [screenStream, setScreenStream] = useState(null);
  const [camStream, setCamStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const screenVideoRef = useRef(null);
  const camVideoRef = useRef(null);
  const socketRef = useRef(null);
  const activeSessionIdRef = useRef(null);
  const chatEndRef = useRef(null);
  const screenStreamRef = useRef(null);
  const camStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const remoteStreamsRef = useRef(new Map());
  const pendingIceRef = useRef(new Map());
  const remoteMetaRef = useRef(new Map());

  useEffect(() => { fetchSessions(); }, [classId]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    activeSessionIdRef.current = activeSession?.id || null;
  }, [activeSession?.id]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  useEffect(() => {
    camStreamRef.current = camStream;
  }, [camStream]);

  function getOutboundTracks() {
    const tracks = [];
    const screenTrack = screenStreamRef.current?.getVideoTracks?.().find((track) => track.readyState === 'live');
    const cameraTrack = camStreamRef.current?.getVideoTracks?.().find((track) => track.readyState === 'live');
    const audioTrack = camStreamRef.current?.getAudioTracks?.().find((track) => track.readyState === 'live' && track.enabled);

    if (screenTrack) tracks.push(screenTrack);
    else if (cameraTrack) tracks.push(cameraTrack);
    if (audioTrack) tracks.push(audioTrack);

    return tracks;
  }

  function upsertRemotePeer(peerId, next) {
    if (!peerId) return;
    const prevMeta = remoteMetaRef.current.get(peerId) || { id: peerId, name: `User ${peerId}`, role: 'student' };
    const merged = {
      ...prevMeta,
      ...next,
      id: peerId,
      stream: next.stream ?? prevMeta.stream ?? remoteStreamsRef.current.get(peerId) ?? null,
    };
    remoteMetaRef.current.set(peerId, merged);
    setRemotePeers(Array.from(remoteMetaRef.current.values()));
  }

  function removePeer(peerId) {
    const pc = peerConnectionsRef.current.get(peerId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnectionsRef.current.delete(peerId);
    }

    remoteStreamsRef.current.delete(peerId);
    pendingIceRef.current.delete(peerId);
    remoteMetaRef.current.delete(peerId);
    setRemotePeers(Array.from(remoteMetaRef.current.values()));
  }

  function clearPeerState() {
    Array.from(peerConnectionsRef.current.keys()).forEach((peerId) => removePeer(peerId));
    peerConnectionsRef.current.clear();
    remoteStreamsRef.current.clear();
    pendingIceRef.current.clear();
    remoteMetaRef.current.clear();
    setRemotePeers([]);
  }

  async function flushPendingCandidates(peerId, pc) {
    const queued = pendingIceRef.current.get(peerId) || [];
    if (!queued.length) return;
    pendingIceRef.current.delete(peerId);

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        // Ignore invalid ICE candidates.
      }
    }
  }

  function queueIceCandidate(peerId, candidate) {
    const queued = pendingIceRef.current.get(peerId) || [];
    queued.push(candidate);
    pendingIceRef.current.set(peerId, queued);
  }

  function attachTracksToPeer(pc) {
    const outboundTracks = getOutboundTracks();

    pc.getSenders().forEach((sender) => {
      if (sender.track) {
        try { pc.removeTrack(sender); } catch { /* no-op */ }
      }
    });

    // Pass the source stream so the receiver always gets event.streams[0]
    // and never has to reuse a stale MediaStream with ended tracks.
    const srcStream = screenStreamRef.current || camStreamRef.current;
    outboundTracks.forEach((track) => {
      try {
        if (srcStream) {
          pc.addTrack(track, srcStream);
        } else {
          pc.addTrack(track);
        }
      } catch {
        // no-op
      }
    });

    if (!outboundTracks.some((track) => track.kind === 'video')) {
      pc.addTransceiver('video', { direction: 'recvonly' });
    }
    if (!outboundTracks.some((track) => track.kind === 'audio')) {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }
  }

  function createPeerConnection(peerId, peerMeta = {}) {
    if (peerConnectionsRef.current.has(peerId)) {
      upsertRemotePeer(peerId, peerMeta);
      return peerConnectionsRef.current.get(peerId);
    }

    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

    attachTracksToPeer(pc);

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !socketRef.current || !activeSessionIdRef.current) return;
      socketRef.current.emit('session:signal', {
        session_id: activeSessionIdRef.current,
        to_user_id: peerId,
        signal: {
          type: 'ice-candidate',
          candidate: candidate.toJSON(),
        },
      });
    };

    pc.ontrack = (event) => {
      let stream = event.streams?.[0];
      if (!stream) {
        stream = remoteStreamsRef.current.get(peerId) || new MediaStream();
        stream.addTrack(event.track);
      }

      remoteStreamsRef.current.set(peerId, stream);
      upsertRemotePeer(peerId, { ...peerMeta, stream });
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) {
        removePeer(peerId);
      }
    };

    peerConnectionsRef.current.set(peerId, pc);
    upsertRemotePeer(peerId, peerMeta);
    return pc;
  }

  async function createOfferForPeer(peerId, peerMeta = {}) {
    if (!socketRef.current || !activeSessionIdRef.current || peerId === user?.id) return;

    try {
      const pc = createPeerConnection(peerId, peerMeta);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socketRef.current.emit('session:signal', {
        session_id: activeSessionIdRef.current,
        to_user_id: peerId,
        signal: {
          type: 'offer',
          sdp: offer.sdp,
        },
      });
    } catch {
      setError('Failed to negotiate live media connection');
    }
  }

  async function handleSessionSignal(payload) {
    if (!activeSessionIdRef.current || String(payload?.session_id) !== String(activeSessionIdRef.current)) return;

    const peerId = Number(payload?.from_user_id);
    const targetId = payload?.to_user_id ? Number(payload.to_user_id) : null;
    const signal = payload?.signal;
    if (targetId && targetId !== Number(user?.id)) return;
    if (!peerId || peerId === user?.id || !signal) return;

    try {
      if (signal.type === 'offer') {
        // Always discard old PC when receiving a new offer  renegotiation
        // creates a brand-new PC on the sender side so we must do the same.
        const old = peerConnectionsRef.current.get(peerId);
        if (old) {
          old.onicecandidate = null;
          old.ontrack = null;
          old.onconnectionstatechange = null;
          old.close();
          peerConnectionsRef.current.delete(peerId);
          pendingIceRef.current.delete(peerId);
        }
        // Clear stale stream so StreamPlayer re-renders with a fresh reference
        // and doesn't keep displaying ended tracks from the closed PC.
        remoteStreamsRef.current.delete(peerId);
        const prevMeta = remoteMetaRef.current.get(peerId);
        if (prevMeta) remoteMetaRef.current.set(peerId, { ...prevMeta, stream: null });

        const pc = createPeerConnection(peerId);
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
        await flushPendingCandidates(peerId, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketRef.current?.emit('session:signal', {
          session_id: activeSessionIdRef.current,
          to_user_id: peerId,
          signal: { type: 'answer', sdp: answer.sdp },
        });
        return;
      }

      const pc = createPeerConnection(peerId);

      if (signal.type === 'answer') {
        // Only apply answer when we are actually waiting for one.
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
          await flushPendingCandidates(peerId, pc);
        }
        return;
      }

      if (signal.type === 'ice-candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (!pc.remoteDescription) {
          queueIceCandidate(peerId, candidate);
        } else {
          await pc.addIceCandidate(candidate);
        }
      }
    } catch {
      // Transient signal errors are usually self-recovering  log only, no UI noise.
    }
  }

  async function renegotiateAllPeers() {
    const peers = Array.from(remoteMetaRef.current.values());
    clearPeerState();

    for (const peer of peers) {
      if (peer.id !== user?.id) {
        await createOfferForPeer(peer.id, peer);
      }
    }
  }

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    const onConnectError = (err) => setError(err?.message || 'Realtime connection failed');
    const onParticipants = (payload) => {
      if (!activeSessionIdRef.current || String(payload?.session_id) !== String(activeSessionIdRef.current)) return;
      const participants = Array.isArray(payload?.participants) ? payload.participants : [];
      participants.forEach((participant) => {
        if (participant?.id && participant.id !== user?.id) upsertRemotePeer(participant.id, participant);
      });
    };
    const onUserJoined = (payload) => {
      if (!activeSessionIdRef.current) return;
      const peer = payload?.user;
      if (!peer?.id || peer.id === user?.id) return;
      upsertRemotePeer(peer.id, peer);
      createOfferForPeer(peer.id, peer);
    };
    const onUserLeft = (payload) => {
      if (!activeSessionIdRef.current) return;
      const peerId = Number(payload?.user_id);
      if (!peerId) return;
      removePeer(peerId);
    };
    const onChatMessage = (payload) => {
      setError('');
      if (!activeSessionIdRef.current || String(payload?.session_id) !== String(activeSessionIdRef.current)) return;
      setSessionMessages((prev) => [...prev, {
        id: `${payload?.from?.id || 'u'}-${payload?.sent_at || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        from: payload?.from, message: payload?.message, sent_at: payload?.sent_at,
      }]);
    };
    const onChatOnline = (payload) => {
      if (!activeSessionIdRef.current || String(payload?.session_id) !== String(activeSessionIdRef.current)) return;
      const users = payload?.users || [];
      setSessionOnline(Array.isArray(users) ? users : []);
    };
    const onChatHistory = (payload) => {
      if (!activeSessionIdRef.current || String(payload?.session_id) !== String(activeSessionIdRef.current)) return;
      const list = payload?.messages || [];
      setSessionMessages(Array.isArray(list) ? list : []);
    };
    const onChatClosed = (payload) => {
      if (!activeSessionIdRef.current || String(payload?.session_id) !== String(activeSessionIdRef.current)) return;
      setSessionMessages([]); setSessionOnline([]); setActiveSession(null);
      setChatClosedNotice('Live chat closed because the session ended.');
    };
    const onSessionEnded = (payload) => {
      if (!activeSessionIdRef.current || String(payload?.session_id) !== String(activeSessionIdRef.current)) return;
      setSessionMessages([]); setSessionOnline([]); setActiveSession(null);
      setChatClosedNotice('Session ended. Temporary live chat was removed.');
    };
    const onChatError = (payload) => setError(payload?.message || 'Live session chat failed');

    socket.on('connect_error', onConnectError);
    socket.on('session:participants', onParticipants);
    socket.on('session:user_joined', onUserJoined);
    socket.on('session:user_left', onUserLeft);
    socket.on('session:signal', handleSessionSignal);
    socket.on('session:chat:message', onChatMessage);
    socket.on('session:chat:online', onChatOnline);
    socket.on('session:chat:history', onChatHistory);
    socket.on('session:chat:closed', onChatClosed);
    socket.on('session:ended', onSessionEnded);
    socket.on('session:chat:error', onChatError);

    return () => {
      clearPeerState();
      socket.off('connect_error', onConnectError);
      socket.off('session:participants', onParticipants);
      socket.off('session:user_joined', onUserJoined);
      socket.off('session:user_left', onUserLeft);
      socket.off('session:signal', handleSessionSignal);
      socket.off('session:chat:message', onChatMessage);
      socket.off('session:chat:online', onChatOnline);
      socket.off('session:chat:history', onChatHistory);
      socket.off('session:chat:closed', onChatClosed);
      socket.off('session:ended', onSessionEnded);
      socket.off('session:chat:error', onChatError);
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (!activeSession || !socketRef.current) return;
    setSessionMessages([]);
    setSessionOnline([]);
    setChatInput('');
    setChatClosedNotice('');
    clearPeerState();

    socketRef.current.emit('session:join', { session_id: activeSession.id });
    socketRef.current.emit('session:chat:join', { session_id: activeSession.id });

    return () => {
      clearPeerState();
      socketRef.current?.emit('session:chat:leave', { session_id: activeSession.id });
      socketRef.current?.emit('session:leave', { session_id: activeSession.id });
    };
  }, [activeSession?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessionMessages]);

  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(async () => {
      try {
        const res = await api.get(`/api/sessions?class_id=${classId}`);
        const data = res.data?.data || res.data || [];
        const current = (Array.isArray(data) ? data : []).find((s) => String(s.id) === String(activeSession.id));
        if (!current || current.status === 'ended') {
          setActiveSession(null);
          setSessionMessages([]);
          setSessionOnline([]);
          setChatClosedNotice('Live chat closed because the session ended.');
          return;
        }
        setActiveSession(current);
      } catch {
        // ignore polling errors
      }
    }, 10000);

    return () => clearInterval(id);
  }, [activeSession, classId]);

  // Attach streams to video elements
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    if (camVideoRef.current && camStream) {
      camVideoRef.current.srcObject = camStream;
    }
  }, [camStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      screenStream?.getTracks().forEach((t) => t.stop());
      camStream?.getTracks().forEach((t) => t.stop());
      clearPeerState();
    };
  }, []);

  useEffect(() => {
    if (!activeSession || !socketRef.current) return;
    if (!remoteMetaRef.current.size) return;
    renegotiateAllPeers();
  }, [screenStream, camStream]);

  const fetchSessions = async () => {
    try {
      const res = await api.get(`/api/sessions?class_id=${classId}`);
      const data = res.data?.data || res.data || [];
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    setStarting(true);
    setError('');
    try {
      const res = await api.post('/api/sessions', {
        class_id: classId,
        title: sessionTitle.trim() || null,
        start_now: true,
      });
      setActiveSession(res.data);
      setShowStart(false);
      setSessionTitle('');
      await fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start session');
    } finally {
      setStarting(false);
    }
  };

  const handleScheduleSession = async () => {
    setScheduling(true);
    setError('');
    try {
      const startAt = new Date(Date.now() + Number(scheduleMinutes || 0) * 60000);
      await api.post('/api/sessions', {
        class_id: classId,
        title: sessionTitle.trim() || null,
        start_now: false,
        scheduled_start: startAt.toISOString(),
      });
      setShowStart(false);
      setSessionTitle('');
      setScheduleMinutes(10);
      await fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule session');
    } finally {
      setScheduling(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await api.patch(`/api/sessions/${activeSession.id}/end`);
    } catch { /* ignore */ }
    stopAllMedia();
    setActiveSession(null);
    await fetchSessions();
  };

  const handleJoinSession = async (session) => {
    try {
      await api.post(`/api/sessions/${session.id}/join`);
      setActiveSession(session);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join session');
    }
  };

  async function startScreenShare() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
      screenStreamRef.current = stream;
      setScreenStream(stream);
      await renegotiateAllPeers();
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setError('Screen sharing failed. Please allow access.');
      }
    }
  }

  function stopScreenShare() {
    screenStream?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenStream(null);
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    renegotiateAllPeers();
  }

  async function toggleCamera() {
    if (camOn) {
      camStream?.getTracks().forEach((t) => t.stop());
      camStreamRef.current = null;
      setCamStream(null);
      if (camVideoRef.current) camVideoRef.current.srcObject = null;
      setCamOn(false);
      await renegotiateAllPeers();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: micOn,
        });
        camStreamRef.current = stream;
        setCamStream(stream);
        setCamOn(true);
        await renegotiateAllPeers();
      } catch {
        setError('Camera access denied.');
      }
    }
  }

  function toggleMic() {
    if (camStream) {
      camStream.getAudioTracks().forEach((t) => { t.enabled = micOn ? false : true; });
    }
    setMicOn((prev) => !prev);
  }

  function stopAllMedia() {
    screenStream?.getTracks().forEach((t) => t.stop());
    camStream?.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setCamStream(null);
    setCamOn(false);
  }

  function formatCountdown(iso) {
    if (!iso) return 'TBD';
    const diff = new Date(iso).getTime() - nowTick;
    if (diff <= 0) return 'Starting now';
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `in ${h}h ${m}m`;
    if (m > 0) return `in ${m}m ${s}s`;
    return `in ${s}s`;
  }

  function sendSessionChat() {
    const text = chatInput.trim();
    if (!text || !activeSession || !socketRef.current) return;
    socketRef.current.emit('session:chat:send', {
      session_id: activeSession.id,
      message: text,
    });
    setChatInput('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2d5a56] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active session studio (teacher only) */}
      {activeSession && (
        <section className="rounded-[28px] border border-[#2d5a56]/30 bg-[#0d1f1e] text-white overflow-hidden shadow-[0_20px_50px_rgba(13,31,30,0.3)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-300">
                <FaCircle className="text-[8px] animate-pulse" /> LIVE
              </span>
              <h3 className="font-bold text-lg">Session #{activeSession.id}</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Screen share */}
              {!screenStream ? (
                <button
                  onClick={startScreenShare}
                  className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3a7a74]"
                >
                  <FaDesktop /> Share Screen
                </button>
              ) : (
                <button
                  onClick={stopScreenShare}
                  className="flex items-center gap-2 rounded-2xl bg-red-600/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                >
                  <FaStopCircle /> Stop Share
                </button>
              )}
              {/* Camera */}
              <button
                onClick={toggleCamera}
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm transition ${camOn ? 'bg-[#2d5a56] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                title={camOn ? 'Turn off camera' : 'Turn on camera'}
              >
                {camOn ? <FaVideo /> : <FaVideoSlash />}
              </button>
              {/* Mic */}
              <button
                onClick={toggleMic}
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm transition ${micOn ? 'bg-[#2d5a56] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                title={micOn ? 'Mute' : 'Unmute'}
              >
                {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
              {/* End session */}
              {isTeacher && (
                <button
                  onClick={handleEndSession}
                  className="flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <FaStopCircle /> End Session
                </button>
              )}
            </div>
          </div>

          {/* Video area */}
          <div className="relative min-h-80 bg-black">
            {screenStream ? (
              <StreamPlayer
                stream={screenStream}
                muted
                className="w-full max-h-120 object-contain"
              />
            ) : remotePeers[0]?.stream ? (
              <StreamPlayer
                stream={remotePeers[0].stream}
                className="w-full max-h-120 object-contain"
              />
            ) : (
              <div className="flex min-h-80 items-center justify-center text-white/30 flex-col gap-3">
                <FaDesktop className="text-6xl" />
                <p className="text-sm">{isTeacher ? 'Share your screen to broadcast to students' : 'Waiting for teacher media stream'}</p>
              </div>
            )}

            {/* Camera pip */}
            {camStream && (
              <div className="absolute bottom-4 right-4 w-36 h-24 overflow-hidden rounded-2xl border-2 border-white/20 shadow-lg bg-black">
                <StreamPlayer stream={camStream} muted className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {remotePeers.length > 0 && (
            <div className="grid gap-3 border-t border-white/10 bg-[#0b1716] p-4 sm:grid-cols-2 xl:grid-cols-3">
              {remotePeers.map((peer) => (
                <div key={peer.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/70">
                    <span className="font-semibold text-white/90">{peer.name}</span>
                    <span className="uppercase tracking-wider">{peer.role}</span>
                  </div>
                  <div className="aspect-video bg-black">
                    {peer.stream ? (
                      <StreamPlayer stream={peer.stream} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-white/40">Connecting media</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/10 bg-[#0f1a19]">
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <FaComments className="text-[#9fd0c4]" />
                <p className="text-sm font-semibold">Live Chat</p>
              </div>
              <p className="text-xs text-white/70">{sessionOnline.length} online</p>
            </div>

            <div className="max-h-48 overflow-y-auto px-4 pb-3">
              {sessionMessages.length === 0 ? (
                <p className="rounded-2xl bg-white/5 px-3 py-2 text-xs text-white/60">
                  Temporary chat for this live class. It closes when the session ends.
                </p>
              ) : (
                <div className="space-y-2">
                  {sessionMessages.map((msg) => {
                    const mine = msg?.from?.id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[88%] rounded-2xl px-3 py-2 ${mine ? 'bg-[#2d5a56] text-white' : 'bg-white/10 text-white/90'}`}>
                          {!mine && <p className="mb-0.5 text-[10px] font-bold text-white/70">{msg?.from?.name || 'User'}</p>}
                          <p className="text-xs leading-relaxed">{msg.message}</p>
                          <p className="mt-0.5 text-[10px] text-white/60">{formatTime(msg.sent_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendSessionChat();
                    }
                  }}
                  placeholder="Message live class..."
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
                />
                <button
                  onClick={sendSessionChat}
                  disabled={!chatInput.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2d5a56] text-white transition hover:bg-[#3a7a74] disabled:opacity-40"
                >
                  <FaPaperPlane className="text-xs" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Live Sessions</h2>
          <p className="text-sm text-slate-500 mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        {isTeacher && !activeSession && (
          <button
            onClick={() => setShowStart(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
          >
            <FaPlus /> Start Live Session
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><FaTimes /></button>
        </div>
      )}

      {chatClosedNotice && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {chatClosedNotice}
        </div>
      )}

      {/* Session list */}
      {sessions.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-[#ced9d5] bg-[#f5f7f5] p-12 text-center">
          <FaClock className="mx-auto mb-4 text-5xl text-[#8ba8a3]" />
          <h3 className="mb-2 text-xl font-bold text-slate-900">No Sessions Yet</h3>
          <p className="text-slate-500 mb-6">
            {isTeacher ? 'Start a live session to teach your students in real time.' : 'Your teacher has not started a session yet.'}
          </p>
          {isTeacher && (
            <button
              onClick={() => setShowStart(true)}
              className="rounded-2xl bg-[#2d5a56] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
            >
              Start First Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isLive = session.status === 'live';
            const isActive = session.status === 'active';
            const isUpcoming = session.status === 'upcoming';
            return (
              <div
                key={session.id}
                className={`rounded-3xl border bg-white p-5 shadow-[0_8px_24px_rgba(17,24,39,0.05)] transition ${
                  isLive || isActive ? 'border-red-200 ring-2 ring-red-100' : isUpcoming ? 'border-amber-200 ring-2 ring-amber-50' : 'border-[#e3e7e3]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {(isLive || isActive) && (
                        <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                          <FaCircle className="text-[7px] animate-pulse" /> LIVE
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        session.status === 'ended'
                          ? 'bg-slate-100 text-slate-500'
                          : isUpcoming
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[#e7f3ef] text-[#234946]'
                      }`}>
                        {session.status || 'scheduled'}
                      </span>
                      {isUpcoming && (
                        <span className="rounded-full bg-[#fff7df] px-2 py-0.5 text-xs font-bold text-amber-700">
                          {formatCountdown(session.start_time)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900">
                      {session.title || `Session #${session.id}`}
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5">
                      <FaClock className="text-[#2d5a56]" />
                      {session.start_time ? formatTime(session.start_time) : session.created_at ? formatTime(session.created_at) : 'Scheduled'}
                    </p>
                    {session.participant_count !== undefined && (
                      <p className="text-sm text-slate-500 flex items-center gap-1.5">
                        <FaUsers className="text-[#2d5a56]" />
                        {session.participant_count} participants
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isUpcoming && !isTeacher && (
                      <button
                        onClick={() => setPreJoinSession(session)}
                        className="rounded-2xl border border-[#dbe3de] bg-[#f6f8f6] px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white"
                      >
                        Remind Me
                      </button>
                    )}
                    {(isLive || isActive) && !isTeacher && (
                      <button
                        onClick={() => setPreJoinSession(session)}
                        className="rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
                      >
                        Join Now
                      </button>
                    )}
                    {(isLive || isActive) && isTeacher && !activeSession && (
                      <button
                        onClick={() => setActiveSession(session)}
                        className="rounded-2xl bg-[#2d5a56] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#234946]"
                      >
                        Manage
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pre-join modal (student) */}
      {preJoinSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[30px] border border-[#dce4de] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
            <div className="flex items-center justify-between border-b border-[#edf0ed] px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{preJoinSession.title || `Session #${preJoinSession.id}`}</h3>
                <p className="mt-0.5 text-sm text-slate-500">Live session in progress</p>
              </div>
              <button
                onClick={() => setPreJoinSession(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 transition hover:bg-[#e8eae8]"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-[#f5f7f5] p-4 text-sm text-slate-600 space-y-2">
                <p className="flex items-center gap-2">
                  <FaClock className="text-[#2d5a56]" />
                  Started {formatTime(preJoinSession.created_at)}
                </p>
                {preJoinSession.participant_count !== undefined && (
                  <p className="flex items-center gap-2">
                    <FaUsers className="text-[#2d5a56]" />
                    {preJoinSession.participant_count} participants
                  </p>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={async () => { await handleJoinSession(preJoinSession); setPreJoinSession(null); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946]"
                >
                  <FaVideo /> Join Now
                </button>
                <button
                  onClick={() => setPreJoinSession(null)}
                  className="flex items-center justify-center rounded-2xl border border-[#dde4de] px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-[#f5f7f5]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start session confirm */}
      {showStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[30px] border border-[#dce4de] bg-white shadow-[0_24px_60px_rgba(17,24,39,0.16)]">
            <div className="flex items-center justify-between border-b border-[#edf0ed] px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Start Live Session</h3>
                <p className="mt-0.5 text-sm text-slate-500">Start now or schedule a countdown for your students</p>
              </div>
              <button
                onClick={() => setShowStart(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f3f4f3] text-slate-500 transition hover:bg-[#e8eae8]"
              >
                <FaTimes />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="Session title (optional)"
                className="w-full rounded-2xl border border-[#d7ded9] bg-[#f6f8f6] px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#7ea89c] focus:bg-white"
              />
              <div className="rounded-2xl bg-[#f5f7f5] p-4 text-sm text-slate-600 space-y-2">
                <p className="flex items-center gap-2"><FaDesktop className="text-[#2d5a56]" /> Screen sharing available after start</p>
                <p className="flex items-center gap-2"><FaVideo className="text-[#2d5a56]" /> Camera optional</p>
                <p className="flex items-center gap-2"><FaMicrophone className="text-[#2d5a56]" /> Microphone available</p>
              </div>
              <div className="rounded-2xl border border-[#e3e7e3] bg-white p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Countdown Schedule</p>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 30].map((m) => (
                    <button
                      key={m}
                      onClick={() => setScheduleMinutes(m)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        scheduleMinutes === m ? 'bg-[#2d5a56] text-white' : 'bg-[#f3f6f4] text-slate-600 hover:bg-[#e8efeb]'
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">Students will receive a real-time alert and a notification.</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={handleStartSession}
                  disabled={starting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#2d5a56] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#234946] disabled:opacity-60"
                >
                  {starting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : <FaVideo />}
                  {starting ? 'Starting...' : 'Start Now'}
                </button>
                <button
                  onClick={handleScheduleSession}
                  disabled={scheduling}
                  className="flex-1 rounded-2xl border border-[#d7ded9] bg-[#f5f7f5] px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60"
                >
                  {scheduling ? 'Scheduling...' : `Start in ${scheduleMinutes}m`}
                </button>
                <button
                  onClick={() => setShowStart(false)}
                  className="flex-1 rounded-2xl border border-[#d7ded9] bg-[#f5f7f5] px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
