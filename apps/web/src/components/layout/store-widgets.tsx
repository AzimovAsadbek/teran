import type { Locale } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { SocialLauncher } from '@/components/social/social-launcher';
import { brandCopy, PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { socialLinks } from '@/lib/contact';
import { getCollections } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { PromoPopup } from './promo-popup';

/** TERAN's networks in the lower right corner, as entered in Admin → Settings. */
export async function SocialSlot() {
  await connection();
  const locale = await getLocale();
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  return <SocialLauncher links={socialLinks(contact)} />;
}

/** The offer card in the lower left corner: TERAN's premium collection, as the promo strip. */
export async function PromoPopupSlot() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, collections] = await Promise.all([
    getTranslations('Home'),
    getCollections(locale).catch(() => []),
  ]);
  const stocked = collections.filter((collection) => collection.productCount > 0);
  const collection =
    stocked.find((candidate) => candidate.slug === PREMIUM_COLLECTION_SLUG) ?? stocked[0];
  if (!collection) return null;
  return (
    <PromoPopup
      storageKey={`teran-popup-${collection.slug}`}
      heading={collection.name}
      text={brandCopy[locale].collection.heading}
      href={`/collections/${collection.slug}`}
      cta={t('promoCta')}
    />
  );
}
