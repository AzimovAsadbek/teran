'use client';

import type { ReactNode } from 'react';
import { radioDotClasses } from '@/components/ui/field';
import { cn } from '@/lib/cn';

/** A native radio input presented as a selectable card (keyboard and screen-reader behaviour stay native). */
export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  aside,
  description,
  invalid,
  disabled,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: ReactNode;
  aside?: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
  /** Shown but not selectable (e.g. a payment method that is not configured). */
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer gap-3 rounded-control border px-4 py-3.5 transition-[border-color,box-shadow,background-color] duration-150',
        disabled
          ? 'cursor-not-allowed border-line bg-surface-muted/60 text-fg-subtle'
          : checked
            ? 'border-brand bg-brand-soft/40 shadow-[inset_0_0_0_1px_var(--color-brand)]'
            : invalid
              ? 'border-danger/60 bg-surface'
              : 'border-line-strong/45 bg-surface hover:border-brand/50',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className={cn(radioDotClasses, 'mt-0.5')}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-title-sm text-fg">{title}</span>
          {aside ? <span className="text-body-sm font-semibold text-fg">{aside}</span> : null}
        </span>
        {description ? (
          <span className="mt-1 block text-body-sm text-fg-muted">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
