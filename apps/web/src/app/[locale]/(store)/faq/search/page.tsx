import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import {
  ArticleCards,
  HelpTopBar,
  helpCategories,
  navCategories,
  searchEntries,
  searchProps,
  shellLabels,
} from '@/components/help/help-parts';
import { SupportRow } from '@/components/content/support-row';
import { HelpSearch } from '@/components/help/help-search';
import { HelpShell } from '@/components/help/help-shell';
import { matchArticles } from '@/components/help/match';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Pages' });
  // A search result page: not indexed, and no canonical or language versions of its own.
  return pageMetadata({ title: t('faqTitle'), href: '/faq/search', locale, noIndex: true });
}

/** The query, read inside Suspense (search parameters are known only per request). */
async function Results({ searchParams }: Pick<PageProps<'/[locale]/faq/search'>, 'searchParams'>) {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Help');
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 100) ?? '';
  const entries = searchEntries(helpCategories(locale));
  const found = matchArticles(entries, query);
  return (
    <>
      <h1 className="mb-8 pt-6 font-heading text-[2rem] leading-tight text-balance text-fg min-[48rem]:pt-0 sm:text-[2.5rem]">
        {query ? t('searchTitle', { query }) : t('searchEmpty')}
      </h1>
      {query && found.length === 0 ? (
        <p className="text-[1.0625rem] leading-relaxed text-fg-muted">
          {t('noResults', { query })}
        </p>
      ) : (
        <ArticleCards
          articles={found.map((entry) => ({
            href: entry.href,
            title: entry.title,
            text: entry.text,
          }))}
        />
      )}
    </>
  );
}

/** The help centre's search results: the trail, then the matching articles as cards. */
export default async function HelpSearchPage({ searchParams }: PageProps<'/[locale]/faq/search'>) {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Help');
  const categories = helpCategories(locale);
  const [search, labels] = await Promise.all([searchProps(locale), shellLabels()]);

  return (
    <>
      <HelpTopBar
        trail={[{ label: t('allArticles'), href: '/faq/articles' }, { label: t('search') }]}
        search={
          <HelpSearch
            entries={searchEntries(categories)}
            labels={search.labels}
            action={search.action}
            variant="bar"
          />
        }
      />
      <HelpShell categories={navCategories(categories)} labels={labels}>
        <Suspense fallback={<div className="h-64" />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </HelpShell>
      <Suspense fallback={null}>
        <SupportRow />
      </Suspense>
    </>
  );
}
