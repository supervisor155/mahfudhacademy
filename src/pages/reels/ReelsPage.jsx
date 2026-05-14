import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';
import useLazyLoadVideo from '../../hooks/useLazyLoadVideo';
import VideoReel from '../../components/reels/VideoReel';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';

export default function ReelsPage() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch initial reels
  useEffect(() => {
    fetchReels(0);
  }, []);

  const fetchReels = async (offset = 0) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/reels/feed?limit=10&offset=${offset}`);
      const newReels = res.data.data || [];
      
      if (offset === 0) {
        setReels(newReels);
      } else {
        setReels(prev => [...prev, ...newReels]);
      }

      // Check if there are more reels to load
      if (newReels.length < 10) {
        setHasMore(false);
      }

      setError('');
    } catch (err) {
      console.error('Error fetching reels:', err);
      setError('Failed to load reels');
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Handle scroll to load more reels
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    // Load more when user is near the bottom (within 3 screens)
    if (scrollHeight - (scrollTop + clientHeight) < clientHeight * 3 && hasMore && !isLoadingMore && !loading) {
      setIsLoadingMore(true);
      fetchReels(reels.length);
    }
  }, [reels.length, hasMore, isLoadingMore, loading]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        scrollToIndex(currentIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(currentIndex - 1);
      } else if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, navigate]);

  const scrollToIndex = (index) => {
    if (index < 0 || index >= reels.length) return;

    setCurrentIndex(index);

    if (scrollContainerRef.current) {
      const element = scrollContainerRef.current.children[index];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleReel = async (reelId, liked) => {
    try {
      if (liked) {
        await api.post(`/api/reels/${reelId}/like`);
      } else {
        await api.delete(`/api/reels/${reelId}/like`);
      }
    } catch (err) {
      console.error('Error updating like:', err);
    }
  };

  if (loading && reels.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <FaSpinner className="text-4xl animate-spin mx-auto mb-4" />
          <p>Loading reels...</p>
        </div>
      </div>
    );
  }

  if (error && reels.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            <FaArrowLeft /> Go Back
          </button>
        </div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg mb-4">No reels available</p>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
          >
            <FaArrowLeft /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-40 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition backdrop-blur-sm"
        title="Go back (ESC)"
      >
        <FaArrowLeft className="text-lg" />
      </button>

      {/* Scrollable Reels Container */}
      <div
        ref={scrollContainerRef}
        className="w-screen h-screen overflow-y-scroll scroll-smooth snap-y snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        {reels.map((reel, index) => (
          <ReelsContainer
            key={reel.id}
            reel={reel}
            index={index}
            currentIndex={currentIndex}
            onLike={handleReel}
          />
        ))}

        {/* Loading More Indicator */}
        {isLoadingMore && (
          <div className="w-screen h-screen bg-black flex items-center justify-center">
            <FaSpinner className="text-4xl text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Reel Counter */}
      <div className="absolute top-4 right-4 z-40 bg-white/20 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
        {currentIndex + 1} / {reels.length}
      </div>

      {/* Keyboard Hint */}
      <div className="absolute bottom-4 right-4 z-40 text-white/50 text-xs text-right">
        <p>↑↓ Navigate</p>
        <p>ESC Go back</p>
      </div>
    </div>
  );
}

// Sub-component for individual reel with intersection observer
function ReelsContainer({ reel, index, currentIndex, onLike }) {
  const [ref, isVisible] = useIntersectionObserver();
  const { loadedUrl } = useLazyLoadVideo(isVisible ? reel.videoUrl : null);

  return (
    <div
      ref={ref}
      className="w-screen h-screen snap-start flex-shrink-0"
      id={`reel-${reel.id}`}
    >
      <VideoReel
        reel={{
          ...reel,
          videoUrl: loadedUrl, // Only show loaded URL
        }}
        isVisible={isVisible}
        onLike={onLike}
      />
    </div>
  );
}
