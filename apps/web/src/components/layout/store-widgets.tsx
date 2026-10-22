import type { Locale } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import type { ChatChannel } from '@/components/chat/chat-types';
import { ChatWidget } from '@/components/chat/chat-widget';
import { NETWORK_NAMES } from '@/components/social/social-icon';
import { brandCopy, PREMIUM_COLLECTION_SLUG } from '@/content/brand';
import { phoneLinks, socialLinks } from '@/lib/contact';
import { getCollections } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { PromoPopup } from './promo-popup';

/**
 * The chat in the lower right corner, with TERAN's networks above it and its messengers and phones
 * inside, as entered in Admin → Settings.
 */
export async function ChatSlot() {
  await connection();
  const locale = await getLocale();
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const socials = socialLinks(contact);
  const channels: ChatChannel[] = [
    ...socials
      .filter((link) => link.network === 'telegram' || link.network === 'whatsapp')
      .map((link) => ({ href: link.href, label: NETWORK_NAMES[link.network], external: true })),
    ...phoneLinks(contact).map((phone) => ({
      href: phone.href,
      label: phone.label,
      external: false,
    })),
  ];
  return <ChatWidget channels={channels} socials={socials} />;
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
