'use client';

import type { ProductSummaryDto } from '@teran/contracts';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { ProductCard } from '@/components/catalog/product-card';
import { IconButton } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

interface ShowcaseTab {
  id: 'featured' | 'new';
  label: string;
  products: ProductSummaryDto[];
}

export interface ShowcaseLabels {
  title: string;
  tabList: string;
  featured: string;
  latest: string;
  previous: string;
  next: string;
  allTeas: string;
}

const CARD_SIZES = '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 62vw';

/**
 * Tabbed product row. Tabs follow the WAI-ARIA pattern (arrow keys, Home and End move between
 * them). Each row scrolls sideways with snap points: swipe on touch screens, the arrow buttons
 * or Tab through the cards elsewhere. Showing a row rather than a grid keeps any number of
 * products from leaving a half-empty line.
 */
export function ProductShowcase({
  featured,
  latest,
  labels,
}: {
  featured: ProductSummaryDto[];
  latest: ProductSummaryDto[];
  labels: ShowcaseLabels;
}) {
  const baseId = useId();
  const tabs: ShowcaseTab[] = [
    { id: 'featured' as const, label: labels.featured, products: featured },
    { id: 'new' as const, label: labels.latest, products: latest },
  ].filter((tab) => tab.products.length > 0);
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
    // Scroll events fire every frame; only re-render when an edge actually changes.
    setEdges((previous) =>
      previous.overflow === next.overflow &&
      previous.atStart === next.atStart &&
      previous.atEnd === next.atEnd
        ? previous
        : next,
    );
  }, []);

  // ResizeObserver reports once on observe, so the first measurement needs no synchronous call.
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

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className="container-page pt-section-sm pb-section"
    >
      <h2 id={`${baseId}-title`} className="text-display-md text-forest-900">
        {labels.title}
      </h2>
      <div className="mt-5 flex items-center justify-between gap-4 border-b border-line">
        <div
          role="tablist"
          aria-label={labels.tabList}
          onKeyDown={onKeyDown}
          className="-mb-px flex gap-6"
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
                'relative h-11 text-button transition-colors duration-150',
                'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:bg-forest-900 after:transition-transform after:duration-200',
                index === active
                  ? 'text-fg after:scale-x-100'
                  : 'text-fg-subtle after:scale-x-0 hover:text-fg',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex h-11 items-center gap-3">
          <Link
            href="/catalog"
            className="group inline-flex items-center gap-1.5 text-button text-brand underline-offset-4 hover:underline"
          >
            {labels.allTeas}
            <ArrowRight
              aria-hidden
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </Link>
          <div className={cn('hidden gap-1.5 md:flex', !edges.overflow && 'md:invisible')}>
            <IconButton
              label={labels.previous}
              icon={<ArrowLeft />}
              variant="outline"
              size="sm"
              disabled={edges.atStart}
              onClick={() => page(-1)}
            />
            <IconButton
              label={labels.next}
              icon={<ArrowRight />}
              variant="outline"
              size="sm"
              disabled={edges.atEnd}
              onClick={() => page(1)}
            />
          </div>
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        className="mt-6"
      >
        <ul
          ref={rowRef}
          onScroll={measure}
          className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto overscroll-x-contain px-gutter py-2 md:-mx-2 md:scroll-px-2 md:gap-6 md:px-2 md:[scrollbar-width:none]"
        >
          {current.products.map((product) => (
            <li
              key={product.id}
              className="w-[62%] shrink-0 snap-start sm:w-[40%] md:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)]"
            >
              <ProductCard product={product} sizes={CARD_SIZES} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
