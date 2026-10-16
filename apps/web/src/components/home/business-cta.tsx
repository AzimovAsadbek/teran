import type { Locale } from '@teran/contracts';
import { ArrowRight, Building2, Coffee, ExternalLink, Hotel, Store } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { BotanicalLayer } from '@/components/brand/botanical';
import { Emblem } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';
import { BRAND, brandCopy } from '@/content/brand';

/**
 * Partnership band (official copy): wholesale, distribution and partnership, the company and its
 * city as supplied by TERAN, and the way into the existing wholesale enquiry form.
 */
export async function BusinessCta() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const tw = await getTranslations('Wholesale');
  const tc = await getTranslations('Common');
  const copy = brandCopy[locale];
  const segments = [
    { icon: Coffee, label: tw('segments.CAFE_RESTAURANT') },
    { icon: Hotel, label: tw('segments.HOTEL') },
    { icon: Store, label: tw('segments.RETAIL') },
    { icon: Building2, label: tw('segments.CORPORATE') },
  ];

  return (
    <section aria-labelledby="business-title" className="container-page py-section">
      <Reveal className="on-dark relative isolate grid gap-10 overflow-hidden rounded-panel bg-surface-inverse px-6 py-12 text-fg-inverse sm:px-12 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-16 lg:py-16">
        <BotanicalLayer scene="business" className="-z-10" />
        <span
          aria-hidden
          className="absolute -right-20 -bottom-24 -z-10 w-80 opacity-[0.08] lg:w-[28rem]"
        >
          <Emblem className="w-full" sizes="448px" />
        </span>
        <div className="lg:col-span-7">
          <p className="text-eyebrow text-accent-on-inverse">{t('businessEyebrow')}</p>
          <h2 id="business-title" className="mt-4 max-w-[20ch] text-display-lg">
            {copy.partnership.heading}
          </h2>
          <p className="mt-5 max-w-xl text-body-lg text-ivory-100/85">{copy.partnership.text}</p>
          <dl className="mt-8 grid max-w-xl gap-x-8 gap-y-4 border-t border-line-inverse pt-6 text-body-sm sm:grid-cols-3">
            <div>
              <dt className="text-caption text-ivory-100/70">{copy.labels.company}</dt>
              <dd className="mt-1 font-semibold">{BRAND.company}</dd>
            </div>
            <div>
              <dt className="text-caption text-ivory-100/70">{copy.labels.location}</dt>
              <dd className="mt-1 font-semibold">{copy.location}</dd>
            </div>
            <div>
              <dt className="text-caption text-ivory-100/70">{copy.labels.website}</dt>
              <dd className="mt-1">
                <a
                  href={BRAND.website.href}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 font-semibold underline decoration-gold-300/50 underline-offset-4 hover:decoration-gold-300"
                >
                  {BRAND.website.label}
                  <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                  <span className="sr-only"> ({tc('opensInNewTab')})</span>
                </a>
              </dd>
            </div>
          </dl>
          <ButtonLink href="/wholesale#request" variant="accent" size="lg" className="mt-9">
            {t('businessCta')} <ArrowRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
        </div>
        <ul className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:col-span-5">
          {segments.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-card border border-line-inverse bg-ivory-50/[0.04] px-4 py-4 text-body-sm font-medium"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ivory-50/[0.08] text-accent-on-inverse">
                <Icon aria-hidden className="h-[1.125rem] w-[1.125rem]" />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
