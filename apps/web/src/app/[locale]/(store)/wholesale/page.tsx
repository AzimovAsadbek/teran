import type { Locale } from '@teran/contracts';
import { Check, ChevronDown, Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Image, { type StaticImageData } from 'next/image';
import { getLocale } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { ValueMark } from '@/components/brand/ornaments';
import { Blocks } from '@/components/content/long-form';
import { VisualPicture } from '@/components/content/visual-picture';
import { BusinessTypeFromLink } from '@/components/forms/business-type-link';
import { WholesaleForm } from '@/components/forms/wholesale-form';
import { SocialIcon } from '@/components/social/social-icon';
import { BRAND, BRAND_VALUES, brandValueLabels, teaHref, type TeaCode } from '@/content/brand';
import { wholesalePage } from '@/content/pages/wholesale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { emailLinks, phoneLinks, socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
import { jsonLd, pageMetadata } from '@/lib/seo';
import { visualFor } from '@/lib/visuals';
import lake from '../../../../../public/brand/art/lake.webp';
import sprig from '../../../../../public/brand/art/sprig-1.webp';
import terraces from '../../../../../public/brand/art/terraces.webp';
import pack8009 from '../../../../../public/brand/packs/8009.webp';
import pack8800 from '../../../../../public/brand/packs/8800.webp';
import pack8830 from '../../../../../public/brand/packs/8830.webp';
import packG8810 from '../../../../../public/brand/packs/g8810.webp';
import packXc2025 from '../../../../../public/brand/packs/xc2025.webp';

/** The five pouches, in the order of the collection. */
const PACKS: { code: TeaCode; image: StaticImageData }[] = [
  { code: 'XC2025', image: packXc2025 },
  { code: 'G8810', image: packG8810 },
  { code: '8800', image: pack8800 },
  { code: '8830', image: pack8830 },
  { code: '8009', image: pack8009 },
];

/** The reference's wholesale type: 32 px condensed headings, 24 px card titles, teal pills. */
const H2 =
  'font-headline text-center text-[2rem] leading-8 text-[#121212] [--heading-case:none] [--headline-weight:800]';
const H3 =
  'font-headline text-center text-[1.5rem] leading-6 text-[#121212] [--heading-case:none] [--headline-weight:800]';
const TEAL_HEADING =
  'font-headline text-[2rem] leading-[2.4rem] text-[#107e84] uppercase [--headline-weight:800]';
const PILL =
  'pill-hover inline-flex h-11 w-fit items-center justify-center rounded-full bg-[#107e84] px-8 pt-[0.5625rem] pb-[0.4375rem] text-[1rem] leading-4 font-semibold text-white';
/** The reference's content width: 1320 px between 60 px margins (16 px on phones). */
const WIDE = 'mx-auto w-full max-w-[90rem] px-4 min-[46.875rem]:px-[3.75rem]';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const page = wholesalePage[locale];
  return pageMetadata({
    title: { absolute: page.metaTitle },
    description: page.description,
    href: '/wholesale',
    locale,
  });
}

/** A picture of the page: the one set in Admin → Settings for `slot`, or TERAN's artwork. */
async function WholesalePicture({
  slot,
  art,
  contain = false,
  sizes,
  priority = false,
  phoneBelow,
  className,
}: {
  slot: string;
  art?: StaticImageData;
  contain?: boolean;
  sizes: string;
  priority?: boolean;
  /** The width under which the picture's phone crop shows (VisualPicture's 750 px by default). */
  phoneBelow?: number;
  className?: string;
}) {
  await connection();
  const locale = await getLocale();
  const visual = visualFor(await getPublicSettings(locale).catch(() => null), slot);
  if (visual) {
    return (
      <div className={cn('absolute inset-0', className)}>
        <VisualPicture visual={visual} sizes={sizes} priority={priority} phoneBelow={phoneBelow} />
      </div>
    );
  }
  if (!art) return null;
  return (
    <Image
      src={art}
      alt=""
      fill
      sizes={sizes}
      quality={60}
      priority={priority}
      className={cn(contain ? 'bg-[#f2f1e9] object-contain p-8' : 'object-cover', className)}
    />
  );
}

/**
 * A frame for a picture of the page (positioned by its caller: `relative` with a size, or
 * `absolute` over a section), filled once the settings are known.
 */
function Frame({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={cn('overflow-hidden', className)}>
      <Suspense fallback={null}>{children}</Suspense>
    </div>
  );
}

/** Phone, Telegram, WhatsApp and e-mail as white pills: dealers usually call or write first. */
async function DirectContact({ title }: { title: string }) {
  await connection();
  const locale = await getLocale();
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const phones = phoneLinks(contact);
  const socials = socialLinks(contact);
  const emails = emailLinks(contact);
  if (phones.length + socials.length + emails.length === 0) return null;
  const button =
    'inline-flex min-h-11 items-center gap-2.5 rounded-full bg-white px-5 text-[1rem] font-semibold text-[#121212] shadow-xs transition-shadow duration-200 hover:shadow-[0_2px_10px_rgb(0_0_0_/_18%)]';
  return (
    <div className="mt-8">
      <h3 className="text-[1.125rem] leading-7 font-semibold text-[#121212]">{title}</h3>
      <ul className="mt-4 flex flex-wrap justify-center gap-3">
        {phones.map((phone) => (
          <li key={phone.href}>
            <a href={phone.href} className={button}>
              <Phone aria-hidden className="h-5 w-5 text-[#107e84]" />
              {phone.label}
            </a>
          </li>
        ))}
        {socials.map((social) => (
          <li key={social.href}>
            <a href={social.href} target="_blank" rel="noopener noreferrer" className={button}>
              <SocialIcon network={social.network} className="h-6 w-6" />
              {social.label}
            </a>
          </li>
        ))}
        {emails.map((email) => (
          <li key={email.href}>
            <a href={email.href} className={button}>
              <Mail aria-hidden className="h-5 w-5 text-[#107e84]" />
              {email.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One of the reference's grey text cards: a teal capital heading over 18 px text. */
function TextCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 rounded-[1.5rem] bg-[#f4f4f4] p-6">
      <h3 className={TEAL_HEADING}>{title}</h3>
      <p className="text-[1.125rem] leading-[1.8rem] font-medium text-[#121212]">{text}</p>
    </div>
  );
}

/** The reference's teal band of names scrolling sideways (its press and certification logos). */
function NameBand({ names, size }: { names: readonly string[]; size: 'large' | 'small' }) {
  const run = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-[3.6rem] pr-[3.6rem]"
    >
      {names.map((name) => (
        <li
          key={name}
          className={cn(
            'font-headline whitespace-nowrap text-white [--headline-weight:700]',
            size === 'large' ? 'text-[3rem] leading-[3rem]' : 'text-[1.75rem] leading-10',
          )}
        >
          {name}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee overflow-hidden rounded-[1.5rem] bg-[#107e84] p-6">
      <div className="marquee-track flex w-max [--marquee-duration:40s]">
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
}

/**
 * For business, on the reference's wholesale page: a teal bar for partners, the hero (TERAN in
 * large teal capitals over the picture), three cards by kind of business, the five teas on grey,
 * "why TERAN" (picture and text, then text and the teal card of the pack's values), the wide
 * flavour band with the teas' names scrolling in teal, how we work, the dealer network with the
 * request form, and the questions.
 */
export default async function WholesalePage() {
  const locale = (await rootParams.locale()) as Locale;
  const page = wholesalePage[locale];
  const landing = page.landing;
  const values = brandValueLabels[locale];
  const cardArt = [{ art: lake }, { art: terraces }, { art: packG8810, contain: true }];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.filter((block) => typeof block === 'string').join(' '),
      },
    })),
  };

  return (
    <>
      {/* The reference's login bar: a question and a white pill on teal. */}
      <div className="bg-[#107e84] px-4 py-5 min-[46.875rem]:px-10">
        <div className="flex flex-col items-center justify-center gap-[0.9rem] text-center min-[46.875rem]:flex-row">
          <p className="text-[1.25rem] leading-5 font-semibold text-white">
            {landing.partnerQuestion}
          </p>
          <Link
            href="/contact"
            className="pill-hover inline-flex h-11 items-center rounded-full bg-white px-8 pt-[0.5425rem] pb-[0.4575rem] text-[1rem] leading-6 font-bold text-[#107e84]"
          >
            {landing.partnerCta}
          </Link>
        </div>
      </div>

      {/* Hero: on phones the words come first and the picture under them. */}
      <section
        aria-labelledby="wholesale-title"
        className="relative flex flex-col overflow-hidden min-[61.875rem]:min-h-[36.5625rem] min-[61.875rem]:justify-center"
      >
        <Frame className="relative order-2 -mt-6 aspect-[2105/1480] w-full min-[61.875rem]:absolute min-[61.875rem]:inset-0 min-[61.875rem]:mt-0 min-[61.875rem]:aspect-auto">
          {/* The frame keeps the phone crop's proportions below 990 px, so that crop shows there. */}
          <WholesalePicture
            slot="wholesale.hero"
            art={packXc2025}
            contain
            sizes="100vw"
            priority
            phoneBelow={990}
            className="min-[61.875rem]:object-right"
          />
        </Frame>
        {/* The words keep to the reference's 1440 px frame, the picture fills the width. */}
        <div className="relative z-10 order-1 mx-auto flex w-full max-w-[95rem] flex-col items-start gap-1 px-4 pt-4 min-[61.875rem]:px-10 min-[61.875rem]:pt-0">
          <h1 id="wholesale-title" className="flex flex-col gap-1 text-[#107e84]">
            <span className="font-headline text-[2rem] leading-[2.4rem] [--heading-case:none] [--headline-weight:800]">
              {landing.heroKicker}
            </span>
            <span className="font-headline text-[3.375rem] leading-[3.375rem] uppercase [--headline-weight:800] min-[61.875rem]:text-[7.5rem] min-[61.875rem]:leading-[7.5rem]">
              {BRAND.name}
            </span>
          </h1>
          <p className="max-w-[40.625rem] pb-[1.875rem] text-[1.25rem] leading-7 font-medium text-[#121212]">
            {page.intro}
          </p>
          <a href="#request" className={PILL}>
            {page.formTitle}
          </a>
        </div>
      </section>

      {/* Three cards by kind of business: a square picture, the title and a pill. */}
      <section
        aria-labelledby="cards-title"
        className={`${WIDE} py-[2.1rem] min-[61.875rem]:py-12`}
      >
        <h2 id="cards-title" className={H2}>
          {landing.cardsTitle}
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-6 min-[46.875rem]:grid-cols-3 min-[61.875rem]:mt-8">
          {landing.cards.map((title, index) => (
            <li key={title} className="flex flex-col items-center gap-4">
              <a href="#request" tabIndex={-1} aria-hidden className="block w-full">
                <Frame className="relative aspect-square w-full rounded-[1rem]">
                  <WholesalePicture
                    slot={`wholesale.card.${index + 1}`}
                    art={cardArt[index]?.art}
                    contain={cardArt[index]?.contain}
                    sizes="(min-width: 46.875rem) 30vw, 100vw"
                  />
                </Frame>
              </a>
              <h3 className={H3}>{title}</h3>
              <a href="#request" className={PILL}>
                {landing.cardCta}
                <span className="sr-only">: {title}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* The five teas on grey. */}
      <section aria-labelledby="collection-title" className="bg-[#f6f6f6]">
        <div className={`${WIDE} py-[2.8rem] min-[61.875rem]:py-16`}>
          <h2 id="collection-title" className={H2}>
            {page.products.title}
          </h2>
          <p className="mx-auto mt-4 max-w-[46rem] text-center text-[1rem] leading-[1.6rem] font-medium text-[#121212]">
            {page.products.text}
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-6 min-[46.875rem]:grid-cols-5 min-[61.875rem]:mt-8">
            {PACKS.map((pack) => (
              <li key={pack.code}>
                {/* Each pack opens its tea's page; its name is the link's name. */}
                <Link href={teaHref(pack.code)} className="group flex flex-col items-center gap-4">
                  <span className="relative block aspect-square w-full overflow-hidden rounded-[1rem] bg-white">
                    <Image
                      src={pack.image}
                      alt=""
                      fill
                      sizes="(min-width: 46.875rem) 18vw, 45vw"
                      className="picture-hover object-contain p-5 drop-shadow-[0_14px_14px_rgb(0_0_0_/_0.18)]"
                    />
                  </span>
                  <h3 className={`${H3} group-hover:underline group-hover:underline-offset-4`}>
                    {BRAND.name} {pack.code}
                  </h3>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why TERAN: a picture beside the first text, then the second text beside the values. */}
      <section aria-labelledby="why-title" className={`${WIDE} pt-[2.1rem] min-[61.875rem]:pt-12`}>
        <h2 id="why-title" className={H2}>
          {landing.whyTitle}
        </h2>
        <div className="mt-[2.1rem] grid grid-cols-1 items-stretch gap-8 min-[61.875rem]:mt-12 min-[61.875rem]:grid-cols-2">
          <Frame className="relative aspect-[575/420] rounded-[1.5rem] min-[61.875rem]:aspect-square">
            <WholesalePicture
              slot="wholesale.why"
              art={sprig}
              sizes="(min-width: 61.875rem) 45vw, 100vw"
            />
          </Frame>
          <TextCard title={landing.why.title} text={landing.why.text} />
        </div>
        <div className="grid grid-cols-1 items-stretch gap-8 py-[2.1rem] min-[61.875rem]:grid-cols-2 min-[61.875rem]:py-12">
          <div className="min-[61.875rem]:order-2">
            {/* The reference's teal certifications card, here the pack's four values. */}
            <div className="flex aspect-[575/419] flex-col items-center justify-center gap-6 rounded-[1.5rem] bg-[#107e84] p-6 text-center text-white">
              <p className="text-[0.875rem] leading-5 font-medium">{landing.valuesKicker}</p>
              <p className="font-headline text-[3.5rem] leading-none [--headline-weight:700]">
                {BRAND.name}
              </p>
              <span aria-hidden className="h-px w-4/5 bg-white/70" />
              <ul className="grid w-full max-w-[28rem] grid-cols-4 gap-2">
                {BRAND_VALUES.map((value) => (
                  <li key={value} className="flex flex-col items-center gap-2">
                    <ValueMark value={value} className="h-12 w-12 text-white" />
                    <span className="text-[0.8125rem] leading-4 font-bold tracking-[0.02em] uppercase">
                      {values[value]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <TextCard title={landing.best.title} text={landing.best.text} />
        </div>
      </section>

      {/* The wide flavour band, its words at the top, then the names scrolling on teal. */}
      <section
        aria-labelledby="flavour-title"
        className="relative h-[25rem] overflow-hidden min-[61.875rem]:h-[36.5625rem]"
      >
        <Frame className="absolute inset-0">
          <WholesalePicture slot="wholesale.flavour" art={lake} sizes="100vw" />
        </Frame>
        {/* The dark words sit on the photograph's light top on wide screens; a phone's crop has
            the dark leaves there, so below 990 px they stand on a light panel. */}
        <div className="relative mx-auto flex max-w-[62.5rem] flex-col items-center gap-3 px-4 pt-[2.1rem] text-center max-[61.875rem]:mx-4 max-[61.875rem]:mt-6 max-[61.875rem]:rounded-[1.25rem] max-[61.875rem]:bg-white/85 max-[61.875rem]:py-5 max-[61.875rem]:backdrop-blur-sm min-[61.875rem]:pt-12">
          <h2 id="flavour-title" className={H2}>
            {landing.flavour.title}
          </h2>
          <p className="text-[1rem] leading-[1.6rem] font-medium text-[#121212]">
            {landing.flavour.text}
          </p>
        </div>
      </section>
      <div className="relative -mt-24 px-4 pb-12 min-[46.875rem]:px-12">
        <NameBand names={PACKS.map((pack) => `${BRAND.name} ${pack.code}`)} size="large" />
      </div>

      {/* How we work: the text beside a picture. */}
      <section
        aria-labelledby="community-title"
        className={`${WIDE} pb-[2.1rem] min-[61.875rem]:pb-12`}
      >
        <h2 id="community-title" className="sr-only">
          {landing.community.title}
        </h2>
        <div className="grid grid-cols-1 items-stretch gap-8 min-[61.875rem]:grid-cols-2">
          <Frame className="relative aspect-[575/420] rounded-[1.5rem] min-[61.875rem]:order-2 min-[61.875rem]:aspect-square">
            <WholesalePicture
              slot="wholesale.community"
              art={terraces}
              sizes="(min-width: 61.875rem) 45vw, 100vw"
            />
          </Frame>
          <TextCard title={landing.community.title} text={landing.community.text} />
        </div>
      </section>

      {/* The dealer network: the large title over its backdrop, the offer and the form. */}
      <section aria-labelledby="dealer-title" className="relative overflow-hidden bg-[#f4f4f4]">
        <Frame className="absolute inset-0">
          <WholesalePicture slot="wholesale.map" sizes="100vw" className="opacity-60" />
        </Frame>
        <div className="relative mx-auto max-w-[56.25rem] px-4 pt-12 pb-24 text-center">
          <h2
            id="dealer-title"
            className="font-headline mx-auto max-w-[31.25rem] text-[2.75rem] leading-[2.75rem] text-[#191919] uppercase [--headline-weight:800] min-[61.875rem]:text-[3.75rem] min-[61.875rem]:leading-[3.75rem]"
          >
            {page.dealer.title}
          </h2>
          <p className="mx-auto mt-6 max-w-[46rem] text-[1.125rem] leading-[1.8rem] font-medium text-[#121212]">
            {page.dealer.text}
          </p>
          <ul className="mt-8 grid gap-4 text-left min-[46.875rem]:grid-cols-3">
            {page.dealer.points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-[1rem] bg-white p-5 text-[1rem] leading-[1.6rem] text-[#121212]"
              >
                <Check aria-hidden className="mt-1 h-5 w-5 shrink-0 text-[#107e84]" />
                {point}
              </li>
            ))}
          </ul>
          <Suspense fallback={null}>
            <DirectContact title={page.dealer.contactTitle} />
          </Suspense>
          <section
            id="request"
            aria-labelledby="request-title"
            className="mt-10 scroll-mt-24 rounded-[1.5rem] bg-white p-6 text-left sm:p-10"
          >
            <h3
              id="request-title"
              className="font-headline text-[2rem] leading-8 text-[#121212] [--heading-case:none] [--headline-weight:800]"
            >
              {page.formTitle}
            </h3>
            <p className="mt-2 text-[1rem] leading-[1.6rem] text-[#121212]/80">{page.formIntro}</p>
            <div className="mt-8">
              <Suspense fallback={null}>
                <BusinessTypeFromLink />
              </Suspense>
              <WholesaleForm />
            </div>
          </section>
        </div>
      </section>
      <div className="relative -mt-11 px-4 min-[46.875rem]:px-12">
        <NameBand names={BRAND_VALUES.map((value) => values[value])} size="small" />
      </div>

      {/* The questions, as the reference's: condensed questions with a caret, over rules. */}
      <section
        aria-labelledby="business-faq-title"
        className="mx-auto max-w-[57.5rem] px-4 pt-[3.75rem] pb-20 min-[46.875rem]:px-0"
      >
        <h2 id="business-faq-title" className={H2}>
          {page.faq.heading}
        </h2>
        <div className="mt-8 border-t border-[#121212]/10">
          {page.faq.items.map((item) => (
            <details key={item.question} className="group border-b border-[#121212]/10">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[0.7rem] [&::-webkit-details-marker]:hidden">
                <span className="font-headline text-[1.5rem] leading-6 text-[#121212] [--heading-case:none] [--headline-weight:600]">
                  {item.question}
                </span>
                <ChevronDown
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-[#121212] transition-transform duration-200 group-open:rotate-180"
                  strokeWidth={2.5}
                />
              </summary>
              <div className="space-y-2 pb-4 text-[1rem] leading-[1.6rem] font-medium text-[#121212]">
                <Blocks blocks={item.answer} />
              </div>
            </details>
          ))}
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    </>
  );
}
