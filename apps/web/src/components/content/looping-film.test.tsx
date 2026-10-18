import type { PublicFilmDto } from '@teran/contracts';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setMotionPaused } from '@/lib/motion';
import { LoopingFilm } from './looping-film';

const film: PublicFilmDto = {
  src: '/uploads/visuals/a/wide/video.mp4',
  type: 'video/mp4',
  width: 736,
  height: 414,
  mask: null,
  focusX: 50,
  focusY: 65,
  sources: [],
};
const phoneFilm: PublicFilmDto = {
  ...film,
  src: '/uploads/visuals/a/phone/video.mp4',
  width: 720,
  height: 1280,
  focusY: 80,
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
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(new Blob(['film'], { type: 'video/mp4' }))),
  );
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:film');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

afterEach(() => {
  act(() => setMotionPaused(false));
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The place comes near and onto the screen. */
function scrollToFilm() {
  act(() => {
    for (const callback of observers) {
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    }
  });
}

describe('LoopingFilm', () => {
  it('fetches the film near the screen, loops it over the poster, and stops with the footer switch', async () => {
    const { container } = render(<LoopingFilm film={film} />);
    expect(fetch).not.toHaveBeenCalled();
    scrollToFilm();
    await waitFor(() =>
      expect(container.querySelector('video')).toHaveAttribute('src', 'blob:film'),
    );
    expect(fetch).toHaveBeenCalledWith(film.src, expect.anything());
    const video = container.querySelector('video')!;
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(video.style.objectPosition).toBe('50% 65%');
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());
    // No button of its own: the visitor's pause (lib/motion) stops it.
    expect(container.querySelector('button')).toBeNull();
    act(() => setMotionPaused(true));
    await waitFor(() => expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled());
  });

  it('gives phones their own film', async () => {
    media['(max-width: 749px)'] = true;
    const { container } = render(<LoopingFilm film={film} phoneFilm={phoneFilm} />);
    scrollToFilm();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(phoneFilm.src, expect.anything()));
    expect(container.querySelector('video')!.style.objectPosition).toBe('50% 80%');
  });

  it('keeps the poster alone with reduced motion', () => {
    media['(prefers-reduced-motion: reduce)'] = true;
    const { container } = render(<LoopingFilm film={film} />);
    scrollToFilm();
    expect(container.querySelector('video')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
