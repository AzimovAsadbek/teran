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

      <section aria-labelledby="segments-title" className="container-page py-16 sm:py-20">
        <h2 id="segments-title" className="text-display-md text-forest-900">
          {page.segmentsTitle}
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {segments.map(([type, text]) => {
            const Icon = SEGMENT_ICONS[type];
            return (
              <li key={type} className="rounded-[var(--radius-card)] bg-white p-6 shadow-soft">
                <span
                  aria-hidden
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-900 text-gold-300"
                >
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-forest-900">
                  {tw(`segments.${type}`)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">{text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="process-title" className="bg-forest-900 text-ivory-50">
        <div className="container-page py-16 sm:py-20">
          <h2 id="process-title" className="text-display-md text-ivory-50">
            {page.processTitle}
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {page.steps.map((step, index) => (
              <li key={step.title} className="border-t border-gold-300/40 pt-6">
                <span aria-hidden className="font-display text-5xl font-semibold text-gold-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-1 text-ivory-100/85">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="container-page grid gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
        <section
          id="request"
          aria-labelledby="request-title"
          className="scroll-mt-28 rounded-[var(--radius-panel)] bg-white p-6 sm:p-10"
        >
          <h2 id="request-title" className="font-display text-3xl font-semibold text-forest-900">
            {page.formTitle}
          </h2>
          <p className="mt-2 text-ink-700">{page.formIntro}</p>
          <div className="mt-8">
            <WholesaleForm />
          </div>
        </section>
        <section aria-labelledby="business-faq-title">
          <h2
            id="business-faq-title"
            className="font-display text-3xl font-semibold text-forest-900"
          >
            {page.faq.heading}
          </h2>
          <div className="mt-4 divide-y divide-ivory-200 border-y border-ivory-200">
            {page.faq.items.map((item) => (
              <details key={item.question} className="group py-1">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-forest-900 [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown
                    aria-hidden
                    className="h-5 w-5 shrink-0 text-ink-500 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="space-y-3 pb-5 leading-relaxed text-ink-700">
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
