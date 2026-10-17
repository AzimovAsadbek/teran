'use client';

import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A row that scrolls sideways, as the reference's timeline on its About page: arrows at both ends
 * (the one at the start faded until the row has moved), touch and trackpad scrolling, and an
 * optional "scroll to explore" pill placed by the caller with `ScrollTrackHint`.
 */
export function ScrollTrack({
  children,
  label,
  previous,
  next,
  className,
}: {
  children: ReactNode;
  /** Accessible name of the row. */
  label: string;
  previous: string;
  next: string;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const update = () =>
      setEdges({
        start: row.scrollLeft <= 4,
        end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 4,
      });
    update();
    row.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => {
      row.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  const page = (direction: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({ left: direction * row.clientWidth * 0.7, behavior: reduce ? 'auto' : 'smooth' });
  };

  const arrow =
    'absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full transition-opacity duration-200 sm:flex';
  return (
    <div className={cn('relative', className)} data-scroll-track="">
      <div
        ref={rowRef}
        role="region"
        aria-label={label}
        // Keyboard users scroll the row with the arrow keys once it has focus.
        tabIndex={0}
        className="flex snap-x snap-proximity scroll-px-gutter items-center overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus lg:scroll-px-[6.25rem] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => page(-1)}
        aria-label={previous}
        disabled={edges.start}
        className={cn(arrow, 'left-2 text-jade-700 disabled:opacity-35 lg:left-6')}
      >
        <ArrowLeft aria-hidden className="h-7 w-7" />
      </button>
      <button
        type="button"
        onClick={() => page(1)}
        aria-label={next}
        disabled={edges.end}
        className={cn(
          arrow,
          'right-2 bg-ivory-50 text-jade-700 shadow-[0_4px_16px_rgb(0_0_0_/_0.12)] disabled:opacity-0 lg:right-6',
        )}
      >
        <ArrowRight aria-hidden className="h-7 w-7" />
      </button>
    </div>
  );
}

/** The reference's tilted "scroll to explore" pill: moves the nearest track on by a screen. */
export function ScrollTrackHint({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        const row = event.currentTarget
          .closest('[data-scroll-track]')
          ?.querySelector('[role="region"]');
        if (!(row instanceof HTMLElement)) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        row.scrollBy({ left: row.clientWidth * 0.7, behavior: reduce ? 'auto' : 'smooth' });
      }}
      className="inline-flex h-[3.125rem] -rotate-2 items-center gap-1 rounded-[0.875rem] bg-jade-100 px-7 text-[1.25rem] text-jade-700 transition-[filter] duration-200 hover:brightness-[0.97]"
    >
      {label}
      <ChevronRight aria-hidden className="h-5 w-5" />
    </button>
  );
}
