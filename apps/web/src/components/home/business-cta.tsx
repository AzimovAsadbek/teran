import { ArrowRight, Building2, Coffee, Hotel, Store } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Emblem } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui/button';
import { Reveal } from '@/components/ui/reveal';

export async function BusinessCta() {
  const t = await getTranslations('Home');
  const tw = await getTranslations('Wholesale');
  const segments = [
    { icon: Coffee, label: tw('segments.CAFE_RESTAURANT') },
    { icon: Hotel, label: tw('segments.HOTEL') },
    { icon: Store, label: tw('segments.RETAIL') },
    { icon: Building2, label: tw('segments.CORPORATE') },
  ];

  return (
    <section aria-labelledby="business-title" className="container-page py-section">
      <Reveal className="on-dark relative isolate grid gap-10 overflow-hidden rounded-panel bg-surface-inverse px-6 py-12 text-fg-inverse sm:px-12 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-16 lg:py-16">
        <span
          aria-hidden
          className="absolute -right-20 -bottom-24 -z-10 w-80 opacity-[0.08] lg:w-[28rem]"
        >
          <Emblem className="w-full" sizes="448px" />
        </span>
        <div className="lg:col-span-7">
          <p className="text-eyebrow text-accent-on-inverse">{t('businessEyebrow')}</p>
          <h2 id="business-title" className="mt-4 max-w-[20ch] text-display-lg">
            {t('businessTitle')}
          </h2>
          <p className="mt-5 max-w-xl text-body-lg text-ivory-100/85">{t('businessText')}</p>
          <ButtonLink href="/wholesale" variant="accent" size="lg" className="mt-9">
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
