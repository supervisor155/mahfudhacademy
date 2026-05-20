import React, { useRef, useEffect, useState } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaHeart, FaComment, FaShare } from 'react-icons/fa';

export default function VideoReel({ reel, isVisible, onLike }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [progress, setProgress] = useState(0);

  // Auto-play when visible
  useEffect(() => {
    if (!videoRef.current) return;

    if (isVisible) {
      videoRef.current.play().catch(() => {
        // Autoplay failed, user must interact
        setIsPlaying(false);
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isVisible]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    if (onLike) onLike(reel.id, !isLiked);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress((current / duration) * 100);
    }
  };

  const handleEnded = () => {
    // Video ended, could auto-scroll to next
    setIsPlaying(false);
  };

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted={isMuted}
        loop
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        playsInline
        onClick={togglePlayPause}
      >
        <source src={reel.videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/55 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/80 via-black/35 to-transparent"></div>
      </div>

      {/* Content Info - Bottom Left */}
      <div className="absolute bottom-20 left-4 right-20 z-20 text-white">
        {/* Teacher */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-400 flex-shrink-0 overflow-hidden">
            {reel.teacherAvatar ? (
              <img src={reel.teacherAvatar} alt={reel.teacherName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{reel.teacherName}</p>
            <p className="text-xs text-gray-300">{reel.teacherRole || 'Teacher'}</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded-full flex-shrink-0 transition">
            Follow
          </button>
        </div>

        {/* Title and Description */}
        <h3 className="text-lg font-bold mb-1 line-clamp-2">{reel.title}</h3>
        <p className="text-sm text-gray-200 line-clamp-2">{reel.description}</p>

        {/* Hashtags */}
        {reel.hashtags && (
          <p className="text-xs text-blue-300 mt-2 line-clamp-1">
            {reel.hashtags.slice(0, 3).join(' ')}
          </p>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          onClick={handleLike}
          className={`h-12 w-12 flex items-center justify-center rounded-full transition-all ${
            isLiked
              ? 'bg-red-500 text-white scale-110'
              : 'bg-black/40 hover:bg-black/55 text-white backdrop-blur-sm'
          }`}
        >
          <FaHeart className="text-xl" />
        </button>

        {/* Comments */}
        <button className="h-12 w-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 text-white transition backdrop-blur-sm">
          <FaComment className="text-xl" />
        </button>

        {/* Share */}
        <button className="h-12 w-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 text-white transition backdrop-blur-sm">
          <FaShare className="text-xl" />
        </button>

        {/* Music/Audio */}
        {reel.audioTitle && (
          <div className="h-12 w-12 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 text-white transition backdrop-blur-sm">
            <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
          </div>
        )}
      </div>

      {/* Play/Pause and Mute Controls - Center Bottom */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="p-2 rounded-full bg-black/40 hover:bg-black/55 text-white transition backdrop-blur-sm"
        >
          {isPlaying ? <FaPause className="text-lg" /> : <FaPlay className="text-lg ml-0.5" />}
        </button>

        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className="p-2 rounded-full bg-black/40 hover:bg-black/55 text-white transition backdrop-blur-sm"
        >
          {isMuted ? <FaVolumeMute className="text-lg" /> : <FaVolumeUp className="text-lg" />}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-20">
        <div className="h-full bg-white/80 transition-all" style={{ width: `${progress}%` }}></div>
      </div>

      {/* Loading Skeleton */}
      {!reel.videoUrl && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm">Loading video...</p>
          </div>
        </div>
      )}
    </div>
  );
}
