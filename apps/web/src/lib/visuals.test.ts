import type { PublicFilmDto } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import { filmSource } from './visuals';

const film: PublicFilmDto = {
  src: '/uploads/visuals/a/b/video.mp4',
  type: 'video/mp4',
  width: 1920,
  height: 1080,
  mask: null,
  focusX: 50,
  focusY: 50,
  sources: [1280, 1920, 2560, 3200, 3840].map((width) => ({
    src: width === 1920 ? '/uploads/visuals/a/b/video.mp4' : `/uploads/visuals/a/b/w${width}.mp4`,
    width,
  })),
};

describe('the film copy a frame gets', () => {
  it('fills the device pixels of the frame with the narrowest copy', () => {
    // A 1440 px wide band, 560 px high, on a 2× screen: 2880 device pixels across.
    expect(filmSource(film, { width: 1440, height: 560 }, 2)).toBe(
      '/uploads/visuals/a/b/w3200.mp4',
    );
    // The same band on a 1× screen.
    expect(filmSource(film, { width: 1440, height: 560 }, 1)).toBe(
      '/uploads/visuals/a/b/video.mp4',
    );
    // A window 2560 px wide on a 2× screen gets the widest there is.
    expect(filmSource(film, { width: 2560, height: 827 }, 2)).toBe(
      '/uploads/visuals/a/b/w3840.mp4',
    );
  });

  it('counts the width a covering film is drawn at in a tall frame', () => {
    // A phone-shaped frame 400 × 700 px covered by a 16:9 film: drawn 1244 px wide.
    expect(filmSource(film, { width: 400, height: 700 }, 1)).toBe('/uploads/visuals/a/b/w1280.mp4');
  });

  it('plays the film itself when it has no copies', () => {
    expect(filmSource({ ...film, sources: [] }, { width: 3000, height: 1000 }, 2)).toBe(film.src);
  });
});
