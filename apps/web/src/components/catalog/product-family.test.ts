import { ILLUSTRATION_KEYS } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import { productFamily } from './product-family';

/** WCAG contrast ratio of a #rrggbb colour against white. */
function contrastOnWhite(hex: string): number {
  const channel = (index: number) => {
    const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  return 1.05 / (luminance + 0.05);
}

describe('productFamily', () => {
  it('puts each kind of drink and object in its own family', () => {
    expect(productFamily('green').key).toBe('tea');
    expect(productFamily('matcha').key).toBe('matcha');
    expect(productFamily('herbal').key).toBe('infusion');
    expect(productFamily('mint').key).toBe('infusion');
    expect(productFamily('iced').key).toBe('iced');
    expect(productFamily('water').key).toBe('water');
    expect(productFamily('juice').key).toBe('juice');
    expect(productFamily('sweets').key).toBe('sweets');
    expect(productFamily('teaware').key).toBe('teaware');
    expect(productFamily('gift').key).toBe('gift');
  });

  it('treats a product without a key as tea', () => {
    expect(productFamily(null).key).toBe('tea');
    expect(productFamily(undefined).key).toBe('tea');
  });

  it('lights only glass and gift boxes', () => {
    expect(productFamily('water').sheen).toBe('clear');
    expect(productFamily('gift').sheen).toBe('gold');
    expect(productFamily('black').sheen).toBeNull();
  });

  it('keeps every category line readable on a white card (AA, 4.5:1)', () => {
    for (const key of ILLUSTRATION_KEYS) {
      expect(contrastOnWhite(productFamily(key).ink)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
