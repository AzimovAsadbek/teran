import type { IncomingHttpHeaders } from 'node:http';
import { digestsEqual, sha256 } from '../crypto.js';

export const INTERNAL_KEY_HEADER = 'x-internal-key';

/**
 * True for requests from the storefront's server (cached catalogue and content loads), which carry
 * the shared INTERNAL_API_KEY. Those requests serve many visitors from one IP, so per-IP rate limits
 * must not apply to them. Compared via SHA-256 digests in constant time; no key configured → false.
 */
export function isInternalRequest(
  request: { headers: IncomingHttpHeaders },
  key: string | undefined,
): boolean {
  if (!key) return false;
  const header = request.headers[INTERNAL_KEY_HEADER];
  return typeof header === 'string' && digestsEqual(sha256(header), sha256(key));
}

const SECRET_QUERY_PARAMS = /([?&](?:token|accessToken)=)[^&#]*/gi;

/** Strips secrets carried in query strings (guest order links) before a URL is logged. */
export function redactUrl(url: string | undefined): string | undefined {
  return url?.replace(SECRET_QUERY_PARAMS, '$1[redacted]');
}
