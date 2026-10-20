import type { BrewingDto } from '@teran/contracts';

/** The `Brewing` messages the measures are worded with. */
type BrewingKey =
  | 'amount'
  | 'gramsPerCup'
  | 'gramsRangePerCup'
  | 'temperature'
  | 'celsius'
  | 'celsiusRange'
  | 'time'
  | 'minutes'
  | 'minutesSingle';

/** A translator of the `Brewing` messages (next-intl's, from the server or the client). */
type BrewingT = (key: BrewingKey, values?: Record<string, string | number>) => string;

/**
 * One brewing measure as the gauge shows it (components/brand/brewing-gauge.tsx): its name, the
 * pack's value in words ("80–90 °C") and the same range in numbers, read against a fixed scale so
 * two teas can be compared at a glance. A single value has `min` equal to `max`.
 */
export interface BrewingMeasure {
  key: 'temperature' | 'time' | 'amount';
  label: string;
  value: string;
  min: number;
  max: number;
  /** The ruler the range is read against (the amount's is its number of leaves). */
  scale: { from: number; to: number; ticks: number[] };
  /** The scale's two ends in words ("60 °C", "5 min"); none for the amount, read as leaves. */
  ends: [string, string] | null;
}

/**
 * The scales: water for tea from 60 °C to boiling; up to five minutes (ten for the infusions that
 * steep longer); up to six grams a cup. Fixed, so any two teas are read against the same rulers.
 */
export const BREWING_SCALES = {
  temperature: { from: 60, to: 100, ticks: [60, 70, 80, 90, 100] },
  time: { from: 0, to: 300, ticks: [0, 60, 120, 180, 240, 300] },
  longTime: { from: 0, to: 600, ticks: [0, 120, 240, 360, 480, 600] },
  amount: { from: 0, to: 6, ticks: [] as number[] },
};

/** "2" or "2.5" minutes from seconds. */
export function minutes(seconds: number): string {
  return Number.isInteger(seconds / 60) ? String(seconds / 60) : (seconds / 60).toFixed(1);
}

/**
 * The pack's brewing as measures, in the order a cup is made: the amount of leaf, the water's
 * temperature, the time. Empty when the product has no brewing guidance.
 */
export function brewingMeasures(brewing: BrewingDto | null | undefined, tb: BrewingT) {
  if (!brewing) return [];
  const measures: BrewingMeasure[] = [];
  if (brewing.amountGrams !== null) {
    const min = Number(brewing.amountGrams);
    const max = brewing.amountMaxGrams !== null ? Number(brewing.amountMaxGrams) : min;
    measures.push({
      key: 'amount',
      label: tb('amount'),
      value:
        brewing.amountMaxGrams !== null
          ? tb('gramsRangePerCup', { min, max })
          : tb('gramsPerCup', { grams: min }),
      min,
      max,
      scale: BREWING_SCALES.amount,
      ends: null,
    });
  }
  if (brewing.temperatureCelsius !== null) {
    const min = brewing.temperatureCelsius;
    const max = brewing.temperatureMaxCelsius ?? min;
    measures.push({
      key: 'temperature',
      label: tb('temperature'),
      value:
        brewing.temperatureMaxCelsius !== null
          ? tb('celsiusRange', { min, max })
          : tb('celsius', { value: min }),
      min,
      max,
      scale: BREWING_SCALES.temperature,
      ends: [
        tb('celsius', { value: BREWING_SCALES.temperature.from }),
        tb('celsius', { value: BREWING_SCALES.temperature.to }),
      ],
    });
  }
  if (brewing.timeMinSeconds !== null) {
    const min = brewing.timeMinSeconds;
    const max =
      brewing.timeMaxSeconds !== null && brewing.timeMaxSeconds > min
        ? brewing.timeMaxSeconds
        : min;
    const scale = max > BREWING_SCALES.time.to ? BREWING_SCALES.longTime : BREWING_SCALES.time;
    measures.push({
      key: 'time',
      label: tb('time'),
      value:
        max !== min
          ? tb('minutes', { min: minutes(min), max: minutes(max) })
          : tb('minutesSingle', { min: minutes(min) }),
      min,
      max,
      scale,
      ends: [
        tb('minutesSingle', { min: minutes(scale.from) }),
        tb('minutesSingle', { min: minutes(scale.to) }),
      ],
    });
  }
  return measures;
}
