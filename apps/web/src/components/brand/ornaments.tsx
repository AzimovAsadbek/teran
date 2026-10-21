import Image from 'next/image';
import type { BrandValue } from '@/content/brand';
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

/** One of the pack's four ringed icons, in TERAN green. */
export function ValueIcon({ value, className }: { value: BrandValue; className?: string }) {
  return <Image src={VALUE_ICONS[value]} alt="" aria-hidden className={cn('h-auto', className)} />;
}
