import type { BusinessType, Locale } from '@teran/contracts';
import { BedDouble, ChevronDown, Coffee, Gift, Store, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import type { ComponentType } from 'react';
import { Blocks } from '@/components/content/long-form';
import { PageHeader } from '@/components/content/page-header';
import { WholesaleForm } from '@/components/forms/wholesale-form';
import { ButtonLink } from '@/components/ui/button';
import { wholesalePage } from '@/content/pages/wholesale';
import { jsonLd, pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const page = wholesalePage[locale];
  return pageMetadata({
    title: page.title,
    description: page.description,
    href: '/wholesale',
    locale,
  });
}

const SEGMENT_ICONS: Record<
  Exclude<BusinessType, 'OTHER'>,
  ComponentType<{ className?: string }>
> = {
  CAFE_RESTAURANT: Coffee,
  HOTEL: BedDouble,
  RETAIL: Store,
  DISTRIBUTOR: Truck,
  CORPORATE: Gift,
};

export default async function WholesalePage() {
  const locale = (await rootParams.locale()) as Locale;
  const page = wholesalePage[locale];
  const tw = await getTranslations('Wholesale');
  const tn = await getTranslations('Nav');
  const segments = Object.entries(page.segments) as [Exclude<BusinessType, 'OTHER'>, string][];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.filter((block) => typeof block === 'string').join(' '),
      },
    })),
  };

  return (
    <>
      <PageHeader
        eyebrow={tn('wholesale')}
        title={page.title}
        intro={page.intro}
        illustration="gift"
      >
        <ButtonLink href="#request" size="lg" className="mt-8">
          {page.formTitle}
        </ButtonLink>
      </PageHeader>

      <section aria-labelledby="segments-title" className="container-page py-section-sm">
        <h2 id="segments-title" className="text-display-md text-forest-900">
          {page.segmentsTitle}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {segments.map(([type, text]) => {
            const Icon = SEGMENT_ICONS[type];
            return (
              <li key={type} className="rounded-card border border-line bg-surface p-6">
                <span
                  aria-hidden
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-inverse text-accent-on-inverse"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-title text-fg">{tw(`segments.${type}`)}</h3>
                <p className="mt-1.5 text-body-sm text-fg-muted">{text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="process-title"
        className="on-dark bg-surface-inverse text-fg-inverse"
      >
        <div className="container-page py-section-sm">
          <h2 id="process-title" className="text-display-md text-ivory-50">
            {page.processTitle}
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {page.steps.map((step, index) => (
              <li key={step.title} className="border-t border-gold-300/35 pt-6">
                <span
                  aria-hidden
                  className="font-display text-5xl font-medium text-accent-on-inverse"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-title-lg">{step.title}</h3>
                <p className="mt-1.5 text-body text-ivory-100/85">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="container-page grid grid-cols-1 gap-10 py-section-sm lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14">
        <section
          id="request"
          aria-labelledby="request-title"
          className="scroll-mt-24 rounded-panel border border-line bg-surface p-6 sm:p-10"
        >
          <h2 id="request-title" className="text-display-sm text-forest-900">
            {page.formTitle}
          </h2>
          <p className="mt-2 text-body text-fg-muted">{page.formIntro}</p>
          <div className="mt-8">
            <WholesaleForm />
          </div>
        </section>
        <section aria-labelledby="business-faq-title">
          <h2 id="business-faq-title" className="text-display-sm text-forest-900">
            {page.faq.heading}
          </h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {page.faq.items.map((item) => (
              <details key={item.question} className="group py-1">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-title-sm text-fg transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown
                    aria-hidden
                    className="h-5 w-5 shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="space-y-3 pb-5 text-body text-fg-muted">
                  <Blocks blocks={item.answer} />
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    </>
  );
}
