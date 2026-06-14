import { io } from 'socket.io-client';

const SOCKET_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:4000'
).trim().replace(/\/$/, '');

let socketInstance = null;
let currentToken = null;

/**
 * Singleton socket manager - reuses the same socket connection
 */
export function getSocket(token) {
  // If token changed, disconnect old socket
  if (socketInstance && currentToken !== token) {
    console.log(' Token changed, reconnecting socket');
    socketInstance.disconnect();
    socketInstance = null;
  }

  // If socket already exists and connected, return it
  if (socketInstance && socketInstance.connected) {
    return socketInstance;
  }

  // Create new socket
  if (!socketInstance && token) {
    console.log(' Creating new socket connection:', SOCKET_BASE_URL);
    currentToken = token;

    socketInstance = io(SOCKET_BASE_URL, {
      auth: { token },
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

    socketInstance.on('connect', () => {
      console.log(' Socket connected:', socketInstance.id);
    });

    socketInstance.on('disconnect', (reason) => {
      console.warn(' Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (error) => {
      console.error(' Socket connection error:', error.message);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(` Socket reconnected after ${attemptNumber} attempts`);
    });
  }

  return socketInstance;
}

/**
 * Disconnect and cleanup socket
 */
export function disconnectSocket() {
  if (socketInstance) {
    console.log(' Disconnecting socket');
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
}

/**
 * Legacy function for backward compatibility
 */
export function createAppSocket(token) {
  return getSocket(token);
}
