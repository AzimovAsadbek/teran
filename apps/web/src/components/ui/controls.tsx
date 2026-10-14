import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/*
 * Shared control styling (docs/design/component-audit.md). Kept free of a client directive so both
 * server components (admin filters, search page) and client components can use these helpers.
 * Sizes step by 4 px and line up with the buttons: xs 36, sm 44, md 48, lg 52.
 */

export type ControlSize = 'xs' | 'sm' | 'md' | 'lg';

const CONTROL =
  'rounded-control border bg-surface text-fg shadow-xs outline-none ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ease-[var(--ease-standard)] ' +
  'placeholder:text-fg-subtle hover:border-fg-subtle focus:border-focus focus:ring-[3px] focus:ring-focus/15 ' +
  'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-muted disabled:text-fg-subtle ' +
  // :read-only also matches every <select>, so the read-only look is limited to text fields.
  '[&:is(input,textarea):read-only]:bg-surface-muted';

const CONTROL_SIZES: Record<ControlSize, string> = {
  xs: 'h-9 px-3 text-body-sm',
  sm: 'h-11 px-3 text-body-sm',
  md: 'h-12 px-3.5 text-body',
  lg: 'h-13 px-4 text-body',
};

/** Classes for a text-like control; also used by search boxes and admin filters. */
export function inputClasses({
  invalid = false,
  size = 'md',
  fullWidth = true,
  className,
}: {
  invalid?: boolean;
  size?: ControlSize;
  /** Controls fill their container by default; toolbars size them to their content instead. */
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    CONTROL,
    CONTROL_SIZES[size],
    fullWidth ? 'w-full' : 'w-auto',
    invalid
      ? 'border-danger hover:border-danger focus:border-danger focus:ring-danger/15'
      : 'border-line-strong',
    className,
  );
}

/** Classes for a multi-line field: grows with its rows, never shorter than seven lines of 16 px. */
export function textareaClasses({
  invalid = false,
  className,
}: { invalid?: boolean; className?: string } = {}): string {
  return cn(
    CONTROL,
    'block min-h-28 w-full resize-y px-3.5 py-3 text-body',
    invalid
      ? 'border-danger hover:border-danger focus:border-danger focus:ring-danger/15'
      : 'border-line-strong',
    className,
  );
}

/** Classes for a native select with room for the chevron (render <SelectChevron /> next to it). */
export function selectClasses(
  options: {
    invalid?: boolean;
    size?: ControlSize;
    fullWidth?: boolean;
    className?: string;
  } = {},
): string {
  return inputClasses({
    ...options,
    className: cn('cursor-pointer appearance-none pr-10', options.className),
  });
}

export function SelectChevron({ className }: { className?: string }) {
  return (
    <ChevronDown
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-fg-subtle',
        className,
      )}
    />
  );
}

/** Classes for a native radio dot (pack sizes, delivery choices and similar use cards around it). */
export const radioDotClasses =
  'h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-full border border-line-strong bg-surface transition-[border-width,border-color] duration-150 checked:border-[6px] checked:border-brand hover:not-checked:border-fg-subtle disabled:cursor-not-allowed disabled:opacity-50';
