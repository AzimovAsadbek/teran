import { formatUzPhone, normalizeUzPhone, type PublicSettingsDto } from '@teran/contracts';

type Contact = PublicSettingsDto['contact'] | null | undefined;

export interface ContactLink {
  href: string;
  label: string;
}

export type SocialNetwork = 'telegram' | 'whatsapp' | 'instagram' | 'youtube';

export interface SocialLink extends ContactLink {
  network: SocialNetwork;
  /** The account as people know it ("@TeranTrade"), or null when the link says nothing more. */
  handle: string | null;
}

/**
 * The contact channels TERAN entered in the admin area (Settings → contact), as links. Every page
 * that shows them (footer, contact, about, partnership) reads them here, so they never differ.
 */
export function phoneLinks(contact: Contact): ContactLink[] {
  return [contact?.phone, contact?.phone2]
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      const e164 = normalizeUzPhone(value) ?? value.replace(/[^+\d]/g, '');
      return { href: `tel:${e164}`, label: formatUzPhone(e164) };
    });
}

export function emailLinks(contact: Contact): ContactLink[] {
  return [contact?.email, contact?.email2]
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ href: `mailto:${value}`, label: value }));
}

export function socialLinks(contact: Contact): SocialLink[] {
  const links: (SocialLink | null)[] = [
    contact?.telegram
      ? {
          network: 'telegram',
          href: `https://t.me/${contact.telegram}`,
          label: `Telegram @${contact.telegram}`,
          handle: `@${contact.telegram}`,
        }
      : null,
    contact?.whatsapp
      ? { network: 'whatsapp', href: contact.whatsapp, label: 'WhatsApp', handle: null }
      : null,
    contact?.instagram
      ? {
          network: 'instagram',
          href: `https://www.instagram.com/${contact.instagram}/`,
          label: `Instagram @${contact.instagram}`,
          handle: `@${contact.instagram}`,
        }
      : null,
    contact?.youtube
      ? { network: 'youtube', href: contact.youtube, label: 'YouTube', handle: null }
      : null,
  ];
  return links.filter((link): link is SocialLink => link !== null);
}

/** The account TERAN is known by ("@TeranTrade"): the first network that names one, else null. */
export function socialHandle(contact: Contact): string | null {
  return socialLinks(contact).find((link) => link.handle)?.handle ?? null;
}
