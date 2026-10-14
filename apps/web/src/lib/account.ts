import 'server-only';
import type { CurrentUserDto, Locale } from '@teran/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getPathname } from '@/i18n/navigation';
import { apiGetAsVisitor } from '@/lib/api/server';
import { hasSessionCookie } from '@/lib/session';

/**
 * The signed-in visitor, or null. Without a session cookie no request is made at all, so sign-in
 * and registration pages render straight away for visitors.
 */
export async function currentUser(): Promise<CurrentUserDto | null> {
  if (!hasSessionCookie(await cookies())) return null;
  return apiGetAsVisitor<CurrentUserDto>('/auth/me').catch(() => null);
}

/** The signed-in customer, or a redirect to sign-in that comes back to `path` afterwards. */
export async function requireUser(locale: Locale, path: string): Promise<CurrentUserDto> {
  const user = await currentUser();
  if (!user) {
    redirect(getPathname({ href: `/account/login?next=${encodeURIComponent(path)}`, locale }));
  }
  return user;
}
