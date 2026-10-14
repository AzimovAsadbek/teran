import type { Locale } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { ButtonLink } from '@/components/ui/button';
import { brandCopy, COLLECTION_CODES, PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { getCollections } from '@/lib/data/catalog';

/**
 * The TERAN premium collection (official heading, text and identifiers) at the end of the full
 * catalogue, after the products, so it never pushes them off a phone's first screen. Rendered only
 * while that collection exists and has products.
 */
export async function PremiumCollectionBand({ locale }: { locale: Locale }) {
  await connection();
  const collections = await getCollections(locale).catch(() => []);
  const ready = collections.some(
    (collection) => collection.slug === PREMIUM_COLLECTION_SLUG && collection.productCount > 0,
  );
  if (!ready) return null;
  const t = await getTranslations('Home');
  const copy = brandCopy[locale];

  return (
    <section
      aria-labelledby="premium-collection-title"
      className="mt-section-sm rounded-panel border border-line bg-surface px-6 py-8 shadow-soft sm:px-10 sm:py-10"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div className="min-w-0">
          <p className="text-eyebrow text-accent-fg">{t('featuredEyebrow')}</p>
          <h2 id="premium-collection-title" className="mt-3 text-display-md text-forest-900">
            {copy.collection.heading}
          </h2>
          <p className="mt-2 text-body-lg text-fg-muted">{copy.collection.text}</p>
          <p className="mt-5 font-display text-[1.375rem] leading-snug tracking-[0.04em] text-accent-fg sm:text-[1.625rem]">
            {COLLECTION_CODES.join(' · ')}
          </p>
        </div>
        <ButtonLink
          href={`/collections/${PREMIUM_COLLECTION_SLUG}`}
          variant="secondary"
          className="self-start lg:self-auto"
        >
          {t('featuredCta')} <ArrowRight aria-hidden className="h-4 w-4" />
        </ButtonLink>
      </div>
    </section>
  );
}
