import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { PageHeader } from '@/components/content/page-header';
import { VisualPicture } from '@/components/content/visual-picture';
import { ProductRail } from '@/components/home/product-rail';
import { Link } from '@/i18n/navigation';
import { getCategories, getProductList } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';
import { visualFor } from '@/lib/visuals';
import terraces from '../../../../../public/brand/art/terraces.webp';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Tea101' });
  return pageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    href: '/tea-101',
    locale,
  });
}

/**
 * The kinds of tea in the reference's order with its pastel bands, and the category each would be
 * sold from. The reference's matcha, herbal, mate and rooibos bands are left out: they are not
 * the Chinese teas TERAN deals in.
 */
const STEPS = ['measure', 'water', 'steep'] as const;

/** The reference's condensed capitals for this page's section headings. */
const HEADLINE = 'font-headline text-[2rem] text-[#121212] [--headline-weight:800]';

const TYPES = [
  { key: 'white', slug: 'white-tea', band: 'bg-[#f0f9f7]' },
  { key: 'green', slug: 'green-tea', band: 'bg-[#f1f8e4]' },
  { key: 'oolong', slug: 'oolong-tea', band: 'bg-[#d4e9f3]' },
  { key: 'black', slug: 'black-tea', band: 'bg-[#ccd7e0]' },
  { key: 'puerh', slug: 'puerh-tea', band: 'bg-[#e2d2da]' },
] as const;

/**
 * A kind's pill to its category and its row of products, as the reference's: only where TERAN's
 * catalogue has that kind of tea; otherwise the band keeps just its words.
 */
async function KindProducts({ slug, label, shop }: { slug: string; label: string; shop: string }) {
  await connection();
  const locale = (await getLocale()) as Locale;
  const category = (await getCategories(locale).catch(() => [])).find(
    (candidate) => candidate.slug === slug && candidate.productCount > 0,
  );
  if (!category) return null;
  const [list, t] = await Promise.all([
    getProductList(locale, `category=${slug}&pageSize=8&sort=featured`).catch(() => null),
    getTranslations('Home'),
  ]);
  const href = `/${category.path}`;
  return (
    <>
      <Link
        href={href}
        className="pill-hover mx-auto mt-4 flex min-h-11 w-fit items-center rounded-full bg-forest-900 px-8 pt-[0.5625rem] pb-[0.4375rem] text-[1rem] leading-4 font-semibold text-white"
      >
        {shop}
      </Link>
      {list && list.items.length > 0 ? (
        <div className="mt-7 text-left">
          <ProductRail
            frame="content"
            tabs={[{ id: slug, label, products: list.items, href, cta: shop }]}
            labels={{
              tabList: label,
              previous: t('showcasePrevious'),
              next: t('showcaseNext'),
            }}
            heading="none"
            cta={false}
          />
        </div>
      ) : null}
    </>
  );
}

/**
 * The picture beside "how much do I need?" (Admin → Settings, page pictures), or TERAN's tea
 * terraces; the reference's wide frame with 24 px corners.
 */
async function AmountPicture() {
  await connection();
  const locale = await getLocale();
  const visual = visualFor(await getPublicSettings(locale).catch(() => null), 'tea101.amount');
  const sizes = '(min-width: 61.875rem) min(46vw, 41.5rem), 100vw';
  return (
    <div className="relative aspect-[664/249] overflow-hidden rounded-[1.5rem]">
      {visual ? (
        <div className="absolute inset-0">
          <VisualPicture visual={visual} sizes={sizes} />
        </div>
      ) : (
        <Image src={terraces} alt="" fill sizes={sizes} quality={60} className="object-cover" />
      )}
    </div>
  );
}

/**
 * Tea 101 on the reference's page: a teal banner, "What is tea?" on white, then a pastel band per
 * kind of tea with its name, what makes it and how to brew it, and — where TERAN sells that kind —
 * a pill to its category and a row of its teas; then how much tea a pack makes and the three
 * brewing steps. The kinds' text is general tea knowledge; the amounts, temperatures and times
 * are those of TERAN's own teas (their product pages give each one's).
 */
export default async function TeaBasicsPage() {
  const t = await getTranslations('Tea101');
  return (
    <>
      <PageHeader tone="teal" size="large" title={t('title')} intro={t('tagline')} />
      <section
        aria-labelledby="what-is-tea"
        className="px-4 pt-[3.75rem] pb-10 text-center min-[46.875rem]:px-10"
      >
        <h2
          id="what-is-tea"
          className="mx-auto max-w-[65rem] font-headline text-[2rem] leading-[2.8rem] text-[#121212] [--headline-weight:800]"
        >
          {t('whatTitle')}
        </h2>
        <p className="mx-auto mt-4 max-w-[32.5rem] text-[1rem] leading-[1.6rem] font-medium text-[#121212]">
          {t('whatText')}
        </p>
      </section>
      {TYPES.map((type) => (
        <section
          key={type.key}
          aria-labelledby={`tea-${type.key}`}
          className={`${type.band} py-12 text-center`}
        >
          <div className="container-frame">
            <h2
              id={`tea-${type.key}`}
              className="font-heading text-[2rem] leading-[2.4rem] text-[#191919] lowercase"
            >
              {t(`types.${type.key}.title`)}
            </h2>
            <p className="mx-auto mt-4 max-w-[62.5rem] text-[1rem] leading-[1.6rem] font-medium text-[#121212]">
              {t(`types.${type.key}.text`)}
            </p>
          </div>
          <Suspense fallback={null}>
            <KindProducts
              slug={type.slug}
              label={t(`types.${type.key}.title`)}
              shop={t(`types.${type.key}.shop`)}
            />
          </Suspense>
        </section>
      ))}
      {/* How much tea a pack makes, with a picture beside it (stacked on phones). */}
      <section aria-labelledby="tea-amount" className="container-frame py-[3.75rem]">
        <div className="grid items-center gap-8 min-[61.875rem]:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 id="tea-amount" className={`${HEADLINE} leading-[2.4rem]`}>
              {t('amountTitle')}
            </h2>
            <div className="flex flex-col gap-[1.125rem] text-[1.125rem] leading-[1.8rem] font-medium text-[#121212]">
              <p>{t('amountText')}</p>
              <p>{t('amountKeep')}</p>
            </div>
          </div>
          <Suspense fallback={<div className="aspect-[664/249] rounded-[1.5rem] bg-ivory-100" />}>
            <AmountPicture />
          </Suspense>
        </div>
      </section>
      {/* Brewing: a short introduction, then the three steps in columns. */}
      <section aria-labelledby="tea-brew" className="container-frame pt-[3.75rem] pb-20">
        <h2 id="tea-brew" className={`${HEADLINE} max-w-[65rem] leading-[2.8rem]`}>
          {t('brewTitle')}
        </h2>
        <p className="mt-4 max-w-[32.5rem] text-[1rem] leading-[1.6rem] font-medium text-[#121212]">
          {t('brewText')}
        </p>
        <ol className="mt-4 grid gap-8 min-[46.875rem]:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step} className="flex flex-col gap-[0.7rem]">
              <h3 className="font-headline text-[1.5rem] leading-[2.4rem] text-[#121212] [--heading-case:none] [--headline-weight:700]">
                {t(`steps.${step}.title`)}
              </h3>
              <p className="text-[1rem] leading-[1.6rem] font-medium text-[#121212]">
                {t(`steps.${step}.text`)}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
