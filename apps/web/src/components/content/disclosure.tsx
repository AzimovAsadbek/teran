import { Leaf } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A question that opens on its answer (ADR-051, UNFURL): a native `<details>`, so it works and is
 * found by the browser's search without JavaScript; its leaf opens from curled as it opens, and
 * where the browser can animate a details element's height the answer unrolls with it
 * (styles/globals.css, `.unfurl-details`). For the help centre and the for-business questions.
 */
export function Disclosure({
  question,
  children,
  headingLevel,
  size = 'md',
  className,
}: {
  question: string;
  children: ReactNode;
  /** A heading inside the summary, so the questions can be listed by heading. */
  headingLevel?: 'h2' | 'h3';
  size?: 'md' | 'lg';
  className?: string;
}) {
  const Question = headingLevel ?? 'span';
  return (
    <details className={cn('unfurl-details group border-b border-line', className)}>
      <summary className="-mx-3 flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-3 py-4 [&::-webkit-details-marker]:hidden">
        <Question
          className={cn(
            'font-heading leading-snug text-fg',
            size === 'lg' ? 'text-[1.1875rem] sm:text-[1.3125rem]' : 'text-[1.1875rem]',
          )}
        >
          {question}
        </Question>
        <Leaf aria-hidden className="unfurl-mark h-5 w-5 shrink-0 text-forest-900" />
      </summary>
      <div className="max-w-[42rem] space-y-3 pb-6 text-[1rem] leading-relaxed text-fg-muted">
        {children}
      </div>
    </details>
  );
}
