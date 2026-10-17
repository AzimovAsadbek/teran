'use client';

import { Minus, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Accessible name of the group, e.g. "Quantity of Classic black tea". */
  label: string;
  /** `lg`: as tall as a large button and as wide as its container (beside add to bag). */
  size?: 'sm' | 'md' | 'lg';
}

/** −/+ stepper with an announced value; never exceeds the stock-derived maximum. */
export function QuantityStepper({
  value,
  max,
  onChange,
  disabled = false,
  label,
  size = 'md',
}: QuantityStepperProps) {
  const t = useTranslations('Product');
  const height = size === 'sm' ? 'h-9' : size === 'lg' ? 'h-13' : 'h-12';
  const button = cn(
    'inline-flex aspect-square items-center justify-center rounded-full text-fg transition-colors duration-150 hover:bg-brand/[0.06]',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-35 aria-disabled:hover:bg-transparent',
    size === 'sm' ? 'h-[calc(100%-4px)]' : 'h-[calc(100%-6px)]',
  );
  // aria-disabled rather than disabled: a disabled button would drop keyboard focus to the page
  // the moment the quantity reaches a limit or an update is in flight.
  const canDecrease = !disabled && value > 1;
  const canIncrease = !disabled && value < max;

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-between rounded-full border border-line-strong/60 bg-surface px-[3px] shadow-xs',
        size === 'sm' ? 'w-[6.5rem]' : size === 'lg' ? 'w-full' : 'w-36',
        height,
      )}
    >
      <button
        type="button"
        className={button}
        onClick={() => {
          if (canDecrease) onChange(value - 1);
        }}
        aria-disabled={!canDecrease || undefined}
        aria-label={t('decrease')}
      >
        <Minus aria-hidden className="h-4 w-4" />
      </button>
      <output
        aria-live="polite"
        className={cn(
          'min-w-8 text-center font-semibold figures',
          size === 'sm' ? 'text-body-sm' : 'text-body',
        )}
      >
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => {
          if (canIncrease) onChange(value + 1);
        }}
        aria-disabled={!canIncrease || undefined}
        aria-label={t('increase')}
      >
        <Plus aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
