import type { Locale, ProductDetailDto } from '@teran/contracts';
import { ArrowDown, MessageSquare, Phone, Truck } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Breadcrumbs } from '@/components/catalog/breadcrumbs';
import { ProductFilm } from '@/components/catalog/product-film';
import { ProductImage } from '@/components/catalog/product-image';
import {
  OPTION_HEADER,
  OPTION_HEADING,
  OPTION_ICON,
  OPTION_LINK,
  OPTION_SMALL,
  OptionCard,
} from '@/components/content/contact-options';
import { VisualPicture } from '@/components/content/visual-picture';
import { ContactForm } from '@/components/forms/contact-form';
import { OrderLine } from '@/components/forms/order-line';
import { brandCopy, PACK_COLOURS, teaCodeOf } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { emailLinks, phoneLinks, socialLinks } from '@/lib/contact';
import { getProduct } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { packLabel } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';
import { visualFor } from '@/lib/visuals';
import terraces from '../../../../../public/brand/art/terraces.webp';

type SearchParams = PageProps<'/[locale]/contact'>['searchParams'];

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

/** A catalogue address as the "Order" buttons pass it (`?tea=teran-8830`). */
const TEA_SLUG = /^[a-z0-9-]{1,120}$/;

/** The page's two cards: white on the warm paper, as the product cards stand on the catalogue. */
const CARD =
  'rounded-[1.5rem] bg-surface shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_24px_48px_-28px_rgb(0_0_0_/_0.3)] ring-1 ring-black/[0.06]';

/** Under the stuck header (the announcement band and the bar), as the home page's story stage. */
const ASIDE_STICKY = '@min-[48.0625rem]/desk:sticky @min-[48.0625rem]/desk:top-[10.5rem]';

/**
 * The tea a visitor came to order: a tea's "Order" passes it (`/contact?tea=<slug>`). Null for a
 * missing or unknown tea, which leaves the page the contact page.
 */
async function orderedTea(searchParams: SearchParams): Promise<ProductDetailDto | null> {
  const query = await searchParams;
  const slug = typeof query.tea === 'string' && TEA_SLUG.test(query.tea) ? query.tea : null;
  if (!slug) return null;
  const locale = (await getLocale()) as Locale;
  return getProduct(locale, slug).catch(() => null);
}

/** "TERAN 8830 · 400 g": the tea and its pack, as the order line and the cards name them. */
async function teaAndPack(product: ProductDetailDto): Promise<{ pack: string | null }> {
  const [locale, tp] = await Promise.all([getLocale(), getTranslations('Product')]);
  const variant = product.defaultVariant ?? product.variants[0] ?? null;
  const pack = variant
    ? packLabel(variant, product.format, locale as Locale, (key, values) =>
        tp(`units.${key}`, values),
      )
    : null;
  return { pack };
}

/** The colour a tea's name is set in: its pack's (TERAN's five), else the page's ink. */
function nameColour(product: ProductDetailDto): string | undefined {
  const code = teaCodeOf(product.slug);
  return code ? PACK_COLOURS[code] : undefined;
}

/** Home / the tea / "Place an order", or Home / "Contact us". */
async function ContactCrumbs({ searchParams }: { searchParams: SearchParams }) {
  const locale = (await getLocale()) as Locale;
  const [t, tf, tea] = await Promise.all([
    getTranslations('Pages'),
    getTranslations('Forms'),
    orderedTea(searchParams),
  ]);
  const items = tea
    ? [{ label: tea.name, href: `/products/${tea.slug}` }, { label: tf('subjects.newOrder') }]
    : [{ label: t('contactTitle') }];
  return <Breadcrumbs items={items} locale={locale} />;
}

/**
 * The page's title: "Place an order" when a tea's "Order" brought the visitor here, else "Contact
 * us" (the title the page opens with, so nothing moves).
 */
async function ContactTitle({ searchParams }: { searchParams: SearchParams }) {
  const [tea, t, tf] = await Promise.all([
    orderedTea(searchParams),
    getTranslations('Pages'),
    getTranslations('Forms'),
  ]);
  return <>{tea ? tf('subjects.newOrder') : t('contactTitle')}</>;
}

const INTRO = 'mt-3 max-w-[34rem] text-[1.0625rem] leading-relaxed text-fg-muted';

/** What happens with an order (TERAN gets in touch to confirm it), or what to write about. */
async function ContactIntro({ searchParams }: { searchParams: SearchParams }) {
  const [tea, t] = await Promise.all([orderedTea(searchParams), getTranslations('Pages')]);
  return <p className={INTRO}>{tea ? t('orderIntro') : t('contactDescription')}</p>;
}

/**
 * The tea being ordered, at the top of the form while the form is the only column (phones and
 * narrow windows): its first picture, its name in its pack's colour, its pack and a way down to
 * the messengers and phones. Wider, the tea stands beside the form (TeaShowcase) and this is not
 * displayed. It hands the tea to the form (order-line.ts), which then becomes an order; it
 * streams in on its own, so the form is never rendered again.
 */
async function OrderSummary({ searchParams }: { searchParams: SearchParams }) {
  const tea = await orderedTea(searchParams);
  if (!tea) return null;
  const [t, { pack }] = await Promise.all([getTranslations('Pages'), teaAndPack(tea)]);
  return (
    <section
      aria-labelledby="order-summary"
      className="mb-7 flex items-center gap-4 rounded-[1rem] bg-paper p-3 @min-[48.0625rem]/desk:hidden"
    >
      <OrderLine value={[tea.name, pack].filter(Boolean).join(' · ')} />
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[0.75rem] bg-surface">
        <ProductImage image={tea.images[0] ?? null} name={tea.name} sizes="80px" decorative />
      </div>
      <div className="min-w-0">
        <h2
          id="order-summary"
          className="font-headline text-[1.375rem] leading-none text-fg uppercase"
          style={{ color: nameColour(tea) }}
        >
          {tea.name}
        </h2>
        {pack ? <p className="mt-1.5 text-body-sm text-fg-muted">{pack}</p> : null}
        <a
          href="#contact-options"
          className="mt-2 inline-flex min-h-6 items-center gap-1 text-[0.875rem] leading-5 font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
        >
          {t('orderOtherChannels')}
          <ArrowDown aria-hidden className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>
    </section>
  );
}

/**
 * The tea being ordered beside the form, from 769 px: its living first picture (the film, as on
 * its card) with its own dry leaf in a swatch ringed in the pack's colour, its name (back to its
 * page), its kind and pack, what it is, the delivery promise the product page makes and a way
 * down to the messengers and phones. It stays in view while the form is filled in.
 */
async function TeaShowcase({ tea }: { tea: ProductDetailDto }) {
  const [t, tp, { pack }] = await Promise.all([
    getTranslations('Pages'),
    getTranslations('Product'),
    teaAndPack(tea),
  ]);
  const picture = tea.images[0] ?? null;
  const leaf = teaCodeOf(tea.slug) ? (tea.images[1] ?? null) : null;
  const colour = nameColour(tea);
  return (
    <aside
      aria-labelledby="order-tea"
      className={`hidden overflow-hidden @min-[48.0625rem]/desk:block ${ASIDE_STICKY} ${CARD}`}
    >
      <div className="relative aspect-square overflow-hidden bg-surface-muted">
        <ProductImage
          image={picture}
          name={tea.name}
          sizes="(min-width: 90rem) 38rem, 42vw"
          priority
        />
        {picture?.film?.cardSrc ? <ProductFilm film={picture.film} size="card" /> : null}
        {leaf ? (
          <span
            aria-hidden
            className="absolute bottom-4 left-4 block h-20 w-20 overflow-hidden rounded-full border-4 bg-surface shadow-[0_2px_6px_rgb(0_0_0_/_0.22)]"
            style={{ borderColor: colour }}
          >
            <ProductImage image={leaf} name={tea.name} sizes="80px" decorative />
          </span>
        ) : null}
      </div>
      <div className="px-6 pt-6 pb-7 @min-[64rem]/desk:px-8">
        <h2
          id="order-tea"
          className="font-headline text-[2rem] leading-none text-fg uppercase"
          style={{ color: colour }}
        >
          <Link href={`/products/${tea.slug}`} className="underline-offset-4 hover:underline">
            {tea.name}
          </Link>
        </h2>
        <p className="mt-3 text-[0.9375rem] font-semibold text-fg-muted">
          {[tea.category.name, pack].filter(Boolean).join(' · ')}
        </p>
        {tea.shortDescription ? (
          <p className="mt-3 text-body leading-relaxed text-fg">{tea.shortDescription}</p>
        ) : null}
        <div className="mt-6 border-t border-line pt-5">
          <p className="flex gap-3 text-[0.9375rem] leading-snug text-fg">
            <Truck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
            {tp('deliveryTextByContact')}
          </p>
          <a
            href="#contact-options"
            className="mt-3 inline-flex min-h-6 items-center gap-1 text-[0.9375rem] font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
          >
            {t('orderOtherChannels')}
            <ArrowDown aria-hidden className="h-4 w-4 shrink-0" />
          </a>
        </div>
      </div>
    </aside>
  );
}

/**
 * The contact page's picture (Admin → Settings, "Contact page picture"), or TERAN's tea terraces:
 * a portrait beside the form, a wide band under it while the form is the only column.
 */
async function ContactPicture() {
  await connection();
  const locale = await getLocale();
  const visual = visualFor(await getPublicSettings(locale).catch(() => null), 'contact.picture');
  const sizes = '(min-width: 53.0625rem) min(40vw, 36rem), 100vw';
  return (
    <div
      className={`relative aspect-[16/9] overflow-hidden rounded-[1.5rem] bg-surface-muted @min-[48.0625rem]/desk:aspect-[4/5] ${ASIDE_STICKY}`}
    >
      {visual ? (
        <div className="absolute inset-0">
          <VisualPicture visual={visual} sizes={sizes} priority />
        </div>
      ) : (
        <Image
          src={terraces}
          alt=""
          fill
          sizes={sizes}
          quality={60}
          priority
          className="object-cover"
        />
      )}
    </div>
  );
}

/** Beside the form: the tea being ordered, or the contact page's picture. */
async function ContactAside({ searchParams }: { searchParams: SearchParams }) {
  const tea = await orderedTea(searchParams);
  return tea ? <TeaShowcase tea={tea} /> : <ContactPicture />;
}

/**
 * Under the desk, the reference's two cards: writing to TERAN (its messengers and e-mails) and
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

/**
 * Contact page, as a desk on TERAN's warm paper: under the breadcrumbs, a white card with the
 * heading, a line on what follows and the form, and beside it (from 769 px of the desk's width;
 * under it before that) the contact page's picture. A tea's "Order" makes it the order desk
 * (ADR-053): the title "Place an order", the tea itself beside the form as its living picture
 * (TeaShowcase; at the top of the form while the form is the only column) and the form an order
 * of that tea with a count of packs. Under the desk, the two option cards. The page's shell and
 * the form are static; what depends on the address streams in.
 */
export default async function ContactPage({ searchParams }: PageProps<'/[locale]/contact'>) {
  const t = await getTranslations('Pages');

  return (
    <>
      <section aria-labelledby="contact-title" className="bg-paper">
        <div className="container-frame pt-5 pb-8 min-[61.875rem]:pt-7 min-[61.875rem]:pb-14">
          <Suspense fallback={<div className="h-[1.3125rem]" />}>
            <ContactCrumbs searchParams={searchParams} />
          </Suspense>
          <div className="mt-5 @container/desk min-[61.875rem]:mt-7">
            <div className="grid grid-cols-1 gap-6 @min-[48.0625rem]/desk:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] @min-[48.0625rem]/desk:items-start @min-[64rem]/desk:gap-8">
              <div
                className={`@container px-5 py-7 @min-[35.5rem]/desk:px-9 @min-[35.5rem]/desk:py-10 @min-[77.5rem]/desk:px-12 @min-[77.5rem]/desk:py-12 ${CARD}`}
              >
                <h1
                  id="contact-title"
                  className="font-heading text-[2.25rem] leading-[1.1] text-balance text-ink-900 @min-[35.5rem]:text-[2.75rem]"
                >
                  <Suspense fallback={t('contactTitle')}>
                    <ContactTitle searchParams={searchParams} />
                  </Suspense>
                </h1>
                <Suspense fallback={<p className={INTRO}>{t('contactDescription')}</p>}>
                  <ContactIntro searchParams={searchParams} />
                </Suspense>
                <div className="mt-7">
                  <Suspense fallback={null}>
                    <OrderSummary searchParams={searchParams} />
                  </Suspense>
                  <ContactForm />
                </div>
              </div>
              <Suspense
                fallback={
                  <div className="aspect-[16/9] rounded-[1.5rem] bg-surface-muted @min-[48.0625rem]/desk:aspect-[4/5]" />
                }
              >
                <ContactAside searchParams={searchParams} />
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
