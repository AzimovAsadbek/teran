import { ArrowRight } from 'lucide-react';
import type { Locale } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { ProductCard } from '@/components/catalog/product-card';
import { ArticleCard } from '@/components/content/article-card';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';
import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { brandCopy, COLLECTION_CODES, PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { getCategories, getCollections, getProductList, leafCategories } from '@/lib/data/catalog';
import { getArticles } from '@/lib/data/content';
import { ProductShowcase } from './product-showcase';

/*
 * Data-driven homepage sections. Each renders at request time (connection()) inside its own
 * Suspense boundary, reads through the cached loaders, and degrades to nothing if the API fails.
 */

const RAIL_FRAME = 'container-page relative z-10 -mt-24 sm:-mt-28';
const RAIL_ROW =
  '-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-3 overflow-x-auto px-gutter py-3 [scrollbar-width:thin] lg:gap-4';
const RAIL_ITEM = 'h-40 min-w-[8.5rem] flex-1 snap-start lg:min-w-[7.25rem]';

/** Tea types as a row of cards overlapping the hero's lower edge: discovery starts on screen one. */
export async function CategoryRailSection() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const tc = await getTranslations('Catalog');
  const categories = leafCategories(await getCategories(locale).catch(() => []));
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="categories-title" className={RAIL_FRAME}>
      <h2 id="categories-title" className="sr-only">
        {t('categoriesTitle')}
      </h2>
      <ul className={RAIL_ROW}>
        {categories.map((category) => (
          <li key={category.slug} className={RAIL_ITEM}>
            <Link
              href={`/${category.path}`}
              className="group flex h-full flex-col items-center rounded-card border border-line bg-surface px-3 pt-4 pb-3.5 text-center shadow-soft transition-[translate,box-shadow,border-color] duration-200 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lift"
            >
              <span className="h-14 w-14 shrink-0 transition-transform duration-300 ease-[var(--ease-soft)] group-hover:rotate-6">
                <TeaTypeArt kind={category.illustrationKey} />
              </span>
              <span className="mt-2.5 line-clamp-2 text-title-sm text-balance text-fg">
                {category.name}
              </span>
              <span className="mt-auto pt-1 text-caption text-fg-subtle">
                {tc('results', { count: category.productCount })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Same footprint as the rail while it streams in, so nothing below it moves. */
export function CategoryRailFallback() {
  return (
    <div aria-hidden className={RAIL_FRAME}>
      <div className={RAIL_ROW}>
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className={RAIL_ITEM}>
            <div className="h-full rounded-card border border-line bg-surface shadow-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}

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
 * The TERAN premium collection (official copy): heading, supporting line and the five identifiers
 * exactly as supplied are part of the static page; the link and the matching products stream in,
 * each into a placeholder of the same size.
 */
export async function CollectionSection() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];

  return (
    <section aria-labelledby="collection-title" className="container-page pt-section-sm pb-section">
      <Reveal>
        <div className="on-dark relative isolate overflow-hidden rounded-panel bg-surface-inverse px-6 py-10 text-fg-inverse sm:px-10 lg:px-14 lg:py-14">
          <span
            aria-hidden
            className="absolute -top-28 -right-28 -z-10 h-80 w-80 rounded-full border border-gold-300/20"
          />
          <span
            aria-hidden
            className="absolute -top-14 -right-14 -z-10 h-52 w-52 rounded-full border border-gold-300/15"
          />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-eyebrow text-accent-on-inverse">{t('featuredEyebrow')}</p>
              <h2 id="collection-title" className="mt-4 text-display-lg">
                {copy.collection.heading}
              </h2>
              <p className="mt-4 text-body-lg text-ivory-100/85">{copy.collection.text}</p>
            </div>
            <Suspense fallback={<div aria-hidden className="h-11 w-56" />}>
              <CollectionLink label={t('featuredCta')} />
            </Suspense>
          </div>
          <p className="mt-10 border-t border-line-inverse pt-8 font-display text-[1.625rem] leading-snug tracking-[0.04em] text-accent-on-inverse sm:text-[2rem]">
            {COLLECTION_CODES.join(' · ')}
          </p>
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
    <ButtonLink
      href={ready ? `/collections/${PREMIUM_COLLECTION_SLUG}` : '/catalog'}
      variant="accent"
      className="self-start lg:self-auto"
    >
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
    <ul className={COLLECTION_GRID}>
      {items.map((product) => (
        <li key={product.id} className={COLLECTION_ITEM}>
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
  const articles = await getArticles(locale, 1, 3).catch(() => null);
  if (!articles || articles.items.length === 0) return null;

  return (
    <section aria-labelledby="journal-title" className="container-page pb-section">
      <Reveal>
        <SectionHeading
          id="journal-title"
          title={t('journalTitle')}
          action={{ href: '/journal', label: t('journalCta') }}
        />
        <ul className="-mx-gutter mt-8 flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter py-2 md:mx-0 md:mt-10 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:py-0">
          {articles.items.map((article) => (
            <li key={article.slug} className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-auto">
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
