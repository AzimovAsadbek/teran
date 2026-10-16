import type { Locale } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { BotanicalLayer } from '@/components/brand/botanical';
import { ButtonLink } from '@/components/ui/button';
import { BRAND, brandCopy, SIGNATURE_TAGLINE } from '@/content/brand';
import { HeroStage } from './hero-stage';

/** One line per sentence ("Teran ta’m." / "Teran taassurot."), with the space kept for screen readers. */
function sentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/);
}

/**
 * The front page's first view, in a deep green garden at dawn. On the left, as one group, the
 * brand's words: descriptor, the pack's tagline as the headline (one sentence per line), the
 * signature line, the description and both calls to action. On the right, a stage where TERAN's
 * featured products appear one at a time in front of a moon gate (hero-stage.tsx).
 *
 * The words, the buttons and the painting in the gate are part of the prerendered shell and paint
 * at once (no entrance waits on script); the products stream in after them.
 */
export async function Hero() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  const signature =
    locale === 'uz'
      ? { text: brandCopy.en.tagline, lang: 'en' }
      : { text: SIGNATURE_TAGLINE, lang: 'uz' };

  return (
    <section
      aria-labelledby="hero-title"
      className="hero-night on-dark relative isolate overflow-hidden text-fg-inverse"
    >
      <BotanicalLayer scene="heroNight" className="-z-10" />
      <div className="container-page grid grid-cols-1 items-center gap-2 lg:min-h-[min(46rem,calc(100svh-7.625rem))] lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-10">
        <div className="pt-10 sm:pt-14 lg:py-16 motion-safe:animate-rise">
          <p className="text-eyebrow text-accent-on-inverse">
            {BRAND.name}® · {BRAND.descriptor}
          </p>
          <h1 id="hero-title" className="mt-4 text-display-xl text-ivory-50 lg:mt-6">
            {sentences(copy.tagline).map((sentence, index) => (
              <span key={sentence} className="block">
                {index > 0 ? ' ' : null}
                {sentence}
              </span>
            ))}
          </h1>
          <div className="mt-5 flex items-center gap-4 lg:mt-7">
            <span
              aria-hidden
              className="h-px w-12 shrink-0 bg-linear-to-r from-gold-400 to-transparent sm:w-16"
            />
            <p lang={signature.lang} className="text-display-xs text-gold-300">
              {signature.text}
            </p>
          </div>
          <p className="mt-4 max-w-[32rem] text-body text-ivory-100/85 sm:text-body-lg lg:mt-5">
            {copy.description}
          </p>
          <div className="mt-7 flex flex-wrap gap-3 lg:mt-9">
            <ButtonLink href="/catalog" variant="accent" size="lg" className="grow sm:grow-0">
              {t('heroCta')} <ArrowRight aria-hidden className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink
              href="/wholesale"
              variant="outline-inverse"
              size="lg"
              className="grow sm:grow-0"
            >
              {t('heroSecondaryCta')}
            </ButtonLink>
          </div>
        </div>
        <HeroStage locale={locale} />
      </div>
    </section>
  );
}
