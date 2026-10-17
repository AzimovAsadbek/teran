import type { Locale } from '@teran/contracts';
import { Search as SearchIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { CatalogResults, CatalogResultsSkeleton } from '@/components/catalog/catalog-results';
import { buttonClasses } from '@/components/ui/button';
import type { RawSearchParams } from '@/features/catalog/query';
import { getPathname, Link } from '@/i18n/navigation';
import { getCategories } from '@/lib/data/catalog';
import { getArticles } from '@/lib/data/content';

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

/** The reference's search band: the title centred over a wide pill field. */
async function SearchHeading({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const [t, locale] = await Promise.all([getTranslations('Search'), getLocale()]);
  const q = queryFrom(await searchParams);
  return (
    <>
      <h1 className="font-headline text-[2rem] text-ivory-50 [--heading-case:none] [--headline-weight:800]">
        {q ? t('resultsFor', { query: q }) : t('title')}
      </h1>
      <form
        role="search"
        action={getPathname({ href: '/search', locale })}
        method="get"
        className="mt-6 w-full max-w-[62.5rem]"
      >
        <label htmlFor="search-page-input" className="sr-only">
          {t('label')}
        </label>
        <div className="flex h-14 items-center gap-3 rounded-full bg-surface pr-1.5 pl-5 text-fg shadow-soft transition-shadow duration-150 focus-within:ring-[3px] focus-within:ring-gold-300/60 sm:h-[3.625rem]">
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

function SidebarGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="mb-8">
      <h2 className="border-b border-fg pb-1.5 text-[0.9375rem] font-bold tracking-[0.06em] text-fg uppercase">
        {title}
      </h2>
      <ul className="mt-3 space-y-2.5">{children}</ul>
    </nav>
  );
}

/**
 * The reference's left column: categories and journal articles whose names match the query
 * (from the catalogue and the journal; nothing is suggested that does not exist).
 */
async function SearchSidebar({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await connection();
  const q = queryFrom(await searchParams).toLocaleLowerCase();
  if (q.length < 2) return null;
  const locale = (await getLocale()) as Locale;
  const [t, tn] = await Promise.all([getTranslations('Search'), getTranslations('Nav')]);
  const [categories, articles] = await Promise.all([
    getCategories(locale).catch(() => []),
    getArticles(locale, 1, 24)
      .then((page) => page.items)
      .catch(() => []),
  ]);
  const matchingCategories = categories
    .filter((category) => category.name.toLocaleLowerCase().includes(q))
    .slice(0, 8);
  const matchingArticles = articles
    .filter(
      (article) =>
        article.title.toLocaleLowerCase().includes(q) ||
        (article.excerpt ?? '').toLocaleLowerCase().includes(q),
    )
    .slice(0, 6);
  if (matchingCategories.length === 0 && matchingArticles.length === 0) return null;
  return (
    <div className="mb-8 lg:mb-0">
      {matchingCategories.length > 0 ? (
        <SidebarGroup title={t('categories')}>
          {matchingCategories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/${category.path}`}
                className="text-[1rem] text-fg underline-offset-4 hover:text-brand hover:underline"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </SidebarGroup>
      ) : null}
      {matchingArticles.length > 0 ? (
        <SidebarGroup title={tn('articles')}>
          {matchingArticles.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/journal/${article.slug}`}
                className="text-[1rem] text-fg underline-offset-4 hover:text-brand hover:underline"
              >
                {article.title}
              </Link>
            </li>
          ))}
        </SidebarGroup>
      ) : null}
    </div>
  );
}

async function SearchResults({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const q = queryFrom(await searchParams);
  if (q.length < 1) return null;
  return <CatalogResults basePath="/search" scope={{ q }} searchParams={searchParams} />;
}

/**
 * Search on the reference's template: a brand-green band with the title and a wide pill field,
 * then matching categories and articles on the left and the filterable product grid on the right.
 */
export default async function SearchPage({ searchParams }: PageProps<'/[locale]/search'>) {
  const t = await getTranslations('Search');
  return (
    <>
      <section className="on-dark bg-forest-900 text-ivory-50">
        <div className="container-page flex min-h-[17.5rem] flex-col items-center justify-center py-12 text-center">
          <Suspense
            fallback={
              <h1 className="font-headline text-[2rem] [--heading-case:none] [--headline-weight:800]">
                {t('title')}
              </h1>
            }
          >
            <SearchHeading searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
      <div className="container-page pt-8 pb-section sm:pt-10 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12">
        {/*
          One boundary for both columns: on phones the matching categories and articles sit above
          the products, and arriving after them would push the whole grid down.
        */}
        <Suspense
          fallback={
            <>
              <aside className="lg:pt-6" />
              <div className="min-w-0">
                <CatalogResultsSkeleton />
              </div>
            </>
          }
        >
          <aside className="lg:pt-6">
            <SearchSidebar searchParams={searchParams} />
          </aside>
          <div className="min-w-0">
            <SearchResults searchParams={searchParams} />
          </div>
        </Suspense>
      </div>
    </>
  );
}
