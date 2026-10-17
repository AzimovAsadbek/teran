'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FILTER_BUTTON, FILTER_BUTTON_ON } from './filter-styles';

/**
 * One filter group of the desktop bar as a dropdown: a <details> element (it opens with a click,
 * Enter or Space even before the page is interactive) whose panel lists the choices as links, so
 * picking one applies it at once, as on the reference. With JavaScript, Esc and a click outside
 * close it.
 */
export function FilterDropdown({
  label,
  selectedCount = 0,
  appliedLabel,
  children,
}: {
  label: string;
  selectedCount?: number;
  /** Screen-reader text for "filter applied". */
  appliedLabel: string;
  children: ReactNode;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const onPointerDown = (event: PointerEvent) => {
      if (details.open && event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.open) return;
      details.open = false;
      details.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    // A <details> is a group; its name lets assistive technology (and tests) find the filter.
    <details ref={detailsRef} aria-label={label} className="group relative">
      <summary
        className={cn(
          selectedCount > 0 ? FILTER_BUTTON_ON : FILTER_BUTTON,
          'cursor-pointer list-none group-open:border-forest-900 group-open:ring-1 group-open:ring-forest-900 [&::-webkit-details-marker]:hidden',
        )}
      >
        {label}
        {selectedCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-900 px-1 text-micro font-bold text-ivory-50 figures">
            {selectedCount}
            <span className="sr-only"> ({appliedLabel})</span>
          </span>
        ) : null}
        <ChevronDown
          aria-hidden
          className="h-4 w-4 transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="absolute top-full left-0 z-30 mt-1 max-h-80 min-w-[13rem] overflow-y-auto rounded-sm border border-line bg-surface py-2 shadow-overlay motion-safe:animate-pop-in">
        {children}
      </div>
    </details>
  );
}
