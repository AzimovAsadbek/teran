'use client';

import { ArrowRight } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { useMatches } from '@/lib/motion';

export interface BusinessCase {
  type: string;
  label: string;
  text: string;
  href: string;
  /** The case's picture in the framed window (wide screens). */
  picture: ReactNode;
  /** The same picture, small, beside the case's name (phones and tablets). */
  thumb: ReactNode;
}

/**
 * Who TERAN works with, as an index: one row per kind of business, each leading to the request
 * form with that kind already chosen. On wide screens a framed window beside the rows shows the
 * picture of the row pointed at or focused, wiping it up over the last one (styles/globals.css,
 * `.wipe-layer`; changed without the wipe with reduced motion); on phones each row carries its
 * own small picture.
 */
export function BusinessIndex({
  title,
  cases,
  headingLevel = 'h3',
}: {
  title: string;
  cases: BusinessCase[];
  /** The index's own heading: under the home section's title (h3) or a page's (h2). */
  headingLevel?: 'h2' | 'h3';
}) {
  const Heading = headingLevel;
  const [active, setActive] = useState(0);
  // The framed window shows from 1024 px, the small pictures below it: each renders (and loads)
  // only on the screens that show it, once the screen is known.
  const wide = useMatches('(min-width: 1024px)');

  return (
    <div className="grid grid-cols-1 gap-x-16 lg:grid-cols-12 lg:items-center">
      <div
        aria-hidden
        className="relative isolate hidden aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#022f2f] lg:col-span-5 lg:block"
      >
        {cases.map((item, index) => (
          <div
            key={item.type}
            data-state={index === active ? 'shown' : index < active ? 'past' : 'next'}
            className="wipe-layer absolute inset-0 isolate overflow-hidden"
            style={{ zIndex: index + 1 } as CSSProperties}
          >
            <div className="wipe-layer-media absolute inset-0">{wide ? item.picture : null}</div>
          </div>
        ))}
      </div>

      <div className="min-w-0 lg:col-span-7">
        <Heading className="font-headline text-[1rem] tracking-[0.12em] text-sun uppercase">
          {title}
        </Heading>
        <ul className="mt-4 border-b border-ivory-50/20">
          {cases.map((item, index) => (
            <li key={item.type} className="border-t border-ivory-50/20">
              <Link
                href={item.href}
                onPointerEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                data-active={index === active ? '' : undefined}
                className="group/case flex items-center gap-4 py-4 focus-visible:outline-sun focus-visible:outline-offset-4 min-[46.875rem]:gap-6 lg:py-5"
              >
                <span
                  aria-hidden
                  className="relative isolate size-[4.5rem] shrink-0 overflow-hidden rounded-[1rem] bg-[#022f2f] min-[46.875rem]:size-24 lg:hidden"
                >
                  {wide === false ? item.thumb : null}
                </span>
                <span
                  aria-hidden
                  className="hidden w-8 shrink-0 font-headline text-[1rem] tracking-[0.06em] text-ivory-50/70 lg:block"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-headline text-[1.5rem] leading-[1.05] text-ivory-50 uppercase transition-[color,translate] duration-500 ease-[var(--ease-out-expo)] group-hover/case:translate-x-1.5 lg:group-data-[active]/case:text-sun min-[46.875rem]:text-[2rem] lg:text-[2.5rem]">
                    {item.label}
                  </span>
                  <span className="mt-1.5 block text-[0.9375rem] leading-snug text-ivory-50/80 min-[46.875rem]:text-[1.0625rem]">
                    {item.text}
                  </span>
                </span>
                {/* An arrow on (not out of) the page: every row leads to TERAN's own form. */}
                <span
                  aria-hidden
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ivory-50/40 text-ivory-50 transition-[background-color,border-color,color] duration-500 ease-[var(--ease-out-expo)] group-hover/case:border-sun group-hover/case:bg-sun group-hover/case:text-ink-900"
                >
                  <ArrowRight className="h-5 w-5 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/case:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
