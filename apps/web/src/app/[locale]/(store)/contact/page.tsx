import type { Locale } from '@teran/contracts';
import { ArrowDown, MessageSquare, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import {
  OPTION_HEADER,
  OPTION_HEADING,
  OPTION_ICON,
  OPTION_LINK,
  OPTION_SMALL,
  OptionCard,
} from '@/components/content/contact-options';
import { VisualPicture } from '@/components/content/visual-picture';
import { ProductImage } from '@/components/catalog/product-image';
import { ContactForm } from '@/components/forms/contact-form';
import { OrderLine } from '@/components/forms/order-line';
import { brandCopy } from '@/content/brand';
import { emailLinks, phoneLinks, socialLinks } from '@/lib/contact';
import { getProduct } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { packLabel } from '@/lib/format';
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
 * Under the panel, the reference's two cards: writing to TERAN (its messengers and e-mails) and
 * the phones, with the opening hours and the address from Admin → Settings. Only what TERAN has
 * entered is listed.
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
      <OptionCard
        header={
          <div className={OPTION_HEADER}>
            <MessageSquare aria-hidden className={OPTION_ICON} strokeWidth={1.5} />
            <h2 className={`${OPTION_HEADING} leading-[1.6rem]`}>{t('writeCardTitle')}</h2>
          </div>
        }
      >
        <p className={OPTION_SMALL}>{t('writeCardText')}</p>
        {messengers.length + emails.length > 0 ? (
          <>
            <p className={`${OPTION_SMALL} mt-1.5`}>{t('writeCardChannels')}</p>
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
      </OptionCard>
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

/** A catalogue address as the "Order" buttons pass it (`?tea=teran-8830`). */
const TEA_SLUG = /^[a-z0-9-]{1,120}$/;

/**
 * When the visitor came from a tea's "Order" (`/contact?tea=<slug>`), that tea above the form: its
 * own picture (the dry leaf for TERAN's teas), name and pack, the delivery promise the product page
 * makes, and a way down to the messengers and phones; it hands the tea to the form (order-line.ts),
 * which opens on "Place an order" with the tea written in. An unknown or missing tea shows nothing.
 * It streams in on its own, so the form above which it appears is never rendered again.
 */
async function OrderSummary({
  searchParams,
}: {
  searchParams: PageProps<'/[locale]/contact'>['searchParams'];
}) {
  const query = await searchParams;
  const slug = typeof query.tea === 'string' && TEA_SLUG.test(query.tea) ? query.tea : null;
  if (!slug) return null;
  const locale = (await getLocale()) as Locale;
  const [t, tp, product] = await Promise.all([
    getTranslations('Pages'),
    getTranslations('Product'),
    getProduct(locale, slug).catch(() => null),
  ]);
  if (!product) return null;
  const variant = product.defaultVariant ?? product.variants[0] ?? null;
  const pack = variant
    ? packLabel(variant, product.format, locale, (key, values) => tp(`units.${key}`, values))
    : null;
  // TERAN's teas open on the same steaming cup; their second picture is their own leaf.
  const picture = product.images[1] ?? product.images[0] ?? null;
  return (
    <section
      aria-labelledby="order-summary"
      className="mb-6 flex gap-4 rounded-[0.5rem] bg-[#f3fafb] p-4 text-[#121212]"
    >
      <OrderLine value={[product.name, pack].filter(Boolean).join(' · ')} />
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[0.375rem] bg-white">
        <ProductImage image={picture} name={product.name} sizes="64px" decorative />
      </div>
      <div className="min-w-0">
        <h2 id="order-summary" className="text-[0.75rem] leading-5 font-semibold text-[#0c504e]">
          {t('orderSummaryTitle')}
        </h2>
        <p className="text-[1.0625rem] leading-6 font-bold">{product.name}</p>
        {pack ? <p className="text-[0.9375rem] leading-5 text-[#3d4a47]">{pack}</p> : null}
        <p className="mt-1 text-[0.875rem] leading-5">{tp('deliveryTextByContact')}</p>
        <a
          href="#contact-options"
          className="mt-2 inline-flex min-h-6 items-center gap-1 text-[0.875rem] leading-5 font-semibold text-[#0c504e] underline underline-offset-2 hover:no-underline"
        >
          {t('orderOtherChannels')}
          <ArrowDown aria-hidden className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>
    </section>
  );
}

/**
 * The page's title: "Place an order" when a tea's "Order" brought the visitor here, else "Contact
 * us" (the title the page opens with, so nothing moves).
 */
async function ContactTitle({
  searchParams,
  title,
}: {
  searchParams: PageProps<'/[locale]/contact'>['searchParams'];
  title: string;
}) {
  const [query, tf] = await Promise.all([searchParams, getTranslations('Forms')]);
  const tea = Array.isArray(query.tea) ? query.tea[0] : query.tea;
  return <>{tea ? tf('subjects.newOrder') : title}</>;
}

/**
 * Contact page: an aqua panel (20 px corners) with the heading and the form on the left and a
 * portrait picture taking 40 % on the right; while the panel is 768 px or narrower the form comes
 * first and the picture follows it, edge to edge, so a phone reaches the first field at once. The
 * panel's inner layout follows its own width (container queries). Under it, the two option cards.
 * A tea's "Order" brings the visitor here with that tea named above the form (OrderSummary) and
 * the title "Place an order".
 */
export default async function ContactPage({ searchParams }: PageProps<'/[locale]/contact'>) {
  const t = await getTranslations('Pages');

  return (
    <>
      <section
        aria-labelledby="contact-title"
        className="container-frame pt-7 min-[61.875rem]:pt-10"
      >
        <div className="@container">
          <div className="on-aqua flex flex-col overflow-hidden bg-gold-500 @min-[48.0625rem]:flex-row @min-[48.0625rem]:items-start @min-[48.0625rem]:rounded-[1.25rem]">
            <div className="w-full min-w-0 @min-[48.0625rem]:flex-1">
              <div className="mx-auto px-5 py-7 @min-[35.5rem]:px-9 @min-[35.5rem]:py-10 @min-[77.5rem]:max-w-[44rem]">
                <h1
                  id="contact-title"
                  className="font-heading text-[2.25rem] leading-[1.1] text-balance text-ink-900 @min-[35.5rem]:text-[2.75rem]"
                >
                  <Suspense fallback={t('contactTitle')}>
                    <ContactTitle searchParams={searchParams} title={t('contactTitle')} />
                  </Suspense>
                </h1>
                <div className="mt-6">
                  <Suspense fallback={null}>
                    <OrderSummary searchParams={searchParams} />
                  </Suspense>
                  <ContactForm />
                </div>
              </div>
            </div>
            {/* On a phone the portrait would push the form a screen down: a wide band there. */}
            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden @min-[48.0625rem]:aspect-[544/769] @min-[48.0625rem]:max-w-[40%] @min-[48.0625rem]:rounded-[1.25rem]">
              <Suspense fallback={null}>
                <ContactPicture />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
      <div
        id="contact-options"
        className="container-frame scroll-mt-40 pt-7 pb-[2.625rem] min-[61.875rem]:pt-10 min-[61.875rem]:pb-[3.75rem]"
      >
        <Suspense fallback={<div className="h-[13.5rem]" />}>
          <ContactOptions />
        </Suspense>
      </div>
    </>
  );
}
