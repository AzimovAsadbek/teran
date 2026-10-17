import { normalizeUzPhone, type Locale } from '@teran/contracts';
import { connection } from 'next/server';
import { BRAND, brandCopy } from '@/content/brand';
import { socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
import { jsonLd, localizedUrl } from '@/lib/seo';
import { siteUrl } from '@/lib/site';

/**
 * The shop for search engines (schema.org OnlineStore): TERAN TRADE MChJ in Namangan, its phones
 * and e-mail and its networks from Admin → Settings → Contact, so they always match the footer.
 * Only facts TERAN supplied: no street address, opening hours or ratings it has not given. The
 * WhatsApp link is a QR code's, not a profile, so it is no `sameAs`.
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
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore',
        '@id': `${siteUrl}/#organization`,
        name: BRAND.name,
        legalName: BRAND.company,
        description: brandCopy[locale].description,
        slogan: brandCopy[locale].tagline,
        url: siteUrl,
        logo: `${siteUrl}/brand/teran-logo.png`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Namangan',
          addressCountry: 'UZ',
        },
        ...(contact?.email ? { email: contact.email } : {}),
        ...(phones[0] ? { telephone: phones[0] } : {}),
        ...(phones.length > 0
          ? {
              contactPoint: phones.map((telephone) => ({
                '@type': 'ContactPoint',
                telephone,
                contactType: 'sales',
                areaServed: 'UZ',
                availableLanguage: ['uz', 'ru', 'en'],
              })),
            }
          : {}),
        ...(profiles.length > 0 ? { sameAs: profiles } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: BRAND.name,
        url: localizedUrl('/', locale),
        inLanguage: locale,
        publisher: { '@id': `${siteUrl}/#organization` },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />;
}
