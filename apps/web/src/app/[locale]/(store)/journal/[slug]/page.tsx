import type { ArticleDetailDto, Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound, permanentRedirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { ArticleCard } from '@/components/content/article-card';
import { ArticleContent } from '@/components/content/article-content';
import { Skeleton } from '@/components/ui/skeleton';
import { getPathname, Link } from '@/i18n/navigation';
import { getArticle, getArticleRedirect, getArticles } from '@/lib/data/content';
import { imageSources } from '@/lib/navigation';
import { coverShareImage, jsonLd, localizedUrl, pageMetadata } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

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
  if (!article) return { robots: { index: false } };
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
  const [{ slug }, locale, t] = await Promise.all([params, getLocale(), getTranslations('Pages')]);
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
    ...(article.cover ? { image: `${siteUrl}${imageSources(article.cover, 1280).src}` } : {}),
    author: { '@type': 'Organization', name: 'TERAN', url: siteUrl },
    publisher: {
      '@type': 'Organization',
      name: 'TERAN',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/brand/teran-logo.png` },
    },
  };

  return (
    <>
      <Breadcrumbs
        locale={locale}
        items={[{ label: t('journalTitle'), href: '/journal' }, { label: article.title }]}
      />
      <article className="mx-auto mt-8 max-w-[44rem]">
        <ArticleContent article={article} locale={locale} />
        <Link
          href="/journal"
          className="mt-12 inline-flex items-center gap-2 text-button text-brand underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          {t('backToJournal')}
        </Link>
      </article>
      <Suspense fallback={null}>
        <MoreArticles currentSlug={article.slug} />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    </>
  );
}

async function MoreArticles({ currentSlug }: { currentSlug: string }) {
  const locale = await getLocale();
  const t = await getTranslations('Pages');
  const articles = await getArticles(locale, 1, 4).catch(() => null);
  const others =
    articles?.items.filter((article) => article.slug !== currentSlug).slice(0, 3) ?? [];
  if (others.length === 0) return null;
  return (
    <section
      aria-labelledby="more-articles"
      className="mt-section border-t border-line-subtle pt-section-sm"
    >
      <h2 id="more-articles" className="text-display-md text-forest-900">
        {t('moreArticles')}
      </h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((article) => (
          <li key={article.slug}>
            <ArticleCard article={article} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ArticlePage({ params }: PageProps<'/[locale]/journal/[slug]'>) {
  return (
    <div className="container-page pt-4 pb-section sm:pt-6">
      <Suspense
        fallback={
          <div className="mx-auto mt-14 max-w-3xl space-y-4" aria-hidden>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-64 w-full rounded-panel" />
          </div>
        }
      >
        <ArticleView params={params} />
      </Suspense>
    </div>
  );
}
