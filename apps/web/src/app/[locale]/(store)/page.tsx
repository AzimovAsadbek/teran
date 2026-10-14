import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { BrewingGuide } from '@/components/home/brewing-guide';
import { BusinessCta } from '@/components/home/business-cta';
import { Hero } from '@/components/home/hero';
import {
  CategoryRailFallback,
  CategoryRailSection,
  CollectionSection,
  JournalSection,
  ShowcaseFallback,
  ShowcaseSection,
} from '@/components/home/home-sections';
import { StorySection } from '@/components/home/story-section';
import { BrandValues } from '@/components/brand/ornaments';
import { Reveal } from '@/components/ui/reveal';
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
      {/* The pack's four values, right under the packs as on the pack itself. */}
      <section aria-labelledby="values-title" className="container-page pt-6 pb-section-sm sm:pt-8">
        <h2 id="values-title" className="sr-only">
          {t('valuesTitle')}
        </h2>
        <BrandValues locale={locale} className="mx-auto max-w-3xl" />
      </section>
      <Suspense fallback={<CategoryRailFallback />}>
        <CategoryRailSection />
      </Suspense>
      <CollectionSection />
      <StorySection />
      <Suspense fallback={<ShowcaseFallback />}>
        <ShowcaseSection />
      </Suspense>
      <section aria-labelledby="brewing-title" className="container-page pt-section">
        <Reveal className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-5">
            <p className="text-eyebrow text-accent-fg">{t('brewingEyebrow')}</p>
            <h2 id="brewing-title" className="mt-4 text-display-lg text-forest-900">
              {t('brewingTitle')}
            </h2>
            <p className="mt-5 text-body-lg text-fg-muted">{t('brewingText')}</p>
            <p className="mt-4 text-helper text-fg-subtle">{t('brewingNote')}</p>
          </div>
          <div className="lg:col-span-7">
            <BrewingGuide />
          </div>
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
