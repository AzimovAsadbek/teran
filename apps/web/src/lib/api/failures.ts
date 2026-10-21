import type { ApiErrorBody } from '@teran/contracts';

/** A server-side API call that did not get a usable answer. */
export interface ApiFailure {
  method: string;
  path: string;
  /** The answer's status, when the API answered. */
  status?: number;
  body?: ApiErrorBody | null;
  /** What fetch threw, when the API did not answer. */
  error?: unknown;
  ms: number;
}

const WINDOW_MS = 60_000;
const SECRET_QUERY_PARAMS = /([?&](?:token|accessToken)=)[^&#]*/gi;

/** Per kind of failure: when it was last written, and how many like it were left out since. */
const recent = new Map<string, { at: number; leftOut: number }>();

function networkCode(error: unknown): string | undefined {
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause;
  return typeof cause?.code === 'string' ? cause.code : undefined;
}

function isTimeout(error: unknown): boolean {
  return (error as { name?: unknown } | null)?.name === 'TimeoutError';
}

/**
 * The call itself failed: no connection (fetch's "fetch failed"), or no answer in time. Anything
 * else fetch rejects with must pass through untouched: Next.js, for one, rejects the fetches still
 * pending when it ends a prerender (HANGING_PROMISE_REJECTION), and has to recognise its own error.
 */
export function isNetworkFailure(error: unknown): boolean {
  if (isTimeout(error)) return true;
  const { name, message } = (error ?? {}) as { name?: unknown; message?: unknown };
  return name === 'TypeError' && message === 'fetch failed';
}

function kindOf(failure: ApiFailure): string {
  if (failure.status !== undefined) return `status ${failure.status}`;
  if (isTimeout(failure.error)) return 'timeout';
  return `unreachable ${networkCode(failure.error) ?? ''}`;
}

/** The reason, in words: `500 INTERNAL_ERROR`, `no answer within 8 s`, `the API at … is unreachable (ECONNREFUSED)`. */
function reasonOf(failure: ApiFailure, apiUrl: string, timeoutMs: number): string {
  if (failure.status !== undefined) {
    return [failure.status, failure.body?.code].filter(Boolean).join(' ');
  }
  if (isTimeout(failure.error)) return `no answer within ${timeoutMs / 1000} s`;
  const code = networkCode(failure.error);
  return `the API at ${apiUrl} is unreachable${code ? ` (${code})` : ''}`;
}

/** The call, tokens in its address redacted: `GET /orders/TRN-1?token=[redacted]`. */
function callOf(failure: ApiFailure): string {
  return `${failure.method} ${failure.path.replace(SECRET_QUERY_PARAMS, '$1[redacted]')}`;
}

/** `GET /content/settings?locale=en: the API at http://api:4000 is unreachable (ECONNREFUSED)`. */
export function describeApiFailure(
  failure: ApiFailure,
  { apiUrl, timeoutMs }: { apiUrl: string; timeoutMs: number },
): string {
  return `${callOf(failure)}: ${reasonOf(failure, apiUrl, timeoutMs)}`;
}

/**
 * One line for the storefront server's log (`docker compose logs web`), e.g.
 *
 *   [api] GET /catalog/products?pageSize=8 failed: 500 INTERNAL_ERROR after 45 ms (API request 7bce04be-…)
 *
 * The API's log has the same request id on its line for the request and on the error with its
 * stack. Tokens in the address are redacted. A failure of a kind already written in the last
 * minute is counted instead, and the next line of that kind says how many were left out: an API
 * that is down costs one line a minute, not one per page.
 */
export function apiFailureLine(
  failure: ApiFailure,
  { apiUrl, timeoutMs, now }: { apiUrl: string; timeoutMs: number; now: number },
): string | null {
  const kind = kindOf(failure);
  const last = recent.get(kind);
  if (last && now - last.at < WINDOW_MS) {
    last.leftOut += 1;
    return null;
  }
  recent.set(kind, { at: now, leftOut: 0 });
  const reason = reasonOf(failure, apiUrl, timeoutMs);
  const requestId = failure.body?.requestId ? ` (API request ${failure.body.requestId})` : '';
  const leftOut = last?.leftOut ? `; ${last.leftOut} more like this since the last report` : '';
  return `[api] ${callOf(failure)} failed: ${reason} after ${Math.round(failure.ms)} ms${requestId}${leftOut}`;
}

/** Forgets what was reported (tests). */
export function resetApiFailures(): void {
  recent.clear();
}
