import 'server-only';
import type {
  AdminBadges,
  AdminMediaUploadLimits,
  AdminTelegramPostList,
  TelegramMode,
} from '@teran/contracts';
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

/** A serverless host refuses request bodies above this before they reach the server. */
const SERVERLESS_BODY_BYTES = 4.5 * 1024 * 1024;

/**
 * How large a film the admin area may upload, and whether it goes straight to object storage
 * (the API decides from its configuration; on Vercel this server also passes at most 4.5 MB on).
 */
export async function getMediaUploadLimits(): Promise<AdminMediaUploadLimits> {
  const limits = await adminGet<AdminMediaUploadLimits>('/media/upload-limits').catch(() => null);
  const multipart = limits?.multipartVideoBytes ?? SERVERLESS_BODY_BYTES;
  return {
    multipartVideoBytes: process.env.VERCEL
      ? Math.min(multipart, SERVERLESS_BODY_BYTES)
      : multipart,
    directVideoBytes: limits?.directVideoBytes ?? null,
  };
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
