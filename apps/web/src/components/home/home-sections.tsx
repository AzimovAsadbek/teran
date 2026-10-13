import { ArrowRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { CategoryTile } from '@/components/catalog/category-tile';
import { ProductCard } from '@/components/catalog/product-card';
import { ArticleCard } from '@/components/content/article-card';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { Link } from '@/i18n/navigation';
import { getCategories, getCollections, getProductList } from '@/lib/data/catalog';
import { getArticles } from '@/lib/data/content';
import { ProductShowcase } from './product-showcase';
import { TeaRibbon } from './tea-ribbon';

/*
 * Data-driven homepage sections. Each renders at request time (connection()) inside its own
 * Suspense boundary, reads through the cached loaders, and degrades to nothing if the API fails.
 */

export async function RibbonSection() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const categories = await getCategories(locale).catch(() => []);
  return (
    <TeaRibbon
      items={categories.map(({ slug, name }) => ({ slug, name }))}
      label={t('ribbonLabel')}
    />
  );
}

export async function ShowcaseSection() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
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
      }}
    />
  );
}

export async function CategorySection() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Home');
  const categories = (await getCategories(locale).catch(() => [])).filter(
    (category) => category.productCount > 0,
  );
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="categories-title" className="container-page pb-16 lg:pb-24">
      <Reveal>
        <div className="max-w-2xl">
          <h2 id="categories-title" className="text-display-lg text-forest-900">
            {t('categoriesTitle')}
          </h2>
          <p className="mt-3 text-lg text-ink-700">{t('categoriesText')}</p>
        </div>
        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 xl:grid-cols-4">
          {categories.map((category) => (
            <li key={category.slug} className="w-[72%] shrink-0 snap-start sm:w-[46%] md:w-auto">
              <CategoryTile category={category} />
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
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
    <section aria-labelledby="featured-collection-title" className="container-page pb-16 lg:pb-24">
      <Reveal className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <div className="on-dark flex flex-col justify-between rounded-[var(--radius-panel)] bg-forest-900 p-8 text-ivory-50 sm:p-10">
          <div>
            <p className="text-eyebrow text-gold-300">{t('featuredEyebrow')}</p>
            <h2 id="featured-collection-title" className="text-display-lg mt-4">
              {collection.name}
            </h2>
            {collection.description ? (
              <p className="mt-4 text-ivory-100/85">{collection.description}</p>
            ) : null}
          </div>
          <ButtonLink
            href={`/collections/${collection.slug}`}
            variant="gold"
            className="mt-10 self-start"
          >
            {t('featuredCta')} <ArrowRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 xl:grid-cols-3">
          {products.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
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
    <section aria-labelledby="journal-title" className="container-page pb-20 lg:pb-28">
      <Reveal>
        <div className="flex items-end justify-between gap-6">
          <h2 id="journal-title" className="text-display-lg text-forest-900">
            {t('journalTitle')}
          </h2>
          <Link
            href="/journal"
            className="hidden items-center gap-2 font-semibold text-forest-900 hover:underline sm:inline-flex"
          >
            {t('journalCta')} <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {articles.items.map((article) => (
            <li key={article.slug}>
              <ArticleCard article={article} />
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
