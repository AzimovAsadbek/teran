import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import {
  categoryHref,
  HelpTopBar,
  helpCategories,
  navCategories,
  QuestionList,
  searchEntries,
  searchProps,
  shellLabels,
} from '@/components/help/help-parts';
import { SupportRow } from '@/components/content/support-row';
import { HelpSearch } from '@/components/help/help-search';
import { HelpShell } from '@/components/help/help-shell';
import { faqGroups } from '@/content/pages/faq';
import { pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return faqGroups.en.map((group) => ({ group: group.id }));
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/faq/[group]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { group } = await params;
  const category = helpCategories(locale).find((candidate) => candidate.id === group);
  // Settled before the page streams, so crawlers get a real 404 for an unknown category.
  if (!category) notFound();
  const t = await getTranslations({ locale, namespace: 'Pages' });
  return pageMetadata({
    title: `${category.heading} · ${t('faqTitle')}`,
    description: category.articles.map((article) => article.question).join(' '),
    href: categoryHref(category.id),
    locale,
  });
}

/**
 * A help group's page: the trail, its name, then its questions, each opening on its full answer
 * in place (as on the help centre's front page).
 */
async function HelpCategoryView({ params }: Pick<PageProps<'/[locale]/faq/[group]'>, 'params'>) {
  const locale = (await rootParams.locale()) as Locale;
  const { group } = await params;
  const categories = helpCategories(locale);
  const category = categories.find((candidate) => candidate.id === group);
  if (!category) notFound();
  const t = await getTranslations('Help');
  const [search, labels] = await Promise.all([searchProps(locale), shellLabels()]);

  return (
    <>
      <HelpTopBar
        trail={[{ label: t('allArticles'), href: '/faq/articles' }, { label: category.heading }]}
        search={
          <HelpSearch
            entries={searchEntries(categories)}
            labels={search.labels}
            action={search.action}
            variant="bar"
          />
        }
      />
      <HelpShell
        categories={navCategories(categories)}
        current={categoryHref(category.id)}
        labels={labels}
      >
        <h1 className="pt-6 font-heading text-[2.25rem] leading-tight text-fg min-[48rem]:pt-0 sm:text-[2.75rem]">
          {category.heading}
        </h1>
        <div className="mt-6">
          <QuestionList group={category.id} articles={category.articles} headingLevel="h2" />
        </div>
      </HelpShell>
    </>
  );
}

/** The page: its trail and content depend on the address, so they stream in under Suspense. */
export default function HelpCategoryPage({ params }: PageProps<'/[locale]/faq/[group]'>) {
  return (
    <>
      <Suspense fallback={<div className="min-h-[40rem]" />}>
        <HelpCategoryView params={params} />
      </Suspense>
      <Suspense fallback={null}>
        <SupportRow />
      </Suspense>
    </>
  );
}
