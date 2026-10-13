import { digestsEqual, generateOrderNumber, generateToken, sha256 } from './crypto.js';

describe('crypto helpers', () => {
  it('generates unguessable URL-safe tokens', () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateToken()).not.toBe(token);
  });

  it('generates non-sequential order numbers without ambiguous characters', () => {
    const numbers = Array.from({ length: 200 }, generateOrderNumber);
    for (const number of numbers) {
      expect(number).toMatch(/^TRN-[0-9A-HJKMNP-TV-Z]{8}$/);
    }
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('compares digests safely', () => {
    expect(digestsEqual(sha256('a'), sha256('a'))).toBe(true);
    expect(digestsEqual(sha256('a'), sha256('b'))).toBe(false);
    expect(digestsEqual(sha256('a'), 'abc')).toBe(false);
  });
});
