import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { CategoryCollage, CategoryCollageFallback } from '@/components/home/category-collage';
import {
  BentoSection,
  BrewingBanner,
  CategoryMarquee,
  CategoryShortcuts,
  GalleryBanner,
  PairSection,
  PromoStrip,
  SloganBand,
  StoryBanner,
  ValuesBanner,
} from '@/components/home/editorial-sections';
import { Hero } from '@/components/home/hero';
import { MediaBandSection } from '@/components/home/media-band-section';
import {
  CategoriesRail,
  CollectionsRail,
  NewArrivalsRail,
  RailFallback,
} from '@/components/home/rail-sections';
import { Skeleton } from '@/components/ui/skeleton';
import { brandCopy } from '@/content/brand';
import { StoreStructuredData } from '@/components/seo/store-structured-data';
import { getPrerenderSettings } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';
import { visualFor } from '@/lib/visuals';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Home' });
  return pageMetadata({
    title: { absolute: t('metaTitle') },
    description: brandCopy[locale].description,
    href: '/',
    locale,
  });
}

/** A banner's footprint while it streams (inset, rounded). */
function BannerFallback({ tall = false }: { tall?: boolean }) {
  return (
    <div aria-hidden className="container-page py-6 sm:py-8">
      <Skeleton
        className={
          tall ? 'h-[39rem] rounded-banner sm:h-[50rem]' : 'h-[28rem] rounded-banner sm:h-[27.5rem]'
        }
      />
    </div>
  );
}

/**
 * The home page in the reference's section order (docs/design/reference-map.md), with TERAN's
 * content: promo strip (a real collection) · hero · category ribbon · new arrivals / our picks ·
 * story banner · category shortcuts · gallery banner · collections row · categories row · bento ·
 * brewing band · category collage · values band · gallery band · journal and business pair ·
 * slogan ribbon · footer (layout). Catalogue sections stream at request time, each in its own
 * Suspense boundary; anything without real content is left out. The first view's and the banners'
 * pictures are prerendered with the page when the API answers (ADR-039).
 */
export default async function HomePage() {
  const locale = (await rootParams.locale()) as Locale;
  // The pictures from Admin → Settings, read with the page (cached under `settings`, so a change
  // there renders the page again), go into the prerendered page itself: the first view's picture
  // is announced in the head, and no banner draws its own artwork first (ADR-039). Without an
  // answer from the API (a build with none, ADR-008) each place reads its picture at request time.
  const settings = await getPrerenderSettings(locale);
  const photo = (slot: string) => visualFor(settings, slot);

  return (
    <>
      <Suspense
        fallback={<div aria-hidden className="h-[5.75rem] bg-forest-950 min-[46.875rem]:h-20" />}
      >
        <PromoStrip />
      </Suspense>
      <Hero settings={settings} />
      <Suspense fallback={<div aria-hidden className="h-12 bg-jade-100 sm:h-[4.1875rem]" />}>
        <CategoryMarquee />
      </Suspense>
      <Suspense fallback={<RailFallback />}>
        <NewArrivalsRail />
      </Suspense>
      {/* Without the settings each banner renders at once with its own artwork, and a photograph
          set in Admin → Settings streams in over it (same frame, so nothing moves). */}
      {settings ? (
        <StoryBanner photo={photo('home.banner.1')} />
      ) : (
        <Suspense fallback={<StoryBanner />}>
          <StoryBanner withPhoto />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <CategoryShortcuts />
      </Suspense>
      <Suspense fallback={<BannerFallback />}>
        <GalleryBanner />
      </Suspense>
      <Suspense fallback={<RailFallback compact cta={false} />}>
        <CollectionsRail />
      </Suspense>
      <Suspense fallback={<RailFallback compact />}>
        <CategoriesRail />
      </Suspense>
      <Suspense fallback={<BannerFallback tall />}>
        <BentoSection />
      </Suspense>
      {settings ? (
        <BrewingBanner photo={photo('home.feature')} />
      ) : (
        <Suspense fallback={<BrewingBanner />}>
          <BrewingBanner withPhoto />
        </Suspense>
      )}
      <Suspense fallback={<CategoryCollageFallback />}>
        <CategoryCollage />
      </Suspense>
      {settings ? (
        <ValuesBanner photo={photo('home.values')} />
      ) : (
        <Suspense fallback={<ValuesBanner />}>
          <ValuesBanner withPhoto />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <MediaBandSection />
      </Suspense>
      <Suspense fallback={null}>
        <PairSection />
      </Suspense>
      <SloganBand />
      <Suspense fallback={null}>
        <StoreStructuredData locale={locale} />
      </Suspense>
    </>
  );
}
