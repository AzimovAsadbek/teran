import 'server-only';
import type {
  ArticleDetailDto,
  AuthFeaturesDto,
  ArticleSummaryDto,
  CheckoutOptionsDto,
  Locale,
  MediaItemDto,
  MediaKind,
  Paginated,
  PublicSettingsDto,
} from '@teran/contracts';
import { cacheLife, cacheTag } from 'next/cache';
import { apiGet, apiGetOrNull } from '@/lib/api/server';

export async function getPublicSettings(locale: Locale): Promise<PublicSettingsDto> {
  'use cache';
  cacheLife('hours');
  cacheTag('settings');
  return apiGet<PublicSettingsDto>(`/content/settings?locale=${locale}`);
}

/**
 * The settings for a page to prerender with (ADR-039), or null when the API does not answer (a
 * build without one, ADR-008). Never throws: an error inside a cached function stops `next build`
 * even when the caller catches it. A miss is kept a minute only, so the page is prerendered again
 * soon after the API answers; meanwhile the page reads its pictures at request time.
 */
export async function getPrerenderSettings(locale: Locale): Promise<PublicSettingsDto | null> {
  'use cache';
  cacheTag('settings');
  try {
    const settings = await apiGet<PublicSettingsDto>(`/content/settings?locale=${locale}`);
    cacheLife('hours');
    return settings;
  } catch {
    cacheLife('minutes');
    return null;
  }
}

export async function getArticles(
  locale: Locale,
  page = 1,
  pageSize = 9,
  featuredFirst = false,
): Promise<Paginated<ArticleSummaryDto>> {
  'use cache';
  cacheLife('hours');
  cacheTag('content');
  return apiGet<Paginated<ArticleSummaryDto>>(
    `/content/articles?locale=${locale}&page=${page}&pageSize=${pageSize}${featuredFirst ? '&featuredFirst=true' : ''}`,
  );
}

interface MediaQuery {
  kind?: MediaKind;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

function mediaPath(locale: Locale, options: MediaQuery): string {
  const query = new URLSearchParams({ locale });
  if (options.featured) query.set('featured', 'true');
  if (options.kind) query.set('kind', options.kind);
  query.set('page', String(options.page ?? 1));
  query.set('pageSize', String(options.pageSize ?? 24));
  return `/content/media?${query}`;
}

/** Published photographs and films (the gallery) in display order; `featured` for the home page. */
export async function getMedia(
  locale: Locale,
  options: MediaQuery = {},
): Promise<Paginated<MediaItemDto>> {
  'use cache';
  cacheLife('hours');
  cacheTag('content');
  return apiGet<Paginated<MediaItemDto>>(mediaPath(locale, options));
}

/**
 * The gallery for a page to prerender with (its header's picture, ADR-056), or null when the API
 * does not answer. Never throws, for the reason given at getPrerenderSettings.
 */
export async function getPrerenderMedia(
  locale: Locale,
  options: MediaQuery = {},
): Promise<Paginated<MediaItemDto> | null> {
  'use cache';
  cacheTag('content');
  try {
    const media = await apiGet<Paginated<MediaItemDto>>(mediaPath(locale, options));
    cacheLife('hours');
    return media;
  } catch {
    cacheLife('minutes');
    return null;
  }
}

/** Current address of a renamed article (for a permanent redirect), or null. */
export async function getArticleRedirect(slug: string): Promise<string | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('content');
  const found = await apiGetOrNull<{ slug: string }>(
    `/content/articles/redirects/${encodeURIComponent(slug)}`,
  );
  return found?.slug ?? null;
}

/** Null when no published article has this slug. */
export async function getArticle(locale: Locale, slug: string): Promise<ArticleDetailDto | null> {
  'use cache';
  cacheLife('hours');
  cacheTag('content');
  return apiGetOrNull<ArticleDetailDto>(
    `/content/articles/${encodeURIComponent(slug)}?locale=${locale}`,
  );
}

export async function getCheckoutOptions(locale: Locale): Promise<CheckoutOptionsDto> {
  'use cache';
  cacheLife('minutes');
  cacheTag('settings');
  return apiGet<CheckoutOptionsDto>(`/checkout/options?locale=${locale}`);
}

/** Which account features the API can offer (password reset needs outgoing e-mail). */
export async function getAuthFeatures(): Promise<AuthFeaturesDto> {
  'use cache';
  cacheLife('minutes');
  cacheTag('settings');
  return apiGet<AuthFeaturesDto>('/auth/features');
}
