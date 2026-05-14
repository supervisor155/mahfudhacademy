import { useEffect, useState } from 'react';

export default function useLazyLoadVideo(videoUrl) {
  const [loadedUrl, setLoadedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!videoUrl) return;

    setIsLoading(true);
    setError(null);

    // Create a video element to preload
    const video = document.createElement('video');
    video.preload = 'metadata'; // Only load metadata initially

    const onLoadedMetadata = () => {
      setLoadedUrl(videoUrl);
      setIsLoading(false);
    };

    const onError = () => {
      setError('Failed to load video');
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);

    video.src = videoUrl;

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
      video.src = '';
    };
  }, [videoUrl]);

  return { loadedUrl, isLoading, error };
}
