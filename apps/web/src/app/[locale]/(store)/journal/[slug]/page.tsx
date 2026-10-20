import type { ArticleDetailDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ArticleCard } from '@/components/content/article-card';
import { ArticleContent } from '@/components/content/article-content';
import { FurtherLinks } from '@/components/content/further-links';
import { Skeleton } from '@/components/ui/skeleton';
import { brandCopy, PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { getPathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getArticle, getArticleRedirect, getArticles } from '@/lib/data/content';
import { imageSources } from '@/lib/navigation';
import { coverShareImage, jsonLd, localizedUrl, pageMetadata } from '@/lib/seo';
import { absoluteUrl, siteUrl } from '@/lib/site';

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/journal/[slug]'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const { slug } = await params;
  let article: ArticleDetailDto | null;
  try {
    article = await getArticle(locale, slug);
  } catch {
    return {}; // API unavailable: the error UI sets noindex itself
  }
  if (!article) {
    // Settled before the page streams: a real 404, or a 308 to a renamed article.
    const current = await getArticleRedirect(slug).catch(() => null);
    if (current) permanentRedirect(getPathname({ href: `/journal/${current}`, locale }));
    notFound();
  }
  return pageMetadata({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt ?? undefined,
    href: `/journal/${article.slug}`,
    locale,
    type: 'article',
    image: coverShareImage(article.cover),
  });
}

async function ArticleView({ params }: Pick<PageProps<'/[locale]/journal/[slug]'>, 'params'>) {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const article = await getArticle(locale, slug);
  if (!article) {
    // A renamed article's old address keeps working.
    const current = await getArticleRedirect(slug).catch(() => null);
    if (current) permanentRedirect(getPathname({ href: `/journal/${current}`, locale }));
    notFound();
  }

  const url = localizedUrl(`/journal/${article.slug}`, locale);
  // Authored by the brand: no individual author is invented.
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt ?? undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: locale,
    mainEntityOfPage: url,
    ...(article.cover ? { image: absoluteUrl(imageSources(article.cover, 1280).src) } : {}),
    author: { '@type': 'Organization', name: 'TERAN', url: siteUrl },
    publisher: {
      '@type': 'Organization',
      name: 'TERAN',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/brand/teran-logo.png` },
    },
  };

  return (
    <>
      <article>
        <ArticleContent article={article} locale={locale} />
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
      {/* Where to read on: two more articles, then Tea 101 and TERAN's five teas. */}
      <Suspense fallback={null}>
        <ReadNext current={article.slug} />
      </Suspense>
    </>
  );
}

/** The two newest other articles, then the ways on to Tea 101 and the five teas. */
async function ReadNext({ current }: { current: string }) {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tn, tt, list] = await Promise.all([
    getTranslations('Pages'),
    getTranslations('Nav'),
    getTranslations('Tea101'),
    getArticles(locale, 1, 3).catch(() => null),
  ]);
  const next = (list?.items ?? []).filter((item) => item.slug !== current).slice(0, 2);
  const collection = brandCopy[locale].collection;
  return (
    <>
      {next.length > 0 ? (
        <section
          aria-labelledby="read-next"
          className="mx-auto mt-20 max-w-[72rem] border-t border-line pt-12 lg:mt-24 lg:pt-16"
        >
          <h2
            id="read-next"
            className="font-heading text-[2rem] leading-tight text-fg sm:text-[2.5rem]"
          >
            {t('readNext')}
          </h2>
          <ul
            className={cn(
              'mt-8 grid grid-cols-1 gap-x-8 gap-y-12',
              next.length === 2 && 'md:grid-cols-2',
            )}
          >
            {next.map((item) => (
              <li key={item.slug}>
                <ArticleCard article={item} layout={next.length === 1 ? 'wide' : 'card'} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <FurtherLinks
        frame="mx-auto max-w-[72rem]"
        label={tn('brandWorld')}
        links={[
          { href: '/tea-101', label: tn('tea101'), text: tt('tagline') },
          {
            href: `/collections/${PREMIUM_COLLECTION_SLUG}`,
            label: collection.heading,
            text: collection.text,
          },
        ]}
      />
    </>
  );
}

export default function ArticlePage({ params }: PageProps<'/[locale]/journal/[slug]'>) {
  return (
    <div className="px-gutter pb-4">
      <Suspense
        fallback={
          // The article's own frame (the centred opening, the cover, the text), so nothing moves
          // when the article arrives.
          <div aria-hidden>
            <div className="mx-auto flex max-w-[52rem] flex-col items-center gap-4 pt-10 sm:pt-14 lg:pt-16">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-12 w-4/5 sm:h-[3.75rem]" />
              <Skeleton className="h-6 w-3/5" />
            </div>
            <Skeleton className="mx-auto mt-10 aspect-[4/3] max-w-[72rem] rounded-[1.25rem] sm:aspect-[16/9] lg:mt-12" />
            <div className="mx-auto mt-12 max-w-[38rem] space-y-4 lg:mt-16">
              {Array.from({ length: 10 }, (_, line) => (
                <Skeleton key={line} className="h-5 w-full" />
              ))}
            </div>
          </div>
        }
      >
        <ArticleView params={params} />
      </Suspense>
    </div>
  );
}
