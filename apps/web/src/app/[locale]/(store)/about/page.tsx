import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Emblem } from '@/components/brand/logo';
import { BrandPrinciples } from '@/components/content/brand-principles';
import { Blocks } from '@/components/content/long-form';
import { PageHeader } from '@/components/content/page-header';
import { ButtonLink } from '@/components/ui/button';
import { BRAND, brandCopy } from '@/content/brand';
import { aboutPage } from '@/content/pages/about';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const page = aboutPage[locale];
  return pageMetadata({ title: page.title, description: page.description, href: '/about', locale });
}

/**
 * About TERAN: the official brand story and philosophy (content/brand.ts), the range in general
 * terms, and a placeholder for the history and photographs TERAN has yet to supply.
 */
export default async function AboutPage() {
  const locale = (await rootParams.locale()) as Locale;
  const page = aboutPage[locale];
  const copy = brandCopy[locale];
  const tn = await getTranslations('Nav');
  const tp = await getTranslations('Pages');
  const range = page.sections.find((section) => section.id === 'range');
  const history = page.sections.find((section) => section.id === 'history');

  return (
    <>
      <PageHeader
        eyebrow={`${BRAND.name}® · ${BRAND.descriptor}`}
        title={page.title}
        intro={copy.description}
        illustration="green"
      />

      <section aria-labelledby="story-title" className="container-page py-section-sm">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div
            aria-hidden
            className="relative mx-auto flex aspect-square w-full max-w-[16rem] items-center justify-center lg:col-span-4 lg:max-w-[20rem]"
          >
            <span className="absolute inset-0 rounded-full border border-gold-500/35" />
            <span className="absolute inset-[8%] rounded-full bg-surface shadow-soft" />
            <Emblem className="relative w-[48%]" sizes="(min-width: 1024px) 160px, 40vw" />
          </div>
          <div className="lg:col-span-8">
            <h2 id="story-title" className="text-display-lg text-forest-900">
              {copy.story.heading}
            </h2>
            <div className="mt-6 max-w-2xl space-y-4 text-body-lg text-fg-muted">
              {copy.story.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="philosophy-title"
        className="border-y border-line-subtle bg-surface"
      >
        <div className="container-page grid grid-cols-1 gap-10 py-section-sm lg:grid-cols-12 lg:gap-16">
          <h2
            id="philosophy-title"
            className="max-w-[16ch] text-display-lg text-forest-900 lg:col-span-4"
          >
            {copy.philosophy.heading}
          </h2>
          <BrandPrinciples locale={locale} className="lg:col-span-8" />
        </div>
      </section>

      {range ? (
        <section
          aria-labelledby="range-title"
          className="on-dark bg-surface-inverse text-fg-inverse"
        >
          <div className="container-page grid grid-cols-1 items-center gap-8 py-section-sm md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="max-w-2xl">
              <h2 id="range-title" className="text-display-md text-ivory-50">
                {range.heading}
              </h2>
              <div className="mt-4 space-y-3 text-body-lg text-ivory-100/90">
                <Blocks blocks={range.blocks} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/catalog" variant="accent" size="lg">
                {tp('shopTeas')}
              </ButtonLink>
              <ButtonLink href="/wholesale" variant="outline-inverse" size="lg">
                {tn('wholesale')}
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : null}

      {history ? (
        <section aria-labelledby="history-title" className="container-page py-section-sm">
          <div className="max-w-3xl">
            <h2 id="history-title" className="text-display-md text-forest-900">
              {history.heading}
            </h2>
            <div className="mt-5 space-y-4 text-body-lg text-fg-muted">
              <Blocks blocks={history.blocks} />
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
