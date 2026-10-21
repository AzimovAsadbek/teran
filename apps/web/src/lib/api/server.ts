import 'server-only';
import { cookies, headers } from 'next/headers';
import { ApiError, readErrorBody } from './errors';
import { apiFailureLine, type ApiFailure } from './failures';

const API_URL = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '');
const INTERNAL_KEY = process.env.API_INTERNAL_KEY;
const TIMEOUT_MS = 8_000;

/**
 * Writes a failed call to the server's log (failures.ts). Not while `next build` prerenders: the
 * API may well be absent then (ADR-008), and those pages render at request time instead.
 */
function reportFailure(failure: ApiFailure): void {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const line = apiFailureLine(failure, {
    apiUrl: API_URL,
    timeoutMs: TIMEOUT_MS,
    now: performance.now(),
  });
  if (line) console.error(line);
}

/** The visitor a server-side request is made for: their cookies and their client IP. */
interface VisitorContext {
  cookie: string;
  forwardedFor: string | null;
}

/**
 * Server-to-server GET against the API. Never cached by fetch itself (`no-store`: without it a
 * build keeps what it fetched in `.next/cache/fetch-cache`, and the next build prerenders with
 * that copy instead of asking the API again): callers decide caching with `'use cache'`, whose
 * tags the API's changes expire. Inside a cache scope `no-store` makes nothing dynamic.
 *
 * - Without a visitor (cached catalogue/content loads shared by everyone) the request carries the
 *   internal key, so the API does not count it against one IP's rate limit.
 * - With a visitor (account pages, order status) it forwards their cookies and client IP instead,
 *   so per-visitor limits and authorisation apply exactly as for a browser request.
 */
export async function apiGet<T>(path: string, visitor?: VisitorContext): Promise<T> {
  const requestHeaders: Record<string, string> = { Accept: 'application/json' };
  if (visitor) {
    if (visitor.cookie) requestHeaders.Cookie = visitor.cookie;
    if (visitor.forwardedFor) requestHeaders['X-Forwarded-For'] = visitor.forwardedFor;
  } else if (INTERNAL_KEY) {
    requestHeaders['X-Internal-Key'] = INTERNAL_KEY;
  }

  // performance.now() is for timing only, so Next.js allows it while prerendering.
  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      headers: requestHeaders,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    reportFailure({ method: 'GET', path, error, ms: performance.now() - started });
    throw error;
  }
  if (!response.ok) {
    const body = await readErrorBody(response);
    // Client errors (404, 401, 400) are answers the callers expect; the API logs them too.
    if (response.status >= 500) {
      const ms = performance.now() - started;
      reportFailure({ method: 'GET', path, status: response.status, body, ms });
    }
    throw new ApiError(response.status, body);
  }
  return (await response.json()) as T;
}

/**
 * GET that resolves to null on 404. Use it inside `'use cache'` loaders: an error thrown there is
 * serialised across the cache boundary and loses its ApiError class, so callers could not tell
 * "not found" from a failure.
 */
export async function apiGetOrNull<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

async function visitorContext(): Promise<VisitorContext> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return { cookie: cookieStore.toString(), forwardedFor: headerList.get('x-forwarded-for') };
}

/** GET on behalf of the current visitor (account and admin pages); returns null when unauthenticated. */
export async function apiGetAsVisitor<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path, await visitorContext());
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
}

/** Per-visitor GET where 400/404 mean "no such resource for this visitor" (e.g. a guest order link). */
export async function apiFindAsVisitor<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path, await visitorContext());
  } catch (error) {
    if (error instanceof ApiError && (error.status === 400 || error.status === 404)) return null;
    throw error;
  }
}
