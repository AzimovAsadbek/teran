import type { Locale } from '@teran/contracts';
import Image from 'next/image';
import { useId } from 'react';
import { BRAND, BRAND_VALUES, brandValueLabels, type BrandValue } from '@/content/brand';
import { cn } from '@/lib/cn';
import calligraphy from '../../../public/brand/ornaments/green-tea-calligraphy.svg';
import iconNatural from '../../../public/brand/ornaments/icon-natural.svg';
import iconQuality from '../../../public/brand/ornaments/icon-quality.svg';
import iconTaste from '../../../public/brand/ornaments/icon-taste.svg';
import iconVigour from '../../../public/brand/ornaments/icon-vigour.svg';
import seal from '../../../public/brand/ornaments/tea-seal.svg';
import lake from '../../../public/brand/art/lake.webp';

/*
 * Ornaments from the TERAN packaging. The four value icons, the 绿茶 ("green tea") calligraphy and
 * its 茶叶 ("tea leaves") seal are the pack's own vectors (scripts/packaging); the seigaiha waves,
 * the gold rule with its diamond and the "PREMIUM CHINESE TEA" ribbon are redrawn in code after
 * the pack. All of them are decorative: the text they accompany is real text.
 */

const VALUE_ICONS: Record<BrandValue, typeof iconNatural> = {
  natural: iconNatural,
  taste: iconTaste,
  vigour: iconVigour,
  quality: iconQuality,
};

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
              dark ? 'text-ivory-50' : 'text-forest-900',
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

/** 绿茶 ("green tea") with the red 茶叶 seal beneath, as printed beside the logo on the pack. */
export function GreenTeaCalligraphy({ className }: { className?: string }) {
  return <Image src={calligraphy} alt="" aria-hidden className={cn('h-auto', className)} />;
}

/** The red 茶叶 ("tea leaves") seal on its own. */
export function TeaSeal({ className }: { className?: string }) {
  return <Image src={seal} alt="" aria-hidden className={cn('h-auto', className)} />;
}

/**
 * Seigaiha waves, as along the top of the pack, fading out downwards. Place inside a positioned
 * parent and size it with `className`; it draws on white, so tone it with opacity.
 */
export function WavePattern({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute bg-[url(/brand/ornaments/seigaiha.svg)] bg-[length:48px_24px] [mask-image:linear-gradient(to_bottom,#000_20%,transparent)]',
        className,
      )}
    />
  );
}

/**
 * The gold rule with a diamond at its centre, from under the logo on the pack. `animated` draws
 * the two hairlines outwards from the diamond once (skipped with reduced motion).
 */
export function GoldRule({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  const draw = animated && 'motion-safe:animate-draw motion-safe:[animation-delay:160ms]';
  return (
    <div aria-hidden className={cn('flex items-center', className)}>
      <span
        className={cn('h-px flex-1 origin-right bg-linear-to-r from-transparent to-gold-500', draw)}
      />
      <span
        className={cn(
          'mx-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold-500',
          animated && 'motion-safe:animate-fade-in motion-safe:[animation-delay:120ms]',
        )}
      />
      <span
        className={cn('h-px flex-1 origin-left bg-linear-to-l from-transparent to-gold-500', draw)}
      />
    </div>
  );
}

/**
 * The "PREMIUM CHINESE TEA" ribbon that hangs from the top edge of every pack: TERAN green inside
 * a gold border. Real text (the brand descriptor, in English on every pack). Give it a width and a
 * position (`absolute …` or `relative`) through `className`; the lettering scales with the width.
 */
export function Pennant({ className }: { className?: string }) {
  const id = useId();
  const gold = `${id}-gold`;
  const [first, ...rest] = BRAND.descriptor.split(' ');
  return (
    <p
      lang="en"
      className={cn('@container flex aspect-[4/5] flex-col items-center text-ivory-50', className)}
    >
      <svg
        aria-hidden
        viewBox="0 0 120 150"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full drop-shadow-[0_6px_8px_rgb(8_43_13/0.25)]"
      >
        <defs>
          <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b07c00" />
            <stop offset="0.35" stopColor="#efcf4a" />
            <stop offset="0.55" stopColor="#f8e9a0" />
            <stop offset="0.75" stopColor="#d0a20a" />
            <stop offset="1" stopColor="#8a5e00" />
          </linearGradient>
        </defs>
        <path d="M0 0H120V124L60 150L0 124Z" fill={`url(#${gold})`} />
        <path d="M5 0H115V120.7L60 144.6L5 120.7Z" fill="#1a5317" />
        <path
          d="M9.5 0V118L60 140L110.5 118V0"
          fill="none"
          stroke={`url(#${gold})`}
          strokeWidth="0.9"
          opacity="0.85"
        />
      </svg>
      <span className="relative mt-[24cqw] text-[16cqw] leading-none font-semibold tracking-[0.04em]">
        {first}
      </span>
      <span className="relative mt-[5cqw] text-[9cqw] leading-none font-semibold tracking-[0.12em]">
        {rest.join(' ')}
      </span>
    </p>
  );
}

/**
 * A round "moon gate" onto the lake from the front of the pack, in gold rings, with the 茶叶 seal
 * stamped in its corner as on a painting. Decorative.
 */
export function MoonGate({ className, sizes }: { className?: string; sizes: string }) {
  return (
    <div aria-hidden className={cn('relative aspect-square', className)}>
      <span className="absolute inset-0 rounded-full border border-gold-500/35" />
      <span className="absolute inset-[3.5%] rounded-full border-2 border-gold-500/70" />
      <span className="absolute inset-[6%] overflow-hidden rounded-full shadow-soft">
        <Image
          src={lake}
          alt=""
          fill
          sizes={sizes}
          fetchPriority="low"
          className="object-cover object-[30%_55%]"
        />
      </span>
      <TeaSeal className="absolute right-[9%] bottom-[12%] w-[10%] shadow-xs" />
    </div>
  );
}
