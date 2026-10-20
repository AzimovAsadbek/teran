import type { Locale } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import {
  COLLECTION_CODES,
  PREMIUM_COLLECTION_SLUG,
  teaCodeOf,
  teaHref,
  type TeaCode,
} from '@/content/brand';
import { brewingMeasures } from '@/lib/brewing';
import { getProductList } from '@/lib/data/catalog';
import { TeaRulers, type RulerTea } from './tea-rulers';

/**
 * TERAN's teas of the premium collection, each with the brewing its pack states, in the packs'
 * own order (XC2025, G8810, 8800, 8830, 8009): what "five teas, one ruler" reads. Empty when the
 * catalogue cannot be read.
 */
export async function rulerTeas(locale: Locale): Promise<RulerTea[]> {
  const [list, tb] = await Promise.all([
    getProductList(locale, `collection=${PREMIUM_COLLECTION_SLUG}&pageSize=8&sort=featured`).catch(
      () => null,
    ),
    getTranslations('Brewing'),
  ]);
  return (list?.items ?? [])
    .flatMap((product): RulerTea[] => {
      const code = teaCodeOf(product.slug);
      return code
        ? [{ code, href: teaHref(code), measures: brewingMeasures(product.brewing, tb) }]
        : [];
    })
    .sort((a, b) => COLLECTION_CODES.indexOf(a.code) - COLLECTION_CODES.indexOf(b.code));
}

/**
 * The five teas on one ruler (ADR-051) where they are compared: Tea 101's green tea and each
 * TERAN tea's own page, where `current` marks the tea being read. Left out with fewer than two.
 */
export async function FiveTeas({
  locale,
  current,
  id,
  footer,
}: {
  locale: Locale;
  current?: TeaCode;
  id: string;
  footer?: ReactNode;
}) {
  const [teas, t] = await Promise.all([rulerTeas(locale), getTranslations('Tea101')]);
  if (teas.length < 2) return null;
  return (
    <div className="rounded-[1.5rem] bg-ivory-50/70 p-5 sm:p-8">
      <TeaRulers teas={teas} title={t('fiveTitle')} id={id} current={current} />
      {footer}
    </div>
  );
}
