import { normalizeUzPhone, type Locale } from '@teran/contracts';
import { connection } from 'next/server';
import { brandCopy } from '@/content/brand';
import { socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
import { storeSchema } from '@/lib/seo';
import { JsonLd } from './json-ld';

/**
 * The shop for search engines (schema.org OnlineStore and WebSite, lib/seo/schema.ts), with its
 * phones, e-mail and networks from Admin → Settings → Contact, so they always match the footer.
 * The WhatsApp link is a QR code's, not a profile, so it is no `sameAs`.
 */
export async function StoreStructuredData({ locale }: { locale: Locale }) {
  await connection();
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const phones = [contact?.phone, contact?.phone2]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeUzPhone(value) ?? value);
  const profiles = socialLinks(contact)
    .filter((link) => link.network !== 'whatsapp')
    .map((link) => link.href);
  return (
    <JsonLd
      data={storeSchema({
        description: brandCopy[locale].description,
        slogan: brandCopy[locale].tagline,
        phones,
        email: contact?.email ?? null,
        profiles,
      })}
    />
  );
}
