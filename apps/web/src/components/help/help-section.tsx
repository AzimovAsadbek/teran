'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Three rows of three squares, as the reference's grid switch. */
function GridIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 14 14" className={className} fill="currentColor">
      {[0, 5, 10].flatMap((y) =>
        [0, 5, 10].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="0.6" />),
      )}
    </svg>
  );
}

/** Three dots with their lines, as the reference's list switch. */
function ListIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 12" className={className} fill="currentColor">
      {[1, 6, 11].map((y) => (
        <g key={y}>
          <circle cx="1.2" cy={y} r="1.2" />
          <rect x="4" y={y - 0.9} width="12" height="1.8" rx="0.9" />
        </g>
      ))}
    </svg>
  );
}

/**
 * A help-centre heading with the reference's grid/list switch at the right (84 by 36 px, a teal
 * tile sliding under the chosen view), over the cards it lays out. The cards read the choice from
 * `data-mode` on their wrapper (`group-data-[mode=list]/mode:` classes). Phones always see the
 * grid and no switch, as on the reference.
 */
export function HelpSection({
  heading,
  level = 2,
  headingClassName,
  headerClassName,
  className,
  labels,
  children,
}: {
  heading: string;
  level?: 1 | 2;
  headingClassName?: string;
  headerClassName?: string;
  className?: string;
  labels: { toList: string; toGrid: string };
  children: ReactNode;
}) {
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const Heading = level === 1 ? 'h1' : 'h2';
  const list = mode === 'list';
  return (
    <section className={className}>
      <div className={cn('flex items-start justify-between gap-4', headerClassName)}>
        <Heading className={headingClassName}>{heading}</Heading>
        <button
          type="button"
          aria-label={list ? labels.toGrid : labels.toList}
          onClick={() => setMode(list ? 'grid' : 'list')}
          className="relative hidden h-9 w-[5.25rem] shrink-0 rounded-[0.25rem] bg-[#02b1af]/8 min-[48rem]:block"
        >
          <span
            aria-hidden
            className={cn(
              'absolute top-1 left-1 h-7 w-9 rounded-[0.25rem] bg-[#02b1af] transition-transform duration-200 ease-in-out',
              list && 'translate-x-10',
            )}
          />
          <span aria-hidden className="absolute inset-1 flex items-center">
            <span className="flex w-9 justify-center">
              <GridIcon className={cn('h-3.5 w-3.5', list ? 'text-[#02b1af]' : 'text-white')} />
            </span>
            <span className="ml-1 flex w-9 justify-center">
              <ListIcon className={cn('h-3 w-4', list ? 'text-white' : 'text-[#02b1af]')} />
            </span>
          </span>
        </button>
      </div>
      <div data-mode={mode} className="group/mode">
        {children}
      </div>
    </section>
  );
}
