import type { Locale } from '@teran/contracts';
import type { CSSProperties } from 'react';
import { brandCopy } from '@/content/brand';
import { cn } from '@/lib/cn';

/**
 * The three brand principles (official copy) as a numbered list. Each item keeps the supplied
 * sentence intact — title, dash, description — and the title is a heading so screen-reader users
 * can move between principles. Used on the homepage and the About page.
 */
export function BrandPrinciples({ locale, className }: { locale: Locale; className?: string }) {
  const { principles } = brandCopy[locale].philosophy;
  return (
    // Inside a revealed section the three rows rise one after another (data-stagger, globals.css).
    <ol data-stagger className={cn('border-b border-line', className)}>
      {principles.map((principle, index) => (
        <li
          key={principle.title}
          style={{ '--i': index } as CSSProperties}
          className="grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-4 border-t border-line py-6 sm:grid-cols-[4rem_minmax(0,1fr)]"
        >
          <span aria-hidden className="font-display text-[1.75rem] leading-none text-accent-fg">
            {String(index + 1).padStart(2, '0')}
          </span>
          {/* A div, not a p: the heading inside it is a block-level element. */}
          <div className="text-body-lg text-fg-muted">
            <h3 className="inline text-display-sm text-forest-900">{principle.title}</h3>
            {' — '}
            {principle.text}
          </div>
        </li>
      ))}
    </ol>
  );
}
