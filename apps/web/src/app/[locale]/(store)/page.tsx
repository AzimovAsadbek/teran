import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { BusinessCloser, BusinessSection } from '@/components/home/business-section';
import {
  CategoryMarquee,
  PairSection,
  PromoStrip,
  SloganBand,
} from '@/components/home/editorial-sections';
import { FamilyFeature } from '@/components/home/family-feature';
import { Hero } from '@/components/home/hero';
import { RangeExplorer } from '@/components/home/range-explorer';
import { NewArrivalsRail, RailFallback } from '@/components/home/rail-sections';
import { SignatureTeas } from '@/components/home/signature-teas';
import { StorySequence } from '@/components/home/story-sequence';
import { StoreStructuredData } from '@/components/seo/store-structured-data';
import { brandCopy } from '@/content/brand';
import { getPrerenderSettings } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

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

/**
 * The home page as one narrative (docs/design/design-system.md, "Experience upgrade"): the promo
 * strip · the first view (the film and the five TERAN pouches) · the category ribbon · the five
 * teas on one stage · the whole range at a glance · the cold drinks (once stocked) · TERAN for
 * business (who TERAN works with, the proof and the process) · the story from the garden to the
 * cup · new arrivals beyond the five teas · the gift sets (once stocked) · the journal · the request
 * again · the slogan. Catalogue sections stream at request time, each in its own Suspense boundary;
 * anything without real content is left out. The first view's and the business section's pictures
 * are prerendered with the page when the API answers (ADR-039). What TERAN stands for is the
 * footer's, on every page.
 */
/** The gift sets' feature, with the way in for corporate gifts. */
async function GiftFeature() {
  const tw = await getTranslations('Wholesale');
  return (
    <FamilyFeature
      slug="gift-sets"
      tone="gift"
      business={{ href: '/wholesale?type=CORPORATE#request', label: tw('segments.CORPORATE') }}
    />
  );
}

export default async function HomePage() {
  const locale = (await rootParams.locale()) as Locale;
  // The pictures from Admin → Settings, read with the page (cached under `settings`, so a change
  // there renders the page again), go into the prerendered page itself (ADR-039). Without an
  // answer from the API (a build with none, ADR-008) each place reads its picture at request time.
  const settings = await getPrerenderSettings(locale);

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
      <Suspense fallback={<div aria-hidden className="h-[48rem]" />}>
        <SignatureTeas />
      </Suspense>
      <Suspense fallback={<div aria-hidden className="h-[40rem]" />}>
        <RangeExplorer />
      </Suspense>
      <Suspense fallback={null}>
        <FamilyFeature slug="drinks" tone="summer" />
      </Suspense>
      <BusinessSection settings={settings} />
      <Suspense fallback={<div aria-hidden className="h-[60rem] bg-lavender" />}>
        <StorySequence />
      </Suspense>
      <Suspense fallback={<RailFallback />}>
        <NewArrivalsRail />
      </Suspense>
      <Suspense fallback={null}>
        <GiftFeature />
      </Suspense>
      <Suspense fallback={null}>
        <PairSection />
      </Suspense>
      <Suspense fallback={null}>
        <BusinessCloser />
      </Suspense>
      <SloganBand />
      <Suspense fallback={null}>
        <StoreStructuredData locale={locale} />
      </Suspense>
    </>
  );
}
