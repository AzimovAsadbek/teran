import 'server-only';
import type {
  ArticleDetailDto,
  ArticleSummaryDto,
  CheckoutOptionsDto,
  Locale,
  Paginated,
  PublicSettingsDto,
} from '@teran/contracts';
import { cacheLife, cacheTag } from 'next/cache';
import { apiGet } from '@/lib/api/server';

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

export async function getArticle(locale: Locale, slug: string): Promise<ArticleDetailDto> {
  'use cache';
  cacheLife('hours');
  cacheTag('content');
  return apiGet<ArticleDetailDto>(`/content/articles/${encodeURIComponent(slug)}?locale=${locale}`);
}

export async function getCheckoutOptions(locale: Locale): Promise<CheckoutOptionsDto> {
  'use cache';
  cacheLife('minutes');
  cacheTag('settings');
  return apiGet<CheckoutOptionsDto>(`/checkout/options?locale=${locale}`);
}
