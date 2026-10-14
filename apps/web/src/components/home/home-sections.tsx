import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { ProductCard } from '@/components/catalog/product-card';
import { ArticleCard } from '@/components/content/article-card';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeading } from '@/components/ui/section-heading';
import { ProductCardSkeleton, Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { getCategories, getCollections, getProductList } from '@/lib/data/catalog';
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
  const categories = (await getCategories(locale).catch(() => [])).filter(
    (category) => category.productCount > 0,
  );
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
              href={`/catalog/${category.slug}`}
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
        allTeas: tn('allTeas'),
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

export async function FeaturedCollectionSection() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const collections = await getCollections(locale).catch(() => []);
  const collection = collections.find((candidate) => candidate.productCount > 0);
  if (!collection) return null;
  const products = await getProductList(
    locale,
    `collection=${collection.slug}&pageSize=3&sort=featured`,
  ).catch(() => null);
  if (!products || products.items.length === 0) return null;

  return (
    <section aria-labelledby="featured-collection-title" className="container-page pb-section">
      <Reveal className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="on-dark relative isolate flex min-h-80 flex-col overflow-hidden rounded-panel bg-surface-inverse p-7 text-fg-inverse sm:p-10 lg:col-span-4">
          <span aria-hidden className="absolute top-6 right-6 h-20 w-20 opacity-90 sm:h-24 sm:w-24">
            <TeaTypeArt kind={collection.illustrationKey} />
          </span>
          <span
            aria-hidden
            className="absolute -right-24 -bottom-24 -z-10 h-72 w-72 rounded-full border border-gold-300/20"
          />
          <span
            aria-hidden
            className="absolute -right-12 -bottom-12 -z-10 h-48 w-48 rounded-full border border-gold-300/15"
          />
          <p className="text-eyebrow text-accent-on-inverse">{t('featuredEyebrow')}</p>
          <h2
            id="featured-collection-title"
            className="mt-auto pt-16 text-display-md text-fg-inverse"
          >
            {collection.name}
          </h2>
          {collection.description ? (
            <p className="mt-3 max-w-sm text-body text-ivory-100/85">{collection.description}</p>
          ) : null}
          <ButtonLink
            href={`/collections/${collection.slug}`}
            variant="accent"
            className="mt-8 self-start"
          >
            {t('featuredCta')} <ArrowRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
        </div>
        <ul className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-4 overflow-x-auto px-gutter pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:col-span-8">
          {products.items.map((product) => (
            <li key={product.id} className="w-[62%] shrink-0 snap-start sm:w-auto">
              <ProductCard
                product={product}
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 62vw"
              />
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
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
