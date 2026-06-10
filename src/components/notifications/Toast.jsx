import { useEffect } from 'react';
import {
  FaCheckCircle, FaExclamationTriangle, FaInfoCircle,
  FaTimes, FaBell, FaComment, FaVideo, FaFileAlt
} from 'react-icons/fa';

/**
 * Toast Notification Component
 * Types: success, error, warning, info, message, video, assignment
 */
export default function Toast({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  onDismiss,
  action
}) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const styles = {
    success: {
      bg: 'bg-gradient-to-r from-green-500 to-green-600',
      icon: <FaCheckCircle className="text-white" />,
      border: 'border-green-400'
    },
    error: {
      bg: 'bg-gradient-to-r from-red-500 to-red-600',
      icon: <FaExclamationTriangle className="text-white" />,
      border: 'border-red-400'
    },
    warning: {
      bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
      icon: <FaExclamationTriangle className="text-white" />,
      border: 'border-amber-400'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
      icon: <FaInfoCircle className="text-white" />,
      border: 'border-blue-400'
    },
    message: {
      bg: 'bg-gradient-to-r from-[#2d5a56] to-[#1e3e3b]',
      icon: <FaComment className="text-white" />,
      border: 'border-[#2d5a56]'
    },
    video: {
      bg: 'bg-gradient-to-r from-purple-500 to-purple-600',
      icon: <FaVideo className="text-white" />,
      border: 'border-purple-400'
    },
    assignment: {
      bg: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
      icon: <FaFileAlt className="text-white" />,
      border: 'border-indigo-400'
    },
    notification: {
      bg: 'bg-gradient-to-r from-teal-500 to-teal-600',
      icon: <FaBell className="text-white" />,
      border: 'border-teal-400'
    }
  };

  const style = styles[type] || styles.info;

  return (
    <div className="pointer-events-auto w-96 max-w-full animate-slideInRight">
      <div
        className={`${style.bg} rounded-2xl border-2 ${style.border} p-4 shadow-2xl backdrop-blur-sm`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg">
            {style.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="mb-1 font-bold text-white text-sm">
                {title}
              </h4>
            )}
            {message && (
              <p className="text-sm text-white/90 leading-relaxed">
                {message}
              </p>
            )}

            {/* Action button */}
            {action && (
              <button
                onClick={action.onClick}
                className="mt-2 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30"
              >
                {action.label}
              </button>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/20 hover:text-white"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>

        {/* Progress bar */}
        {duration > 0 && (
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white/50 transition-all"
              style={{
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
