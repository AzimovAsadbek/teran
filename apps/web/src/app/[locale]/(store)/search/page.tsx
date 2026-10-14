import type { Locale } from '@teran/contracts';
import { Search as SearchIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { CatalogResults, CatalogResultsSkeleton } from '@/components/catalog/catalog-results';
import { buttonClasses } from '@/components/ui/button';
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
        className="mt-5 max-w-2xl"
      >
        <label htmlFor="search-page-input" className="sr-only">
          {t('label')}
        </label>
        <div className="flex h-14 items-center gap-3 rounded-control border border-line-strong bg-surface pr-1.5 pl-4 shadow-xs transition-[border-color,box-shadow] duration-150 focus-within:border-forest-700 focus-within:ring-[3px] focus-within:ring-forest-700/15">
          <SearchIcon aria-hidden className="h-5 w-5 shrink-0 text-fg-subtle" />
          <input
            id="search-page-input"
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t('placeholder')}
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent text-body-lg text-fg outline-none placeholder:text-fg-subtle"
          />
          <button type="submit" className={buttonClasses('primary', 'md')}>
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
    <div className="container-page pt-4 pb-section sm:pt-6">
      <Breadcrumbs items={[{ label: t('title') }]} locale={locale} />
      <div className="mt-4 sm:mt-6">
        <Suspense fallback={<h1 className="text-display-lg text-forest-900">{t('title')}</h1>}>
          <SearchHeading searchParams={searchParams} />
        </Suspense>
      </div>
      <Suspense fallback={<CatalogResultsSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
