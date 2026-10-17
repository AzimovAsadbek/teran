'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The announcement band and the main bar stay on top together while the page scrolls (as on the
 * reference). Once the page has scrolled, a soft shadow separates the bar from the content under
 * it; a sentinel replaces scroll listeners.
 */
export function StickyHeader({ children }: { children: ReactNode }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const header = headerRef.current;
    if (!sentinel || !header) return;
    const observer = new IntersectionObserver(([entry]) => {
      header.dataset.scrolled = entry && !entry.isIntersecting ? 'true' : 'false';
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-px w-px"
      />
      <div
        ref={headerRef}
        data-scrolled="false"
        className="group/header sticky top-0 z-40 transition-shadow duration-300 data-[scrolled=true]:shadow-[0_10px_28px_-22px_rgb(14_61_18_/_0.5)]"
      >
        {children}
      </div>
    </>
  );
}
