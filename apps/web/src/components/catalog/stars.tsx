import { cn } from '@/lib/cn';

/**
 * Five stars filled up to `value` (0 to 5, fractions included: 4.8 fills the fifth star to 80 %),
 * sized by the font size. Decorative: whoever shows them also says the number in words (ADR-042).
 * Each row is one star drawn by a repeated mask (`star-row`), not ten SVGs: a listing shows a row
 * per card, and the page's HTML and its React payload repeat every element of it.
 */
export function Stars({ value, className }: { value: number; className?: string }) {
  const filled = (Math.max(0, Math.min(5, value)) / 5) * 100;
  return (
    <span
      aria-hidden
      className={cn('relative inline-block h-[1em] w-[5em] shrink-0 align-[-0.125em]', className)}
    >
      <span className="star-row absolute inset-0 bg-[#e4dccb]" />
      <span
        className="star-row absolute inset-y-0 left-0 bg-[#f0a020]"
        style={{ width: `${filled}%` }}
      />
    </span>
  );
}
