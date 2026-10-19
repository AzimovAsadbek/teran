import { cn } from '@/lib/cn';

/** A five-pointed star in a 24 px box. */
const STAR =
  'M12 2.6l2.83 5.94 6.53.79-4.8 4.5 1.22 6.47L12 17.15l-5.78 3.15 1.22-6.47-4.8-4.5 6.53-.79z';

function Row() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((index) => (
        <svg key={index} viewBox="0 0 24 24" className="h-[1em] w-[1em] shrink-0" aria-hidden>
          <path d={STAR} fill="currentColor" />
        </svg>
      ))}
    </>
  );
}

/**
 * Five stars filled up to `value` (0 to 5, fractions included: 4.8 fills the fifth star to 80 %),
 * sized by the font size. Decorative: whoever shows them also says the number in words (ADR-042).
 */
export function Stars({ value, className }: { value: number; className?: string }) {
  const filled = (Math.max(0, Math.min(5, value)) / 5) * 100;
  return (
    <span aria-hidden className={cn('relative inline-flex shrink-0 align-[-0.125em]', className)}>
      <span className="flex text-[#e4dccb]">
        <Row />
      </span>
      <span
        className="absolute inset-y-0 left-0 flex overflow-hidden text-[#f0a020]"
        style={{ width: `${filled}%` }}
      >
        <Row />
      </span>
    </span>
  );
}
