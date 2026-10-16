import type { ImageDto, Locale, ProductSummaryDto } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BotanicalLayer } from '@/components/brand/botanical';
import { getProductList } from '@/lib/data/catalog';
import { formatMoney, packLabel } from '@/lib/format';
import { isDemoContent } from '@/lib/site';
import lake from '../../../public/brand/art/lake.webp';
import { HeroCarousel, type HeroSlide } from './hero-carousel';

/** Most products the stage shows in turn. */
const STAGE_LIMIT = 6;
/** The showcase's "featured" query, so both read one cached list. */
const FEATURED_QUERY = 'featured=true&pageSize=8&sort=featured';

const SIZES = {
  // A cut-out stands about two thirds of the stage high.
  cutout: '(min-width: 1024px) 22rem, 46vw',
  // A photograph fills the gate.
  photo: '(min-width: 1024px) 36rem, 78vw',
};

/**
 * The hero's stage: a moon gate opening onto the painted landscape of the TERAN packs (the largest
 * image, prerendered and fetched first), light around it, mist and drifting leaves before and
 * behind, and the featured products, which stream in (their data is read at request time).
 */
export function HeroStage({ locale }: { locale: Locale }) {
  return (
    <div
      data-hero-stage
      className="hero-stage h-[32rem] sm:h-[35rem] lg:h-[min(40rem,calc(100svh-10rem))] lg:min-h-[32rem]"
    >
      <span aria-hidden className="hero-halo" />
      <div aria-hidden className="hero-gate">
        <Image
          src={lake}
          alt=""
          loading="eager"
          fetchPriority="high"
          sizes="(min-width: 1024px) 36rem, 78vw"
          className="hero-gate-art"
        />
        <BotanicalLayer scene="gate" />
        <span className="hero-gate-haze" />
      </div>
      <span aria-hidden className="hero-rim" />
      <BotanicalLayer scene="stageBack" />
      <Suspense fallback={null}>
        <StageProducts locale={locale} />
      </Suspense>
      <BotanicalLayer scene="stageFront" />
    </div>
  );
}

/**
 * Featured products with a cut-out image stand on the stage; if none has one, featured products
 * with a photograph are shown inside the gate instead. Nothing here names a product: the list is
 * whatever the catalogue marks as featured, in its order.
 */
async function StageProducts({ locale }: { locale: Locale }) {
  await connection();
  const [list, t, tp, tc] = await Promise.all([
    getProductList(locale, FEATURED_QUERY).catch(() => null),
    getTranslations('Home'),
    getTranslations('Product'),
    getTranslations('Common'),
  ]);
  const products = list?.items ?? [];
  const staged = products.filter((product) => product.stageImage);
  const mode: HeroSlide['mode'] = staged.length > 0 ? 'cutout' : 'photo';
  const chosen = (mode === 'cutout' ? staged : products.filter((product) => product.image)).slice(
    0,
    STAGE_LIMIT,
  );
  if (chosen.length === 0) return null;

  const currency = tc('currency.UZS');
  const units: Units = (key, values) => tp(`units.${key}`, values);
  const slides = chosen.map((product): HeroSlide => {
    const image = (mode === 'cutout' ? product.stageImage : product.image) as ImageDto;
    const price = formatMoney(product.priceFrom, locale, currency);
    return {
      id: product.id,
      href: `/products/${product.slug}`,
      name: product.name,
      kicker: [product.category.name, pack(product, locale, units)].filter(Boolean).join(' · '),
      description: product.shortDescription,
      price: product.variantCount > 1 ? tc('priceFrom', { price }) : price,
      image: stageImage(image, SIZES[mode], tp('demoImage')),
      mode,
    };
  });

  return (
    <HeroCarousel
      slides={slides}
      labels={{
        region: t('heroStageLabel'),
        slide: t.raw('heroSlide') as string,
        previous: t('heroPrevious'),
        next: t('heroNext'),
        pause: t('heroPause'),
        play: t('heroPlay'),
        goTo: t.raw('heroGoTo') as string,
        details: t('heroDetails'),
      }}
    />
  );
}

type Units = Parameters<typeof packLabel>[3];

/** The default pack, e.g. "400 g" or "20 pyramids · 40 g". */
function pack(product: ProductSummaryDto, locale: Locale, units: Units): string | null {
  if (!product.defaultVariant) return null;
  return packLabel(product.defaultVariant, product.format, locale, units) || null;
}

/** Renditions from the API (ADR-009): every stored width in srcset, 640 px as the fallback. */
function stageImage(image: ImageDto, sizes: string, demoNote: string): HeroSlide['image'] {
  const url = (width: number) => `${image.src}/${width}.webp`;
  const fallback =
    image.widths.find((width) => width >= 640) ??
    image.widths[image.widths.length - 1] ??
    image.width;
  return {
    src: url(fallback),
    srcSet: image.widths.map((width) => `${url(width)} ${width}w`).join(', '),
    sizes,
    width: image.width,
    height: image.height,
    alt: isDemoContent ? `${image.alt} (${demoNote})` : image.alt,
  };
}
