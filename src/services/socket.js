import { io } from 'socket.io-client';

const SOCKET_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000'
).trim().replace(/\/$/, '');

export function createAppSocket(token) {
  console.log('🔌 Connecting to Socket.io:', SOCKET_BASE_URL);

  const socket = io(SOCKET_BASE_URL, {
    auth: { token },
    // Start with polling for reliability on restrictive/mobile networks, then upgrade to websocket.
    transports: ['polling', 'websocket'],
    upgrade: true,
    tryAllTransports: true,
    timeout: 20000,
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.5,
  });

  // Enhanced connection logging
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.warn('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🚨 Socket connection error:', {
      message: error.message,
      description: error.description,
      context: error.context,
    });
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log(`🔄 Socket reconnected after ${attemptNumber} attempts`);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Socket reconnection attempt #${attemptNumber}`);
  });

  socket.on('reconnect_error', (error) => {
    console.error('⚠️ Socket reconnection error:', error.message);
  });

  socket.on('reconnect_failed', () => {
    console.error('💥 Socket reconnection failed - max attempts reached');
  });

  return socket;
}
