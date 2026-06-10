import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createAppSocket } from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash,
  FaDesktop, FaPhoneSlash, FaUsers, FaComments, FaExpand,
  FaCompress, FaCog, FaSignOutAlt
} from 'react-icons/fa';

export default function LiveSessionRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [iceServers, setIceServers] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [error, setError] = useState('');

  const localVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const containerRef = useRef(null);

  // Join session and get ICE servers
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

  // Initialize Socket.io
  useEffect(() => {
    if (!token || !roomId) return;
    const io = createAppSocket(token);
    setSocket(io);

    io.on('connect', () => {
      console.log('✅ Socket connected');
      io.emit('join-live-session', { session_id: sessionId, room_id: roomId });
    });

    io.on('disconnect', () => console.log('❌ Socket disconnected'));

    return () => io.disconnect();
  }, [token, roomId, sessionId]);

  // Get local media stream
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1
          }
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true; // Prevent echo feedback
        }
      } catch (err) {
        console.error('❌ Media access error:', err);
        setError('Camera/microphone access denied. Please allow permissions.');
      }
    };
    getMedia();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // WebRTC signaling handlers
  useEffect(() => {
    if (!socket || !localStream) return;

    // New participant joined
    socket.on('session:participant-joined', async ({ user_id, socket_id }) => {
      console.log('👤 Participant joined:', user_id);
      setParticipants(prev => [...prev, { user_id, socket_id }]);

      // Create peer connection for new participant
      const pc = createPeerConnection(socket_id);
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { to: socket_id, offer });
    });

    // Received offer from peer
    socket.on('webrtc:offer', async ({ from, offer }) => {
      console.log('📥 Received offer from:', from);
      const pc = createPeerConnection(from);
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { to: from, answer });
    });

    // Received answer from peer
    socket.on('webrtc:answer', async ({ from, answer }) => {
      console.log('📥 Received answer from:', from);
      const pc = peerConnectionsRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    // Received ICE candidate
    socket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    // Participant left
    socket.on('session:participant-left', ({ socket_id }) => {
      console.log('👋 Participant left:', socket_id);
      setParticipants(prev => prev.filter(p => p.socket_id !== socket_id));

      const pc = peerConnectionsRef.current[socket_id];
      if (pc) {
        pc.close();
        delete peerConnectionsRef.current[socket_id];
      }

      setRemoteStreams(prev => {
        const updated = { ...prev };
        delete updated[socket_id];
        return updated;
      });
    });

    // Session ended
    socket.on('session:ended', () => {
      alert('Live session has ended');
      navigate(-1);
    });

    return () => {
      socket.off('session:participant-joined');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('session:participant-left');
      socket.off('session:ended');
    };
  }, [socket, localStream, sessionId, navigate]);

  // Create RTCPeerConnection
  const createPeerConnection = useCallback((peerId) => {
    if (peerConnectionsRef.current[peerId]) {
      return peerConnectionsRef.current[peerId];
    }

    const pc = new RTCPeerConnection({ iceServers });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          to: peerId,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('📹 Received remote track from:', peerId, event.track.kind);
      const stream = event.streams[0];

      setRemoteStreams(prev => {
        const existing = prev[peerId];
        // Merge tracks if stream already exists
        if (existing) {
          event.track.addEventListener('ended', () => {
            console.log('Track ended:', event.track.kind);
          });
          return prev;
        }
        return {
          ...prev,
          [peerId]: stream
        };
      });
    };

    // Connection state monitoring with auto-reconnect
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state [${peerId}]:`, pc.iceConnectionState);

      if (pc.iceConnectionState === 'failed') {
        console.warn('⚠️ Connection failed with peer:', peerId);
        // Attempt ICE restart
        pc.restartIce();
      }

      if (pc.iceConnectionState === 'disconnected') {
        console.warn('⚠️ Connection disconnected with peer:', peerId);
        // Wait a bit before attempting restart
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') {
            console.log('Attempting ICE restart for:', peerId);
            pc.restartIce();
          }
        }, 3000);
      }

      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('✅ Connection established with peer:', peerId);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state [${peerId}]:`, pc.connectionState);
    };

    peerConnectionsRef.current[peerId] = pc;
    return pc;
  }, [iceServers, socket]);

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(prev => !prev);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(prev => !prev);
    }
  };

  // Screen sharing
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in all peer connections
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.error('❌ Screen share error:', err);
      setError('Screen sharing failed');
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];

      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    }
    setIsScreenSharing(false);
  };

  // Leave session
  const leaveSession = async () => {
    try {
      // Close all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};

      // Stop local media
      localStream?.getTracks().forEach(track => track.stop());

      // Leave session
      await api.post(`/api/sessions/${sessionId}/leave`);

      socket?.disconnect();
      navigate(-1);
    } catch (err) {
      console.error('❌ Leave error:', err);
      navigate(-1);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(prev => !prev);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="mb-4 text-xl">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl bg-red-600 px-6 py-3 font-semibold hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex h-screen flex-col bg-gray-900">
      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className={`grid h-full gap-4 ${
          Object.keys(remoteStreams).length === 0 ? 'grid-cols-1' :
          Object.keys(remoteStreams).length === 1 ? 'grid-cols-2' :
          Object.keys(remoteStreams).length <= 4 ? 'grid-cols-2 grid-rows-2' :
          'grid-cols-3 grid-rows-3'
        }`}>
          {/* Local video */}
          <div className="relative overflow-hidden rounded-2xl bg-gray-800">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1 text-sm font-semibold text-white">
              You {isScreenSharing && '(Sharing)'}
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2d5a56] text-2xl font-bold text-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Remote videos */}
          {Object.entries(remoteStreams).map(([peerId, stream]) => (
            <RemoteVideo key={peerId} stream={stream} peerId={peerId} />
          ))}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between border-t border-gray-700 bg-gray-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <FaUsers className="text-gray-400" />
          <span className="text-sm font-semibold text-white">
            {participants.length + 1} participant{participants.length !== 0 ? 's' : ''}
          </span>
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAudio}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            } text-white`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </button>

          <button
            onClick={toggleVideo}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            } text-white`}
            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
          >
            {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
              isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
            } text-white`}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            <FaDesktop />
          </button>

          <button
            onClick={leaveSession}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
            title="Leave Session"
          >
            <FaPhoneSlash />
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChat(prev => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600"
            title="Chat"
          >
            <FaComments />
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white hover:bg-gray-600"
            title="Fullscreen"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Remote video component
function RemoteVideo({ stream, peerId }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-800">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />
      <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1 text-sm font-semibold text-white">
        Participant
      </div>
    </div>
  );
}
