import { describe, expect, it } from 'vitest';
import { isLightConnection } from './motion';

const link = (fields: { saveData?: boolean; effectiveType?: string }) =>
  Object.assign(new EventTarget(), fields);

describe('isLightConnection', () => {
  it('keeps films off with data saving or on a link rated 3G or slower', () => {
    expect(isLightConnection(link({ saveData: true, effectiveType: '4g' }))).toBe(true);
    for (const effectiveType of ['slow-2g', '2g', '3g']) {
      expect(isLightConnection(link({ effectiveType }))).toBe(true);
    }
  });

  it('plays them on 4G, and where the browser says nothing of its connection', () => {
    expect(isLightConnection(link({ effectiveType: '4g' }))).toBe(false);
    expect(isLightConnection(undefined)).toBe(false);
  });
});
