import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSocket } from '../services/socket';

/**
 * Hook to manage toast notifications and browser notifications
 * Returns: { toasts, addToast, removeToast, requestPermission }
 */
export default function useNotifications() {
  const [toasts, setToasts] = useState([]);
  const { token, user } = useAuth();
  const [permission, setPermission] = useState(Notification.permission);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Add toast notification
  const addToast = useCallback((toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { ...toast, id }]);

    // Play notification sound
    playNotificationSound();

    // Show browser notification
    if (permission === 'granted' && toast.title) {
      showBrowserNotification(toast);
    }

    return id;
  }, [permission]);

  // Remove toast
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Silently fail if audio can't play
      });
    } catch (err) {
      console.warn('Failed to play notification sound:', err);
    }
  };

  // Show browser notification
  const showBrowserNotification = (toast) => {
    try {
      const notification = new Notification(toast.title, {
        body: toast.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: toast.id,
        requireInteraction: toast.requireInteraction || false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        toast.action?.onClick?.();
      };
    } catch (err) {
      console.warn('Failed to show browser notification:', err);
    }
  };

  // Listen to socket events for auto-notifications
  useEffect(() => {
    if (!token || !user) return;

    const socket = getSocket(token);
    if (!socket) return;

    const handleMessage = (data) => {
      if (data.sender_id !== user.id) {
        addToast({
          type: 'message',
          title: 'New Message',
          message: `${data.sender_name}: ${data.text?.slice(0, 50) || 'Sent a file'}`,
          duration: 5000,
        });
      }
    };

    const handleAnnouncement = (data) => {
      addToast({
        type: 'notification',
        title: 'New Announcement',
        message: data.title || data.content?.slice(0, 80),
        duration: 8000,
      });
    };

    const handleAssignment = (data) => {
      addToast({
        type: 'assignment',
        title: 'New Assignment',
        message: data.title,
        duration: 8000,
      });
    };

    const handleVideo = (data) => {
      addToast({
        type: 'video',
        title: 'New Video',
        message: data.title,
        duration: 6000,
      });
    };

    const handleSessionStart = (data) => {
      addToast({
        type: 'warning',
        title: 'Live Session Starting',
        message: `${data.title} starts in ${data.minutes} minutes`,
        duration: 10000,
        requireInteraction: true,
        action: {
          label: 'Join Now',
          onClick: () => {
            window.location.href = `/session/${data.session_id}`;
          }
        }
      });
    };

    const handleUserOnline = (data) => {
      if (data.user_id !== user.id) {
        addToast({
          type: 'info',
          title: 'Member Online',
          message: `${data.user_name} joined the class`,
          duration: 4000,
        });
      }
    };

    socket.on('message', handleMessage);
    socket.on('announcement:new', handleAnnouncement);
    socket.on('assignment:created', handleAssignment);
    socket.on('video:uploaded', handleVideo);
    socket.on('session:starting-soon', handleSessionStart);
    socket.on('class:user-online', handleUserOnline);

    return () => {
      // Clean up listeners only, don't disconnect socket
      socket.off('message', handleMessage);
      socket.off('announcement:new', handleAnnouncement);
      socket.off('assignment:created', handleAssignment);
      socket.off('video:uploaded', handleVideo);
      socket.off('session:starting-soon', handleSessionStart);
      socket.off('class:user-online', handleUserOnline);
    };
  }, [token, user, addToast]);

  // Auto-request permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't auto-request, just check
      setPermission(Notification.permission);
    }
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    requestPermission,
    permission,
  };
}
