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
    <div className="rounded-panel border border-line bg-surface p-5 shadow-soft sm:p-8">
      {/* Native radios: one tab stop and arrow-key selection come from the browser. */}
      <fieldset>
        <legend className="sr-only">{t('chooseType')}</legend>
        <div className="flex flex-wrap gap-2">
          {BREWING_GUIDE.map((entry, index) => (
            <label
              key={entry.type}
              className={cn(
                'inline-flex h-10 cursor-pointer items-center rounded-full border px-4 text-body-sm font-semibold transition-colors duration-150',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                index === active
                  ? 'border-brand bg-brand text-fg-inverse'
                  : 'border-line-strong/50 bg-surface text-fg hover:border-brand/60',
              )}
            >
              <input
                type="radio"
                name={`${baseId}-type`}
                value={entry.type}
                checked={index === active}
                onChange={() => setActive(index)}
                className="sr-only"
              />
              {t(`types.${entry.type}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <dl
        id={`${baseId}-facts`}
        aria-live="polite"
        className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3"
      >
        {facts.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 rounded-card bg-surface-muted px-5 py-4 sm:block sm:p-5"
          >
            <dt className="flex items-center gap-2 text-label text-fg-muted">
              <Icon aria-hidden className="h-4 w-4 text-accent-fg" />
              {label}
            </dt>
            <dd className="text-metric text-forest-900 sm:mt-3">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
