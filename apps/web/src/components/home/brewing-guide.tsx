'use client';

import { Scale, Thermometer, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

/** General, widely used brewing guidance per tea type (not product claims). */
export const BREWING_GUIDE = [
  { type: 'green', temperature: 80, minMinutes: 2, maxMinutes: 3, grams: 2 },
  { type: 'black', temperature: 95, minMinutes: 3, maxMinutes: 5, grams: 2.5 },
  { type: 'white', temperature: 85, minMinutes: 3, maxMinutes: 5, grams: 2.5 },
  { type: 'oolong', temperature: 90, minMinutes: 3, maxMinutes: 5, grams: 3 },
  { type: 'herbal', temperature: 100, minMinutes: 5, maxMinutes: 7, grams: 2 },
] as const;

export function BrewingGuide() {
  const t = useTranslations('Brewing');
  const baseId = useId();
  const [active, setActive] = useState(0);
  const current = BREWING_GUIDE[active] ?? BREWING_GUIDE[0];

  const facts = [
    {
      icon: Thermometer,
      label: t('temperature'),
      value: t('celsius', { value: current.temperature }),
    },
    {
      icon: Timer,
      label: t('time'),
      value: t('minutes', { min: current.minMinutes, max: current.maxMinutes }),
    },
    { icon: Scale, label: t('amount'), value: t('gramsPerCup', { grams: current.grams }) },
  ];

  return (
    <div className="rounded-[var(--radius-panel)] border border-ivory-200 bg-white p-6 shadow-soft sm:p-8">
      <div role="radiogroup" aria-label={t('chooseType')} className="flex flex-wrap gap-2">
        {BREWING_GUIDE.map((entry, index) => (
          <button
            key={entry.type}
            type="button"
            role="radio"
            aria-checked={index === active}
            onClick={() => setActive(index)}
            className={cn(
              'h-11 rounded-full border px-4 text-sm font-semibold transition-colors',
              index === active
                ? 'border-forest-900 bg-forest-900 text-ivory-50'
                : 'border-ivory-300 text-forest-900 hover:border-forest-900/40',
            )}
          >
            {t(`types.${entry.type}`)}
          </button>
        ))}
      </div>
      <dl id={`${baseId}-facts`} aria-live="polite" className="mt-8 grid gap-4 sm:grid-cols-3">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl bg-ivory-100 p-5">
            <dt className="flex items-center gap-2 text-sm font-semibold text-ink-700">
              <Icon aria-hidden className="h-4 w-4 text-gold-700" />
              {label}
            </dt>
            <dd className="mt-2 font-display text-3xl font-semibold text-forest-900 tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
