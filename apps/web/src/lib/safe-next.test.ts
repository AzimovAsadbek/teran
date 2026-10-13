import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/checkout')).toBe('/checkout');
    expect(safeNextPath('/account/orders/TRN-ABCDEFGH?x=1')).toBe(
      '/account/orders/TRN-ABCDEFGH?x=1',
    );
  });

  it('rejects anything that could leave the site', () => {
    for (const value of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      '/\n//evil.example',
      undefined,
      ['/account'],
    ]) {
      expect(safeNextPath(value)).toBe('/account');
    }
  });
});
