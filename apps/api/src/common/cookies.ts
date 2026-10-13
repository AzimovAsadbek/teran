import type { CookieOptions } from 'express';

/**
 * With HTTPS (COOKIE_SECURE=true) cookies get the `__Host-` prefix, which browsers only accept
 * when the cookie is Secure, has Path=/ and no Domain — so it cannot be set or shadowed by
 * another subdomain. Plain names are used for local HTTP development.
 */
export function cookieName(base: 'teran_session' | 'teran_cart', secure: boolean): string {
  return secure ? `__Host-${base}` : base;
}

export function cookieOptions(secure: boolean, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function clearCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, secure, sameSite: 'lax', path: '/' };
}
