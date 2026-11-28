'use client';

import { useId, type ReactNode } from 'react';
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
  const id = useId();
  const descriptions = [aside && `${id}-aside`, description && `${id}-description`]
    .filter(Boolean)
    .join(' ');
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-card border px-4 py-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus motion-safe:transition-[border-color,box-shadow,background-color] motion-safe:duration-150',
        disabled
          ? 'cursor-not-allowed border-line bg-surface-muted/60 text-fg-subtle'
          : checked
            ? 'border-brand bg-brand-soft/40 shadow-[inset_0_0_0_1px_var(--color-brand)]'
            : invalid
              ? 'border-danger/60 bg-surface'
              : 'border-line bg-surface hover:border-brand/50',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-labelledby={`${id}-title`}
        aria-describedby={descriptions || undefined}
        onChange={() => onChange(value)}
        className={cn(radioDotClasses, 'mt-1 shrink-0')}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span id={`${id}-title`} className="text-title-sm text-fg">
            {title}
          </span>
          {aside ? (
            <span id={`${id}-aside`} className="max-w-full text-helper font-semibold text-fg-muted">
              {aside}
            </span>
          ) : null}
        </span>
        {description ? (
          <span id={`${id}-description`} className="mt-1 block text-body-sm text-fg-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
