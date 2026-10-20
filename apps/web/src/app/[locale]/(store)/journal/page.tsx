import type { Locale } from '@teran/contracts';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Pagination } from '@/components/catalog/pagination';
import { ArticleCard } from '@/components/content/article-card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { getArticles } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

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

  // The first page opens on the newest article as a lead; the rest stand in a grid that never
  // ends on one card alone (three columns only when they divide by three, else two, and an odd
  // last one on its side across both).
  const lead = page === 1 ? articles.items[0] : undefined;
  const rest = lead ? articles.items.slice(1) : articles.items;
  const threes = rest.length % 3 === 0 && rest.length >= 3;
  const lastWide = !threes && rest.length % 2 === 1;
  return (
    <>
      {lead ? <ArticleCard article={lead} headingLevel="h2" layout="lead" priority /> : null}
      {rest.length > 0 ? (
        <ul
          className={cn(
            'grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2',
            threes && 'lg:grid-cols-3',
            lead && 'mt-14 border-t border-line pt-12 lg:mt-20 lg:pt-16',
          )}
        >
          {rest.map((article, index) => {
            const wide = lastWide && index === rest.length - 1;
            return (
              <li key={article.slug} className={cn(wide && 'md:col-span-2')}>
                <ArticleCard
                  article={article}
                  headingLevel="h2"
                  layout={wide ? 'wide' : 'card'}
                  priority={!lead && index < 2}
                />
              </li>
            );
          })}
        </ul>
      ) : null}
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
      <header className="container-page pt-10 pb-10 sm:pt-14 lg:pt-16 lg:pb-14">
        <h1 className="font-heading text-[clamp(3rem,2rem+4vw,5rem)] leading-[0.98] text-fg">
          {t('journalTitle')}
        </h1>
        <p className="mt-4 max-w-[36rem] text-[1.125rem] leading-relaxed text-pretty text-fg-muted sm:text-[1.25rem]">
          {t('journalDescription')}
        </p>
      </header>
      <div className="container-page pb-16 lg:pb-24">
        <Suspense
          fallback={
            // The lead's footprint and the first row of cards under it, so the page is as tall
            // as it will be and nothing below moves when the articles arrive.
            <div aria-hidden>
              <div className="grid grid-cols-1 gap-y-4 md:grid-cols-12 md:gap-x-10">
                <Skeleton className="aspect-[16/10] rounded-[1.25rem] md:col-span-7" />
                <div className="space-y-3 md:col-span-5 md:self-center">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-4/5" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
              <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-12 border-t border-line pt-12 md:grid-cols-2 lg:mt-20 lg:pt-16">
                {[0, 1].map((card) => (
                  <div key={card} className="space-y-4">
                    <Skeleton className="aspect-[4/3] rounded-[1.25rem]" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <ArticleList searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
