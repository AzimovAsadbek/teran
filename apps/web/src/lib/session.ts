/** Names of the session cookie set by the API (with the __Host- prefix when served over HTTPS). */
export const SESSION_COOKIES = ['teran_session', '__Host-teran_session'] as const;

/** Whether a request carries a session cookie at all (it may still be expired or revoked). */
export function hasSessionCookie(cookies: { has(name: string): boolean }): boolean {
  return SESSION_COOKIES.some((name) => cookies.has(name));
}

/** What the header needs to know about the visitor; null for anyone not signed in. */
export type HeaderAccount = { firstName: string; staff: boolean } | null;
