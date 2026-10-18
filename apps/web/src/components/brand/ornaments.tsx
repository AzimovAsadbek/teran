import type { Locale } from '@teran/contracts';
import Image from 'next/image';
import { BRAND_VALUES, brandValueLabels, type BrandValue } from '@/content/brand';
import { cn } from '@/lib/cn';
import iconNatural from '../../../public/brand/ornaments/icon-natural.svg';
import iconQuality from '../../../public/brand/ornaments/icon-quality.svg';
import iconTaste from '../../../public/brand/ornaments/icon-taste.svg';
import iconVigour from '../../../public/brand/ornaments/icon-vigour.svg';

/*
 * The four value icons from the TERAN packaging, the pack's own vectors (scripts/packaging).
 * Decorative: the text they accompany is real text.
 */

const VALUE_ICONS: Record<BrandValue, typeof iconNatural> = {
  natural: iconNatural,
  taste: iconTaste,
  vigour: iconVigour,
  quality: iconQuality,
};

/**
 * One of the pack's four ringed icons in the current text colour (drawn through the icon as a
 * mask), for the reference's teal promise icons.
 */
export function ValueMark({ value, className }: { value: BrandValue; className?: string }) {
  const url = `url(${VALUE_ICONS[value].src})`;
  return (
    <span
      aria-hidden
      className={cn('inline-block bg-current', className)}
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  );
}

/** One of the pack's four ringed icons, in TERAN green. */
export function ValueIcon({ value, className }: { value: BrandValue; className?: string }) {
  return <Image src={VALUE_ICONS[value]} alt="" aria-hidden className={cn('h-auto', className)} />;
}

/**
 * The pack's row of values (natural product, refined taste, everyday vigour, quality choice) with
 * the thin dividers between them. On a dark or photographic background (`tone="dark"`) the icons
 * sit in ivory discs and the labels are ivory.
 */
export function BrandValues({
  locale,
  className,
  compact = false,
  tone = 'light',
}: {
  locale: Locale;
  className?: string;
  /** Smaller icons and labels, e.g. beside a product. */
  compact?: boolean;
  tone?: 'light' | 'dark';
}) {
  const labels = brandValueLabels[locale];
  const dark = tone === 'dark';
  return (
    // Two by two on phones (Russian labels are long), one row of four from 640 px, as on the pack.
    <ul className={cn('grid grid-cols-2 gap-y-7 sm:grid-cols-4 sm:gap-y-0', className)}>
      {BRAND_VALUES.map((value, index) => (
        <li
          key={value}
          className={cn(
            'flex flex-col items-center px-2 text-center sm:px-3',
            dark ? 'border-ivory-50/35' : 'border-gold-500/35',
            index % 2 === 1 && 'border-l',
            index === 2 && 'sm:border-l',
          )}
        >
          {dark ? (
            <span className="flex rounded-full bg-ivory-50 p-1">
              <ValueIcon value={value} className={compact ? 'w-8' : 'w-10 sm:w-12'} />
            </span>
          ) : (
            <ValueIcon value={value} className={compact ? 'w-9' : 'w-11 sm:w-14'} />
          )}
          <span
            className={cn(
              'mt-2.5 max-w-[10rem] font-bold tracking-[0.06em] text-balance uppercase',
              dark ? 'text-ivory-50' : 'text-fg',
              compact ? 'text-[0.625rem] leading-tight' : 'text-micro sm:text-caption',
            )}
          >
            {labels[value]}
          </span>
        </li>
      ))}
    </ul>
  );
}
