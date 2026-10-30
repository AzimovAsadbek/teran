import type { ProductFilmDto } from '@teran/contracts';
import { act, cleanup, render, waitFor } from '@testing-library/react';
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
  // Unmounted while the media mocks are still in place: a film still loading when a test ends
  // must not reach jsdom's play(), which is not implemented (it returns nothing to catch).
  cleanup();
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

/** Takes the film off the screen again. */
function leaveFilm() {
  act(() => {
    for (const callback of observers) {
      callback(
        [
          {
            isIntersecting: false,
            intersectionRatio: 0,
            boundingClientRect: { width: 240 } as DOMRectReadOnly,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    }
  });
}

describe('ProductFilm', () => {
  it('fetches nothing for a card only scrolled past', () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<ProductFilm film={film} size="card" />);
      scrollToFilm();
      act(() => vi.advanceTimersByTime(300));
      leaveFilm();
      act(() => vi.advanceTimersByTime(2000));
      expect(container.querySelector('video')).not.toHaveAttribute('src');
    } finally {
      vi.useRealTimers();
    }
  });

  it('plays the cards copy once it has stayed on screen, and stops while the films are paused', async () => {
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

  it('plays the film itself on a card drawn wider than its copy in CSS pixels', async () => {
    const { container } = render(<ProductFilm film={film} size="card" />);
    scrollToFilm(820);
    await waitFor(() => expect(container.querySelector('video')).toHaveAttribute('src', film.src));
  });

  it("keeps the cards' copy for a large card on a 2× screen (films by CSS pixels)", async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const { container } = render(<ProductFilm film={film} size="card" />);
    scrollToFilm(430);
    await waitFor(() =>
      expect(container.querySelector('video')).toHaveAttribute('src', film.cardSrc),
    );
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

  it('keeps the picture still on a very slow connection (2G; 3G still plays)', () => {
    const connection = Object.assign(new EventTarget(), { effectiveType: '2g', saveData: false });
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
    try {
      const { container } = render(<ProductFilm film={film} size="full" />);
      scrollToFilm();
      expect(container.querySelector('video')).toBeNull();
    } finally {
      delete (navigator as Navigator & { connection?: unknown }).connection;
    }
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
