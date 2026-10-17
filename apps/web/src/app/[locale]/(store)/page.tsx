import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { CategoryCollage, CategoryCollageFallback } from '@/components/home/category-collage';
import {
  AdvisorBanner,
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
import { jsonLd, localizedUrl, pageMetadata } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

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
 * story banner · category shortcuts · gallery banner · collections row · advisor banner ·
 * categories row · bento · brewing band · category collage · values band · gallery band · journal
 * and business pair · slogan ribbon · footer (layout). Data sections stream at request time, each
 * in its own Suspense boundary; anything without real content is left out.
 */
export default async function HomePage() {
  const locale = (await rootParams.locale()) as Locale;

  // Only facts we know: the brand name, its site and its logo. No invented address or ratings.
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'TERAN',
        url: siteUrl,
        logo: `${siteUrl}/brand/teran-logo.png`,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: 'TERAN',
        url: localizedUrl('/', locale),
        inLanguage: locale,
        publisher: { '@id': `${siteUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${localizedUrl('/search', locale)}?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <>
      <Suspense fallback={<div aria-hidden className="h-[5.5rem] bg-forest-950 lg:h-20" />}>
        <PromoStrip />
      </Suspense>
      <Hero />
      <Suspense fallback={<div aria-hidden className="h-12 bg-jade-100 sm:h-[4.1875rem]" />}>
        <CategoryMarquee />
      </Suspense>
      <Suspense fallback={<RailFallback />}>
        <NewArrivalsRail />
      </Suspense>
      <StoryBanner />
      <Suspense fallback={null}>
        <CategoryShortcuts />
      </Suspense>
      <Suspense fallback={<BannerFallback />}>
        <GalleryBanner />
      </Suspense>
      <Suspense fallback={<RailFallback tinted />}>
        <CollectionsRail />
      </Suspense>
      <AdvisorBanner />
      <Suspense fallback={<RailFallback />}>
        <CategoriesRail />
      </Suspense>
      <Suspense fallback={<BannerFallback tall />}>
        <BentoSection />
      </Suspense>
      <BrewingBanner />
      <Suspense fallback={<CategoryCollageFallback />}>
        <CategoryCollage />
      </Suspense>
      <ValuesBanner />
      <Suspense fallback={null}>
        <MediaBandSection />
      </Suspense>
      <Suspense fallback={null}>
        <PairSection />
      </Suspense>
      <SloganBand />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    </>
  );
}
