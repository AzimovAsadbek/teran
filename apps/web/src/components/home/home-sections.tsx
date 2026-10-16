import { ArrowRight } from 'lucide-react';
import type { Locale } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type CSSProperties } from 'react';
import Image from 'next/image';
import { GoldRule, WavePattern } from '@/components/brand/ornaments';
import { ProductCard } from '@/components/catalog/product-card';
import { ArticleCard } from '@/components/content/article-card';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';
import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { brandCopy, COLLECTION_CODES, PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { getCollections, getProductList } from '@/lib/data/catalog';
import { getArticles } from '@/lib/data/content';
import terraces from '../../../public/brand/art/terraces.webp';
import { ProductShowcase } from './product-showcase';

/*
 * Data-driven homepage sections. Each renders at request time (connection()) inside its own
 * Suspense boundary, reads through the cached loaders, and degrades to nothing if the API fails.
 */

export async function ShowcaseSection() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const tn = await getTranslations('Nav');
  const [featured, latest] = await Promise.all([
    getProductList(locale, 'featured=true&pageSize=8&sort=featured').catch(() => null),
    getProductList(locale, 'pageSize=8&sort=newest').catch(() => null),
  ]);
  return (
    <ProductShowcase
      featured={featured?.items ?? []}
      latest={latest?.items ?? []}
      labels={{
        title: t('showcaseTitle'),
        tabList: t('showcaseTabs'),
        featured: t('tabFeatured'),
        latest: t('tabNew'),
        previous: t('showcasePrevious'),
        next: t('showcaseNext'),
        allTeas: tn('shopAll'),
      }}
    />
  );
}

/** Placeholder with the showcase's footprint (heading, tab row, one row of cards). */
export function ShowcaseFallback() {
  return (
    <div aria-hidden className="container-page pt-section-sm pb-section">
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <div className="mt-5 h-11 border-b border-line" />
      <div className="mt-6 flex gap-4 overflow-hidden py-2 md:gap-6">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="w-[62%] shrink-0 sm:w-[40%] md:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)]"
          >
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

const COLLECTION_GRID =
  '-mx-gutter mt-8 flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter py-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:py-0 lg:grid-cols-5';
const COLLECTION_ITEM = 'w-[62%] shrink-0 snap-start sm:w-auto';

/**
 * The TERAN premium collection (official copy) on the tea terraces from the back of the pack:
 * heading, supporting line and the identifiers are part of the static page; the link and the
 * matching products stream in, each into a placeholder of the same size.
 */
export async function CollectionSection() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];

  return (
    <section aria-labelledby="collection-title" className="container-page pt-section-sm pb-section">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-panel border border-line bg-surface px-6 pt-10 pb-44 sm:px-10 sm:pb-56 lg:px-14 lg:py-16">
          <Image
            src={terraces}
            alt=""
            sizes="(min-width: 1024px) 66vw, 100vw"
            fetchPriority="low"
            className="absolute right-0 bottom-0 -z-20 w-full max-w-none lg:top-1/2 lg:w-[68%] lg:-translate-y-1/2"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-b from-surface from-45% to-transparent to-75% lg:bg-linear-to-r lg:from-surface lg:from-35% lg:to-transparent lg:to-60%"
          />
          <WavePattern className="inset-x-0 top-0 -z-10 h-28 opacity-30" />
          <div className="max-w-xl">
            <p className="text-eyebrow text-accent-fg">{t('featuredEyebrow')}</p>
            <h2 id="collection-title" className="mt-4 text-display-lg text-forest-900">
              {copy.collection.heading}
            </h2>
            <p className="mt-4 text-body-lg text-fg-muted">{copy.collection.text}</p>
            <GoldRule className="mt-8 max-w-sm" />
            <p className="mt-5 font-display text-[1.5rem] leading-snug tracking-[0.04em] text-accent-fg sm:text-[1.875rem]">
              {COLLECTION_CODES.join(' · ')}
            </p>
            <div className="mt-8">
              <Suspense fallback={<div aria-hidden className="h-11 w-56" />}>
                <CollectionLink label={t('featuredCta')} />
              </Suspense>
            </div>
          </div>
        </div>
        <Suspense
          fallback={
            <div aria-hidden className={COLLECTION_GRID}>
              {COLLECTION_CODES.map((code) => (
                <div key={code} className={COLLECTION_ITEM}>
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          }
        >
          <CollectionProducts />
        </Suspense>
      </Reveal>
    </section>
  );
}

/** To the collection page when the catalogue has it, otherwise to all teas. */
async function CollectionLink({ label }: { label: string }) {
  await connection();
  const locale = await getLocale();
  const collections = await getCollections(locale).catch(() => []);
  const ready = collections.some(
    (collection) => collection.slug === PREMIUM_COLLECTION_SLUG && collection.productCount > 0,
  );
  return (
    <ButtonLink href={ready ? `/collections/${PREMIUM_COLLECTION_SLUG}` : '/catalog'}>
      {label} <ArrowRight aria-hidden className="h-4 w-4" />
    </ButtonLink>
  );
}

async function CollectionProducts() {
  await connection();
  const locale = await getLocale();
  const products = await getProductList(
    locale,
    `collection=${PREMIUM_COLLECTION_SLUG}&pageSize=5&sort=featured`,
  ).catch(() => null);
  const items = products?.items ?? [];
  if (items.length === 0) return null;
  return (
    <ul data-stagger className={COLLECTION_GRID}>
      {items.map((product, index) => (
        <li key={product.id} className={COLLECTION_ITEM} style={{ '--i': index } as CSSProperties}>
          <ProductCard
            product={product}
            sizes="(min-width: 1024px) 18vw, (min-width: 640px) 30vw, 62vw"
          />
        </li>
      ))}
    </ul>
  );
}

export async function JournalSection() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  // Articles chosen in the admin area come first, then the newest.
  const articles = await getArticles(locale, 1, 3, true).catch(() => null);
  if (!articles || articles.items.length === 0) return null;

  return (
    <section aria-labelledby="journal-title" className="container-page pb-section">
      <Reveal>
        <SectionHeading
          id="journal-title"
          title={t('journalTitle')}
          action={{ href: '/journal', label: t('journalCta') }}
        />
        <ul
          data-stagger
          className="-mx-gutter mt-8 flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter py-2 md:mx-0 md:mt-10 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:py-0"
        >
          {articles.items.map((article, index) => (
            <li
              key={article.slug}
              className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-auto"
              style={{ '--i': index } as CSSProperties}
            >
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
