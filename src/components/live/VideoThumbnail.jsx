import { useEffect, useRef } from 'react';
import { FaMicrophoneSlash } from 'react-icons/fa';

export default function VideoThumbnail({ stream, label, isMuted = false, isVideoOff = false }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-gray-700 shadow-md">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
      />
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2d5a56] text-sm font-bold text-white">
            {label?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}
      <div className="absolute bottom-1 left-1 rounded bg-black/70 px-2 py-0.5 text-xs text-white">
        {label}
      </div>
      {isMuted && (
        <div className="absolute bottom-1 right-1 rounded-full bg-red-600 p-1">
          <FaMicrophoneSlash className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
}
