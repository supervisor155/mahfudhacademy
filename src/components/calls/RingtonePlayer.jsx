import { useEffect, useRef } from 'react';

/**
 * Ringtone Player - Plays looping ringtone sound
 */
export default function RingtonePlayer({ isPlaying }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) {
      // Create audio element
      audioRef.current = new Audio('/sounds/ringtone.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.7;
    }

    const audio = audioRef.current;

    if (isPlaying) {
      // Play ringtone
      audio.play().catch(err => {
        console.warn('Ringtone playback failed:', err);
      });
    } else {
      // Stop ringtone
      audio.pause();
      audio.currentTime = 0;
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [isPlaying]);

  // Also vibrate on mobile
  useEffect(() => {
    if (isPlaying && 'vibrate' in navigator) {
      // Vibrate pattern: [vibrate, pause, vibrate, pause, ...]
      const vibrateInterval = setInterval(() => {
        navigator.vibrate([300, 100, 300]);
      }, 1000);

      return () => clearInterval(vibrateInterval);
    }
  }, [isPlaying]);

  return null; // No visual component
}
