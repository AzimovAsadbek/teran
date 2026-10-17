'use client';

import { Leaf } from 'lucide-react';
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const TONES = {
  jade: 'bg-jade-100 text-forest-900',
  'jade-deep': 'bg-jade-700 text-ivory-50',
  forest: 'bg-forest-900 text-ivory-50',
} as const;

/**
 * The reference's ribbons of moving capitals. The track holds two copies of the words and moves
 * by one copy, so the loop is seamless (globals.css). It pauses while off screen (no work for a
 * band nobody sees) and on hover, and stays still with reduced motion.
 *
 * - `md`: the 67 px band under the hero (48 px on phones), 56 px capitals with a mark between
 *   the words, one full turn in 48 s;
 * - `lg`: the 64 px ribbon above the footer (38 px on phones), words spaced without marks, 37 s.
 *
 * `marks` are drawn in turn between the words (the pack's value icons); a leaf when none are
 * given, nothing for an empty list.
 */
export function Marquee({
  label,
  words,
  tone,
  size = 'md',
  marks,
}: {
  label: string;
  words: readonly string[];
  tone: keyof typeof TONES;
  size?: 'md' | 'lg';
  marks?: ReactNode[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) delete element.dataset.offscreen;
      else element.dataset.offscreen = '';
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const markAt = (index: number): ReactNode => {
    if (marks === undefined) return <Leaf className="h-full w-auto fill-current text-gold-600" />;
    return marks.length > 0 ? marks[index % marks.length] : null;
  };

  const run = (
    <span className="flex shrink-0 items-center">
      {words.map((word, index) => {
        const mark = markAt(index);
        return (
          <span key={`${word}-${index}`} className="flex items-center">
            <span
              className={cn('whitespace-nowrap', size === 'lg' ? 'px-3 sm:px-6' : 'px-3 sm:px-4')}
            >
              {word}
            </span>
            {mark ? (
              <span className="flex h-[1.875rem] shrink-0 items-center sm:h-11">{mark}</span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn('marquee overflow-hidden', TONES[tone])}
      style={size === 'lg' ? ({ '--marquee-duration': '36.8s' } as CSSProperties) : undefined}
    >
      <div
        aria-hidden
        className={cn(
          'marquee-track flex w-max font-headline leading-none',
          size === 'lg'
            ? 'text-[2.4rem] lg:text-[4rem]'
            : 'py-[0.45rem] text-[2.1rem] sm:py-[0.34375rem] sm:text-[3.5rem]',
        )}
      >
        {run}
        {run}
      </div>
    </div>
  );
}
