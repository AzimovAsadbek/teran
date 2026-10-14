import type { Locale } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { HeroLandscape } from '@/components/brand/illustrations';
import { ButtonLink } from '@/components/ui/button';
import { BRAND, brandCopy, SIGNATURE_TAGLINE } from '@/content/brand';

/** One line per sentence ("Teran ta’m." / "Teran taassurot."), with the space kept for screen readers. */
function sentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/);
}

/**
 * Full-bleed hero: the official descriptor, tagline and brand description over the original dawn
 * landscape. Uzbek pages carry the supplied English tagline as a signature line; Russian and
 * English pages carry the Uzbek original. A soft scrim keeps the text above 7:1 against every part
 * of the art. Fully static, so it is part of the prerendered shell and paints immediately.
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
      className="on-dark relative isolate overflow-hidden bg-forest-950 text-ivory-50"
    >
      <HeroLandscape className="absolute inset-0 -z-20" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_65%_at_50%_40%,rgb(6_31_16/0.7),rgb(6_31_16/0.25)_70%,transparent)]"
      />
      <div className="container-page flex min-h-[min(44rem,80svh)] flex-col items-center justify-center pt-14 pb-36 text-center sm:pt-20 sm:pb-44">
        <p className="flex items-center gap-3 text-eyebrow text-accent-on-inverse">
          <span aria-hidden className="hidden h-px w-8 bg-gold-300/60 sm:block" />
          <span>
            {BRAND.name}® · {BRAND.descriptor}
          </span>
          <span aria-hidden className="hidden h-px w-8 bg-gold-300/60 sm:block" />
        </p>
        <h1 id="hero-title" className="mt-5 text-display-xl text-ivory-50 motion-safe:animate-rise">
          {sentences(copy.tagline).map((sentence, index) => (
            <span key={sentence} className="block">
              {index > 0 ? ' ' : null}
              {sentence}
            </span>
          ))}
        </h1>
        <p lang={signature.lang} className="mt-4 text-display-xs text-accent-on-inverse">
          {signature.text}
        </p>
        <p className="mt-5 max-w-2xl text-body-lg text-balance text-ivory-100/90">
          {copy.description}
        </p>
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
