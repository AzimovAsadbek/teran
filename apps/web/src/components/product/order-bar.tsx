'use client';

import { ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ButtonLink } from '@/components/ui/button';
import { useFloatingBar, usePrimaryAction } from '@/lib/floating';

/**
 * The product page's "Order" while prices are hidden (ADR-045): the button in its place, and, once
 * it has scrolled up out of view, the same action in a bar at the foot of the screen — the
 * picture, the name and "Order" — so on a phone the one action stays a thumb away. The bar is the
 * purchase bar's pattern (purchase-panel.tsx): rendered into <body>, sliding up once. While the
 * button is in the lower part of the screen the floating contact disc steps aside, and above the
 * bar it rises (lib/floating).
 */
export function OrderBar({
  href,
  label,
  ariaLabel,
  name,
  thumb,
}: {
  href: string;
  label: string;
  ariaLabel: string;
  name: string;
  /** A small square picture (the pack or the first photograph), 96 px or so. */
  thumb: { src: string; alt: string } | null;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);
  usePrimaryAction(buttonRef);
  useFloatingBar(scrolledPast);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    // As the purchase bar's: a root far below the screen, so only leaving past the top counts.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { rootMargin: '0px 0px 100000px 0px' },
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={buttonRef} className="mt-4 w-full sm:w-auto">
        <ButtonLink
          href={href}
          aria-label={ariaLabel}
          size="lg"
          className="w-full gap-2 sm:w-auto sm:min-w-[14rem]"
        >
          {label}
          <ArrowRight aria-hidden className="h-4 w-4" />
        </ButtonLink>
      </div>
      {scrolledPast
        ? createPortal(
            <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 pb-[env(safe-area-inset-bottom)] motion-safe:animate-slide-up">
              <div className="flex w-full max-w-[37.5rem] items-center gap-3 rounded-full border border-line bg-surface py-2 pr-2 pl-2 shadow-overlay">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a small, pre-sized file
                  <img
                    src={thumb.src}
                    alt={thumb.alt}
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-full bg-surface-muted object-cover"
                  />
                ) : null}
                <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-fg sm:text-body">
                  {name}
                </p>
                <ButtonLink href={href} aria-label={ariaLabel} className="shrink-0 gap-2">
                  {label}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
