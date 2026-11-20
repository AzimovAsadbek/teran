import { describe, it, expect } from 'vitest';
import { filmWidthLimit, isModestConnection } from './motion';

describe('film rendition selection', () => {
  it.each(['slow-2g', '2g', '3g'])('uses the lightest video on %s', (effectiveType) => {
    expect(isModestConnection(Object.assign(new EventTarget(), { effectiveType }))).toBe(true);
  });
  it('selects a 320px starting copy for 2G and 640px for 3G', () => {
    expect(filmWidthLimit(Object.assign(new EventTarget(), { effectiveType: '2g' }))).toBe(320);
    expect(filmWidthLimit(Object.assign(new EventTarget(), { effectiveType: '3g' }))).toBe(640);
    expect(filmWidthLimit(Object.assign(new EventTarget(), { effectiveType: '4g' }))).toBeNull();
  });
  it('honours Save-Data on fast connections and otherwise selects by screen size', () => {
    expect(
      isModestConnection(Object.assign(new EventTarget(), { effectiveType: '4g', saveData: true })),
    ).toBe(true);
    expect(isModestConnection(Object.assign(new EventTarget(), { effectiveType: '4g' }))).toBe(
      false,
    );
    expect(isModestConnection(undefined)).toBe(false);
  });
});
