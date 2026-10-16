import { ApiError, readErrorBody } from '@/lib/api/errors';

/**
 * Largest file the admin area sends. The API accepts 5 MB, but a serverless deployment refuses
 * request bodies above 4.5 MB before they reach it (docs/deployment/vercel.md), so the editor
 * checks the lower limit and says so before uploading.
 */
export const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
/** Smallest side of an accepted picture (the API's own rule). */
export const MIN_IMAGE_SIDE = 200;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const IMAGE_TYPES = new Set(IMAGE_ACCEPT.split(','));

export type LocalImageProblem = 'unsupported_format' | 'too_large' | 'too_small' | 'unreadable';

export interface LocalImageCheck {
  width: number | null;
  height: number | null;
  problem: LocalImageProblem | null;
}

/**
 * A quick check in the browser before anything is sent: type, size and dimensions. The API checks
 * the file's real content again (a renamed file cannot slip through).
 */
export async function checkImageFile(file: File): Promise<LocalImageCheck> {
  if (file.type && !IMAGE_TYPES.has(file.type)) {
    return { width: null, height: null, problem: 'unsupported_format' };
  }
  if (file.size > MAX_UPLOAD_BYTES) return { width: null, height: null, problem: 'too_large' };
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    if (width < MIN_IMAGE_SIDE || height < MIN_IMAGE_SIDE) {
      return { width, height, problem: 'too_small' };
    }
    return { width, height, problem: null };
  } catch {
    // Some browsers cannot decode AVIF: the server decides.
    return { width: null, height: null, problem: file.type === 'image/avif' ? null : 'unreadable' };
  }
}

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

/** "4.5 MB" in the reader's language. */
export function formatBytes(bytes: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 / 1024)} MB`;
}
