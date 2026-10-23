import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Blocks } from '@/components/content/long-form';
import {
  articleHref,
  categoryHref,
  HelpTopBar,
  helpCategories,
  navCategories,
  plainText,
  searchEntries,
  searchProps,
  shellLabels,
} from '@/components/help/help-parts';
import { SupportRow } from '@/components/content/support-row';
import { HelpSearch } from '@/components/help/help-search';
import { HelpShell } from '@/components/help/help-shell';
import { JsonLd } from '@/components/seo/json-ld';
import { helpCentre } from '@/content/pages/faq';
import { faqSchema, pageMetadata } from '@/lib/seo';

export function generateStaticParams() {
  return helpCentre('en', false).flatMap((category) =>
    category.articles.map((article) => ({ group: category.id, article: article.slug })),
  );
}

function find(locale: Locale, group: string, slug: string) {
  const categories = helpCategories(locale);
  const category = categories.find((candidate) => candidate.id === group);
  const article = category?.articles.find((candidate) => candidate.slug === slug);
  return { categories, category, article };
}

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/faq/[group]/[article]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { group, article: slug } = await params;
  const { article } = find(locale, group, slug);
  // Settled before the page streams, so crawlers get a real 404 for an unknown article.
  if (!article) notFound();
  const description = plainText(article.answer);
  return pageMetadata({
    title: article.question,
    description: description.length > 160 ? `${description.slice(0, 157)}…` : description,
    href: articleHref(group, article.slug),
    locale,
  });
}

/**
 * A help answer on its own page (for links and search): the trail down to the question, the
 * question in TERAN's serif and the answer at a reading measure; under it, as under every help
 * page, the row for writing or calling.
 */
async function HelpArticleView({
  params,
}: Pick<PageProps<'/[locale]/faq/[group]/[article]'>, 'params'>) {
  const locale = (await rootParams.locale()) as Locale;
  const { group, article: slug } = await params;
  const { categories, category, article } = find(locale, group, slug);
  if (!category || !article) notFound();
  const t = await getTranslations('Help');
  const [search, labels] = await Promise.all([searchProps(locale), shellLabels()]);
  const structuredData = faqSchema([
    { question: article.question, answer: plainText(article.answer) },
  ]);

  return (
    <>
      <HelpTopBar
        trail={[
          { label: t('allArticles'), href: '/faq/articles' },
          { label: category.heading, href: categoryHref(category.id) },
          { label: article.question },
        ]}
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
        current={articleHref(category.id, article.slug)}
        labels={labels}
      >
        <article className="pt-6 min-[48rem]:pt-0">
          <div className="max-w-[42.5rem]">
            <h1 className="font-heading text-[2.25rem] leading-[1.1] text-balance text-fg sm:text-[2.75rem]">
              {article.question}
            </h1>
            <div className="mt-6 space-y-4 text-[1.0625rem] leading-relaxed text-fg">
              <Blocks blocks={article.answer} />
            </div>
          </div>
        </article>
      </HelpShell>
      <JsonLd data={structuredData} />
    </>
  );
}

/** The page: its trail and content depend on the address, so they stream in under Suspense. */
export default function HelpArticlePage({ params }: PageProps<'/[locale]/faq/[group]/[article]'>) {
  return (
    <>
      <Suspense fallback={<div className="min-h-[40rem]" />}>
        <HelpArticleView params={params} />
      </Suspense>
      <Suspense fallback={null}>
        <SupportRow />
      </Suspense>
    </>
  );
}
