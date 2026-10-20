'use client';

import { Leaf } from 'lucide-react';
import { useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { useMotionPaused } from '@/lib/motion';

const TONES = {
  jade: 'bg-jade-100 text-fg',
  'jade-deep': 'bg-jade-700 text-ivory-50',
  forest: 'bg-forest-900 text-ivory-50',
  /* The reference's ribbons: red capitals on lavender, and the surf band above the footer. */
  lavender: 'bg-lavender text-cherry',
  surf: 'bg-gold-400 text-fg',
} as const;

export interface MarqueeItem {
  label: string;
  /** Where the word leads, as the reference's ribbon words do (shop pages); plain text without. */
  href?: string;
}

/**
 * The reference's ribbons of moving capitals. The track holds two copies of the words and moves
 * by one copy, so the loop is seamless (globals.css). A word with a link is underlined when pointed
 * at, and the ribbon holds still under the pointer or a pressing finger so its words can be read
 * and chosen; it stops off screen, while a keyboard user is on one of its links, with reduced
 * motion, and while the visitor has paused the storefront's motion with the footer's switch
 * (lib/motion.ts). The second copy is hidden from assistive technology and the keyboard.
 *
 * - `md`: the 67 px band under the hero (48 px on phones), 56 px capitals with a mark between
 *   the words, one full turn in 48 s;
 * - `lg`: the 64 px ribbon above the footer (38 px on phones), words spaced without marks, 37 s.
 *
 * `marks` are drawn in turn between the words (the home ribbon's colour stickers); a leaf when
 * none are given, nothing for an empty list.
 */
export function Marquee({
  label,
  items,
  tone,
  size = 'md',
  marks,
}: {
  label: string;
  items: readonly MarqueeItem[];
  tone: keyof typeof TONES;
  size?: 'md' | 'lg';
  marks?: ReactNode[];
}) {
  const ref = useRef<HTMLElement>(null);
  const paused = useMotionPaused();

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
  const linked = items.some((item) => item.href);

  const run = (clone: boolean) => (
    <span aria-hidden={clone || !linked || undefined} className="flex shrink-0 items-center">
      {items.map((item, index) => {
        const mark = markAt(index);
        const word = cn('whitespace-nowrap', size === 'lg' ? 'px-6' : 'px-3 sm:px-4');
        return (
          <span key={`${item.label}-${index}`} className="flex items-center">
            {item.href ? (
              <Link
                href={item.href}
                tabIndex={clone ? -1 : undefined}
                className={cn(
                  word,
                  'underline-reveal decoration-[0.05em] underline-offset-[0.08em] focus-visible:outline-current',
                )}
              >
                {item.label}
              </Link>
            ) : (
              <span className={word}>{item.label}</span>
            )}
            {mark ? (
              // The reference's ribbon icons: 48 px high (34 px under 750 px).
              <span
                aria-hidden
                className="flex h-[2.1rem] shrink-0 items-center min-[46.875rem]:h-12"
              >
                {mark}
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
  const track = (
    <div
      className={cn(
        'marquee-track flex w-max font-headline',
        size === 'lg'
          ? 'text-[2.4rem] leading-6 min-[46.875rem]:text-[4rem]'
          : 'py-[0.45rem] text-[2.1rem] leading-none sm:py-[0.34375rem] sm:text-[3.5rem]',
      )}
    >
      {run(false)}
      {run(true)}
    </div>
  );
  // The large ribbon's capitals overflow their 24 px line, as the reference's: the clipping box
  // reaches past it without taking room.
  const className = cn(
    'marquee overflow-hidden',
    TONES[tone],
    size === 'lg' && '-my-[2.1875rem] py-[2.1875rem]',
  );
  const style = size === 'lg' ? ({ '--marquee-duration': '36.8s' } as CSSProperties) : undefined;
  // With links it is a small navigation; without, a picture of words with one spoken name.
  return linked ? (
    <nav
      ref={ref}
      aria-label={label}
      className={className}
      style={style}
      data-paused={paused ? '' : undefined}
    >
      {track}
    </nav>
  ) : (
    <div
      ref={ref as Ref<HTMLDivElement>}
      role="img"
      aria-label={label}
      data-paused={paused ? '' : undefined}
      className={className}
      style={style}
    >
      {track}
    </div>
  );
}
