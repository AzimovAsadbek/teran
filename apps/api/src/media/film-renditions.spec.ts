import { describe, expect, it } from 'vitest';
import { missingFilmWidths } from './film-renditions.js';

describe('light page film copies', () => {
  it('adds only missing smaller copies and stays within the public settings contract', () => {
    expect(missingFilmWidths(1920, [])).toEqual([320, 640]);
    expect(missingFilmWidths(640, [320])).toEqual([]);
    expect(missingFilmWidths(320, [])).toEqual([]);
    expect(missingFilmWidths(null, [])).toEqual([]);
    expect(missingFilmWidths(3840, [720, 800, 900, 1080, 1280, 1600, 1920])).toEqual([320]);
  });
});
