'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Sticky main bar that turns into a frosted glass surface once the page scrolls,
 * so content passing underneath stays legible. Uses a sentinel instead of scroll listeners.
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
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div
        ref={headerRef}
        data-scrolled="false"
        className="group/header sticky top-0 z-40 border-b border-transparent bg-ivory-50 transition-[background-color,box-shadow,border-color] duration-300 data-[scrolled=true]:border-ivory-200/70 data-[scrolled=true]:shadow-[0_12px_32px_-24px_rgb(11_46_25_/_0.45)] supports-[backdrop-filter]:data-[scrolled=true]:bg-ivory-50/90 [@media(prefers-reduced-transparency:reduce)]:data-[scrolled=true]:bg-ivory-50 supports-[backdrop-filter]:data-[scrolled=true]:backdrop-blur-xl supports-[backdrop-filter]:data-[scrolled=true]:backdrop-saturate-150"
      >
        {children}
      </div>
    </>
  );
}
