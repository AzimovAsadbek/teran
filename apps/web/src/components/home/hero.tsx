import type { Locale, PublicSettingsDto } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { BRAND, brandCopy, PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { getPublicSettings } from '@/lib/data/content';
import { visualFor } from '@/lib/visuals';
import lake from '../../../public/brand/art/lake.webp';
import { HeroStage, type HeroLabels, type HeroWords } from './hero-stage';

/** One line per sentence ("Teran ta’m." / "Teran taassurot."), as the reference breaks its lines. */
function sentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/);
}

/**
 * The front page's first view: TERAN's words — the pack's tagline, what TERAN is and a pill to the
 * five teas (the way in for businesses is the black strip above) — over the film of the first view's place (`home.hero.1`,
 * set by the import script), or its picture (Admin → Settings), or the lake painted on the packs,
 * with the five TERAN pouches standing on its lower edge. One view, no rotation (the owner's
 * decision of 2026-10-18, ADR-037). The words are prerendered with the page, and so is the picture
 * (the page's largest paint) when the page has the settings while prerendering: the browser then
 * finds it in the document's first bytes and in its head (ADR-039). Without them (a build with no
 * API, ADR-008) the picture or film streams in at request time, behind the words.
 */
export async function Hero({ settings = null }: { settings?: PublicSettingsDto | null }) {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Home' });
  const copy = brandCopy[locale];
  const words: HeroWords = {
    eyebrow: `${BRAND.name}® · ${BRAND.descriptor}`,
    lines: sentences(copy.tagline),
    text: copy.description,
    // The five teas the view shows, not the whole catalogue (where other products may lead).
    cta: { href: `/collections/${PREMIUM_COLLECTION_SLUG}`, label: t('heroCta') },
  };
  const labels: HeroLabels = {
    // Read by screen readers and search engines only: the brand, what it sells, its tagline.
    heading: `${BRAND.name} — ${t('heroHeadingKind')}. ${copy.tagline}`,
  };
  if (settings) {
    return (
      <HeroStage
        words={words}
        labels={labels}
        media={visualFor(settings, 'home.hero.1')}
        art={lake}
      />
    );
  }
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
