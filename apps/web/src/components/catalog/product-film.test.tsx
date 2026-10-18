import type { ProductFilmDto } from '@teran/contracts';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setMotionPaused } from '@/lib/motion';
import { ProductFilm } from './product-film';

const film: ProductFilmDto = {
  src: '/uploads/products/a/film/video.mp4',
  cardSrc: '/uploads/products/a/film/card.mp4',
  mask: '/uploads/products/a/film/mask.png',
  type: 'video/mp4',
  width: 1024,
  height: 1024,
};

let media: Record<string, boolean>;
let observers: IntersectionObserverCallback[];

beforeEach(() => {
  media = {};
  observers = [];
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: media[query] ?? false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private readonly callback: IntersectionObserverCallback) {}
      observe() {
        observers.push(this.callback);
      }
      disconnect() {}
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  act(() => setMotionPaused(false));
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Brings the film on screen, drawn `width` CSS pixels wide. */
function scrollToFilm(width = 240) {
  act(() => {
    for (const callback of observers) {
      callback(
        [
          {
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: { width } as DOMRectReadOnly,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    }
  });
}

describe('ProductFilm', () => {
  it('plays the cards copy once near and on screen, and stops while the films are paused', async () => {
    const { container } = render(<ProductFilm film={film} size="card" />);
    const video = container.querySelector('video')!;
    expect(video).not.toHaveAttribute('src');
    scrollToFilm();
    await waitFor(() => expect(video).toHaveAttribute('src', film.cardSrc));
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('aria-hidden', 'true');
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());
    act(() => setMotionPaused(true));
    await waitFor(() => expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled());
  });

  it('plays the film itself on a card drawn wider than its copy (a large card at 2×)', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const { container } = render(<ProductFilm film={film} size="card" />);
    scrollToFilm(430);
    await waitFor(() => expect(container.querySelector('video')).toHaveAttribute('src', film.src));
  });

  it('plays the film itself in the gallery, only on the slide shown', async () => {
    const { container, rerender } = render(<ProductFilm film={film} size="full" active={false} />);
    scrollToFilm();
    const video = container.querySelector('video')!;
    await waitFor(() => expect(video).toHaveAttribute('src', film.src));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    rerender(<ProductFilm film={film} size="full" active />);
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());
  });

  it('keeps the picture still with reduced motion, and without a cards copy', () => {
    media['(prefers-reduced-motion: reduce)'] = true;
    const reduced = render(<ProductFilm film={film} size="card" />);
    expect(reduced.container.querySelector('video')).toBeNull();
    media['(prefers-reduced-motion: reduce)'] = false;
    const noCopy = render(<ProductFilm film={{ ...film, cardSrc: null }} size="card" />);
    expect(noCopy.container.querySelector('video')).toBeNull();
  });
});
