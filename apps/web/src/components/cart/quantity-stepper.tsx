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
  size?: 'sm' | 'md';
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
  const height = size === 'sm' ? 'h-9' : 'h-12';
  const button = cn(
    'inline-flex aspect-square items-center justify-center rounded-full text-forest-900 transition-colors hover:bg-forest-900/[0.06] disabled:opacity-35 disabled:hover:bg-transparent',
    height,
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex items-center rounded-full border border-sage-500 bg-white',
        height,
      )}
    >
      <button
        type="button"
        className={button}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label={t('decrease')}
      >
        <Minus aria-hidden className="h-4 w-4" />
      </button>
      <output aria-live="polite" className="min-w-8 text-center text-sm font-semibold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label={t('increase')}
      >
        <Plus aria-hidden className="h-4 w-4" />
      </button>
    </div>
  );
}
