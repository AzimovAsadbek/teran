import type { ReactNode } from 'react';

/**
 * The product cards' small icons, lucide's own drawings (lucide-react 1.55), defined once per page
 * and drawn by reference: a listing repeats each card's icons dozens of times, and both the HTML
 * and the page's React payload would carry every path of every copy.
 */
const SHAPES = {
  thermometer: <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" />,
  timer: (
    <>
      <line x1="10" x2="14" y1="2" y2="2" />
      <line x1="12" x2="15" y1="14" y2="11" />
      <circle cx="12" cy="14" r="8" />
    </>
  ),
  package: (
    <>
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <path d="m7.5 4.27 9 5.15" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type CardIconName = keyof typeof SHAPES;

/** The icons, hidden: once in every layout that shows product cards. */
export function CardIconSprite() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      {Object.entries(SHAPES).map(([name, shape]) => (
        <symbol
          key={name}
          id={`card-icon-${name}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {shape}
        </symbol>
      ))}
    </svg>
  );
}

/** One of the icons, in the current text colour; sized by its class. Decorative. */
export function CardIcon({ name, className }: { name: CardIconName; className?: string }) {
  return (
    <svg aria-hidden className={className}>
      <use href={`#card-icon-${name}`} />
    </svg>
  );
}
