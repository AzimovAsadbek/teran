import 'server-only';
import type {
  ArticleDetailDto,
  AuthFeaturesDto,
  ArticleSummaryDto,
  CheckoutOptionsDto,
  Locale,
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

export async function getArticles(
  locale: Locale,
  page = 1,
  pageSize = 9,
): Promise<Paginated<ArticleSummaryDto>> {
  'use cache';
  cacheLife('hours');
  cacheTag('content');
  return apiGet<Paginated<ArticleSummaryDto>>(
    `/content/articles?locale=${locale}&page=${page}&pageSize=${pageSize}`,
  );
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
