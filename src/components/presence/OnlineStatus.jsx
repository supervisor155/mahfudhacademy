import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createAppSocket } from '../../services/socket';

/**
 * Online Status Indicator - Shows green dot for online users
 * Usage: <OnlineStatus userId={123} />
 */
export default function OnlineStatus({ userId, showLabel = false, size = 'sm' }) {
  const [isOnline, setIsOnline] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (!token || !userId) return;

    const socket = createAppSocket(token);

    // Listen for this user coming online
    socket.on('user:online', (data) => {
      if (data.user_id === userId) {
        setIsOnline(true);
      }
    });

    // Listen for this user going offline
    socket.on('user:offline', (data) => {
      if (data.user_id === userId) {
        setIsOnline(false);
      }
    });

    // Get initial online users list
    socket.on('presence:online-users', (data) => {
      const online = data.users?.some(u => u.user_id === userId);
      setIsOnline(online);
    });

    return () => socket.disconnect();
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
