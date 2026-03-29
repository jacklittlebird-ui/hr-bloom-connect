import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

/**
 * Saves and restores scroll position per route for a given scrollable element.
 */
export function useScrollRestoration(ref: React.RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Save scroll position on scroll
    const handleScroll = () => {
      scrollPositions.set(pathname, el.scrollTop);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });

    // Restore scroll position for this route
    const saved = scrollPositions.get(pathname);
    if (saved != null) {
      // Use requestAnimationFrame to ensure DOM is rendered
      requestAnimationFrame(() => {
        el.scrollTop = saved;
      });
    } else {
      el.scrollTop = 0;
    }

    prevPathRef.current = pathname;

    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [pathname, ref]);
}
