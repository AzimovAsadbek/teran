import type { Locale } from '@teran/contracts';
import { Check, Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Image, { type StaticImageData } from 'next/image';
import { getLocale } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type CSSProperties } from 'react';
import { teaTint } from '@/components/brand/tea-stage';
import { Disclosure } from '@/components/content/disclosure';
import { Blocks } from '@/components/content/long-form';
import { BusinessTypeFromLink } from '@/components/forms/business-type-link';
import { WholesaleForm } from '@/components/forms/wholesale-form';
import { BusinessIndex } from '@/components/home/business-index';
import { businessCases } from '@/components/home/business-section';
import { JsonLd } from '@/components/seo/json-ld';
import { SocialIcon } from '@/components/social/social-icon';
import { BRAND, PACK_COLOURS, teaHref, type TeaCode } from '@/content/brand';
import { wholesalePage } from '@/content/pages/wholesale';
import { Link } from '@/i18n/navigation';
import { emailLinks, phoneLinks, socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
import { faqSchema, pageMetadata } from '@/lib/seo';
import pack8009 from '../../../../../public/brand/packs/8009.webp';
import pack8800 from '../../../../../public/brand/packs/8800.webp';
import pack8830 from '../../../../../public/brand/packs/8830.webp';
import packG8810 from '../../../../../public/brand/packs/g8810.webp';
import packXc2025 from '../../../../../public/brand/packs/xc2025.webp';
import { ClientMessages } from '@/i18n/client-messages';

/** The five pouches, in the order of the collection. */
const PACKS: { code: TeaCode; image: StaticImageData }[] = [
  { code: 'XC2025', image: packXc2025 },
  { code: 'G8810', image: packG8810 },
  { code: '8800', image: pack8800 },
  { code: '8830', image: pack8830 },
  { code: '8009', image: pack8009 },
];

/** How the pouches stand in the opening: turned, raised and sized, XC2025 in front. */
const STAND = [
  { turn: -8, drop: 9, size: 0.8, z: 1 },
  { turn: -4, drop: 3, size: 0.9, z: 2 },
  { turn: 0, drop: 0, size: 1, z: 3 },
  { turn: 4, drop: 3, size: 0.9, z: 2 },
  { turn: 8, drop: 9, size: 0.8, z: 1 },
];
const STAND_ORDER: TeaCode[] = ['G8810', '8830', 'XC2025', '8800', '8009'];

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

/** The first phone from Admin → Settings, beside the opening's one button. */
async function OpeningPhone() {
  await connection();
  const locale = await getLocale();
  const phone = phoneLinks((await getPublicSettings(locale).catch(() => null))?.contact)[0];
  if (!phone) return null;
  return (
    <a
      href={phone.href}
      className="inline-flex min-h-11 items-center gap-2 text-[1rem] font-semibold underline decoration-ivory-50/35 underline-offset-[6px] hover:decoration-ivory-50 focus-visible:outline-sun"
    >
      <Phone aria-hidden className="h-4 w-4 text-sun" />
      {phone.label}
    </a>
  );
}

/** The kinds of business, each opening the form below with its kind chosen (as the home's). */
async function KindsOfBusiness({ title }: { title: string }) {
  await connection();
  const locale = (await getLocale()) as Locale;
  const settings = await getPublicSettings(locale).catch(() => null);
  const cases = await businessCases(settings, locale);
  return <BusinessIndex title={title} cases={cases} headingLevel="h2" />;
}

/** Phone, Telegram, WhatsApp and e-mail: dealers usually call or write first. */
async function DirectContact({ title }: { title: string }) {
  await connection();
  const locale = await getLocale();
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const phones = phoneLinks(contact);
  const socials = socialLinks(contact);
  const emails = emailLinks(contact);
  if (phones.length + socials.length + emails.length === 0) return null;
  const button =
    'inline-flex min-h-11 items-center gap-2.5 rounded-full bg-surface px-5 text-[1rem] font-semibold text-fg shadow-xs ring-1 ring-line transition-shadow duration-200 hover:shadow-[0_2px_10px_rgb(0_0_0_/_14%)]';
  return (
    <div className="mt-10">
      <h3 className="font-headline text-[0.9375rem] tracking-[0.12em] text-forest-900 uppercase">
        {title}
      </h3>
      <ul className="mt-4 flex flex-wrap gap-3">
        {phones.map((phone) => (
          <li key={phone.href}>
            <a href={phone.href} className={button}>
              <Phone aria-hidden className="h-5 w-5 text-forest-900" />
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
              <Mail aria-hidden className="h-5 w-5 text-forest-900" />
              {email.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * For business: the long form of the home page's "TERAN for business" (ADR-050/051), one path to
 * the request. On deep teal, the opening — the title, what TERAN offers, one button to the form
 * and the phone — beside the five pouches standing as on the first view, then the kinds of
 * business, each opening the form with its kind chosen. On white, the five teas (each to its page)
 * as the proof; on pale grey the four steps from request to supply, a stream running down them on
 * phones; then the dealer offer, the questions and the direct lines beside the form. Every word is
 * the page's own (content/pages/wholesale.ts): no terms, volumes, clients or figures. Nothing
 * moves near the form.
 */
export default async function WholesalePage() {
  const locale = (await rootParams.locale()) as Locale;
  const page = wholesalePage[locale];
  const landing = page.landing;
  const packByCode = new Map(PACKS.map((pack) => [pack.code, pack]));

  // The questions answered on the page, with the text of their answers.
  const structuredData = faqSchema(
    page.faq.items.map((item) => ({
      question: item.question,
      answer: item.answer.filter((block) => typeof block === 'string').join(' '),
    })),
  );

  return (
    <>
      <section aria-labelledby="wholesale-title" className="on-dark bg-teal-ink text-ivory-50">
        <div className="container-page grid grid-cols-1 items-center gap-x-12 gap-y-10 pt-12 pb-6 min-[46.875rem]:pt-16 lg:grid-cols-12 lg:pt-20 lg:pb-10">
          <div className="lg:col-span-7">
            <h1
              id="wholesale-title"
              className="font-heading text-[clamp(2.75rem,1.9rem+3.6vw,5rem)] leading-[1.02] text-balance"
            >
              {page.title}
            </h1>
            <p className="mt-5 max-w-[36rem] text-[1.125rem] leading-relaxed text-pretty text-ivory-50/85 sm:text-[1.25rem]">
              {page.intro}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href="#request"
                className="pill-hover inline-flex h-12 items-center rounded-full bg-sun px-7 text-[1rem] font-semibold text-ink-900 focus-visible:outline-sun"
              >
                {page.formTitle}
              </a>
              <Suspense fallback={null}>
                <OpeningPhone />
              </Suspense>
            </div>
            <p className="mt-6 text-[1rem] text-ivory-50/80">
              {landing.partnerQuestion}{' '}
              <Link
                href="/contact"
                className="font-semibold text-ivory-50 underline decoration-ivory-50/35 underline-offset-[6px] hover:decoration-ivory-50 focus-visible:outline-sun"
              >
                {landing.partnerCta}
              </Link>
            </p>
          </div>
          {/* The five pouches standing together, XC2025 in front, the others risen onto the shelf
              one after another beside it: the front pack is the page's largest picture and stands
              from the first frame (styles/globals.css, Arrivals). */}
          <div aria-hidden className="flex items-end justify-center lg:col-span-5">
            {STAND_ORDER.map((code, index) => {
              const pack = packByCode.get(code)!;
              const stand = STAND[index]!;
              return (
                <span
                  key={code}
                  className="relative -mx-[3.5%] block w-[24%] max-w-[12.5rem]"
                  style={{ zIndex: stand.z }}
                >
                  <span
                    className={index === 2 ? 'block' : 'arrive-pack block'}
                    style={
                      {
                        '--i': Math.abs(index - 2),
                        rotate: `${stand.turn}deg`,
                        translate: `0 ${stand.drop}%`,
                        scale: stand.size,
                      } as CSSProperties
                    }
                  >
                    <Image
                      src={pack.image}
                      alt=""
                      priority={index === 2}
                      sizes="(min-width: 1024px) 12.5rem, 24vw"
                      className="h-auto w-full drop-shadow-[0_22px_22px_rgb(0_0_0_/_0.35)]"
                    />
                  </span>
                </span>
              );
            })}
          </div>
        </div>
        <div className="container-page pt-6 pb-16 lg:pt-10 lg:pb-24">
          <Suspense fallback={<div className="h-[28rem]" aria-hidden />}>
            <KindsOfBusiness title={page.segmentsTitle} />
          </Suspense>
        </div>
      </section>

      {/* The proof: TERAN's five teas, each to its page (its name is the link's name). */}
      <section aria-labelledby="collection-title" className="container-page py-16 lg:py-24">
        <div className="grid grid-cols-1 items-end gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2
              id="collection-title"
              className="font-heading text-[2.25rem] leading-[1.05] text-balance text-fg sm:text-[3rem]"
            >
              {page.products.title}
            </h2>
            <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed text-pretty text-fg-muted">
              {page.products.text}
            </p>
            {page.dealer.points[0] ? (
              <p className="mt-5 flex max-w-[34rem] gap-2.5 text-[1rem] leading-relaxed text-pretty text-fg">
                <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-forest-900" />
                {page.dealer.points[0]}
              </p>
            ) : null}
          </div>
          <ul className="grid grid-cols-5 gap-2 min-[46.875rem]:gap-4 lg:col-span-7">
            {PACKS.map((pack) => (
              <li key={pack.code}>
                <Link
                  href={teaHref(pack.code)}
                  className="group/card flex flex-col items-center gap-3 focus-visible:outline-offset-4"
                >
                  <span
                    className="relative block aspect-[3/4] w-full overflow-hidden rounded-[1rem]"
                    style={{ backgroundColor: teaTint(PACK_COLOURS[pack.code]) }}
                  >
                    <Image
                      src={pack.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 9rem, 18vw"
                      className="object-contain p-[12%] drop-shadow-[0_12px_12px_rgb(0_0_0_/_0.18)]"
                    />
                    <span aria-hidden className="card-sheen pointer-events-none absolute inset-0" />
                  </span>
                  <span className="flex w-full flex-col items-center gap-1.5">
                    <span
                      aria-hidden
                      className="h-[3px] w-8 rounded-full"
                      style={{ backgroundColor: PACK_COLOURS[pack.code] }}
                    />
                    <span
                      className="font-headline text-[0.875rem] tracking-[0.02em] group-hover/card:underline group-hover/card:underline-offset-4 min-[46.875rem]:text-[1.125rem]"
                      style={{ color: PACK_COLOURS[pack.code] }}
                    >
                      <span className="sr-only">{BRAND.name} </span>
                      {pack.code}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works: from the request to regular supply. */}
      <section aria-labelledby="process-title" className="bg-ivory-100">
        <div className="container-page py-16 lg:py-24">
          <h2
            id="process-title"
            className="font-heading text-[2.25rem] leading-[1.05] text-fg sm:text-[3rem]"
          >
            {page.processTitle}
          </h2>
          <ol className="story-steps relative mt-10 grid grid-cols-1 gap-y-9 pl-12 lg:mt-14 lg:grid-cols-4 lg:gap-x-10 lg:pl-0">
            {/* The stream down the steps on phones, as far as the reader has come. */}
            <span
              aria-hidden
              className="story-stream pointer-events-none absolute top-3 bottom-3 left-[0.9rem] w-0.5 rounded-full bg-forest-900/45 lg:hidden"
            />
            {page.steps.map((step, index) => (
              <li key={step.title} className="relative">
                <span
                  aria-hidden
                  className="absolute top-0 -left-12 flex size-[1.875rem] items-center justify-center rounded-full bg-ivory-100 font-headline text-[0.9375rem] text-teal-ink ring-2 ring-forest-900/45 lg:static lg:block lg:size-auto lg:bg-transparent lg:text-[3.5rem] lg:leading-none lg:text-forest-900 lg:ring-0"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="font-headline text-[1.25rem] leading-tight text-fg uppercase lg:mt-5">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[22rem] text-[1rem] leading-relaxed text-pretty text-fg-muted">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The request: the dealer offer and the questions beside the form; nothing moves here. */}
      <section aria-labelledby="dealer-title" className="container-page py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2
              id="dealer-title"
              className="font-heading text-[2.25rem] leading-[1.05] text-balance text-fg sm:text-[2.75rem]"
            >
              {page.dealer.title}
            </h2>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-pretty text-fg-muted">
              {page.dealer.text}
            </p>
            {page.dealer.points.length > 1 ? (
              <ul className="mt-6 space-y-3">
                {page.dealer.points.slice(1).map((point) => (
                  <li key={point} className="flex gap-2.5 text-[1rem] leading-relaxed text-fg">
                    <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-forest-900" />
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <section
            id="request"
            aria-labelledby="request-title"
            className="scroll-mt-28 rounded-[1.5rem] bg-surface p-6 shadow-soft ring-1 ring-line sm:p-10 lg:col-span-7 lg:row-span-2"
          >
            <h2
              id="request-title"
              className="font-heading text-[2rem] leading-tight text-fg sm:text-[2.5rem]"
            >
              {page.formTitle}
            </h2>
            <p className="mt-2 text-[1rem] leading-relaxed text-fg-muted">{page.formIntro}</p>
            <div className="mt-8">
              <Suspense fallback={null}>
                <BusinessTypeFromLink />
              </Suspense>
              <ClientMessages
                pick={['Forms', 'Validation', 'Wholesale', 'Checkout.regionPlaceholder']}
              >
                <WholesaleForm />
              </ClientMessages>
            </div>
          </section>
          <div className="lg:col-span-5">
            <h3
              id="business-faq-title"
              className="font-headline text-[0.9375rem] tracking-[0.12em] text-forest-900 uppercase"
            >
              {page.faq.heading}
            </h3>
            <div className="mt-3 border-t border-line">
              {page.faq.items.map((item) => (
                <Disclosure key={item.question} question={item.question}>
                  <Blocks blocks={item.answer} />
                </Disclosure>
              ))}
            </div>
            <Suspense fallback={null}>
              <DirectContact title={page.dealer.contactTitle} />
            </Suspense>
          </div>
        </div>
      </section>
      <JsonLd data={structuredData} />
    </>
  );
}
