import type { MediaItemDto } from '@teran/contracts';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { MediaLabels } from './media-gallery';
import { ReelPlayer } from './reel-player';

// The emblem is a static image import, which Vite gives as a plain URL: next/image refuses it.
vi.mock('@/components/brand/logo', () => ({ Emblem: () => null }));

const HEIGHT = 800;

const film = (n: number): MediaItemDto => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  kind: 'VIDEO',
  title: `Lavha ${n}`,
  caption: null,
  image: {
    src: `/uploads/media/${n}/poster`,
    widths: [320, 640, 960],
    width: 1080,
    height: 1920,
    alt: '',
    transparent: false,
  },
  video: {
    src: `/uploads/media/${n}/film.mp4`,
    type: 'video/mp4',
    durationSeconds: 12,
    captions: null,
  },
  publishedAt: '2026-10-23T00:00:00.000Z',
});
const films = [1, 2, 3, 4, 5].map(film);

const labels: MediaLabels = {
  photo: 'Photo',
  video: 'Video',
  open: '{title} — enlarge',
  play: 'Watch the video: {title}',
  close: 'Close',
  previous: 'Previous',
  next: 'Next',
  position: '{index} / {total}',
  thumbnails: 'Thumbnails',
  captions: 'Subtitles',
  reels: 'Short films',
  pause: 'Pause',
  resume: 'Play',
  swipeHint: 'Swipe up for the next video',
};

let media: Record<string, boolean>;
let frames: Map<number, FrameRequestCallback>;
let lastFrame: number;
let play: Mock<HTMLMediaElement['play']>;
let pause: Mock<HTMLMediaElement['pause']>;
let scrollTo: Mock<(options: ScrollToOptions) => void>;
const scrollTops = new WeakMap<Element, number>();
const descriptors = {
  clientHeight: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight'),
  scrollTop: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop'),
};

beforeEach(() => {
  media = {};
  frames = new Map();
  lastFrame = 0;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: media[query] ?? false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++lastFrame, callback);
    return lastFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  // jsdom lays nothing out: every element is a screen tall, and scrolls where it is told.
  Object.defineProperty(Element.prototype, 'clientHeight', {
    configurable: true,
    get: () => HEIGHT,
  });
  Object.defineProperty(Element.prototype, 'scrollTop', {
    configurable: true,
    get(this: Element) {
      return scrollTops.get(this) ?? 0;
    },
    set(this: Element, value: number) {
      scrollTops.set(this, value);
    },
  });
  scrollTo = vi.fn();
  Element.prototype.scrollTo = scrollTo as unknown as Element['scrollTo'];
});

afterEach(() => {
  // Unmounted while the frame and media stubs are still in place (jsdom has no animation frames).
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  for (const [name, descriptor] of Object.entries(descriptors)) {
    if (descriptor) Object.defineProperty(Element.prototype, name, descriptor);
  }
  Reflect.deleteProperty(Element.prototype, 'scrollTo');
  document.documentElement.style.overflow = '';
});

/** Runs the animation frames asked for so far. */
function runFrames() {
  const due = [...frames.values()];
  frames.clear();
  act(() => {
    for (const callback of due) callback(0);
  });
}

const sourceOf = (video: unknown) =>
  (video as HTMLVideoElement).querySelector('source')?.getAttribute('src');

function setup(index: number, props: Partial<Parameters<typeof ReelPlayer>[0]> = {}) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ReelPlayer
      items={films}
      index={index}
      labels={labels}
      handle="@TeranTrade"
      onChange={onChange}
      onClose={onClose}
      {...props}
    />,
  );
  const dialog = view.container.querySelector('dialog')!;
  const list = view.container.querySelector('ol')!;
  return {
    ...view,
    dialog,
    list,
    onChange,
    onClose,
    /** The film in view (the others are inert). */
    current: () => view.container.querySelector<HTMLElement>('li:not([inert])')!,
    fetched: () => [...view.container.querySelectorAll('video')].map(sourceOf),
    scrollTo: (top: number) => {
      list.scrollTop = top;
      fireEvent.scroll(list);
      runFrames();
    },
  };
}

describe('ReelPlayer', () => {
  it('opens at the chosen film, plays it muted, and fetches only its neighbours', () => {
    const { dialog, list, current, fetched } = setup(2);

    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleName('Lavha 3');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(list.scrollTop).toBe(2 * HEIGHT);
    expect(fetched()).toEqual([
      '/uploads/media/2/film.mp4',
      '/uploads/media/3/film.mp4',
      '/uploads/media/4/film.mp4',
    ]);
    expect(play.mock.contexts.map(sourceOf)).toEqual(['/uploads/media/3/film.mp4']);
    expect(play.mock.contexts[0]).toHaveProperty('muted', true);
    expect(within(current()).getByText('Lavha 3')).toBeInTheDocument();
    expect(within(current()).getByText('@TeranTrade')).toBeInTheDocument();
    expect(document.activeElement).toBe(within(current()).getByRole('button', { name: 'Pause' }));
  });

  it('a scroll brings the next film into view: it plays from its start, the one that left stops', () => {
    const { current, fetched, onChange, ...view } = setup(2);
    play.mockClear();

    view.scrollTo(3 * HEIGHT);

    expect(onChange).toHaveBeenCalledWith(3);
    expect(within(current()).getByText('Lavha 4')).toBeInTheDocument();
    expect(play.mock.contexts.map(sourceOf)).toEqual(['/uploads/media/4/film.mp4']);
    expect(pause.mock.contexts.map(sourceOf)).toContain('/uploads/media/3/film.mp4');
    expect(fetched()).toEqual([
      '/uploads/media/3/film.mp4',
      '/uploads/media/4/film.mp4',
      '/uploads/media/5/film.mp4',
    ]);
    // Focus went along with it.
    expect(document.activeElement).toBe(within(current()).getByRole('button', { name: 'Pause' }));
  });

  it('keys and the arrows move one film at a time; a tap pauses and plays again', () => {
    const { dialog, current, getByRole } = setup(0);

    expect(getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.keyDown(dialog, { key: 'ArrowDown' });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: HEIGHT, behavior: 'smooth' });
    fireEvent.keyDown(dialog, { key: 'End' });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 4 * HEIGHT, behavior: 'smooth' });
    fireEvent.click(getByRole('button', { name: 'Next' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: HEIGHT, behavior: 'smooth' });

    media['(prefers-reduced-motion: reduce)'] = true;
    fireEvent.keyDown(dialog, { key: 'PageDown' });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: HEIGHT, behavior: 'auto' });

    pause.mockClear();
    fireEvent.click(within(current()).getByRole('button', { name: 'Pause' }));
    expect(pause.mock.contexts.map(sourceOf)).toEqual(['/uploads/media/1/film.mp4']);
    play.mockClear();
    fireEvent.click(within(current()).getByRole('button', { name: 'Play' }));
    expect(play.mock.contexts.map(sourceOf)).toEqual(['/uploads/media/1/film.mp4']);
  });

  it('Esc and the cross close it and give the page its scrolling back', () => {
    const first = setup(1);
    fireEvent(first.dialog, new Event('cancel', { cancelable: true }));
    expect(first.onClose).toHaveBeenCalledTimes(1);
    expect(first.dialog).not.toHaveAttribute('open');
    expect(document.documentElement.style.overflow).toBe('');
    first.unmount();

    const second = setup(1);
    fireEvent.click(second.getByRole('button', { name: 'Close' }));
    expect(second.onClose).toHaveBeenCalledTimes(1);
    expect(second.dialog).not.toHaveAttribute('open');
  });

  it('a film the browser will not start (iOS Low Power Mode) waits for a tap', async () => {
    play.mockRejectedValue(new DOMException('Autoplay is not allowed', 'NotAllowedError'));
    const { current } = setup(0);
    await waitFor(() =>
      expect(within(current()).getByRole('button', { name: 'Play' })).toBeInTheDocument(),
    );
  });

  it('on a touch screen, says how to move on until the first swipe', () => {
    vi.useFakeTimers();
    media['(pointer: coarse)'] = true;
    const { queryByText, ...view } = setup(0);
    expect(queryByText('Swipe up for the next video')).toBeNull();
    act(() => vi.advanceTimersByTime(700));
    expect(queryByText('Swipe up for the next video')).toBeInTheDocument();
    view.scrollTo(HEIGHT);
    expect(queryByText('Swipe up for the next video')).toBeNull();
  });
});
