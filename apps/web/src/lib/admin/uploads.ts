import type { ApiErrorBody } from '@teran/contracts';
import { ApiError, readErrorBody } from '@/lib/api/errors';

/**
 * Heaviest picture the API takes (UPLOAD_MAX_BYTES, 5 MB). The admin area never sends a heavier
 * one: it redraws larger pictures lighter in the browser first (media-files.ts, ADR-061).
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Smallest side of an accepted picture (the API's own rule). */
export const MIN_IMAGE_SIDE = 200;
/** The formats the API reads; any other picture the browser can read is redrawn as one of them. */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
/** What the file pickers offer: any picture (a phone's HEIC, a camera's large JPEG…). */
export const IMAGE_PICK = 'image/*';

/** A same-origin multipart upload (the session cookie authenticates it). */
export async function uploadFile<T = unknown>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append('file', file);
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, { method: 'POST', body, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, null);
  }
  if (!response.ok) throw new ApiError(response.status, await readErrorBody(response));
  return (await response.json()) as T;
}

/**
 * The same upload, reporting how much of the file has been sent (0 to 1): a film of tens of
 * megabytes takes a while, and the composer shows it moving (fetch cannot report it).
 */
export function uploadFileWithProgress<T = unknown>(
  path: string,
  file: File,
  onProgress: (sent: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const body = new FormData();
    body.append('file', file);
    const request = new XMLHttpRequest();
    request.open('POST', `/api/v1${path}`);
    request.setRequestHeader('Accept', 'application/json');
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
    });
    request.addEventListener('load', () => {
      let parsed: unknown = null;
      try {
        parsed = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        parsed = null;
      }
      if (request.status >= 200 && request.status < 300) {
        resolve(parsed as T);
        return;
      }
      const error =
        parsed && typeof parsed === 'object' && 'code' in parsed ? (parsed as ApiErrorBody) : null;
      reject(new ApiError(request.status, error));
    });
    request.addEventListener('error', () => reject(new ApiError(0, null)));
    request.addEventListener('abort', () => reject(new ApiError(0, null)));
    request.send(body);
  });
}
