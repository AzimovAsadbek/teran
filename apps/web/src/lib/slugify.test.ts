import { describe, expect, it } from 'vitest';
import { slugify, suggestSku } from './slugify';

describe('slugify', () => {
  it('turns Uzbek, Russian and English names into link addresses', () => {
    expect(slugify('Yashil choy')).toBe('yashil-choy');
    expect(slugify('Oʻrik gʻunchasi')).toBe('orik-gunchasi');
    expect(slugify('Жасминовый чай')).toBe('zhasminovyy-chay');
    expect(slugify('  Earl Grey — 100 g! ')).toBe('earl-grey-100-g');
    expect(slugify('Café crème')).toBe('cafe-creme');
  });

  it('cuts long names at a word boundary', () => {
    expect(slugify('one two three four', 12)).toBe('one-two');
  });
});

describe('suggestSku', () => {
  it('builds an upper-case code from the name and size', () => {
    expect(suggestSku('Jasmine green tea', '100', new Set())).toBe('TRN-JASMIN-GREEN-TEA-100');
    expect(suggestSku('Qora choy', '', new Set())).toBe('TRN-QORA-CHOY');
  });

  it('never repeats a code that is already used', () => {
    const taken = new Set(['TRN-QORA-CHOY-50']);
    expect(suggestSku('Qora choy', '50', taken)).toBe('TRN-QORA-CHOY-50-2');
  });

  it('matches the SKU rules', () => {
    expect(suggestSku('Очень длинное название чая высшего сорта', '1000', new Set())).toMatch(
      /^[A-Z0-9][A-Z0-9-]{1,39}$/,
    );
  });
});
