import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Blocks } from '@/components/content/long-form';
import { ArticleRating } from '@/components/help/article-rating';
import {
  articleHref,
  categoryHref,
  HelpContact,
  HelpTopBar,
  helpCategories,
  navCategories,
  plainText,
  searchEntries,
  searchProps,
  shellLabels,
} from '@/components/help/help-parts';
import { HelpSearch } from '@/components/help/help-search';
import { HelpShell } from '@/components/help/help-shell';
import { helpCentre } from '@/content/pages/faq';
import { jsonLd, pageMetadata } from '@/lib/seo';

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
 * A help article as the reference's: the trail down to the question, then a white card with a
 * soft shadow (edge to edge on phones) holding the question in 44 px, the answer in a 680 px
 * column and the "Was this article helpful?" row.
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
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: article.question,
        acceptedAnswer: { '@type': 'Answer', text: plainText(article.answer) },
      },
    ],
  };

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
        <article className="pt-14 min-[48rem]:rounded-[0.5rem] min-[48rem]:bg-white min-[48rem]:p-10 min-[48rem]:shadow-[0_2px_4px_rgb(22_22_22_/_16%)]">
          <div className="mx-auto max-w-[42.5rem]">
            <h1 className="mb-6 text-[2.75rem] leading-[3rem] font-semibold tracking-[-0.03em] text-black">
              {article.question}
            </h1>
            <div className="space-y-6 text-[1rem] leading-6 text-[#161616]">
              <Blocks blocks={article.answer} />
            </div>
            <ArticleRating
              labels={{
                question: t('helpful'),
                yes: t('yes'),
                no: t('no'),
                thanks: t('thanks'),
                thanksNo: t('thanksNo'),
              }}
            />
          </div>
        </article>
      </HelpShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
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
      <HelpContact />
    </>
  );
}
