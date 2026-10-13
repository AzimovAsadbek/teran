import type { Locale } from '@teran/contracts';
import { Search as SearchIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { CatalogResults } from '@/components/catalog/catalog-results';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import type { RawSearchParams } from '@/features/catalog/query';
import { getPathname } from '@/i18n/navigation';

/** Search results are never indexed (thin, unbounded URLs) but their links are followed. */
export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Search' });
  return { title: t('metaTitle'), robots: { index: false, follow: true } };
}

function queryFrom(params: RawSearchParams): string {
  const value = Array.isArray(params.q) ? params.q[0] : params.q;
  return (value ?? '').trim().slice(0, 100);
}

async function SearchHeading({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const [t, locale] = await Promise.all([getTranslations('Search'), getLocale()]);
  const q = queryFrom(await searchParams);
  return (
    <>
      <h1 className="text-display-lg text-forest-900">
        {q ? t('resultsFor', { query: q }) : t('title')}
      </h1>
      <form
        role="search"
        action={getPathname({ href: '/search', locale })}
        method="get"
        className="mt-6 max-w-2xl"
      >
        <label htmlFor="search-page-input" className="sr-only">
          {t('label')}
        </label>
        <div className="flex items-center gap-3 rounded-full border border-sage-500 bg-white px-5 focus-within:border-forest-700">
          <SearchIcon aria-hidden className="h-5 w-5 text-ink-500" />
          <input
            id="search-page-input"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t('placeholder')}
            className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-ink-500"
          />
          <button
            type="submit"
            className="rounded-full bg-forest-900 px-4 py-2 text-sm font-semibold text-ivory-50"
          >
            {t('submit')}
          </button>
        </div>
      </form>
    </>
  );
}

async function SearchResults({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const q = queryFrom(await searchParams);
  if (q.length < 1) return null;
  return <CatalogResults basePath="/search" scope={{ q }} searchParams={searchParams} />;
}

export default async function SearchPage({ searchParams }: PageProps<'/[locale]/search'>) {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Search');
  return (
    <div className="container-page pt-6 pb-20">
      <Breadcrumbs items={[{ label: t('title') }]} locale={locale} />
      <div className="mt-6 mb-10">
        <Suspense fallback={<h1 className="text-display-lg text-forest-900">{t('title')}</h1>}>
          <SearchHeading searchParams={searchParams} />
        </Suspense>
      </div>
      <Suspense fallback={<ProductGridSkeleton count={8} />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
