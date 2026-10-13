/**
 * Where to go after signing in. Only same-site paths are accepted ("/account", "/checkout?x=1"):
 * absolute URLs, protocol-relative "//host" and backslash tricks fall back to the default, so the
 * parameter cannot be used as an open redirect.
 */
export function safeNextPath(value: unknown, fallback = '/account'): string {
  if (typeof value !== 'string' || value.length > 300) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
