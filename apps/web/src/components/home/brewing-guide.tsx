'use client';

import { Scale, Thermometer, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

interface BrewingEntry {
  code: string;
  grams: number;
  gramsMax?: number;
  temperature: number;
  temperatureMax?: number;
  minMinutes: number;
  maxMinutes: number;
}

/**
 * How to brew each of the five TERAN teas, as the owner gives it (2026-10-17): grams per 250 ml,
 * water temperature and steeping time. The same values are on each product's page.
 */
export const BREWING_GUIDE: readonly BrewingEntry[] = [
  { code: 'XC2025', grams: 5, temperature: 80, temperatureMax: 90, minMinutes: 2, maxMinutes: 3 },
  { code: 'G8810', grams: 5, temperature: 90, minMinutes: 2, maxMinutes: 3 },
  {
    code: '8800',
    grams: 3,
    gramsMax: 5,
    temperature: 85,
    temperatureMax: 90,
    minMinutes: 2,
    maxMinutes: 2,
  },
  {
    code: '8830',
    grams: 3,
    gramsMax: 5,
    temperature: 85,
    temperatureMax: 90,
    minMinutes: 2,
    maxMinutes: 2,
  },
  {
    code: '8009',
    grams: 3,
    gramsMax: 5,
    temperature: 85,
    temperatureMax: 90,
    minMinutes: 2,
    maxMinutes: 2,
  },
];

/** The pack's "Tayyorlash usuli" panel: a green title bar and the facts side by side. */
export function BrewingGuide() {
  const t = useTranslations('Brewing');
  const baseId = useId();
  const [active, setActive] = useState(0);
  const current = BREWING_GUIDE[active] ?? BREWING_GUIDE[0]!;

  const facts = [
    {
      icon: Scale,
      label: t('amount'),
      value: current.gramsMax
        ? t('gramsRangePerCup', { min: current.grams, max: current.gramsMax })
        : t('gramsPerCup', { grams: current.grams }),
    },
    {
      icon: Thermometer,
      label: t('temperature'),
      value: current.temperatureMax
        ? t('celsiusRange', { min: current.temperature, max: current.temperatureMax })
        : t('celsius', { value: current.temperature }),
    },
    {
      icon: Timer,
      label: t('time'),
      value:
        current.maxMinutes !== current.minMinutes
          ? t('minutes', { min: current.minMinutes, max: current.maxMinutes })
          : t('minutesSingle', { min: current.minMinutes }),
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
          <legend className="sr-only">{t('chooseTea')}</legend>
          <div className="flex flex-wrap justify-center gap-2">
            {BREWING_GUIDE.map((entry, index) => (
              <label
                key={entry.code}
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
                  value={entry.code}
                  checked={index === active}
                  onChange={() => setActive(index)}
                  className="sr-only"
                />
                TERAN {entry.code}
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
                <span className="mt-3 text-title-lg text-fg sm:text-[1.5rem] sm:leading-tight">
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
