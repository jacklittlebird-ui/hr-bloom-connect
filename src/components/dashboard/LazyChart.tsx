import { useRef, useState, useEffect, ReactNode } from 'react';

interface LazyChartProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only when the container scrolls into view (IntersectionObserver).
 * Prevents chart components from fetching data until actually visible.
 */
export const LazyChart = ({ children, fallback }: LazyChartProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' } // start loading slightly before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="min-h-[320px]">
      {visible
        ? children
        : fallback || (
            <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50 h-[320px] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
    </div>
  );
};
