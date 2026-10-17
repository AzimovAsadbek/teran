import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import {
  ArticleCards,
  articleHref,
  categoryHref,
  CategoryBanner,
  HelpChat,
  HelpTopBar,
  helpCategories,
  navCategories,
  plainText,
  searchEntries,
  searchProps,
  shellLabels,
} from '@/components/help/help-parts';
import { HelpSearch } from '@/components/help/help-search';
import { HelpSection } from '@/components/help/help-section';
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
 * A help-centre category as the reference's: the trail, the title with the view switch over a
 * rule, then its articles as cards (the question over three lines of the answer).
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
        <CategoryBanner id={category.id} />
        <HelpSection
          level={1}
          heading={category.heading}
          headingClassName="text-[1.5rem] leading-8 font-semibold tracking-[-0.015rem] text-[#161616]"
          headerClassName="mb-10 border-b border-[#ddd] pt-6 pb-10 min-[48rem]:pt-0"
          labels={{ toList: t('toList'), toGrid: t('toGrid') }}
        >
          <ArticleCards
            articles={category.articles.map((article) => ({
              href: articleHref(category.id, article.slug),
              title: article.question,
              text: plainText(article.answer),
            }))}
          />
        </HelpSection>
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
      <HelpChat />
    </>
  );
}
