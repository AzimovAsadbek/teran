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
    <section aria-labelledby="business-title" className="container-page py-16 lg:py-24">
      <Reveal className="on-dark relative isolate overflow-hidden rounded-[2rem] bg-forest-900 px-6 py-12 text-ivory-50 sm:px-12 lg:px-16 lg:py-16">
        <span
          aria-hidden
          className="absolute -right-16 -bottom-20 -z-10 w-80 opacity-15 lg:w-[26rem]"
        >
          <Emblem className="w-full" sizes="420px" />
        </span>
        <div className="max-w-2xl">
          <p className="text-eyebrow text-gold-300">{t('businessEyebrow')}</p>
          <h2 id="business-title" className="text-display-lg mt-4">
            {t('businessTitle')}
          </h2>
          <p className="mt-5 text-lg text-ivory-100/85">{t('businessText')}</p>
          <ul className="mt-8 flex flex-wrap gap-3">
            {segments.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-ivory-50/20 px-4 py-2 text-sm"
              >
                <Icon aria-hidden className="h-4 w-4 text-gold-300" />
                {label}
              </li>
            ))}
          </ul>
          <ButtonLink href="/wholesale" variant="gold" size="lg" className="mt-10">
            {t('businessCta')} <ArrowRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
