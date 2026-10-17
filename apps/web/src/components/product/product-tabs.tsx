'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ProductTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * The reference's product tabs (about · taste · ingredients · highlights) under the price: one row
 * of uppercase labels, the active one underlined. Every panel is in the page (hidden when not
 * selected), so all of the text is there for search engines and for reading without JavaScript.
 * WAI-ARIA tabs: ←/→, Home and End move between them.
 */
export function ProductTabs({ tabs, label }: { tabs: ProductTab[]; label: string }) {
  const baseId = useId();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  if (tabs.length === 0) return null;

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
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="mt-7">
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        // One row that scrolls sideways on narrow screens instead of wrapping.
        className="-mx-gutter flex gap-x-6 overflow-x-auto px-gutter [scrollbar-width:none] sm:mx-0 sm:gap-x-7 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={index === active}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            className={cn(
              'relative min-h-11 shrink-0 pb-1 text-[1rem] font-medium tracking-[0.02em] whitespace-nowrap uppercase transition-colors duration-150 sm:text-[1.0625rem]',
              'after:absolute after:inset-x-0 after:bottom-1 after:h-0.5 after:bg-forest-900 after:transition-transform after:duration-200',
              index === active
                ? 'text-forest-900 after:scale-x-100'
                : 'text-fg after:scale-x-0 hover:text-forest-800',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={index !== active}
          tabIndex={0}
          className="pt-4 text-body text-fg focus-visible:outline-offset-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
