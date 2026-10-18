import type { Locale } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BRAND, brandCopy } from '@/content/brand';
import { getPublicSettings } from '@/lib/data/content';
import { visualFor } from '@/lib/visuals';
import lake from '../../../public/brand/art/lake.webp';
import { HeroStage, type HeroLabels, type HeroWords } from './hero-stage';

/** One line per sentence ("Teran ta’m." / "Teran taassurot."), as the reference breaks its lines. */
function sentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/);
}

/**
 * The front page's first view: TERAN's words — the pack's tagline, what TERAN is, a pill to the
 * teas — over the film of the first view's place (`home.hero.1`, set by the import script), or its
 * picture (Admin → Settings), or the lake painted on the packs. One view, no rotation (the owner's
 * decision of 2026-10-18, ADR-037): the words are prerendered with the page; the picture or film
 * streams in at request time, behind them.
 */
export async function Hero() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];
  const words: HeroWords = {
    eyebrow: `${BRAND.name}® · ${BRAND.descriptor}`,
    lines: sentences(copy.tagline),
    text: copy.description,
    cta: { href: '/catalog', label: t('heroCta') },
  };
  const labels: HeroLabels = {
    // Read by screen readers and search engines only: the brand, what it sells, its tagline.
    heading: `${BRAND.name} — ${t('heroHeadingKind')}. ${copy.tagline}`,
    pause: t('filmPause'),
    play: t('filmPlay'),
  };
  return (
    <Suspense fallback={<HeroStage words={words} labels={labels} media="pending" art={lake} />}>
      <HeroWithMedia locale={locale} words={words} labels={labels} />
    </Suspense>
  );
}

async function HeroWithMedia({
  locale,
  words,
  labels,
}: {
  locale: Locale;
  words: HeroWords;
  labels: HeroLabels;
}) {
  await connection();
  const settings = await getPublicSettings(locale).catch(() => null);
  return (
    <HeroStage
      words={words}
      labels={labels}
      media={visualFor(settings, 'home.hero.1')}
      art={lake}
    />
  );
}
