import { useEffect, useState } from 'react';
import { FaPhone, FaVideo, FaTimes, FaPhoneSlash } from 'react-icons/fa';
import RingtonePlayer from './RingtonePlayer';

/**
 * Incoming Call Modal - Shows popup when receiving a call
 * Plays ringtone until answered/rejected
 */
export default function IncomingCallModal({
  callData,
  onAccept,
  onReject,
  onTimeout
}) {
  const [timeoutSeconds, setTimeoutSeconds] = useState(30);

  useEffect(() => {
    if (!callData) return;

    // Auto-reject after 30 seconds
    const countdown = setInterval(() => {
      setTimeoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          onTimeout?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [callData, onTimeout]);

  if (!callData) return null;

  const { callerName, callerPhoto, callType, callId } = callData;
  const isVideo = callType === 'video';

  return (
    <>
      {/* Ringtone player */}
      <RingtonePlayer isPlaying={true} />

      {/* Modal overlay */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
        <div className="relative mx-4 w-full max-w-md animate-slideUp">
          {/* Pulsing ring effect */}
          <div className="absolute inset-0 -m-4 animate-ping rounded-full bg-gradient-to-br from-[#2d5a56]/30 to-[#7ea89c]/30" />

          {/* Card */}
          <div className="relative rounded-[32px] border-2 border-[#d4e8e0] bg-gradient-to-br from-white to-[#f2f8f5] p-8 shadow-2xl">

            {/* Caller photo/avatar */}
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#2d5a56] bg-[#e7f3ef] shadow-lg">
              {callerPhoto ? (
                <img src={callerPhoto} alt={callerName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-[#2d5a56]">
                  {callerName?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>

            {/* Call type icon */}
            <div className="mb-3 flex justify-center">
              {isVideo ? (
                <FaVideo className="text-2xl text-[#2d5a56]" />
              ) : (
                <FaPhone className="text-2xl text-[#2d5a56]" />
              )}
            </div>

            {/* Caller name */}
            <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">
              {callerName || 'Unknown'}
            </h2>

            {/* Call type label */}
            <p className="mb-6 text-center text-sm font-medium text-slate-500">
              Incoming {isVideo ? 'Video' : 'Audio'} Call
            </p>

            {/* Timeout indicator */}
            <div className="mb-6 text-center">
              <div className="mx-auto h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-[#2d5a56] transition-all duration-1000"
                  style={{ width: `${(timeoutSeconds / 30) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {timeoutSeconds}s remaining
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-6">

              {/* Reject button */}
              <button
                onClick={() => onReject(callData)}
                className="group flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
                title="Decline call"
              >
                <FaPhoneSlash className="text-2xl text-white transition-transform group-hover:rotate-12" />
              </button>

              {/* Accept button */}
              <button
                onClick={() => onAccept(callData)}
                className="group flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#2d5a56] to-[#1e3e3b] shadow-xl transition-all hover:scale-110 hover:shadow-2xl active:scale-95"
                title="Accept call"
              >
                {isVideo ? (
                  <FaVideo className="text-3xl text-white transition-transform group-hover:scale-110" />
                ) : (
                  <FaPhone className="text-3xl text-white transition-transform group-hover:rotate-12" />
                )}
              </button>
            </div>

            {/* Labels */}
            <div className="mt-4 flex items-center justify-center gap-12 text-xs font-semibold text-slate-500">
              <span>Decline</span>
              <span>Accept</span>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            transform: translateY(2rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
