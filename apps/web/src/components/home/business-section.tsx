import type { BusinessType, Locale, PublicSettingsDto } from '@teran/contracts';
import { Check, Phone, Send } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Image, { type StaticImageData } from 'next/image';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { VisualPicture } from '@/components/content/visual-picture';
import { wholesalePage } from '@/content/pages/wholesale';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { phoneLinks, socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
import { visualFor } from '@/lib/visuals';
import pack8009 from '../../../public/brand/packs/8009.webp';
import pack8800 from '../../../public/brand/packs/8800.webp';
import pack8830 from '../../../public/brand/packs/8830.webp';
import packG8810 from '../../../public/brand/packs/g8810.webp';
import packXc2025 from '../../../public/brand/packs/xc2025.webp';
import { BusinessIndex, type BusinessCase } from './business-index';

/**
 * The kinds of business, in the order a visitor scans them, each with the picture of the
 * for-business page that already shows it (Admin → Settings): the tray for hotels, the tasting
 * table for cafés and restaurants, the tins for shops, the open baskets for distributors. Gifts
 * show TERAN's own five pouches.
 */
const CASES: { type: Exclude<BusinessType, 'OTHER'>; slot: string | null }[] = [
  { type: 'HOTEL', slot: 'wholesale.card.2' },
  { type: 'CAFE_RESTAURANT', slot: 'wholesale.community' },
  { type: 'RETAIL', slot: 'wholesale.card.3' },
  { type: 'DISTRIBUTOR', slot: 'wholesale.card.1' },
  { type: 'CORPORATE', slot: null },
];

/** The five pouches in the collection's order. */
const PACKS: { code: string; image: StaticImageData }[] = [
  { code: 'XC2025', image: packXc2025 },
  { code: 'G8810', image: packG8810 },
  { code: '8800', image: pack8800 },
  { code: '8830', image: pack8830 },
  { code: '8009', image: pack8009 },
];

/** The five pouches fanned out on a warm ground: TERAN's packs as a gift. */
function PackFan({ compact = false }: { compact?: boolean }) {
  const packs = compact ? PACKS.slice(0, 3) : PACKS;
  return (
    <span className="absolute inset-0 flex items-end justify-center bg-cream pb-[12%]">
      {packs.map((pack, index) => {
        const offset = index - (packs.length - 1) / 2;
        return (
          <span
            key={pack.code}
            className={cn('relative -mx-[3%] block', compact ? 'w-[42%]' : 'w-[30%]')}
            style={{
              rotate: `${offset * 7}deg`,
              translate: `0 ${Math.abs(offset) * 6}%`,
              zIndex: 10 - Math.abs(offset),
            }}
          >
            <Image
              src={pack.image}
              alt=""
              sizes={compact ? '3rem' : '12rem'}
              className="h-auto w-full drop-shadow-[0_18px_22px_rgb(60_40_10_/_0.28)]"
            />
          </span>
        );
      })}
    </span>
  );
}

/**
 * TERAN for business on the home page, after the range: what TERAN offers businesses and how to
 * ask (the for-business page's own words), an index of the kinds of business TERAN works with
 * (each opening the request form with its kind chosen), then the proof and the process — five
 * teas in one pack size straight from the importer, and the four steps from request to supply.
 * Every word comes from the for-business page (content/pages/wholesale.ts): no terms, volumes,
 * clients or figures are stated, as none are published.
 */
export async function BusinessSection({
  settings = null,
}: {
  settings?: PublicSettingsDto | null;
}) {
  if (settings) return <BusinessView settings={settings} />;
  return (
    <Suspense fallback={<BusinessView settings={null} />}>
      <BusinessWithSettings />
    </Suspense>
  );
}

async function BusinessWithSettings() {
  await connection();
  const locale = (await rootParams.locale()) as Locale;
  return <BusinessView settings={await getPublicSettings(locale).catch(() => null)} />;
}

async function BusinessView({ settings }: { settings: PublicSettingsDto | null }) {
  const locale = (await rootParams.locale()) as Locale;
  const tw = await getTranslations({ locale, namespace: 'Wholesale' });
  const page = wholesalePage[locale];
  const phone = phoneLinks(settings?.contact)[0] ?? null;

  const cases: BusinessCase[] = CASES.map(({ type, slot }) => {
    const visual = slot ? visualFor(settings, slot) : null;
    return {
      type,
      label: tw(`segments.${type}`),
      text: page.segments[type],
      href: `/wholesale?type=${type}#request`,
      picture: visual ? (
        <VisualPicture visual={visual} sizes="(min-width: 1440px) 34rem, 40vw" />
      ) : (
        <PackFan />
      ),
      thumb: visual ? <VisualPicture visual={visual} sizes="6rem" /> : <PackFan compact />,
    };
  });

  return (
    <section aria-labelledby="business-title" className="bg-teal-ink text-ivory-50">
      <div className="container-page py-16 min-[46.875rem]:py-20 lg:py-28">
        <div className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12 lg:items-end">
          <h2
            id="business-title"
            className="font-heading text-[2.5rem] leading-[1.02] text-balance lg:col-span-7 min-[46.875rem]:text-[3.5rem] lg:text-[4.25rem]"
          >
            {page.title}
          </h2>
          <div className="lg:col-span-5">
            <p className="text-[1.0625rem] leading-relaxed text-pretty text-ivory-50/85">
              {page.intro}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/wholesale#request"
                className="pill-hover inline-flex h-12 items-center rounded-full bg-sun px-7 text-[1rem] font-semibold text-ink-900 focus-visible:outline-sun"
              >
                {page.formTitle}
              </Link>
              {phone ? (
                <a
                  href={phone.href}
                  className="inline-flex min-h-11 items-center gap-2 text-[1rem] font-semibold underline decoration-ivory-50/35 underline-offset-[6px] hover:decoration-ivory-50 focus-visible:outline-sun"
                >
                  <Phone aria-hidden className="h-4 w-4 text-sun" />
                  {phone.label}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-12 lg:mt-16">
          <BusinessIndex title={page.segmentsTitle} cases={cases} />
        </div>

        {/* The proof and the process: five teas in one pack size straight from the importer (facts
            TERAN supplied), and what happens after a request (the for-business page's steps). */}
        <div className="mt-12 grid grid-cols-1 gap-4 lg:mt-16 lg:grid-cols-12 lg:gap-6">
          <div className="flex flex-col gap-5 rounded-[1.5rem] bg-ivory-50/[0.07] p-6 lg:col-span-5 lg:p-8">
            <span aria-hidden className="flex items-end">
              {PACKS.map((pack, index) => (
                <Image
                  key={pack.code}
                  src={pack.image}
                  alt=""
                  sizes="3.5rem"
                  className={cn('h-auto w-12 min-[46.875rem]:w-14', index > 0 && '-ml-3')}
                />
              ))}
            </span>
            <div>
              <h3 className="font-headline text-[1.375rem] leading-tight text-sun uppercase min-[46.875rem]:text-[1.625rem]">
                {page.products.title}
              </h3>
              <p className="mt-1.5 text-[1rem] leading-relaxed text-pretty text-ivory-50/85">
                {page.products.text}
              </p>
              {page.dealer.points[0] ? (
                <p className="mt-4 flex gap-2.5 text-[1rem] leading-relaxed text-pretty text-ivory-50">
                  <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-sun" />
                  {page.dealer.points[0]}
                </p>
              ) : null}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-ivory-50/15 p-6 lg:col-span-7 lg:p-8">
            <h3 className="font-headline text-[1rem] tracking-[0.12em] text-sun uppercase">
              {page.processTitle}
            </h3>
            <ol className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 min-[46.875rem]:grid-cols-2">
              {page.steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden
                    className="font-headline text-[1.75rem] leading-none text-sun/80 tabular-nums"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="block font-headline text-[1.25rem] leading-tight uppercase">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-[0.9375rem] leading-relaxed text-pretty text-ivory-50/80">
                      {step.text}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The page's last word before the slogan: the request again, for a business visitor who has read
 * to the end — the for-business page's own description, the way to the form and TERAN's phone and
 * Telegram (from Admin → Settings; left out when not set).
 */
export async function BusinessCloser() {
  await connection();
  const locale = (await rootParams.locale()) as Locale;
  const settings = await getPublicSettings(locale).catch(() => null);
  const page = wholesalePage[locale];
  const phone = phoneLinks(settings?.contact)[0] ?? null;
  const telegram = socialLinks(settings?.contact).find((link) => link.network === 'telegram');
  const quiet =
    'inline-flex min-h-11 items-center gap-2 text-[1rem] font-semibold underline decoration-ivory-50/35 underline-offset-[6px] hover:decoration-ivory-50 focus-visible:outline-sun';
  return (
    <section aria-labelledby="business-closer-title" className="bg-teal-ink text-ivory-50">
      <div className="container-page flex flex-col gap-6 py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:py-14">
        <div className="max-w-[44rem]">
          <h2
            id="business-closer-title"
            className="font-heading text-[2rem] leading-tight min-[46.875rem]:text-[2.5rem]"
          >
            {page.formTitle}
          </h2>
          <p className="mt-2 text-[1.0625rem] leading-relaxed text-pretty text-ivory-50/85">
            {page.description}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/wholesale#request"
            className="pill-hover inline-flex h-12 items-center gap-2 rounded-full bg-sun px-7 text-[1rem] font-semibold text-ink-900 focus-visible:outline-sun"
          >
            <Send aria-hidden className="h-4 w-4" />
            {page.steps[0]?.title ?? page.formTitle}
          </Link>
          {phone ? (
            <a href={phone.href} className={quiet}>
              <Phone aria-hidden className="h-4 w-4 text-sun" />
              {phone.label}
            </a>
          ) : null}
          {telegram ? (
            <a href={telegram.href} target="_blank" rel="noopener noreferrer" className={quiet}>
              {telegram.label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
