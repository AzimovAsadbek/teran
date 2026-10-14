import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { HeroLandscape } from '@/components/brand/illustrations';
import { ButtonLink } from '@/components/ui/button';

/**
 * Full-bleed hero: the original dawn landscape behind a centred serif headline. A soft scrim
 * keeps the text above 7:1 against every part of the art. Fully static, so it is part of the
 * prerendered shell and paints immediately; the tea-type rail overlaps its lower edge.
 */
export async function Hero() {
  const t = await getTranslations('Home');
  return (
    <section
      aria-labelledby="hero-title"
      className="on-dark relative isolate overflow-hidden bg-forest-950 text-ivory-50"
    >
      <HeroLandscape className="absolute inset-0 -z-20" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_65%_at_50%_40%,rgb(6_31_16/0.7),rgb(6_31_16/0.25)_70%,transparent)]"
      />
      <div className="container-page flex min-h-[min(44rem,80svh)] flex-col items-center justify-center pt-14 pb-36 text-center sm:pt-20 sm:pb-44">
        <p className="flex items-center gap-3 text-eyebrow text-balance text-accent-on-inverse">
          <span aria-hidden className="hidden h-px w-8 bg-gold-300/60 sm:block" />
          {t('heroEyebrow')}
          <span aria-hidden className="hidden h-px w-8 bg-gold-300/60 sm:block" />
        </p>
        <h1
          id="hero-title"
          className="mt-5 max-w-[16ch] text-display-xl text-ivory-50 motion-safe:animate-rise"
        >
          {t('heroTitle')}
        </h1>
        <p className="mt-5 max-w-xl text-body-lg text-balance text-ivory-100/90">{t('heroText')}</p>
        <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href="/catalog" variant="accent" size="lg" className="w-full sm:w-auto">
            {t('heroCta')} <ArrowRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink
            href="/wholesale"
            variant="outline-inverse"
            size="lg"
            className="w-full sm:w-auto"
          >
            {t('heroSecondaryCta')}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
