import type { PublicFilmDto } from '@teran/contracts';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoopingFilm } from './looping-film';

const film: PublicFilmDto = {
  src: '/uploads/visuals/a/wide/video.mp4',
  type: 'video/mp4',
  width: 736,
  height: 414,
  focusX: 50,
  focusY: 65,
};
const phoneFilm: PublicFilmDto = {
  ...film,
  src: '/uploads/visuals/a/phone/video.mp4',
  width: 720,
  height: 1280,
  focusY: 80,
};
const labels = { pause: 'Pause the video', play: 'Play the video' };

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
  it('fetches the film near the screen, loops it over the poster and lets it be stopped', async () => {
    const { container } = render(
      <LoopingFilm film={film} labels={labels} controlsClassName="bottom-4 left-4" />,
    );
    expect(fetch).not.toHaveBeenCalled();
    scrollToFilm();
    const button = await screen.findByRole('button', { name: 'Pause the video' });
    expect(fetch).toHaveBeenCalledWith(film.src, expect.anything());
    const video = container.querySelector('video')!;
    expect(video).toHaveAttribute('src', 'blob:film');
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(video.style.objectPosition).toBe('50% 65%');
    await waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled());

    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Play the video' })).toBeInTheDocument();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it('gives phones their own film', async () => {
    media['(max-width: 749px)'] = true;
    const { container } = render(
      <LoopingFilm
        film={film}
        phoneFilm={phoneFilm}
        labels={labels}
        controlsClassName="bottom-4 left-4"
      />,
    );
    scrollToFilm();
    await screen.findByRole('button', { name: 'Pause the video' });
    expect(fetch).toHaveBeenCalledWith(phoneFilm.src, expect.anything());
    expect(container.querySelector('video')!.style.objectPosition).toBe('50% 80%');
  });

  it('keeps the poster alone with reduced motion', () => {
    media['(prefers-reduced-motion: reduce)'] = true;
    const { container } = render(
      <LoopingFilm film={film} labels={labels} controlsClassName="bottom-4 left-4" />,
    );
    scrollToFilm();
    expect(container.querySelector('video')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
