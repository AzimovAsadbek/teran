'use client';

import type { ProductSummaryDto } from '@teran/contracts';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { ProductCard } from '@/components/catalog/product-card';
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
}

/** Tabbed product rows (WAI-ARIA tabs: arrow keys move between tabs). */
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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = tabs[Math.min(active, tabs.length - 1)];

  if (!current) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (active + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-labelledby={`${baseId}-title`} className="container-page py-16 lg:py-24">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h2 id={`${baseId}-title`} className="text-display-lg max-w-xl text-forest-900">
          {labels.title}
        </h2>
        <div
          role="tablist"
          aria-label={labels.tabList}
          onKeyDown={onKeyDown}
          className="inline-flex self-start rounded-full bg-ivory-100 p-1"
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
              onClick={() => setActive(index)}
              className={cn(
                'h-11 rounded-full px-5 text-sm font-semibold transition-colors',
                index === active
                  ? 'bg-forest-900 text-ivory-50 shadow-soft'
                  : 'text-forest-900 hover:bg-ivory-200/70',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        tabIndex={0}
        className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-12 md:overflow-visible md:px-0 xl:grid-cols-4"
      >
        {current.products.map((product) => (
          <div key={product.id} className="w-[68%] shrink-0 snap-start sm:w-[44%] md:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
