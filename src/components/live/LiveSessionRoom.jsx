import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getSocket } from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import VideoThumbnail from './VideoThumbnail';
import {
  FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash,
  FaDesktop, FaPhoneSlash, FaUsers, FaExpand, FaCompress,
  FaStopCircle
} from 'react-icons/fa';

// Remote video with auto-attach
function RemoteVideo({ stream, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gray-800">
      <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
      <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1 text-sm font-semibold text-white">
        {label || 'Participant'}
      </div>
    </div>
  );
}

export default function LiveSessionRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();

  const callType = searchParams.get('type') || 'video';
  const isAudioOnly = callType === 'audio';

  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [iceServers, setIceServers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(!isAudioOnly);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionState, setConnectionState] = useState('connecting');
  const [error, setError] = useState('');

  // Screen share state
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [screenSharingPeerId, setScreenSharingPeerId] = useState(null);
  const [screenSharingName, setScreenSharingName] = useState('');
  const screenShareVideoRef = useRef(null);

  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const containerRef = useRef(null);

  // Join session
  useEffect(() => {
    const joinSession = async () => {
      try {
        const res = await api.post(`/api/sessions/${sessionId}/join`);
        setRoomId(res.data.room_id);
        setIceServers(res.data.ice_servers || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to join session');
      }
    };
    joinSession();
  }, [sessionId]);

  // Socket setup
  useEffect(() => {
    if (!token || !roomId) return;
    const sock = getSocket(token);
    setSocket(sock);
    sock.emit('join-live-session', { session_id: sessionId, room_id: roomId });
    return () => {
      sock.emit('leave-live-session', { session_id: sessionId });
    };
  }, [token, roomId, sessionId]);

  // Get local media
  useEffect(() => {
    const getMedia = async () => {
      try {
        setConnectionState('requesting-media');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: isAudioOnly ? false : { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        setLocalStream(stream);
        setConnectionState('media-ready');
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
        }
      } catch (err) {
        setError(`${isAudioOnly ? 'Microphone' : 'Camera/microphone'} access denied.`);
        setConnectionState('error');
      }
    };
    getMedia();
    return () => localStream?.getTracks().forEach(t => t.stop());
  }, [isAudioOnly]);

  // WebRTC signaling
  useEffect(() => {
    if (!socket || !localStream) return;

    const handleParticipantJoined = async ({ user_id, user_name, socket_id }) => {
      setParticipants(prev => [...prev, { user_id, user_name, socket_id }]);
      const pc = createPeerConnection(socket_id, user_name);
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { to: socket_id, offer });
    };

    const handleOffer = async ({ from, from_name, offer }) => {
      const pc = createPeerConnection(from, from_name);
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { to: from, answer });
    };

    const handleAnswer = async ({ from, answer }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc && candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    };

    const handleParticipantLeft = ({ socket_id }) => {
      setParticipants(prev => prev.filter(p => p.socket_id !== socket_id));
      const pc = peerConnectionsRef.current[socket_id];
      if (pc) { pc.close(); delete peerConnectionsRef.current[socket_id]; }
      setRemoteStreams(prev => { const u = { ...prev }; delete u[socket_id]; return u; });
      // If the screen sharer left, stop screen share view
      if (screenSharingPeerId === socket_id) {
        setScreenShareActive(false);
        setScreenSharingPeerId(null);
        setScreenSharingName('');
      }
    };

    const handleScreenShareStarted = ({ socket_id, user_name }) => {
      console.log('📺 Screen share started by:', user_name);
      setScreenShareActive(true);
      setScreenSharingPeerId(socket_id);
      setScreenSharingName(user_name);
    };

    const handleScreenShareStopped = () => {
      console.log('📺 Screen share stopped');
      setScreenShareActive(false);
      setScreenSharingPeerId(null);
      setScreenSharingName('');
    };

    socket.on('session:participant-joined', handleParticipantJoined);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('session:participant-left', handleParticipantLeft);
    socket.on('screen-share-started', handleScreenShareStarted);
    socket.on('screen-share-stopped', handleScreenShareStopped);
    socket.on('session:ended', () => { alert('Session ended'); navigate(-1); });

    return () => {
      socket.off('session:participant-joined', handleParticipantJoined);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('session:participant-left', handleParticipantLeft);
      socket.off('screen-share-started', handleScreenShareStarted);
      socket.off('screen-share-stopped', handleScreenShareStopped);
    };
  }, [socket, localStream, navigate, screenSharingPeerId]);

  const createPeerConnection = useCallback((peerId, peerName) => {
    if (peerConnectionsRef.current[peerId]) return peerConnectionsRef.current[peerId];

    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (e) => {
      if (e.candidate && socket) socket.emit('webrtc:ice-candidate', { to: peerId, candidate: e.candidate });
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      setRemoteStreams(prev => ({ ...prev, [peerId]: stream }));
      // Attach to screen share video if this is the presenter
      if (screenShareActive && screenSharingPeerId === peerId && screenShareVideoRef.current) {
        screenShareVideoRef.current.srcObject = stream;
      }
    };

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') setConnectionState('connected');
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionState('connected');
      } else if (pc.iceConnectionState === 'failed') {
        setConnectionState('reconnecting');
        setTimeout(() => { if (pc.iceConnectionState === 'failed') pc.restartIce(); }, 1000);
      } else if (pc.iceConnectionState === 'disconnected') {
        setConnectionState('reconnecting');
        setTimeout(() => { if (pc.iceConnectionState === 'disconnected') pc.restartIce(); }, 3000);
      }
    };

    peerConnectionsRef.current[peerId] = pc;
    return pc;
  }, [iceServers, socket, screenShareActive, screenSharingPeerId]);

  // Attach screen share video when presenter stream changes
  useEffect(() => {
    if (screenShareActive && screenSharingPeerId && screenShareVideoRef.current) {
      const stream = remoteStreams[screenSharingPeerId];
      if (stream) screenShareVideoRef.current.srcObject = stream;
    }
  }, [screenShareActive, screenSharingPeerId, remoteStreams]);

  const toggleAudio = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsAudioEnabled(p => !p);
  };

  const toggleVideo = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsVideoEnabled(p => !p);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' } });
      const screenTrack = screenStream.getVideoTracks()[0];

      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(screenTrack);
      });

      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

      // Notify others
      socket?.emit('screen-share-start', { session_id: sessionId });

      screenTrack.onended = stopScreenShare;
      setIsScreenSharing(true);
      // Show local screen share layout too
      setScreenShareActive(true);
      setScreenSharingPeerId('local');
      setScreenSharingName('You (Presenting)');
    } catch (err) {
      console.error('Screen share error:', err);
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      });
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    }
    socket?.emit('screen-share-stop', { session_id: sessionId });
    setIsScreenSharing(false);
    setScreenShareActive(false);
    setScreenSharingPeerId(null);
    setScreenSharingName('');
  };

  const leaveSession = async () => {
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    localStream?.getTracks().forEach(t => t.stop());
    try { await api.post(`/api/sessions/${sessionId}/leave`); } catch (_) {}
    navigate(-1);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(p => !p);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="mb-6 text-xl">{error}</p>
          <button onClick={() => navigate(-1)} className="rounded-2xl bg-red-600 px-8 py-4 font-bold hover:bg-red-700">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const remoteEntries = Object.entries(remoteStreams);
  const totalParticipants = participants.length + 1;

  return (
    <div ref={containerRef} className="flex h-screen flex-col bg-gray-900 text-white">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80">
        <span className="text-sm font-semibold text-gray-300">
          {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
        </span>
        {connectionState !== 'connected' && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            connectionState === 'requesting-media' ? 'bg-blue-600' :
            connectionState === 'connecting' ? 'bg-yellow-600' :
            connectionState === 'reconnecting' ? 'bg-orange-600' :
            'bg-gray-700'
          }`}>
            {connectionState === 'requesting-media' && '🎥 Starting camera...'}
            {connectionState === 'media-ready' && '✓ Ready'}
            {connectionState === 'connecting' && '⏳ Connecting...'}
            {connectionState === 'reconnecting' && '🔄 Reconnecting...'}
          </span>
        )}
        {isAudioOnly && (
          <span className="rounded-full bg-[#2d5a56] px-3 py-1 text-xs font-semibold">
            🎧 Audio-Only
          </span>
        )}
        <button onClick={toggleFullscreen} className="rounded-lg p-2 hover:bg-gray-700">
          {isFullscreen ? <FaCompress /> : <FaExpand />}
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">

        {/* SCREEN SHARE LAYOUT (Google Meet style) */}
        {screenShareActive ? (
          <div className="flex h-full flex-col">

            {/* Main shared screen - fills everything */}
            <div className="flex-1 overflow-hidden p-2">
              <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
                {screenSharingPeerId === 'local' ? (
                  <video
                    ref={screenShareVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <video
                    ref={screenShareVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-contain"
                  />
                )}
                {/* Presenter label */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-black/70 px-4 py-2 text-sm font-semibold">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  📺 {screenSharingName} is presenting
                </div>
                {/* Stop sharing button for local presenter */}
                {isScreenSharing && (
                  <button
                    onClick={stopScreenShare}
                    className="absolute top-4 right-4 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700"
                  >
                    <FaStopCircle /> Stop sharing
                  </button>
                )}
              </div>
            </div>

            {/* Participant thumbnails - horizontal strip at bottom */}
            <div className="flex gap-2 overflow-x-auto border-t border-gray-700 bg-gray-800 p-3 scrollbar-hide">
              {/* Local video */}
              <VideoThumbnail
                stream={localStream}
                label="You"
                isMuted={!isAudioEnabled}
                isVideoOff={!isVideoEnabled || isAudioOnly}
              />
              {/* Remote participants */}
              {remoteEntries.map(([peerId, stream]) => {
                const p = participants.find(x => x.socket_id === peerId);
                return (
                  <VideoThumbnail
                    key={peerId}
                    stream={stream}
                    label={p?.user_name || 'Participant'}
                  />
                );
              })}
            </div>
          </div>

        ) : (
          /* NORMAL GRID LAYOUT */
          <div className="h-full p-2">
            {isAudioOnly ? (
              /* Audio call - show avatars */
              <div className="flex h-full flex-wrap items-center justify-center gap-6 p-4">
                {/* Local */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br from-[#2d5a56] to-[#1e3e3b] text-4xl font-bold shadow-xl">
                    {user?.name?.[0]?.toUpperCase()}
                    {isAudioEnabled && (
                      <div className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#2d5a56]">
                        <FaMicrophone className="text-xs text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-300">You</span>
                </div>
                {/* Remote */}
                {participants.map(p => (
                  <div key={p.socket_id} className="flex flex-col items-center gap-3">
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-blue-800 text-4xl font-bold shadow-xl">
                      {p.user_name?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <span className="text-sm font-semibold text-gray-300">{p.user_name || 'Participant'}</span>
                  </div>
                ))}
              </div>
            ) : (
              /* Video grid */
              <div className={`grid h-full gap-2 ${
                remoteEntries.length === 0 ? 'grid-cols-1' :
                remoteEntries.length === 1 ? 'grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1' :
                remoteEntries.length <= 3 ? 'grid-cols-2 grid-rows-2' :
                remoteEntries.length <= 8 ? 'grid-cols-3 grid-rows-3' :
                'grid-cols-4 grid-rows-3'
              }`}>
                {/* Local */}
                <div className="relative overflow-hidden rounded-2xl bg-gray-800">
                  <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1 text-sm font-semibold">
                    You {isScreenSharing && '(Sharing)'}
                  </div>
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2d5a56] text-3xl font-bold">
                        {user?.name?.[0]?.toUpperCase()}
                      </div>
                    </div>
                  )}
                  {!isAudioEnabled && (
                    <div className="absolute top-3 right-3 rounded-full bg-red-600 p-2">
                      <FaMicrophoneSlash className="text-xs" />
                    </div>
                  )}
                </div>
                {/* Remote */}
                {remoteEntries.map(([peerId, stream]) => {
                  const p = participants.find(x => x.socket_id === peerId);
                  return <RemoteVideo key={peerId} stream={stream} label={p?.user_name || 'Participant'} />;
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-3 border-t border-gray-700 bg-gray-800 px-4 py-4 sm:gap-4">

        {/* Mute */}
        <button
          onClick={toggleAudio}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-lg transition active:scale-95 ${
            isAudioEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-700'
          }`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>

        {/* Video toggle */}
        {!isAudioOnly && (
          <button
            onClick={toggleVideo}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-lg transition active:scale-95 ${
              isVideoEnabled ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
          >
            {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
          </button>
        )}

        {/* Screen Share */}
        {!isAudioOnly && (
          <button
            onClick={toggleScreenShare}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-lg transition active:scale-95 ${
              isScreenSharing ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400' : 'bg-gray-600 hover:bg-gray-500'
            }`}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            <FaDesktop />
          </button>
        )}

        {/* Participants count */}
        <div className="flex h-14 items-center gap-2 rounded-full bg-gray-700 px-4 text-sm font-semibold text-gray-300">
          <FaUsers />
          <span>{totalParticipants}</span>
        </div>

        {/* Leave */}
        <button
          onClick={leaveSession}
          className="flex h-14 w-20 items-center justify-center rounded-full bg-red-600 text-lg font-bold transition hover:bg-red-700 active:scale-95"
          title="Leave"
        >
          <FaPhoneSlash />
        </button>
      </div>
    </div>
  );
}
