import { describe, expect, it } from 'vitest';
import { formatAmount, formatGrams, multiplyMoney, packLabel } from './format';

describe('money formatting', () => {
  it('multiplies decimal strings exactly', () => {
    expect(multiplyMoney('45000.00', 3)).toBe('135000.00');
    expect(multiplyMoney('0.10', 3)).toBe('0.30');
    expect(multiplyMoney('19999.99', 7)).toBe('139999.93');
    expect(multiplyMoney('45000', 2)).toBe('90000.00');
  });

  it('formats whole soʻm without decimals and keeps real fractions', () => {
    expect(formatAmount('85000.00', 'uz').replace(/\s/g, ' ')).toBe('85 000');
    expect(formatAmount('85000.50', 'en')).toBe('85,000.50');
  });
});

describe('pack labels', () => {
  const units = (key: string, values: { count: number }) => `${values.count} ${key}`;

  it('localises grams through Intl', () => {
    expect(formatGrams(100, 'ru')).toBe('100 г');
    expect(formatGrams(100, 'uz')).toBe('100 g');
  });

  it('combines unit counts and weight', () => {
    expect(packLabel({ weightGrams: 50, unitCount: 25 }, 'TEA_BAGS', 'en', units)).toBe('25 TEA_BAGS · 50 g');
    expect(packLabel({ weightGrams: null, unitCount: 3 }, 'GIFT_SET', 'en', units)).toBe('3 default');
    expect(packLabel({ weightGrams: 100, unitCount: null }, 'LOOSE_LEAF', 'en', units)).toBe('100 g');
  });
});
