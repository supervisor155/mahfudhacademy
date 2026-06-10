import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';
import { useNavigate } from 'react-router-dom';

/**
 * Hook to manage incoming call notifications
 * Returns: { incomingCall, acceptCall, rejectCall }
 */
export default function useIncomingCall() {
  const [incomingCall, setIncomingCall] = useState(null);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !user) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleIncoming = (callData) => {
      console.log('📞 Incoming call:', callData);
      setIncomingCall(callData);
    };

    const handleAccepted = (data) => {
      if (data.acceptedBy === user.id) {
        setIncomingCall(null);
      }
    };

    const handleEnded = () => {
      setIncomingCall(null);
    };

    // Listen for incoming calls
    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleEnded);
    socket.on('call:ended', handleEnded);
    socket.on('call:missed', handleEnded);

    return () => {
      // Clean up listeners only, don't disconnect socket
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleEnded);
      socket.off('call:ended', handleEnded);
      socket.off('call:missed', handleEnded);
    };
  }, [token, user]);

  const acceptCall = (callData) => {
    const socket = getSocket(token);
    if (!socket) return;

    // Emit accept event
    socket.emit('call:accept', {
      callId: callData.callId,
      callerId: callData.callerId,
    });

    // Navigate to session
    if (callData.sessionId) {
      navigate(`/session/${callData.sessionId}`);
    }

    setIncomingCall(null);
  };

  const rejectCall = (callData) => {
    const socket = getSocket(token);
    if (!socket) return;

    // Emit reject event
    socket.emit('call:reject', {
      callId: callData.callId,
      callerId: callData.callerId,
      reason: 'declined',
    });

    setIncomingCall(null);
  };

  const timeoutCall = () => {
    if (!incomingCall) return;

    const socket = getSocket(token);
    if (!socket) return;

    // Emit missed event
    socket.emit('call:missed', {
      callId: incomingCall.callId,
      targetUserId: incomingCall.callerId,
    });

    setIncomingCall(null);
  };

  return {
    incomingCall,
    acceptCall,
    rejectCall,
    timeoutCall,
  };
}
