import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { BrewingGuide } from '@/components/home/brewing-guide';
import { BusinessCta } from '@/components/home/business-cta';
import { Hero } from '@/components/home/hero';
import {
  CategorySection,
  FeaturedCollectionSection,
  JournalSection,
  RibbonSection,
  ShowcaseSection,
} from '@/components/home/home-sections';
import { StorySection } from '@/components/home/story-section';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { Reveal } from '@/components/ui/reveal';
import { jsonLd, localizedUrl, pageMetadata } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Home' });
  const meta = await getTranslations({ locale, namespace: 'Meta' });
  return pageMetadata({
    title: { absolute: t('metaTitle') },
    description: meta('defaultDescription'),
    href: '/',
    locale,
  });
}

export default async function HomePage() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');

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
      <Hero />
      <Suspense fallback={<div className="mt-8 h-16 border-y border-gold-500/25 bg-ivory-100" />}>
        <RibbonSection />
      </Suspense>
      <Suspense
        fallback={
          <div className="container-page py-16 lg:py-24">
            <ProductGridSkeleton />
          </div>
        }
      >
        <ShowcaseSection />
      </Suspense>
      <Suspense fallback={null}>
        <CategorySection />
      </Suspense>
      <Suspense fallback={null}>
        <FeaturedCollectionSection />
      </Suspense>
      <StorySection />
      <section aria-labelledby="brewing-title" className="container-page py-16 lg:py-24">
        <Reveal className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            <p className="text-eyebrow text-gold-700">{t('brewingEyebrow')}</p>
            <h2 id="brewing-title" className="text-display-lg mt-4 text-forest-900">
              {t('brewingTitle')}
            </h2>
            <p className="mt-5 text-lg text-ink-700">{t('brewingText')}</p>
            <p className="mt-4 text-sm text-ink-500">{t('brewingNote')}</p>
          </div>
          <BrewingGuide />
        </Reveal>
      </section>
      <BusinessCta />
      <Suspense fallback={null}>
        <JournalSection />
      </Suspense>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    </>
  );
}
