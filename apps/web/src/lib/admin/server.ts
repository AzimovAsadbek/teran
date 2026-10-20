import 'server-only';
import type { AdminBadges, AdminTelegramPostList, TelegramMode } from '@teran/contracts';
import { cache } from 'react';
import { apiGetAsVisitor } from '@/lib/api/server';

/** Server-side admin data for the signed-in staff member; null when the session lacks access. */
export function adminGet<T>(path: string): Promise<T | null> {
  return apiGetAsVisitor<T>(`/admin${path}`);
}

/**
 * Work waiting for staff, loaded once per request: the navigation badges and the dashboard's
 * to-do list share it. A failure only hides the counts.
 */
export const getAdminBadges = cache((): Promise<AdminBadges | null> =>
  adminGet<AdminBadges>('/badges').catch(() => null),
);

/** How Telegram announcements are configured (shown next to each product and article). */
export const getTelegramSettings = cache(
  async (): Promise<{ mode: TelegramMode; channel: string | null }> => {
    const list = await adminGet<AdminTelegramPostList>('/telegram/posts?pageSize=1').catch(
      () => null,
    );
    return { mode: list?.mode ?? 'disabled', channel: list?.channel ?? null };
  },
);

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
