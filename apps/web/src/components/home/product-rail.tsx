'use client';

import type { ProductSummaryDto } from '@teran/contracts';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
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
/** The home page's grid: four cards from 1200 px, two below (the reference's featured tabs). */
const GRID_SIZES = '(min-width: 1920px) 440px, (min-width: 1200px) 23vw, 48vw';
const GRID_ITEMS = 4;
/**
 * A row that holds exactly five products (TERAN's five teas, as on the live shop) shows all five,
 * five across from 1200 px, rather than leaving one out of a row of four.
 */
const WHOLE_RANGE = 5;
const WHOLE_SIZES = '(min-width: 1920px) 352px, (min-width: 1200px) 18vw, 48vw';

/**
 * The reference's tabbed product rows. On the home page (`centred`, `hidden`) as its featured tabs:
 * headings centred above the row (the active one teal and underlined; a single tab is just the
 * heading), a grid of four cards (two by two below 1200 px) and a pill under it to the whole
 * listing; switching tabs brings the cards in one after another. Elsewhere (`serif`, `condensed`)
 * a row of four cards at a time from 1024 px (three from 768 px) that scrolls sideways with arrows
 * when there are more; `none` is that row alone, under a heading of the page's own (the reference's
 * Tea 101 carousels). Tabs follow the WAI-ARIA pattern (arrow keys, Home, End).
 */
export function ProductRail({
  tabs: allTabs,
  labels,
  heading = 'centred',
  cta = true,
  priorityCount = 0,
  frame = 'page',
}: {
  tabs: RailTab[];
  labels: RailLabels;
  /**
   * How a single row is titled. `centred`: the heading centred and a pill under the row (home);
   * `serif`: a soft-serif heading on the left over a hairline (the reference's product page);
   * `condensed`: condensed capitals on the left with a "view all" link on the right (its bag);
   * `hidden`: the first tab alone, its heading for screen readers only (the home page's later
   * rows, as the reference's); `none`: the first tab's row alone, named by its label, for a section
   * that has its own heading.
   */
  heading?: 'centred' | 'serif' | 'condensed' | 'hidden' | 'none';
  /** The pill to the whole listing under a centred or hidden heading. */
  cta?: boolean;
  /** How many of the first cards are fetched at once: where the row is the page's main content. */
  priorityCount?: number;
  /**
   * The row's frame: `page`, the home and catalogue width (1792 px between 64 px margins);
   * `content`, the reference's 1440 px frame of its product and bag pages.
   */
  frame?: 'page' | 'content';
}) {
  const baseId = useId();
  const filled = allTabs.filter((tab) => tab.products.length > 0);
  const tabs = heading === 'hidden' || heading === 'none' ? filled.slice(0, 1) : filled;
  const [active, setActive] = useState(0);
  // Set while a newly chosen tab's cards come in (the reference's 330 ms, 45 ms apart).
  const [entering, setEntering] = useState(false);
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

  useEffect(() => {
    if (!entering) return;
    const timer = window.setTimeout(() => setEntering(false), 600);
    return () => window.clearTimeout(timer);
  }, [entering, active]);

  if (!current) return null;

  const select = (index: number, focus = false) => {
    if (index !== active) setEntering(true);
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
  const hidden = heading === 'hidden';
  const bare = heading === 'none';
  const start = single && heading !== 'centred' && !hidden && !bare;
  const grid = heading === 'centred' || hidden;
  const whole = grid && current.products.length === WHOLE_RANGE;
  const products = grid
    ? current.products.slice(0, whole ? WHOLE_RANGE : GRID_ITEMS)
    : current.products;

  return (
    <section
      aria-labelledby={bare ? undefined : `${baseId}-${single ? 'title' : `tab-${current.id}`}`}
      aria-label={bare ? current.label : undefined}
      className={
        bare
          ? undefined
          : heading === 'serif'
            ? 'py-10 sm:py-12'
            : hidden
              ? 'py-10 min-[46.875rem]:pt-0'
              : 'py-10 min-[46.875rem]:pt-16'
      }
    >
      <div
        className={cn(
          frame === 'content' ? 'container-frame' : 'container-page',
          heading === 'serif' && 'border-t border-line pt-10 sm:pt-12',
        )}
      >
        {bare ? null : start ? (
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
            className={
              hidden
                ? 'sr-only'
                : 'mb-6 text-center font-heading text-[1.75rem] leading-[1.2] text-fg min-[46.875rem]:text-[2.25rem]'
            }
          >
            {current.label}
          </h2>
        ) : (
          <>
            {/* The tabs are no headings: this one keeps the page's outline (h1, h2, the cards' h3). */}
            <h2 id={`${baseId}-tabs`} className="sr-only">
              {labels.tabList}
            </h2>
            <div
              role="tablist"
              aria-labelledby={`${baseId}-tabs`}
              onKeyDown={onKeyDown}
              className={cn(
                // The tabs scroll sideways on phones, bleeding to the margins of the row's frame.
                frame === 'content' ? '-mx-frame px-frame' : '-mx-gutter px-gutter',
                '-mt-1.5 mb-[1.125rem] flex min-h-[3.375rem] items-end gap-4 overflow-x-auto pt-1.5 [scrollbar-width:none] min-[46.875rem]:mx-0 min-[46.875rem]:mt-0 min-[46.875rem]:mb-8 min-[46.875rem]:min-h-[2.625rem] min-[46.875rem]:flex-wrap min-[46.875rem]:justify-center min-[46.875rem]:gap-8 min-[46.875rem]:overflow-visible min-[46.875rem]:px-0 min-[46.875rem]:pt-0',
              )}
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
                    // The reference's tabs: teal and underlined when chosen, teal while pointed at.
                    'shrink-0 border-b-2 pb-2 font-heading text-[1.5rem] leading-[1.1] whitespace-nowrap transition-[color,border-color] duration-200 ease-[ease] first:ml-auto last:mr-auto hover:text-forest-900 min-[46.875rem]:text-[2rem] min-[46.875rem]:first:ml-0 min-[46.875rem]:last:mr-0',
                    index === active
                      ? 'border-forest-900 text-forest-900'
                      : 'border-transparent text-fg',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div
          role={single ? undefined : 'tabpanel'}
          id={`${baseId}-panel`}
          aria-labelledby={single ? undefined : `${baseId}-tab-${current.id}`}
          className={cn('relative', grid || bare ? null : start ? 'mt-6 lg:mt-7' : 'mt-8 lg:mt-9')}
        >
          <ul
            ref={rowRef}
            onScroll={grid ? undefined : measure}
            data-entering={entering ? '' : undefined}
            className={
              grid
                ? cn(
                    'rail-grid grid grid-cols-2 gap-2 min-[46.875rem]:gap-4',
                    whole ? 'min-[75rem]:grid-cols-5' : 'min-[75rem]:grid-cols-4',
                  )
                : 'grid grid-cols-2 gap-2.5 md:-mx-2 md:flex md:snap-x md:snap-mandatory md:scroll-px-2 md:gap-4 md:overflow-x-auto md:overscroll-x-contain md:px-2 md:py-3 md:[scrollbar-width:none]'
            }
          >
            {products.map((product, index) => (
              <li
                key={product.id}
                style={grid ? ({ '--i': index } as CSSProperties) : undefined}
                className={cn(
                  !grid &&
                    'md:w-[calc((100%-2rem)/3)] md:shrink-0 md:snap-start lg:w-[calc((100%-3rem)/4)]',
                  !grid && index >= 4 && 'max-md:hidden',
                )}
              >
                <ProductCard
                  product={product}
                  sizes={grid ? (whole ? WHOLE_SIZES : GRID_SIZES) : CARD_SIZES}
                  priority={active === 0 && index < priorityCount}
                />
              </li>
            ))}
          </ul>
          {!grid && edges.overflow ? (
            <>
              <IconButton
                label={labels.previous}
                icon={<ArrowLeft />}
                variant="outline"
                disabled={edges.atStart}
                onClick={() => page(-1)}
                className={cn(
                  'absolute top-[38%] -left-3 z-10 shadow-soft',
                  frame === 'page' && 'xl:-left-14',
                )}
              />
              <IconButton
                label={labels.next}
                icon={<ArrowRight />}
                variant="outline"
                disabled={edges.atEnd}
                onClick={() => page(1)}
                className={cn(
                  'absolute top-[38%] -right-3 z-10 shadow-soft',
                  frame === 'page' && 'xl:-right-14',
                )}
              />
            </>
          ) : null}
        </div>

        {start || bare || !cta ? null : grid ? (
          <Link
            key={current.id}
            href={current.href}
            data-entering={entering ? '' : undefined}
            className="rail-view-all pill-hover mx-auto mt-8 flex min-h-12 w-fit items-center justify-center rounded-full bg-forest-900 px-8 text-center text-[1rem] leading-6 font-medium text-ivory-50"
          >
            {current.cta}
          </Link>
        ) : (
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
