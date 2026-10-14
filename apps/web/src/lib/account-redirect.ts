import { NextResponse, type NextRequest } from 'next/server';
import { hasSessionCookie } from './session';

/** Account pages anyone may open; every other /account page needs a session. */
const PUBLIC_ACCOUNT_PAGES = new Set(['login', 'register', 'forgot-password', 'reset-password']);
const ACCOUNT_PATH = /^(\/(?:ru|en|uz))?\/account(\/[^/]+)?(\/.*)?$/;

/**
 * Sends a visitor without a session cookie straight from a private account page to sign-in, so
 * nobody sees an account page start to render and then bounce. (The pages still check the
 * session itself: a cookie can be expired or revoked.)
 */
export function accountRedirect(request: NextRequest): NextResponse | null {
  const match = ACCOUNT_PATH.exec(request.nextUrl.pathname);
  if (!match) return null;
  const section = match[2]?.slice(1);
  if (section && PUBLIC_ACCOUNT_PAGES.has(section)) return null;
  if (hasSessionCookie(request.cookies)) return null;
  const prefix = match[1] ?? '';
  const next = request.nextUrl.pathname.slice(prefix.length) + request.nextUrl.search;
  const target = new URL(`${prefix}/account/login`, request.url);
  target.searchParams.set('next', next);
  return NextResponse.redirect(target);
}
