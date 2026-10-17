import type { Locale } from '@teran/contracts';
import { useId } from 'react';
import { cn } from '@/lib/cn';

/**
 * The flag of each storefront language, drawn in code (3:2, rounded, with a hairline edge so the
 * white bands read on white): Uzbekistan for Uzbek, Russia for Russian, the United Kingdom for
 * English. Decorative: the language's name is always written beside it.
 */
export function LanguageFlag({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-[0.1875rem]',
        className ?? 'h-4 w-6',
      )}
    >
      {locale === 'uz' ? <Uzbekistan /> : locale === 'ru' ? <Russia /> : <UnitedKingdom />}
      {/* The hairline edge, over the picture (an inset shadow on the frame would sit under it). */}
      <span className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(0_0_0_/_12%)]" />
    </span>
  );
}

const FILL = 'block h-full w-full';

/** Blue, white and green bands parted by red, the crescent and the twelve stars at the hoist. */
function Uzbekistan() {
  // Stars in rows of three, four and five, right-aligned, as on the flag.
  const stars = [
    ...[0, 1, 2].map((i) => [196 - i * 24, 24] as const),
    ...[0, 1, 2, 3].map((i) => [196 - i * 24, 48] as const),
    ...[0, 1, 2, 3, 4].map((i) => [196 - i * 24, 72] as const),
  ];
  return (
    <svg viewBox="0 0 375 250" preserveAspectRatio="xMidYMid slice" className={FILL}>
      <rect width="375" height="250" fill="#1eb53a" />
      <rect width="375" height="125" fill="#0099b5" />
      <rect y="80" width="375" height="90" fill="#ce1126" />
      <rect y="85" width="375" height="80" fill="#fff" />
      <circle cx="70" cy="40" r="30" fill="#fff" />
      <circle cx="80" cy="40" r="30" fill="#0099b5" />
      {stars.map(([x, y]) => (
        <path
          key={`${x}-${y}`}
          transform={`translate(${x} ${y - 6}) scale(0.62)`}
          fill="#fff"
          d="M0-9.6 2.2-3 9.1-3 3.5 1.1 5.6 7.8 0 3.7-5.6 7.8-3.5 1.1-9.1-3-2.2-3Z"
        />
      ))}
    </svg>
  );
}

/** White, blue and red bands. */
function Russia() {
  return (
    <svg viewBox="0 0 9 6" preserveAspectRatio="none" className={FILL}>
      <rect width="9" height="2" fill="#fff" />
      <rect y="2" width="9" height="2" fill="#0039a6" />
      <rect y="4" width="9" height="2" fill="#d52b1e" />
    </svg>
  );
}

/** The Union Flag: blue field, the white-edged red crosses of St George, St Andrew and St Patrick. */
function UnitedKingdom() {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className={FILL}>
      <defs>
        <clipPath id={`${id}-s`}>
          <path d="M0 0v30h60V0z" />
        </clipPath>
        <clipPath id={`${id}-t`}>
          <path d="M30 15h30v15zv15H0zH0V0zV0h30z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-s)`}>
        <path d="M0 0v30h60V0z" fill="#012169" />
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0 0l60 30m0-30L0 30"
          clipPath={`url(#${id}-t)`}
          stroke="#c8102e"
          strokeWidth="4"
        />
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10" />
        <path d="M30 0v30M0 15h60" stroke="#c8102e" strokeWidth="6" />
      </g>
    </svg>
  );
}
