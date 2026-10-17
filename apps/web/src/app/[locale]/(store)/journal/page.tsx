import type { Locale } from '@teran/contracts';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Pagination } from '@/components/catalog/pagination';
import { ArticleCard } from '@/components/content/article-card';
import { PageHeader } from '@/components/content/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getArticles } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';
import terraces from '../../../../../public/brand/art/terraces.webp';

const PAGE_SIZE = 9;

function pageNumber(value: string | string[] | undefined): number {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(parsed) && parsed > 1 && parsed <= 1000 ? parsed : 1;
}

export async function generateMetadata({
  searchParams,
}: PageProps<'/[locale]/journal'>): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Pages' });
  const page = pageNumber((await searchParams).page);
  return pageMetadata({
    title: t('journalTitle'),
    description: t('journalMetaDescription'),
    href: '/journal',
    locale,
    query: page > 1 ? `page=${page}` : '',
  });
}

async function ArticleList({ searchParams }: Pick<PageProps<'/[locale]/journal'>, 'searchParams'>) {
  await connection();
  const [locale, t, query] = await Promise.all([
    getLocale(),
    getTranslations('Pages'),
    searchParams,
  ]);
  const page = pageNumber(query.page);
  const articles = await getArticles(locale, page, PAGE_SIZE).catch(() => null);

  if (!articles || articles.items.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-fg">
          <BookOpen aria-hidden className="h-7 w-7" />
        </span>
        <p className="mt-5 text-body-lg text-fg-muted">{t('journalEmpty')}</p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {articles.items.map((article) => (
          <li key={article.slug}>
            <ArticleCard article={article} headingLevel="h2" />
          </li>
        ))}
      </ul>
      <Pagination
        page={articles.page}
        totalPages={articles.totalPages}
        hrefFor={(target) => (target > 1 ? `/journal?page=${target}` : '/journal')}
      />
    </>
  );
}

export default async function JournalPage({ searchParams }: PageProps<'/[locale]/journal'>) {
  const t = await getTranslations('Pages');
  return (
    <>
      <PageHeader
        tone="brand"
        title={t('journalTitle')}
        intro={t('journalDescription')}
        image={terraces}
      />
      {/* The reference's 1440 px frame; its topic pills are left out (TERAN's articles have none). */}
      <div className="container-frame pt-7 pb-12">
        <Suspense
          fallback={
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="aspect-[345/472] rounded-[1rem]" />
              ))}
            </div>
          }
        >
          <ArticleList searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
