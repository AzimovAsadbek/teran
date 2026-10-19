import type { ArticleDetailDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { ArticleContent } from '@/components/content/article-content';
import { Skeleton } from '@/components/ui/skeleton';
import { getPathname } from '@/i18n/navigation';
import { getArticle, getArticleRedirect } from '@/lib/data/content';
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
      {/* As the reference's article: the hero and the text, nothing after it. */}
      <article>
        <ArticleContent article={article} locale={locale} />
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    </>
  );
}

export default function ArticlePage({ params }: PageProps<'/[locale]/journal/[slug]'>) {
  return (
    // No width limit: the article's hero spans the window at any size, as the reference's does.
    <div className="px-gutter pb-16 sm:pb-24">
      <Suspense
        fallback={
          // The article's own frame (the split hero, then the text column), so nothing moves when
          // the article arrives: a placeholder of another shape shifted the page by 0.29 (CLS).
          <div aria-hidden>
            <div className="-mx-gutter grid grid-cols-1 bg-white lg:min-h-[25rem] lg:grid-cols-[minmax(0,704fr)_minmax(0,736fr)]">
              <div className="aspect-[16/10] bg-ivory-200 lg:aspect-auto" />
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-10 sm:px-12 lg:px-16">
                <Skeleton className="h-7 w-44 rounded-full" />
                <Skeleton className="h-11 w-4/5 sm:h-[3.75rem]" />
                <Skeleton className="h-5 w-3/5" />
              </div>
            </div>
            <div className="mx-auto mt-12 max-w-[46rem] space-y-4">
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
