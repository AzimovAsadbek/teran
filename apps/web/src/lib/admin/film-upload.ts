import type { AdminMediaItem, ApiErrorBody, MediaUploadSession } from '@teran/contracts';
import { ApiError, readErrorBody } from '@/lib/api/errors';

/*
 * Films of any size (ADR-061): a film goes to the API in pieces of a few megabytes, each its own
 * request, so no request is too large for the server and a lost connection costs one piece, not
 * the whole film. The API says where each piece must start; after a failure the upload asks how
 * far it got and goes on from there.
 */

export interface FilmUploadProgress {
  /** Bytes the API has, and of the piece on its way. */
  sent: number;
  total: number;
  /** Bytes per second over the last few seconds; null until there is enough to say. */
  bytesPerSecond: number | null;
}

/** Tries per piece before the upload stops and waits for the person to go on. */
const ATTEMPTS = 5;
/**
 * Times the finished film is handed over before giving up. Storing a film of several gigabytes in
 * R2 can take minutes, and the server's gateway answers 504 after one; each try waits again.
 */
const COMPLETE_ATTEMPTS = 30;

/** The upload stopped (the connection is gone): `session` says where it can go on. */
export class FilmUploadInterrupted extends Error {
  constructor(
    readonly session: MediaUploadSession,
    readonly reason: ApiError,
  ) {
    super('The film upload stopped');
    this.name = 'FilmUploadInterrupted';
  }
}

const base = (mediaId: string) => `/api/v1/admin/media/${mediaId}/video/uploads`;

async function call<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, null);
  }
  if (!response.ok) throw new ApiError(response.status, await readErrorBody(response));
  return (response.status === 204 ? null : await response.json()) as T;
}

/** One piece, with its progress (fetch cannot report what it has sent; XMLHttpRequest can). */
function sendPiece(
  url: string,
  piece: Blob,
  onSent: (bytes: number) => void,
  signal?: AbortSignal,
): Promise<MediaUploadSession> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', 'application/octet-stream');
    request.setRequestHeader('Accept', 'application/json');
    request.upload.addEventListener('progress', (event) => onSent(event.loaded));
    request.addEventListener('load', () => {
      let body: unknown = null;
      try {
        body = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        body = null;
      }
      if (request.status >= 200 && request.status < 300) {
        resolve(body as MediaUploadSession);
        return;
      }
      const error =
        body && typeof body === 'object' && 'code' in body ? (body as ApiErrorBody) : null;
      reject(new ApiError(request.status, error));
    });
    request.addEventListener('error', () => reject(new ApiError(0, null)));
    request.addEventListener('timeout', () => reject(new ApiError(0, null)));
    request.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    signal?.addEventListener('abort', () => request.abort(), { once: true });
    request.send(piece);
  });
}

/** Where a refused piece says the upload goes on (409 `upload_offset`), if it says. */
function receivedFrom(error: unknown): number | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const received = (error.body?.details as { received?: unknown } | undefined)?.received;
  return typeof received === 'number' ? received : null;
}

/** A failure worth trying again: no answer, a busy or restarting server. */
function passing(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500)
  );
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * Uploads a film to a gallery item and answers the item with it. Pass `session` (from a
 * FilmUploadInterrupted) to go on with a stopped upload instead of starting again; `signal` stops
 * it (then cancelFilmUpload removes what was sent).
 */
export async function uploadFilm(
  mediaId: string,
  file: File,
  {
    session: previous,
    onStart,
    onProgress,
    signal,
  }: {
    session?: MediaUploadSession | null;
    /** The upload's session as soon as it exists (to cancel it, or go on with it later). */
    onStart?: (session: MediaUploadSession) => void;
    onProgress?: (progress: FilmUploadProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<AdminMediaItem> {
  signal?.throwIfAborted();
  let session: MediaUploadSession | null = null;
  if (previous && previous.size === file.size) {
    session = await call<MediaUploadSession>(`${base(mediaId)}/${previous.id}`, {}).catch(
      () => null,
    );
  }
  session ??= await call<MediaUploadSession>(base(mediaId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size: file.size }),
  });
  onStart?.(session);

  const samples: { time: number; sent: number }[] = [];
  const report = (sent: number) => {
    const now = performance.now();
    samples.push({ time: now, sent });
    while (samples.length > 2 && now - samples[0]!.time > 5000) samples.shift();
    const first = samples[0]!;
    const seconds = (now - first.time) / 1000;
    onProgress?.({
      sent,
      total: file.size,
      bytesPerSecond: seconds >= 1 ? Math.max(0, (sent - first.sent) / seconds) : null,
    });
  };

  let received = session.received;
  let failures = 0;
  report(received);
  while (received < file.size) {
    // Stopped between two pieces: nothing more is sent.
    signal?.throwIfAborted();
    const end = Math.min(received + session.chunkBytes, file.size);
    const from = received;
    try {
      const next = await sendPiece(
        `${base(mediaId)}/${session.id}?offset=${from}`,
        file.slice(from, end),
        (bytes) => report(from + bytes),
        signal,
      );
      received = next.received;
      failures = 0;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      const there = receivedFrom(error);
      if (there !== null) {
        received = there;
        continue;
      }
      failures += 1;
      if (!passing(error) || failures >= ATTEMPTS) {
        throw new FilmUploadInterrupted(
          { ...session, received },
          error instanceof ApiError ? error : new ApiError(0, null),
        );
      }
      // A moment's pause, longer each time, then ask where the API got to.
      await wait(1000 * 2 ** (failures - 1), signal);
      const status = await call<MediaUploadSession>(`${base(mediaId)}/${session.id}`, {}).catch(
        () => null,
      );
      if (status) received = status.received;
    }
    report(received);
  }
  signal?.throwIfAborted();
  return complete(mediaId, session, signal);
}

/**
 * Hands the finished film over to be stored. When the answer does not come (the gateway gave up
 * while the API was still storing a long film), asking again waits for the same work; once the
 * film is stored the upload is gone, and the item says whether it has the film.
 */
async function complete(
  mediaId: string,
  session: MediaUploadSession,
  signal?: AbortSignal,
): Promise<AdminMediaItem> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await call<AdminMediaItem>(`${base(mediaId)}/${session.id}/complete`, {
        method: 'POST',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && attempt > 1) {
        const item = await call<AdminMediaItem>(`/api/v1/admin/media/${mediaId}`, {}).catch(
          () => null,
        );
        if (item?.video?.bytes === session.size) return item;
      }
      if (!passing(error) || attempt >= COMPLETE_ATTEMPTS) throw error;
    }
    await wait(Math.min(10_000, 2000 * attempt), signal);
  }
}

/** Removes a stopped or cancelled upload and what was sent of it. */
export async function cancelFilmUpload(mediaId: string, sessionId: string): Promise<void> {
  await call<null>(`${base(mediaId)}/${sessionId}`, { method: 'DELETE' }).catch(() => undefined);
}
