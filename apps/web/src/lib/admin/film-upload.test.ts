import type { AdminMediaVideoJob, MediaUploadSession } from '@teran/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  FilmRefused,
  FilmUploadInterrupted,
  uploadFilm,
  waitForFilm,
  type FilmUploadProgress,
} from './film-upload';

/*
 * The browser's side of films in pieces (ADR-061) and of their making ready (ADR-062), against a
 * small stand-in for the API: it keeps how many bytes it has, takes a piece only where the file
 * ends, can drop the connection, and then reports the film's job as the server would.
 */

const PIECE = 4;

interface Server {
  received: number;
  size: number;
  /** Pieces the server refuses to answer (the connection drops), counted down. */
  drops: number;
  pieces: number[];
  completed: boolean;
  /** Completions whose answer is lost (504), counted down; the hand-over happens all the same. */
  slowCompletes: number;
  /** What each completion asked for. */
  completions: unknown[];
  /** What the item's job says when asked, one answer per question (then the film is kept). */
  jobs: (AdminMediaVideoJob | null)[];
}

let server: Server;

function session(): MediaUploadSession {
  return {
    id: 'upload-0000000000000001',
    size: server.size,
    received: server.received,
    chunkBytes: PIECE,
  };
}

class FakeRequest {
  upload = new EventTarget();
  status = 0;
  responseText = '';
  private url = '';
  private readonly listeners = new Map<string, () => void>();
  open(_method: string, url: string) {
    this.url = url;
  }
  setRequestHeader() {}
  addEventListener(type: string, listener: () => void) {
    this.listeners.set(type, listener);
  }
  abort() {
    this.listeners.get('abort')?.();
  }
  send(body: Blob) {
    queueMicrotask(() => {
      if (server.drops > 0) {
        server.drops -= 1;
        this.listeners.get('error')?.();
        return;
      }
      const offset = Number(new URL(this.url, 'http://test').searchParams.get('offset'));
      this.upload.dispatchEvent(new ProgressEvent('progress', { loaded: body.size }));
      if (offset !== server.received) {
        this.status = 409;
        this.responseText = JSON.stringify({
          statusCode: 409,
          code: 'CONFLICT',
          message: 'offset',
          details: { reason: 'upload_offset', received: server.received },
        });
      } else {
        server.received += body.size;
        server.pieces.push(offset);
        this.status = 200;
        this.responseText = JSON.stringify(session());
      }
      this.listeners.get('load')?.();
    });
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  server = {
    received: 0,
    size: 10,
    drops: 0,
    pieces: [],
    completed: false,
    slowCompletes: 0,
    completions: [],
    jobs: [],
  };
  vi.stubGlobal('XMLHttpRequest', FakeRequest);
  vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
    if (url.endsWith('/complete')) {
      server.completions.push(JSON.parse(String(init.body)));
      if (server.completed) return json({ statusCode: 404, code: 'NOT_FOUND' }, 404);
      server.completed = true;
      if (server.slowCompletes > 0) {
        // The answer is lost on the way; the film was handed over all the same.
        server.slowCompletes -= 1;
        return new Response('<html>504 Gateway Time-out</html>', { status: 504 });
      }
      const waiting = { state: 'waiting', percent: null, reason: null };
      return json({ id: 'media-1', video: null, videoJob: waiting }, 202);
    }
    if (url.endsWith('/admin/media/media-1')) {
      const job = server.jobs.length > 0 ? server.jobs.shift()! : null;
      const kept = server.completed && job === null;
      return json({ id: 'media-1', video: kept ? { bytes: 7 } : null, videoJob: job });
    }
    if (init.method === 'POST') {
      server.size = (JSON.parse(String(init.body)) as { size: number }).size;
      return json(session(), 201);
    }
    return json(session());
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const film = (bytes: number) =>
  new File([new Uint8Array(bytes)], 'film.mp4', { type: 'video/mp4' });

describe('uploadFilm', () => {
  it('sends the film piece by piece, each where the last ended, then completes it', async () => {
    const progress: FilmUploadProgress[] = [];
    const item = await uploadFilm('media-1', film(10), {
      onProgress: (update) => progress.push(update),
    });
    expect(server.pieces).toEqual([0, 4, 8]);
    expect(server.completed).toBe(true);
    // Handed over: the API makes it ready in the background.
    expect(item).toMatchObject({ id: 'media-1', videoJob: { state: 'waiting' } });
    expect(server.completions).toEqual([{ poster: false }]);
    expect(progress.at(-1)).toMatchObject({ sent: 10, total: 10 });
  });

  it('asks the API to take the cover from the film when the browser could not', async () => {
    await uploadFilm('media-1', film(10), { poster: true });
    expect(server.completions).toEqual([{ poster: true }]);
  });

  it('goes on from where the API says when a piece arrives out of turn', async () => {
    server.received = 4; // the API already has the first piece (an answer that got lost)
    await uploadFilm('media-1', film(10), {
      session: { ...session(), received: 0 },
    });
    expect(server.pieces).toEqual([4, 8]);
    expect(server.completed).toBe(true);
  });

  it('tries again after a dropped connection, asking first how far it got', async () => {
    vi.useFakeTimers();
    server.drops = 2;
    const done = uploadFilm('media-1', film(10));
    await vi.advanceTimersByTimeAsync(10_000);
    await done;
    expect(server.pieces).toEqual([0, 4, 8]);
  });

  it('stops after repeated failures, saying where the upload can go on', async () => {
    vi.useFakeTimers();
    server.drops = 100;
    const done = uploadFilm('media-1', film(10)).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(60_000);
    const error = await done;
    expect(error).toBeInstanceOf(FilmUploadInterrupted);
    expect((error as FilmUploadInterrupted).session).toMatchObject({ received: 0, size: 10 });
    expect((error as FilmUploadInterrupted).reason).toBeInstanceOf(ApiError);

    // The connection is back: the same upload goes on instead of starting again.
    server.drops = 0;
    await uploadFilm('media-1', film(10), { session: (error as FilmUploadInterrupted).session });
    expect(server.completed).toBe(true);
  });

  it('asks again when the answer to the hand-over is lost, and finds the film kept', async () => {
    vi.useFakeTimers();
    server.slowCompletes = 1;
    const done = uploadFilm('media-1', film(10));
    await vi.advanceTimersByTimeAsync(10_000);
    const item = await done;
    expect(server.completions).toHaveLength(2);
    expect(item).toMatchObject({ id: 'media-1', video: { bytes: 7 } });
  });

  it('stops at once when told to, without completing', async () => {
    const stop = new AbortController();
    stop.abort();
    await expect(uploadFilm('media-1', film(10), { signal: stop.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(server.completed).toBe(false);
  });
});

describe('waitForFilm', () => {
  it('reports how the film goes and answers the item once it has the film', async () => {
    vi.useFakeTimers();
    server.completed = true;
    server.jobs = [
      { state: 'waiting', percent: null, reason: null },
      { state: 'working', percent: 40, reason: null },
    ];
    const seen: AdminMediaVideoJob[] = [];
    const done = waitForFilm('media-1', { onProgress: (job) => seen.push(job) });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await done).toMatchObject({ video: { bytes: 7 }, videoJob: null });
    expect(seen.map((job) => job.state)).toEqual(['waiting', 'working']);
  });

  it('says why a film was refused, as an upload error does', async () => {
    server.completed = true;
    server.jobs = [{ state: 'failed', percent: null, reason: 'unsupported_video' }];
    const error = await waitForFilm('media-1').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FilmRefused);
    expect((error as FilmRefused).body?.details).toEqual({ reason: 'unsupported_video' });
  });

  it('stops waiting when told to (the work goes on on the server)', async () => {
    server.jobs = [{ state: 'working', percent: 10, reason: null }];
    const stop = new AbortController();
    stop.abort();
    await expect(waitForFilm('media-1', { signal: stop.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
