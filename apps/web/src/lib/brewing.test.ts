// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BREWING_SCALES, brewingMeasures } from './brewing';

/** A stand-in for next-intl: the key and its values, so the wording can be checked. */
const tb = (key: string, values?: Record<string, string | number>) =>
  values ? `${key}(${Object.values(values).join(',')})` : key;

const brewing = {
  temperatureCelsius: 80,
  temperatureMaxCelsius: 90,
  timeMinSeconds: 120,
  timeMaxSeconds: 180,
  amountGrams: '5',
  amountMaxGrams: null,
};

describe('brewing measures', () => {
  it('reads the pack in the order a cup is made, with each range in numbers and words', () => {
    const measures = brewingMeasures(brewing, tb);
    expect(measures.map((measure) => measure.key)).toEqual(['amount', 'temperature', 'time']);
    expect(measures[0]).toMatchObject({ value: 'gramsPerCup(5)', min: 5, max: 5, ends: null });
    expect(measures[1]).toMatchObject({ value: 'celsiusRange(80,90)', min: 80, max: 90 });
    expect(measures[1]!.ends).toEqual(['celsius(60)', 'celsius(100)']);
    expect(measures[2]).toMatchObject({ value: 'minutes(2,3)', min: 120, max: 180 });
  });

  it('keeps one value as a range of one, and an amount range as a range', () => {
    const [amount, temperature, time] = brewingMeasures(
      {
        ...brewing,
        temperatureMaxCelsius: null,
        timeMaxSeconds: 120,
        amountGrams: '3',
        amountMaxGrams: '5',
      },
      tb,
    );
    expect(amount).toMatchObject({ value: 'gramsRangePerCup(3,5)', min: 3, max: 5 });
    expect(temperature).toMatchObject({ value: 'celsius(80)', min: 80, max: 80 });
    expect(time).toMatchObject({ value: 'minutesSingle(2)', min: 120, max: 120 });
  });

  it('reads long steeps against the ten-minute ruler and the rest against five minutes', () => {
    const short = brewingMeasures(brewing, tb).find((measure) => measure.key === 'time');
    const long = brewingMeasures({ ...brewing, timeMinSeconds: 300, timeMaxSeconds: 480 }, tb).find(
      (measure) => measure.key === 'time',
    );
    expect(short?.scale).toBe(BREWING_SCALES.time);
    expect(long?.scale).toBe(BREWING_SCALES.longTime);
    expect(long?.ends).toEqual(['minutesSingle(0)', 'minutesSingle(10)']);
  });

  it('has nothing to show without brewing guidance, and leaves out what the pack does not say', () => {
    expect(brewingMeasures(null, tb)).toEqual([]);
    const measures = brewingMeasures(
      { ...brewing, amountGrams: null, timeMinSeconds: null, timeMaxSeconds: null },
      tb,
    );
    expect(measures.map((measure) => measure.key)).toEqual(['temperature']);
  });
});
