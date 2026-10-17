'use client';

import type { ProductSummaryDto } from '@teran/contracts';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ProductCard } from '@/components/catalog/product-card';
import { ButtonLink, IconButton } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export interface RailTab {
  id: string;
  label: string;
  products: ProductSummaryDto[];
  /** Where the call to action under the row leads (the tab's whole listing). */
  href: string;
  cta: string;
}

export interface RailLabels {
  tabList: string;
  previous: string;
  next: string;
}

const CARD_SIZES = '(min-width: 1024px) 22vw, (min-width: 768px) 30vw, calc(50vw - 1.8rem)';

/**
 * The reference's tabbed product row: headings centred above the row (the active one underlined;
 * a single tab is just the heading), four cards at a time from 1024 px (three from 768 px) that
 * scroll sideways with arrows beside the row when there are more, and a pill under the row to the
 * whole listing. On phones the row becomes a two-by-two grid of the first four products, as on the
 * reference. Tabs follow the WAI-ARIA pattern (arrow keys, Home, End).
 */
export function ProductRail({
  tabs: allTabs,
  labels,
  tone = 'plain',
  heading = 'centred',
  priorityCount = 0,
}: {
  tabs: RailTab[];
  labels: RailLabels;
  /** `tinted`: on a cream band instead of the page. */
  tone?: 'plain' | 'tinted';
  /**
   * How a single row is titled. `centred`: the heading centred and a pill under the row (home);
   * `serif`: a soft-serif heading on the left over a hairline (the reference's product page);
   * `condensed`: condensed capitals on the left with a "view all" link on the right (its bag).
   */
  heading?: 'centred' | 'serif' | 'condensed';
  /** How many of the first cards are fetched at once: where the row is the page's main content. */
  priorityCount?: number;
}) {
  const baseId = useId();
  const tabs = allTabs.filter((tab) => tab.products.length > 0);
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ overflow: false, atStart: true, atEnd: true });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rowRef = useRef<HTMLUListElement>(null);
  const current = tabs[Math.min(active, tabs.length - 1)];

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const max = row.scrollWidth - row.clientWidth;
    const next = {
      overflow: max > 4,
      atStart: row.scrollLeft <= 4,
      atEnd: row.scrollLeft >= max - 4,
    };
    setEdges((previous) =>
      previous.overflow === next.overflow &&
      previous.atStart === next.atStart &&
      previous.atEnd === next.atEnd
        ? previous
        : next,
    );
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [measure]);

  if (!current) return null;

  const select = (index: number, focus = false) => {
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
    const row = rowRef.current;
    if (row) {
      row.scrollLeft = 0;
      requestAnimationFrame(measure);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = tabs.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (active + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (active + last) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  };

  const page = (direction: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({ left: direction * row.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  const single = tabs.length === 1;
  const start = single && heading !== 'centred';

  return (
    <section
      aria-labelledby={`${baseId}-${single ? 'title' : `tab-${current.id}`}`}
      className={cn(
        heading === 'serif' ? 'py-10 sm:py-12' : 'py-12 sm:py-14 lg:py-16',
        tone === 'tinted' && 'bg-ivory-100',
      )}
    >
      <div
        className={cn(
          'container-page',
          heading === 'serif' && 'border-t border-line pt-10 sm:pt-12',
        )}
      >
        {start ? (
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <h2
              id={`${baseId}-title`}
              className={
                heading === 'serif'
                  ? 'font-heading text-[1.75rem] leading-[1.2] text-fg sm:text-[2.25rem]'
                  : 'font-headline text-[2rem] leading-[1.2] text-fg [--heading-case:none] [--headline-weight:600]'
              }
            >
              {current.label}
            </h2>
            <Link
              href={current.href}
              className="pb-1 text-[1rem] text-fg underline-offset-4 hover:underline"
            >
              {current.cta}
            </Link>
          </div>
        ) : single ? (
          <h2
            id={`${baseId}-title`}
            className="text-center font-heading text-[1.75rem] leading-tight text-forest-900 sm:text-[2rem]"
          >
            {current.label}
          </h2>
        ) : (
          <div
            role="tablist"
            aria-label={labels.tabList}
            onKeyDown={onKeyDown}
            className="flex flex-wrap items-end justify-center gap-x-5 gap-y-2 sm:gap-x-8"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${tab.id}`}
                aria-selected={index === active}
                aria-controls={`${baseId}-panel`}
                tabIndex={index === active ? 0 : -1}
                onClick={() => select(index)}
                className={cn(
                  'relative pb-2 font-heading text-[1.375rem] leading-tight transition-colors duration-150 sm:text-[2rem]',
                  'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:bg-forest-900 after:transition-transform after:duration-200',
                  index === active
                    ? 'text-forest-900 after:scale-x-100'
                    : 'text-fg after:scale-x-0 hover:text-forest-800',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div
          role={single ? undefined : 'tabpanel'}
          id={`${baseId}-panel`}
          aria-labelledby={single ? undefined : `${baseId}-tab-${current.id}`}
          className={cn('relative', start ? 'mt-6 lg:mt-7' : 'mt-8 lg:mt-9')}
        >
          <ul
            ref={rowRef}
            onScroll={measure}
            className="grid grid-cols-2 gap-2.5 md:-mx-2 md:flex md:snap-x md:snap-mandatory md:scroll-px-2 md:gap-4 md:overflow-x-auto md:overscroll-x-contain md:px-2 md:py-3 md:[scrollbar-width:none]"
          >
            {current.products.map((product, index) => (
              <li
                key={product.id}
                className={cn(
                  'md:w-[calc((100%-2rem)/3)] md:shrink-0 md:snap-start lg:w-[calc((100%-3rem)/4)]',
                  index >= 4 && 'max-md:hidden',
                )}
              >
                <ProductCard
                  product={product}
                  sizes={CARD_SIZES}
                  priority={active === 0 && index < priorityCount}
                />
              </li>
            ))}
          </ul>
          {edges.overflow ? (
            <>
              <IconButton
                label={labels.previous}
                icon={<ArrowLeft />}
                variant="outline"
                disabled={edges.atStart}
                onClick={() => page(-1)}
                className="absolute top-[38%] -left-3 z-10 shadow-soft xl:-left-14"
              />
              <IconButton
                label={labels.next}
                icon={<ArrowRight />}
                variant="outline"
                disabled={edges.atEnd}
                onClick={() => page(1)}
                className="absolute top-[38%] -right-3 z-10 shadow-soft xl:-right-14"
              />
            </>
          ) : null}
        </div>

        {start ? null : (
          <div className="mt-8 flex justify-center lg:mt-9">
            <ButtonLink href={current.href} size="lg" className="min-w-[11rem]">
              {current.cta}
            </ButtonLink>
          </div>
        )}
      </div>
    </section>
  );
}
