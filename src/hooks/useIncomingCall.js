import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createAppSocket } from '../services/socket';
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

    const socket = createAppSocket(token);

    // Listen for incoming calls
    socket.on('call:incoming', (callData) => {
      console.log('📞 Incoming call:', callData);
      setIncomingCall(callData);
    });

    // Call was accepted by us (in another tab/device)
    socket.on('call:accepted', (data) => {
      if (data.acceptedBy === user.id) {
        setIncomingCall(null);
      }
    });

    // Call was rejected or ended
    socket.on('call:rejected', () => {
      setIncomingCall(null);
    });

    socket.on('call:ended', () => {
      setIncomingCall(null);
    });

    socket.on('call:missed', () => {
      setIncomingCall(null);
    });

    return () => socket.disconnect();
  }, [token, user]);

  const acceptCall = (callData) => {
    const socket = createAppSocket(token);

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
    const socket = createAppSocket(token);

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

    const socket = createAppSocket(token);

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
