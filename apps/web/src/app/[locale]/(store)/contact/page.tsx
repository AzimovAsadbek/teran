import type { Locale } from '@teran/contracts';
import { Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import {
  ChatCard,
  OPTION_HEADER,
  OPTION_HEADING,
  OPTION_ICON,
  OPTION_LINK,
  OPTION_SMALL,
  OptionCard,
} from '@/components/content/contact-options';
import { VisualPicture } from '@/components/content/visual-picture';
import { ContactForm } from '@/components/forms/contact-form';
import { brandCopy } from '@/content/brand';
import { emailLinks, phoneLinks, socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';
import { visualFor } from '@/lib/visuals';
import terraces from '../../../../../public/brand/art/terraces.webp';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Pages' });
  return pageMetadata({
    title: t('contactTitle'),
    description: t('contactMetaDescription'),
    href: '/contact',
    locale,
  });
}

/**
 * The panel's picture (Admin → Settings, "Contact page picture"), or TERAN's tea terraces; it
 * fills the reference's portrait frame.
 */
async function ContactPicture() {
  await connection();
  const locale = await getLocale();
  const visual = visualFor(await getPublicSettings(locale).catch(() => null), 'contact.picture');
  const sizes = '(min-width: 53.0625rem) min(40vw, 36rem), 100vw';
  if (visual) {
    return (
      <div className="absolute inset-0">
        <VisualPicture visual={visual} sizes={sizes} priority />
      </div>
    );
  }
  return (
    <Image
      src={terraces}
      alt=""
      fill
      sizes={sizes}
      quality={60}
      priority
      className="object-cover"
    />
  );
}

/**
 * Under the panel, the reference's two cards: the chat (its header opens the chat window; TERAN
 * adds its messengers and e-mails) and the phones, with the opening hours and the address from
 * Admin → Settings. Only what TERAN has entered is listed.
 */
async function ContactOptions() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tc] = await Promise.all([getTranslations('Pages'), getTranslations('Common')]);
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const messengers = socialLinks(contact).filter(
    (link) => link.network === 'telegram' || link.network === 'whatsapp',
  );
  const emails = emailLinks(contact);
  const phones = phoneLinks(contact);
  const address = contact?.address || brandCopy[locale].location;

  return (
    <div className="grid grid-cols-1 gap-5 min-[46.875rem]:grid-cols-2">
      <ChatCard title={t('chatCardTitle')}>
        <p className={OPTION_SMALL}>{t('chatCardText')}</p>
        {messengers.length + emails.length > 0 ? (
          <>
            <p className={`${OPTION_SMALL} mt-1.5`}>{t('writeUs')}</p>
            {messengers.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={OPTION_LINK}
              >
                {link.network === 'whatsapp' ? t('channels.whatsappAction') : link.label}
                <span className="sr-only"> ({tc('opensInNewTab')})</span>
              </a>
            ))}
            {emails.map((email) => (
              <a key={email.href} href={email.href} className={`${OPTION_LINK} break-all`}>
                {email.label}
              </a>
            ))}
          </>
        ) : null}
      </ChatCard>
      <OptionCard
        header={
          <div className={OPTION_HEADER}>
            <Phone aria-hidden className={OPTION_ICON} strokeWidth={1.5} />
            <h2 className={`${OPTION_HEADING} leading-[1.6rem]`}>{t('callCardTitle')}</h2>
          </div>
        }
      >
        <p className={OPTION_SMALL}>{t('callCardText')}</p>
        <div className={`${OPTION_SMALL} flex flex-col gap-3.5`}>
          {contact?.workingHours ? (
            <p className="whitespace-pre-line">{contact.workingHours}</p>
          ) : null}
          <p>
            {t('channels.address')}: <span className="whitespace-pre-line">{address}</span>
          </p>
          {phones.length > 0 ? <p>{t('callCardPhones')}</p> : null}
        </div>
        {phones.map((phone) => (
          <a key={phone.href} href={phone.href} className={OPTION_LINK}>
            {phone.label}
          </a>
        ))}
      </OptionCard>
    </div>
  );
}

/**
 * Contact page on the reference's: a teal panel (20 px corners) with the heading and the form on
 * the left and a portrait picture taking 40 % on the right; while the panel is 768 px or narrower
 * the picture sits on top, edge to edge, and the corners go square. The panel's inner layout
 * follows its own width (container queries), as the reference's embedded form follows its frame.
 * Under it, the two option cards.
 */
export default async function ContactPage() {
  const t = await getTranslations('Pages');

  return (
    <>
      <section
        aria-labelledby="contact-title"
        className="container-frame pt-7 min-[61.875rem]:pt-10"
      >
        <div className="@container">
          <div className="flex flex-col-reverse bg-[#00b1b0] @min-[48.0625rem]:flex-row @min-[48.0625rem]:items-start @min-[48.0625rem]:rounded-[1.25rem]">
            <div className="w-full min-w-0 @min-[48.0625rem]:flex-1">
              <div className="mx-auto @min-[77.5rem]:max-w-[42.5rem]">
                <div className="m-5">
                  <h1
                    id="contact-title"
                    className="px-4 py-6 text-[1.5rem] leading-8 font-semibold text-black @min-[35.5rem]:px-6"
                  >
                    {t('contactTitle')}
                  </h1>
                  <div className="px-4 py-6 @min-[35.5rem]:px-6">
                    <ContactForm />
                  </div>
                </div>
              </div>
            </div>
            <div className="relative aspect-[544/769] w-full shrink-0 overflow-hidden @min-[48.0625rem]:max-w-[40%] @min-[48.0625rem]:rounded-[1.25rem]">
              <Suspense fallback={null}>
                <ContactPicture />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
      <div className="container-frame pt-7 pb-[2.625rem] min-[61.875rem]:pt-10 min-[61.875rem]:pb-[3.75rem]">
        <Suspense fallback={<div className="h-[13.5rem]" />}>
          <ContactOptions />
        </Suspense>
      </div>
    </>
  );
}
