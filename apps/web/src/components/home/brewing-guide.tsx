'use client';

import { Scale, Thermometer, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Brewing guidance per tea type. Green tea follows the instructions printed on TERAN's green tea
 * packs (5 g per 250 ml, 90 °C, 2–3 minutes); the other types carry general, widely used guidance
 * (not product claims).
 */
export const BREWING_GUIDE = [
  { type: 'green', temperature: 90, minMinutes: 2, maxMinutes: 3, grams: 5 },
  { type: 'black', temperature: 95, minMinutes: 3, maxMinutes: 5, grams: 2.5 },
  { type: 'white', temperature: 85, minMinutes: 3, maxMinutes: 5, grams: 2.5 },
  { type: 'oolong', temperature: 90, minMinutes: 3, maxMinutes: 5, grams: 3 },
  { type: 'puerh', temperature: 95, minMinutes: 3, maxMinutes: 5, grams: 3 },
] as const;

/** The pack's "Tayyorlash usuli" panel: a green title bar and the facts side by side. */
export function BrewingGuide() {
  const t = useTranslations('Brewing');
  const baseId = useId();
  const [active, setActive] = useState(0);
  const current = BREWING_GUIDE[active] ?? BREWING_GUIDE[0];

  const facts = [
    { icon: Scale, label: t('amount'), value: t('gramsPerCup', { grams: current.grams }) },
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
  ];

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-soft">
      <p className="bg-forest-700 px-5 py-2.5 text-center text-caption font-bold tracking-[0.16em] text-ivory-50 uppercase">
        {t('method')}
      </p>
      <div className="p-5 sm:p-8">
        {/* Native radios: one tab stop and arrow-key selection come from the browser. */}
        <fieldset>
          <legend className="sr-only">{t('chooseType')}</legend>
          <div className="flex flex-wrap justify-center gap-2">
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
          className="mt-6 grid grid-cols-3 rounded-card border border-line sm:mt-8"
        >
          {facts.map(({ icon: Icon, label, value }, index) => (
            <div
              key={label}
              className={cn(
                'flex flex-col items-center px-2 py-5 text-center sm:px-4 sm:py-6',
                index > 0 && 'border-l border-line',
              )}
            >
              {/* The label reads first; on screen it sits under the value, as on the pack. */}
              <dt className="order-2 mt-1.5 text-caption text-fg-subtle">{label}</dt>
              <dd className="order-1 flex flex-col items-center">
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-forest-700 text-forest-700"
                >
                  <Icon className="h-[1.125rem] w-[1.125rem]" />
                </span>
                <span className="mt-3 text-title-lg text-forest-900 sm:text-[1.5rem] sm:leading-tight">
                  {value}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
