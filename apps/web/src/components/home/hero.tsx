import type { Locale } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import * as rootParams from 'next/root-params';
import { GoldRule, GreenTeaCalligraphy, Pennant, WavePattern } from '@/components/brand/ornaments';
import { ButtonLink } from '@/components/ui/button';
import { brandCopy, SIGNATURE_TAGLINE } from '@/content/brand';
import { cn } from '@/lib/cn';
import lake from '../../../public/brand/art/lake.webp';
import sprig from '../../../public/brand/art/sprig-1.webp';
import pack8009 from '../../../public/brand/packs/8009.webp';
import pack8830 from '../../../public/brand/packs/8830.webp';
import packG8810 from '../../../public/brand/packs/g8810.webp';
import packXc2025 from '../../../public/brand/packs/xc2025.webp';

/** One line per sentence ("Teran ta’m." / "Teran taassurot."), with the space kept for screen readers. */
function sentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/);
}

/** The four packs, the two brightest in front. */
const PACKS = [
  { src: pack8830, front: false },
  { src: packXc2025, front: true },
  { src: pack8009, front: true },
  { src: packG8810, front: false },
];

/**
 * The front of the pack, as a page: the misty lake with its pavilion behind, the ribbon top left,
 * 绿茶 top right, the tagline in the open sky and the four TERAN packs standing on the shore. The
 * text sits on a soft mist (stronger on phones, where it runs further down the painting) that
 * keeps every line at 4.5:1 or more against the darkest pixel behind it.
 * Fully static, so it is part of the prerendered shell and paints immediately.
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
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-canvas">
      {/* The largest paint on every screen size: fetched first. */}
      <Image
        src={lake}
        alt=""
        fill
        loading="eager"
        fetchPriority="high"
        sizes="100vw"
        className="-z-30 object-cover object-[50%_35%]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-[linear-gradient(to_bottom,rgb(252_250_244/0.95),rgb(252_250_244/0.9)_58%,rgb(252_250_244/0.25)_74%,transparent_86%)] sm:bg-[radial-gradient(ellipse_90%_62%_at_50%_22%,rgb(252_250_244/0.95)_0%,rgb(252_250_244/0.86)_40%,rgb(252_250_244/0.2)_78%,transparent)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-20 h-1/5 bg-linear-to-b from-transparent to-canvas"
      />
      <WavePattern className="inset-x-0 top-0 -z-10 h-32 opacity-35" />
      {/* Tea sprigs in the lower corners, as on the front of the pack. */}
      <Image
        src={sprig}
        alt=""
        sizes="(min-width: 1024px) 11rem, 6rem"
        fetchPriority="low"
        className="absolute -bottom-4 -left-8 -z-10 w-24 -rotate-6 sm:w-32 lg:-left-6 lg:w-44"
      />
      <Image
        src={sprig}
        alt=""
        sizes="(min-width: 1024px) 11rem, 6rem"
        fetchPriority="low"
        className="absolute -right-8 -bottom-4 -z-10 w-24 -scale-x-100 rotate-6 sm:w-32 lg:-right-6 lg:w-44"
      />

      <div className="relative container-page flex flex-col items-center pt-24 text-center sm:pt-20 lg:pt-16">
        <Pennant className="absolute top-0 left-gutter w-[4.25rem] sm:w-24 lg:w-28" />
        <GreenTeaCalligraphy className="absolute top-5 right-gutter w-7 sm:top-6 sm:w-9 lg:w-11" />

        <h1
          id="hero-title"
          className="max-w-4xl text-display-lg text-forest-900 motion-safe:animate-rise"
        >
          {sentences(copy.tagline).map((sentence, index) => (
            <span key={sentence} className="block">
              {index > 0 ? ' ' : null}
              {sentence}
            </span>
          ))}
        </h1>
        <GoldRule className="mt-5 w-48 sm:w-64" />
        <p lang={signature.lang} className="mt-3 text-display-xs text-accent-fg">
          {signature.text}
        </p>
        <p className="mt-4 max-w-2xl text-body text-balance text-fg-muted sm:text-body-lg">
          {copy.description}
        </p>
        <div className="mt-7 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href="/catalog" size="lg" className="w-full sm:w-auto">
            {t('heroCta')} <ArrowRight aria-hidden className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink href="/wholesale" variant="secondary" size="lg" className="w-full sm:w-auto">
            {t('heroSecondaryCta')}
          </ButtonLink>
        </div>

        <div
          role="img"
          aria-label={t('heroPacks')}
          className="mt-9 flex w-full max-w-[46rem] items-end justify-center sm:mt-12"
        >
          {PACKS.map((pack, index) => (
            <Image
              key={pack.src.src}
              src={pack.src}
              alt=""
              sizes="(min-width: 768px) 13rem, 26vw"
              className={cn(
                'h-auto drop-shadow-[0_22px_18px_rgb(32_24_8/0.35)]',
                pack.front ? 'relative z-10 w-[27%]' : 'w-[23%] translate-y-[-3%]',
                index > 0 && '-ml-[2.5%]',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
