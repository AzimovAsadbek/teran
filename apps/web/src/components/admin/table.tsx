import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/*
 * Admin lists. From 768 px they are tables; below that every row becomes a card with its cells
 * stacked, each repeating its column name (hidden from assistive technology, which still gets the
 * header cells). A row whose main link has `table.rowLink` opens with a click anywhere on it.
 * No client directive: server pages and client managers both use these.
 */
export const table = {
  wrapper: 'md:overflow-x-auto md:rounded-card md:border md:border-line md:bg-surface',
  table: cn(
    'w-full text-left text-body-sm text-fg md:min-w-[40rem]',
    'md:[&_tbody_tr:last-child_td]:border-b-0 md:[&_tbody_tr]:transition-colors md:[&_tbody_tr:hover]:bg-surface-muted/50',
    'max-md:block max-md:[&_thead]:sr-only max-md:[&_tbody]:grid max-md:[&_tbody]:gap-3',
    'max-md:[&_tbody_tr]:grid max-md:[&_tbody_tr]:gap-2 max-md:[&_tbody_tr]:rounded-card max-md:[&_tbody_tr]:border max-md:[&_tbody_tr]:border-line max-md:[&_tbody_tr]:bg-surface max-md:[&_tbody_tr]:p-4',
  ),
  th: 'border-b border-line bg-surface-muted/60 px-4 py-3 text-caption font-semibold tracking-[0.06em] whitespace-nowrap text-fg-subtle uppercase',
  td: 'border-b border-line-subtle px-4 py-3 align-middle max-md:flex max-md:min-w-0 max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:border-0 max-md:p-0',
  link: 'font-semibold text-brand underline-offset-4 hover:underline',
  /** A row that opens as a whole; put `rowLink` on its main link. */
  row: 'relative cursor-pointer',
  rowLink:
    'font-semibold text-brand underline-offset-4 after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:rounded-card focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-focus',
  /** A control inside a linked row that must stay clickable on its own. */
  above: 'relative z-10',
};

/**
 * One cell. `label` is the column name repeated on phones; the `primary` cell (the row's name or
 * number) opens the card without a label.
 */
export function Cell({
  label,
  primary = false,
  className,
  children,
}: {
  label?: string;
  primary?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <td className={cn(table.td, primary && 'max-md:block', className)}>
      {label && !primary ? (
        <span aria-hidden className="shrink-0 text-helper text-fg-subtle md:hidden">
          {label}
        </span>
      ) : null}
      <span className={cn('min-w-0', primary ? 'block' : 'max-md:text-right')}>{children}</span>
    </td>
  );
}
