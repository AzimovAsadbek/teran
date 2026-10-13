import 'server-only';
import { cookies } from 'next/headers';
import { ApiError, readErrorBody } from './errors';

const API_URL = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '');
const TIMEOUT_MS = 8_000;

/**
 * Server-to-server GET against the API. Never cached by fetch itself: callers decide caching
 * with `'use cache'`, and personal requests forward the visitor's cookies explicitly.
 */
export async function apiGet<T>(path: string, init: { cookie?: string } = {}): Promise<T> {
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { Accept: 'application/json', ...(init.cookie ? { Cookie: init.cookie } : {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorBody(response));
  }
  return (await response.json()) as T;
}

/** GET on behalf of the current visitor (account and admin pages); returns null when unauthenticated. */
export async function apiGetAsVisitor<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();
  try {
    return await apiGet<T>(path, { cookie: cookieHeader });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}
