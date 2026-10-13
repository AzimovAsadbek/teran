'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
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
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: ReactNode;
  aside?: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
}) {
  return (
    <label
      className={cn(
        'relative flex cursor-pointer gap-3 rounded-2xl border-2 bg-white px-4 py-3.5 transition-colors',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-700',
        checked
          ? 'border-forest-900'
          : invalid
            ? 'border-danger-700/60'
            : 'border-ivory-300 hover:border-forest-900/40',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
          checked ? 'border-forest-900 bg-forest-900 text-ivory-50' : 'border-sage-500 bg-white',
        )}
      >
        {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-semibold text-forest-900">{title}</span>
          {aside ? <span className="text-sm font-semibold text-forest-900">{aside}</span> : null}
        </span>
        {description ? (
          <span className="mt-1 block text-sm text-ink-700">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
