import 'server-only';
import { apiGetAsVisitor } from '@/lib/api/server';

/** Server-side admin data for the signed-in staff member; null when the session lacks access. */
export function adminGet<T>(path: string): Promise<T | null> {
  return apiGetAsVisitor<T>(`/admin${path}`);
}

type Params = Record<string, string | string[] | undefined>;

/** First value of a search parameter. */
export function param(params: Params, key: string): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() ? first.trim() : undefined;
}

/** Builds an API query string from the allowed, non-empty parameters. */
export function apiQuery(
  params: Params,
  keys: readonly string[],
  extra: Record<string, string> = {},
): string {
  const query = new URLSearchParams(extra);
  for (const key of keys) {
    const value = param(params, key);
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

/** Page link that keeps the current filters. */
export function pageHref(
  base: string,
  params: Params,
  keys: readonly string[],
  page: number,
): string {
  const query = new URLSearchParams();
  for (const key of keys) {
    const value = param(params, key);
    if (value) query.set(key, value);
  }
  if (page > 1) query.set('page', String(page));
  const text = query.toString();
  return text ? `${base}?${text}` : base;
}
