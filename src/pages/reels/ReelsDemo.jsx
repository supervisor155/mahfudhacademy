import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import useIntersectionObserver from '../../hooks/useIntersectionObserver';
import VideoReel from '../../components/reels/VideoReel';

// Sample reel data with public video URLs
const SAMPLE_REELS = [
  {
    id: 1,
    title: 'Introduction to Surah Al-Fatiha',
    description: 'Learn the opening chapter of the Quran with proper tajweed rules',
    teacherName: 'Sheikh Ahmed',
    teacherRole: 'Quran Teacher',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    hashtags: ['#Quran', '#Tajweed', '#Learning'],
    audioTitle: 'Traditional Quranic Recitation',
    likes: 1200,
    comments: 45,
  },
  {
    id: 2,
    title: 'Understanding Arabic Grammar Basics',
    description: 'Foundation rules of Arabic grammar explained in simple terms',
    teacherName: 'Ustadha Fatima',
    teacherRole: 'Arabic Instructor',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    hashtags: ['#Arabic', '#Grammar', '#Language'],
    audioTitle: 'Arabic Learning Audio',
    likes: 890,
    comments: 32,
  },
  {
    id: 3,
    title: 'Memorization Tips & Techniques',
    description: 'Proven strategies to memorize Quranic verses more effectively',
    teacherName: 'Hafiz Muhammad',
    teacherRole: 'Hafiz Trainer',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Muhammad',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    hashtags: ['#Memorization', '#Quran', '#Study'],
    audioTitle: 'Memorization Techniques',
    likes: 2100,
    comments: 78,
  },
  {
    id: 4,
    title: 'Islamic History: The Life of Prophet Muhammad',
    description: 'An overview of the prophetic life and teachings',
    teacherName: 'Dr. Hassan',
    teacherRole: 'Islamic Scholar',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hassan',
    videoUrl: 'https://www.w3schools.com/html/movie.mp4',
    hashtags: ['#History', '#Islam', '#Prophet'],
    audioTitle: 'Seerah Audio',
    likes: 3400,
    comments: 156,
  },
  {
    id: 5,
    title: 'Daily Duas and Supplications',
    description: 'Essential prayers for every part of your day',
    teacherName: 'Ustadh Ali',
    teacherRole: 'Islamic Teacher',
    teacherAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    hashtags: ['#Dua', '#Spirituality', '#Daily'],
    audioTitle: 'Dua Compilation',
    likes: 4500,
    comments: 202,
  },
];

export default function ReelsDemo() {
  const navigate = useNavigate();
  const [reels] = useState(SAMPLE_REELS);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollToIndex = (index) => {
    if (index < 0 || index >= reels.length) return;
    setCurrentIndex(index);

    const container = document.getElementById('reels-scroll-container');
    if (container) {
      const element = container.children[index];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
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

  const handleReel = async (reelId, liked) => {
    console.log(`Reel ${reelId} ${liked ? 'liked' : 'unliked'}`);
  };

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
        id="reels-scroll-container"
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
      </div>

      {/* Reel Counter */}
      <div className="absolute top-4 right-4 z-40 bg-white/20 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
        {currentIndex + 1} / {reels.length}
      </div>

      {/* Keyboard Hint */}
      <div className="absolute bottom-4 right-4 z-40 text-white/50 text-xs text-right">
        <p> Navigate</p>
        <p>ESC Go back</p>
      </div>
    </div>
  );
}

// Sub-component for individual reel
function ReelsContainer({ reel, index, currentIndex, onLike }) {
  const [ref, isVisible] = useIntersectionObserver();

  return (
    <div
      ref={ref}
      className="w-screen h-screen snap-start flex-shrink-0"
      id={`reel-${reel.id}`}
    >
      <VideoReel
        reel={reel}
        isVisible={isVisible}
        onLike={onLike}
      />
    </div>
  );
}
