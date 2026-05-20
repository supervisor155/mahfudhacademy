import { useEffect, useRef, useState } from 'react';

export default function useIntersectionObserver(options = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      // Trigger when at least 70% of element is visible
      if (entry.intersectionRatio >= 0.7) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, {
      threshold: 0.7,
      ...options,
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [options]);

  return [ref, isVisible];
}
