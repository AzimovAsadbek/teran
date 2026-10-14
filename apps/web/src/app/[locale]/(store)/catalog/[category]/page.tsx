import type { Locale } from '@teran/contracts';
import { notFound, permanentRedirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { getPathname } from '@/i18n/navigation';
import { getCategoryPage } from '@/lib/data/catalog';

/**
 * Former category address (/catalog/green-tea). The proxy already answers these with a 308 to the
 * category's current page; this page is the fallback when it could not reach the API.
 */
async function LegacyCategory({
  params,
  searchParams,
}: Pick<PageProps<'/[locale]/catalog/[category]'>, 'params' | 'searchParams'>): Promise<never> {
  const [{ category }, query, locale] = await Promise.all([
    params,
    searchParams,
    rootParams.locale() as Promise<Locale>,
  ]);
  const page = await getCategoryPage(locale, category);
  if (!page) notFound();
  const path = page.type === 'redirect' ? page.path : page.category.path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const entry of Array.isArray(value) ? value : [value ?? '']) {
      if (entry) search.append(key, entry);
    }
  }
  const text = search.toString();
  permanentRedirect(getPathname({ href: text ? `/${path}?${text}` : `/${path}`, locale }));
}

export default function LegacyCategoryPage({
  params,
  searchParams,
}: PageProps<'/[locale]/catalog/[category]'>) {
  return (
    <Suspense fallback={null}>
      <LegacyCategory params={params} searchParams={searchParams} />
    </Suspense>
  );
}
