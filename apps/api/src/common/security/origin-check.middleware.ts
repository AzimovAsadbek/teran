import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TRUSTED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none']);

/**
 * CSRF defence for cookie-authenticated, state-changing requests (OWASP "verify origin with
 * standard headers"), layered on top of SameSite=Lax cookies.
 *
 * - If the browser sent an Origin header it must be one of the configured storefront origins.
 * - Otherwise, if Sec-Fetch-Site is present it must not be "cross-site".
 * - Requests with neither header are not from a browser (server-to-server calls from Next.js,
 *   CLI tools); they cannot carry a victim's cookies, so they are allowed.
 */
export function createOriginCheckMiddleware(allowedOrigins: readonly string[]) {
  const allowed = new Set(allowedOrigins.map((origin) => new URL(origin).origin));

  return (request: Request, response: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(request.method)) {
      next();
      return;
    }

    const origin = request.headers.origin;
    if (origin !== undefined) {
      if (origin !== 'null' && allowed.has(origin)) {
        next();
        return;
      }
      reject(response);
      return;
    }

    const fetchSite = request.headers['sec-fetch-site'];
    if (typeof fetchSite === 'string' && !TRUSTED_FETCH_SITES.has(fetchSite)) {
      reject(response);
      return;
    }

    next();
  };
}

function reject(response: Response): void {
  response.status(403).json({
    statusCode: 403,
    code: 'INVALID_ORIGIN',
    message: 'Cross-site request rejected',
  });
}
