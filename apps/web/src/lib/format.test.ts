import { PRODUCT_FORMATS } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import {
  formatAmount,
  formatDate,
  formatDateTime,
  formatFileSize,
  formatGrams,
  multiplyMoney,
  namesFormat,
  packLabel,
} from './format';

describe('money formatting', () => {
  it('multiplies decimal strings exactly', () => {
    expect(multiplyMoney('45000.00', 3)).toBe('135000.00');
    expect(multiplyMoney('0.10', 3)).toBe('0.30');
    expect(multiplyMoney('19999.99', 7)).toBe('139999.93');
    expect(multiplyMoney('45000', 2)).toBe('90000.00');
  });

  it('formats whole soʻm without decimals and keeps real fractions', () => {
    expect(formatAmount('85000.00', 'uz')).toBe('85\u00a0000');
    expect(formatAmount('85000.50', 'en')).toBe('85,000.50');
    expect(formatAmount('1234567.5', 'ru')).toBe('1\u00a0234\u00a0567,50');
    expect(formatAmount('0.00', 'uz')).toBe('0');
    expect(formatAmount('999.00', 'en')).toBe('999');
  });

  it('formats every locale the same way on the server and in any browser', () => {
    // Chromium has no Uzbek data, so these must not depend on Intl (see format.ts).
    expect(formatAmount('56000.00', 'uz')).toBe('56\u00a0000');
    expect(formatDate('2026-10-04T19:05:00.000Z', 'uz')).toBe('5-oktabr, 2026');
    expect(formatDateTime('2026-10-04T19:05:00.000Z', 'uz')).toBe('5-okt, 2026, 00:05');
    expect(formatDateTime('2026-01-31T10:30:00.000Z', 'uz')).toBe('31-yan, 2026, 15:30');
  });

  it('uses CLDR date patterns for Russian and English in Tashkent time', () => {
    expect(formatDate('2026-10-04T19:05:00.000Z', 'ru')).toBe('5 октября 2026 г.');
    expect(formatDate('2026-10-04T19:05:00.000Z', 'en')).toBe('October 5, 2026');
  });
});

describe('pack labels', () => {
  const units = (key: string, values: { count: number }) => `${values.count} ${key}`;

  it('localises grams', () => {
    expect(formatGrams(100, 'ru')).toBe('100 г');
    expect(formatGrams(100, 'uz')).toBe('100 g');
    expect(formatGrams(1500, 'uz')).toBe('1\u00a0500 g');
    expect(formatGrams(1500, 'en')).toBe('1,500 g');
    expect(formatGrams(2.5, 'ru')).toBe('2,5 г');
  });

  it('combines unit counts and weight', () => {
    expect(packLabel({ weightGrams: 50, unitCount: 25 }, 'TEA_BAGS', 'en', units)).toBe(
      '25 TEA_BAGS · 50 g',
    );
    expect(packLabel({ weightGrams: null, unitCount: 3 }, 'GIFT_SET', 'en', units)).toBe(
      '3 default',
    );
    expect(packLabel({ weightGrams: 100, unitCount: null }, 'LOOSE_LEAF', 'en', units)).toBe(
      '100 g',
    );
    // A product of no tea format (honey, a teapot) is described by its pack alone.
    expect(packLabel({ weightGrams: 500, unitCount: 2 }, 'OTHER', 'en', units)).toBe(
      '2 default · 500 g',
    );
  });

  it('names every format except "other"', () => {
    expect(PRODUCT_FORMATS.filter(namesFormat)).toEqual([
      'LOOSE_LEAF',
      'TEA_BAGS',
      'PYRAMIDS',
      'GIFT_SET',
      'ACCESSORY',
    ]);
  });
});

describe('file sizes', () => {
  it('reads the same on the server and in the browser, in each language', () => {
    expect(formatFileSize(2_202_009, 'uz')).toBe('2,1 MB');
    expect(formatFileSize(2_202_009, 'en')).toBe('2.1 MB');
    expect(formatFileSize(5 * 1024 * 1024, 'ru')).toBe('5 MB');
    expect(formatFileSize(37_900, 'uz')).toBe('37 KB');
    expect(formatFileSize(12, 'en')).toBe('1 KB');
    expect(formatFileSize(3.25 * 1024 ** 3, 'uz')).toBe('3,3 GB');
    expect(formatFileSize(1023.5 * 1024 ** 2, 'uz')).toBe('1\u00a0023,5 MB');
  });
});
