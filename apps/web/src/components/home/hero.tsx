import type { Locale } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BRAND, brandCopy } from '@/content/brand';
import { getProductList } from '@/lib/data/catalog';
import lake from '../../../public/brand/art/lake.webp';
import terraces from '../../../public/brand/art/terraces.webp';
import { HeroSlider, type HeroLabels, type HeroSlideData } from './hero-slider';

/** The showcase's "featured" query, so both read one cached list. */
const FEATURED_QUERY = 'featured=true&pageSize=8&sort=featured';
/** Products after the brand's own slide (the reference runs two to four slides). */
const PRODUCT_SLIDES = 3;
/**
 * Each product stands on one of the paintings from the packs, under a veil of its slide's colour:
 * the tea terraces, the lake at sunrise, the misty mountains above the terraces.
 */
const PRODUCT_SCENES: Pick<HeroSlideData, 'tone' | 'art' | 'artFocus'>[] = [
  { tone: 'jade', art: terraces, artFocus: 'right' },
  { tone: 'gold', art: lake, artFocus: 'right' },
  { tone: 'sage', art: terraces, artFocus: 'left' },
];

/** One line per sentence ("Teran ta’m." / "Teran taassurot."), as the reference breaks its lines. */
function sentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/);
}

/**
 * The front page's first view, as the reference's feature banner: TERAN's own slide first (the
 * pack's tagline over the lake painted on the packs, prerendered with the page so it paints at
 * once), then featured products standing on the packs' paintings, which stream in at request time.
 * Nothing here names a product: the slides are whatever the catalogue marks as featured.
 */
export async function Hero() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  const brand: HeroSlideData = {
    key: 'brand',
    tone: 'art',
    eyebrow: `${BRAND.name}® · ${BRAND.descriptor}`,
    lines: sentences(copy.tagline),
    text: copy.description,
    cta: { href: '/catalog', label: t('heroCta') },
    art: lake,
  };
  const labels: HeroLabels = {
    heading: `${BRAND.name} — ${copy.tagline}`,
    region: t('heroStageLabel'),
    // A template the slider fills in per slide.
    slide: t('heroSlide', { index: '{index}', total: '{total}' }),
    pause: t('heroPause'),
    play: t('heroPlay'),
  };
  return (
    <Suspense fallback={<HeroSlider slides={[brand]} labels={labels} />}>
      <FeaturedSlides locale={locale} brand={brand} labels={labels} />
    </Suspense>
  );
}

async function FeaturedSlides({
  locale,
  brand,
  labels,
}: {
  locale: Locale;
  brand: HeroSlideData;
  labels: HeroLabels;
}) {
  await connection();
  const [list, t] = await Promise.all([
    getProductList(locale, FEATURED_QUERY).catch(() => null),
    getTranslations('Home'),
  ]);
  // Only products with a cut-out stand on a slide; a photograph would not sit on the colour.
  const staged = (list?.items ?? []).filter((product) => product.stageImage);
  const slides: HeroSlideData[] = [
    brand,
    ...staged.slice(0, PRODUCT_SLIDES).map((product, index): HeroSlideData => ({
      key: product.id,
      ...PRODUCT_SCENES[index % PRODUCT_SCENES.length]!,
      eyebrow: product.category.name,
      lines: [product.name],
      text: product.shortDescription,
      cta: { href: `/products/${product.slug}`, label: t('heroDetails') },
      product: product.stageImage,
    })),
  ];
  return <HeroSlider slides={slides} labels={labels} />;
}
