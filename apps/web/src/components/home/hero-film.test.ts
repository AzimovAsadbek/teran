import { afterEach, expect, it, vi } from 'vitest';
import { setMotionPaused } from '@/lib/motion';
import '../../../public/hero-film.v1.js';

afterEach(() => {
  document.body.replaceChildren();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('starts before hydration on 2G, honours a motion preference, and retries a blocked start with a gesture', async () => {
  const media = (matches: boolean) => Object.assign(new EventTarget(), { matches });
  vi.stubGlobal('matchMedia', (query: string) => media(query.includes('reduced-motion')));
  // A media origin without readable range headers falls back to the native player.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 206 })));
  const connection = Object.assign(new EventTarget(), { effectiveType: '2g' });
  const old = Object.getOwnPropertyDescriptor(navigator, 'connection');
  Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
  let visible: (entries: { isIntersecting: boolean }[]) => void = () => {};
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof visible) {
        visible = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
  const play = vi
    .spyOn(HTMLMediaElement.prototype, 'play')
    .mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'))
    .mockResolvedValue(undefined);
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const hero = document.createElement('teran-hero-film');
  const video = document.createElement('video');
  hero.dataset.clips = JSON.stringify({
    wide: {
      src: '/high.mp4',
      sources: [
        { width: 320, src: '/low.mp4' },
        { width: 720, src: '/high.mp4' },
      ],
      width: 720,
      height: 400,
      focusX: 50,
      focusY: 50,
    },
  });
  hero.append(video);
  try {
    document.body.append(hero);
    expect(fetch).not.toHaveBeenCalled();
    visible([{ isIntersecting: true }]);
    expect(video.hasAttribute('src')).toBe(false);
    setMotionPaused(false);
    await vi.waitFor(() => expect(video.getAttribute('src')).toBe('/low.mp4'));
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    document.dispatchEvent(new Event('keydown'));
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    video.dispatchEvent(new Event('playing'));
    expect(video.style.opacity).toBe('1');
    visible([{ isIntersecting: false }]);
    expect(pause).toHaveBeenCalled();

    // A fresh visit with the motion preference already enabled can prepare the small copy
    // before CSS produces an intersection. Playback still waits for the visible first view.
    hero.remove();
    play.mockClear();
    vi.mocked(fetch).mockClear();
    const nextHero = hero.cloneNode(false);
    const nextVideo = document.createElement('video');
    nextHero.appendChild(nextVideo);
    document.body.appendChild(nextHero);
    expect(fetch).toHaveBeenCalledWith('/low.mp4', expect.objectContaining({ priority: 'high' }));
    await vi.waitFor(() => expect(nextVideo.getAttribute('src')).toBe('/low.mp4'));
    expect(play).not.toHaveBeenCalled();
    visible([{ isIntersecting: true }]);
    await vi.waitFor(() => expect(play).toHaveBeenCalledOnce());
  } finally {
    if (old) Object.defineProperty(navigator, 'connection', old);
    else Reflect.deleteProperty(navigator, 'connection');
  }
});

it('switches a stalled hero to the lightest copy without a network estimate', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches: false }));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 206 })));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private readonly notify: (entries: { isIntersecting: boolean }[]) => void) {}
      observe() {
        this.notify([{ isIntersecting: true }]);
      }
      disconnect() {}
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const hero = document.createElement('teran-hero-film');
  hero.dataset.clips = JSON.stringify({
    wide: {
      src: '/original.mp4',
      sources: [
        { width: 320, src: '/small.mp4' },
        { width: 1080, src: '/original.mp4' },
      ],
    },
  });
  const video = document.createElement('video');
  hero.append(video);
  try {
    document.body.append(hero);
    expect(video.getAttribute('src')).toBe('/original.mp4');
    video.dispatchEvent(new Event('waiting'));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(video.getAttribute('src')).toBe('/small.mp4');
  } finally {
    hero.remove();
    vi.useRealTimers();
  }
});
