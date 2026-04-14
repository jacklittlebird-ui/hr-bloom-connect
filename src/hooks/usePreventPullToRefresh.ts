import { RefObject, useEffect } from 'react';

const EDGE_TOLERANCE = 1;

const isScrollable = (element: HTMLElement) => {
  const { overflowY } = window.getComputedStyle(element);
  return /(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > element.clientHeight + EDGE_TOLERANCE;
};

const getActiveScroller = <T extends HTMLElement>(target: EventTarget | null, container: T) => {
  let current = target instanceof HTMLElement ? target : null;

  while (current && current !== container) {
    if (isScrollable(current)) {
      return current;
    }
    current = current.parentElement;
  }

  return container;
};

export const usePreventPullToRefresh = <T extends HTMLElement>(
  containerRef: RefObject<T>,
  enabled = true,
) => {
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let startX = 0;
    let activeScroller: HTMLElement = container;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      startY = touch.clientY;
      startX = touch.clientX;
      activeScroller = getActiveScroller(event.target, container);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaY = touch.clientY - startY;
      const deltaX = touch.clientX - startX;

      if (Math.abs(deltaX) > Math.abs(deltaY)) return;

      const maxScrollTop = activeScroller.scrollHeight - activeScroller.clientHeight;
      const atTop = activeScroller.scrollTop <= EDGE_TOLERANCE;
      const atBottom = maxScrollTop - activeScroller.scrollTop <= EDGE_TOLERANCE;

      if ((deltaY > 0 && atTop) || (deltaY < 0 && atBottom)) {
        event.preventDefault();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
    };
  }, [containerRef, enabled]);
};