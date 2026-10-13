import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { HeroLandscape } from '@/components/brand/illustrations';
import { ButtonLink } from '@/components/ui/button';

/**
 * Inset hero: an original landscape illustration with a frosted message card. Fully static,
 * so it is part of the prerendered shell and paints immediately.
 */
export async function Hero() {
  const t = await getTranslations('Home');
  return (
    <section aria-labelledby="hero-title" className="container-page pt-3 lg:pt-5">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-forest-900">
        <HeroLandscape className="absolute inset-0 -z-10" />
        <div className="flex min-h-[32rem] items-end p-3 sm:min-h-[36rem] sm:p-8 lg:min-h-[40rem] lg:p-12">
          <div className="glass-dark on-dark max-w-xl rounded-[1.5rem] p-6 motion-safe:animate-rise sm:p-9">
            <p className="text-eyebrow text-gold-300">{t('heroEyebrow')}</p>
            <h1 id="hero-title" className="text-display-xl mt-4 text-balance text-ivory-50">
              {t('heroTitle')}
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-ivory-100/90">
              {t('heroText')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/catalog" variant="gold" size="lg">
                {t('heroCta')} <ArrowRight aria-hidden className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/wholesale" variant="outline-light" size="lg">
                {t('heroSecondaryCta')}
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
