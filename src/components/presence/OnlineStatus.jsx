import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../services/socket';

/**
 * Online Status Indicator - Shows green dot for online users
 * Usage: <OnlineStatus userId={123} />
 * Optimized: Uses singleton socket, instant updates
 */
export default function OnlineStatus({ userId, showLabel = false, size = 'sm' }) {
  const [isOnline, setIsOnline] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token || !userId) return;

    const socket = getSocket(token);
    if (!socket) return;

    // Instant update handlers
    const handleOnline = (data) => {
      if (data.user_id === userId) {
        setIsOnline(true);
      }
    };

    const handleOffline = (data) => {
      if (data.user_id === userId) {
        setIsOnline(false);
      }
    };

    const handleOnlineList = (data) => {
      const online = data.users?.some(u => u.user_id === userId);
      setIsOnline(online);
    };

    // Register listeners
    socket.on('user:online', handleOnline);
    socket.on('user:offline', handleOffline);
    socket.on('presence:online-users', handleOnlineList);

    return () => {
      // Clean up listeners only
      socket.off('user:online', handleOnline);
      socket.off('user:offline', handleOffline);
      socket.off('presence:online-users', handleOnlineList);
    };
  }, [userId, token]);

  const sizeClasses = {
    xs: 'h-2 w-2',
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (!isOnline && !showLabel) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        <div
          className={`${sizeClasses[size]} rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        {isOnline && (
          <div
            className={`${sizeClasses[size]} absolute animate-ping rounded-full bg-green-400 opacity-75`}
          />
        )}
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}
