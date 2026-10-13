'use client';

import { Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

function LeafGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0 text-gold-500">
      <path
        d="M10 18 C 4 12, 4 6, 10 2 C 16 6, 16 12, 10 18 Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}

/**
 * Slow ribbon of tea types (the reference's ticker, reworked). Moving content has a visible
 * pause control (WCAG 2.2.2) and is static when the visitor prefers reduced motion.
 */
export function TeaRibbon({
  items,
  label,
}: {
  items: { slug: string; name: string }[];
  label: string;
}) {
  const t = useTranslations('Common');
  const [paused, setPaused] = useState(false);
  if (items.length === 0) return <div className="h-16" aria-hidden />;

  const row = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className={cn('flex shrink-0 items-center gap-10 pr-10', hidden && 'motion-reduce:hidden')}
    >
      {items.map((item) => (
        <li key={item.slug} className="flex items-center gap-10">
          <Link
            href={`/catalog/${item.slug}`}
            tabIndex={hidden ? -1 : undefined}
            className="font-display text-2xl font-semibold whitespace-nowrap text-forest-900 transition-colors hover:text-gold-700"
          >
            {item.name}
          </Link>
          <LeafGlyph />
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label={label} className="relative mt-8 border-y border-gold-500/25 bg-ivory-100">
      <div className="flex h-16 items-center overflow-x-auto motion-safe:overflow-hidden">
        <div
          className={cn(
            'flex w-max motion-safe:animate-marquee',
            paused && '[animation-play-state:paused]',
          )}
        >
          {row(false)}
          {row(true)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        aria-label={paused ? t('play') : t('pause')}
        className="absolute top-1/2 right-3 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-ivory-50 text-forest-900 shadow-soft motion-safe:inline-flex"
      >
        {paused ? (
          <Play aria-hidden className="h-4 w-4" />
        ) : (
          <Pause aria-hidden className="h-4 w-4" />
        )}
      </button>
    </section>
  );
}
