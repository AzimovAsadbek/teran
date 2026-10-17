import { cn } from '@/lib/cn';

/**
 * The reference's round rubber stamp ("davidstea QUALITY"): two rings, a small soft-serif word
 * over a condensed one, tilted. Decorative: the words it carries are said elsewhere on the page.
 */
export function Stamp({ top, word, className }: { top: string; word: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex aspect-square w-28 -rotate-12 flex-col items-center justify-center rounded-full border-[3px] border-current px-3 text-center outline-2 outline-offset-[3px] outline-current outline-solid sm:w-32',
        className,
      )}
    >
      <span className="font-heading text-[0.9375rem] leading-none">{top}</span>
      <span className="mt-1 font-headline text-[1.375rem] leading-[0.9] [overflow-wrap:anywhere] sm:text-[1.625rem]">
        {word}
      </span>
    </span>
  );
}
