import { io } from 'socket.io-client';

const SOCKET_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000'
).trim().replace(/\/$/, '');

export function createAppSocket(token) {
  return io(SOCKET_BASE_URL, {
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
}
