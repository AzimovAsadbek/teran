'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const WIDE = '(min-width: 61.875rem)';

/**
 * A column of footer links as the reference's: one disclosure whose heading row (heading and
 * caret over a rule) opens the list on phones; from 990 px the list always shows under a plain
 * heading (the browser's `::details-content` is kept open). Browsers without that pseudo-element
 * get the disclosure opened while the window is wide.
 */
export function FooterColumn({
  title,
  className,
  headingClassName,
  children,
}: {
  title: string;
  className?: string;
  headingClassName: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (CSS.supports('selector(::details-content)')) return;
    const wide = window.matchMedia(WIDE);
    const sync = () => {
      if (ref.current) ref.current.open = wide.matches;
    };
    sync();
    wide.addEventListener('change', sync);
    return () => wide.removeEventListener('change', sync);
  }, []);

  return (
    <details
      ref={ref}
      className={cn(
        'group border-b border-[#ccc] pt-4 pb-[1.0625rem] min-[61.875rem]:border-0 min-[61.875rem]:p-0 min-[61.875rem]:details-content:block min-[61.875rem]:details-content:h-auto min-[61.875rem]:details-content:[content-visibility:visible]',
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 min-[61.875rem]:pointer-events-none min-[61.875rem]:cursor-auto [&::-webkit-details-marker]:hidden">
        <span className={headingClassName}>{title}</span>
        <ChevronDown
          aria-hidden
          className="h-6 w-6 shrink-0 transition-transform duration-200 ease-[ease] group-open:rotate-180 min-[61.875rem]:hidden"
        />
      </summary>
      <ul className="mt-4 flex flex-col gap-4">{children}</ul>
    </details>
  );
}
