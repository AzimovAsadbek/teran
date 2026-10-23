import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from 'next/image';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type CSSProperties } from 'react';
import { Emblem } from '@/components/brand/logo';
import { ValueIcon } from '@/components/brand/ornaments';
import { PACK_IMAGES } from '@/components/brand/pack-images';
import { FurtherLinks } from '@/components/content/further-links';
import { Blocks } from '@/components/content/long-form';
import { BusinessCloser } from '@/components/home/business-section';
import {
  BRAND_VALUES,
  brandCopy,
  brandValueLabels,
  PACKAGING,
  type TeaCode,
} from '@/content/brand';
import { aboutPage } from '@/content/pages/about';
import { Link } from '@/i18n/navigation';
import { getCategories } from '@/lib/data/catalog';
import { categoryTree } from '@/lib/navigation';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const page = aboutPage[locale];
  return pageMetadata({
    title: page.metaTitle ? { absolute: page.metaTitle } : page.title,
    description: page.description,
    href: '/about',
    locale,
  });
}

/** The five pouches standing together on warm paper, XC2025 in front (the opening's picture). */
const STAND: { code: TeaCode; turn: number; drop: number; size: number; z: number }[] = [
  { code: 'G8810', turn: -8, drop: 9, size: 0.82, z: 1 },
  { code: '8830', turn: -4, drop: 3, size: 0.92, z: 2 },
  { code: 'XC2025', turn: 0, drop: 0, size: 1, z: 3 },
  { code: '8800', turn: 4, drop: 3, size: 0.92, z: 2 },
  { code: '8009', turn: 8, drop: 9, size: 0.82, z: 1 },
];

/**
 * About TERAN as an editorial story (ADR-051), in TERAN's own words (content/brand.ts,
 * content/pages/about.ts) and pictures (its five pouches; no stock photograph stands in for
 * TERAN's own places): the meaning of the name opening the page beside the five pouches, the
 * history at a reading measure, the three principles one after another, what TERAN stands for
 * once (the pack's tagline and four values on deep teal, the colour steeping in as the band
 * comes into view), the range and its kinds, the request for businesses, and the ways on to the
 * journal and Tea 101. Nothing is invented: no figures, stores, press or certificates.
 */
export default async function AboutPage() {
  const locale = (await rootParams.locale()) as Locale;
  const page = aboutPage[locale];
  const copy = brandCopy[locale];
  const values = brandValueLabels[locale];
  const [tn, tp, tpr, tt] = await Promise.all([
    getTranslations('Nav'),
    getTranslations('Pages'),
    getTranslations('Product'),
    getTranslations('Tea101'),
  ]);
  const range = page.sections.find((section) => section.id === 'range');
  const history = page.sections.find((section) => section.id === 'history');

  return (
    <>
      {/* 1. The meaning of the name, beside the five pouches. */}
      <header className="container-page grid grid-cols-1 items-center gap-x-14 gap-y-10 pt-10 pb-14 sm:pt-14 lg:grid-cols-12 lg:pt-16 lg:pb-20">
        <div className="lg:col-span-6">
          <p className="font-headline text-[0.9375rem] tracking-[0.14em] text-forest-900 uppercase">
            {page.title}
          </p>
          <h1 className="mt-4 font-heading text-[clamp(2.75rem,1.8rem+3.6vw,4.75rem)] leading-[1.02] text-balance text-fg">
            {copy.story.heading}
          </h1>
          <div className="mt-6 max-w-[36rem] space-y-4 text-[1.125rem] leading-relaxed text-pretty text-fg-muted sm:text-[1.25rem]">
            {copy.story.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
        <div className="relative lg:col-span-6">
          <div
            aria-hidden
            className="relative isolate flex items-end justify-center overflow-hidden rounded-[2rem] bg-paper px-[4%] pt-[14%] pb-[9%]"
          >
            <span className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_32%_22%,rgb(255_255_255_/_0.8),transparent_70%)]" />
            <span className="absolute inset-x-[10%] bottom-[7%] -z-10 h-[10%] rounded-[50%] bg-ink-900/10 blur-xl" />
            {STAND.map((item, index) => (
              <span
                key={item.code}
                className="relative -mx-[4%] block w-[28%]"
                style={{ zIndex: item.z }}
              >
                <span
                  className="set-down block"
                  style={
                    {
                      '--i': Math.abs(index - 2),
                      rotate: `${item.turn}deg`,
                      translate: `0 ${item.drop}%`,
                      scale: item.size,
                    } as CSSProperties
                  }
                >
                  <Image
                    src={PACK_IMAGES[item.code]}
                    alt=""
                    priority={index === 2}
                    sizes="(min-width: 1024px) 12rem, 28vw"
                    className="h-auto w-full drop-shadow-[0_22px_22px_rgb(32_24_8_/_0.3)]"
                  />
                </span>
              </span>
            ))}
          </div>
          {/* The page's one hand-set mark: the pack's slogan, as a sticker on the frame. */}
          <p
            lang="uz"
            aria-hidden
            className="absolute -top-4 left-[6%] -rotate-6 font-headline text-[1.75rem] leading-[0.9] text-jade-600 text-sticker [--sticker-color:var(--color-ivory-50)] [--sticker-width:2.5px] sm:text-[2.25rem]"
          >
            {PACKAGING.slogan[2]}
          </p>
        </div>
      </header>

      {/* 2. The history, from the facts TERAN supplied, at a reading measure. */}
      {history ? (
        <section aria-labelledby="history-title" className="bg-ivory-100">
          <div className="container-page grid grid-cols-1 gap-x-14 gap-y-6 py-16 lg:grid-cols-12 lg:py-24">
            <h2
              id="history-title"
              className="font-heading text-[2.25rem] leading-[1.05] text-balance text-fg sm:text-[3rem] lg:col-span-4"
            >
              {history.heading}
            </h2>
            <div className="max-w-[38rem] space-y-4 text-[1.0625rem] leading-relaxed text-pretty text-fg lg:col-span-7 lg:col-start-6">
              <Blocks blocks={history.blocks} />
            </div>
          </div>
        </section>
      ) : null}

      {/* 3. The three principles, one after another. */}
      <section aria-labelledby="ideas-title" className="container-page py-16 lg:py-24">
        <h2
          id="ideas-title"
          className="font-heading text-[2.25rem] leading-[1.05] text-balance text-fg sm:text-[3rem]"
        >
          {copy.philosophy.heading}
        </h2>
        <ol className="mt-10 grid grid-cols-1 md:mt-14 md:grid-cols-3 md:gap-x-10">
          {copy.philosophy.principles.map((principle, index) => (
            <li
              key={principle.title}
              className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-5 border-t border-line py-7 sm:grid-cols-[5rem_minmax(0,1fr)] md:block md:pt-8 md:pb-0"
            >
              <span
                aria-hidden
                className="row-span-2 font-headline text-[2.75rem] leading-none text-forest-900 sm:text-[3.5rem] md:block md:text-[4rem]"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="font-heading text-[1.5rem] leading-tight text-fg sm:text-[1.75rem] md:mt-6 lg:text-[2rem]">
                {principle.title}
              </h3>
              {/* The supplied copy continues the title ("Deep taste — rich flavour…"). */}
              <p className="mt-2 max-w-[22rem] text-[1.0625rem] leading-relaxed text-pretty text-fg-muted first-letter:uppercase">
                {principle.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* 4. What TERAN stands for, once: the pack's tagline and its four values on deep teal, the
          colour steeping in from the emblem as the band comes into view. */}
      <section
        aria-labelledby="difference-title"
        className="on-dark relative isolate overflow-clip bg-forest-800 text-ivory-50"
      >
        <span aria-hidden className="scroll-steep absolute inset-0 -z-10 bg-teal-ink" />
        <div className="container-page flex flex-col items-center py-16 text-center lg:py-24">
          <span className="flex size-20 items-center justify-center rounded-full bg-ivory-50 sm:size-24">
            <Emblem className="w-12 sm:w-14" sizes="56px" />
          </span>
          <h2
            id="difference-title"
            className="mt-6 font-headline text-[1rem] tracking-[0.14em] text-ivory-50 uppercase"
          >
            {tpr('differenceTitle')}
          </h2>
          <p
            lang="uz"
            className="mt-4 max-w-[46rem] font-heading text-[2.25rem] leading-[1.08] text-balance sm:text-[3.25rem]"
          >
            {PACKAGING.tagline}
          </p>
          <ul className="mt-12 grid w-full max-w-[52rem] grid-cols-2 gap-y-8 sm:grid-cols-4">
            {BRAND_VALUES.map((value) => (
              <li key={value} className="flex flex-col items-center gap-3">
                <span className="flex rounded-full bg-ivory-50 p-2">
                  <ValueIcon value={value} className="w-14 sm:w-16" />
                </span>
                <span className="font-headline text-[1.125rem] leading-none">{values[value]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 5. The range and its kinds. */}
      {range ? (
        <section aria-labelledby="range-title" className="container-page py-16 lg:py-24">
          <div className="grid grid-cols-1 gap-x-14 gap-y-6 lg:grid-cols-12">
            <h2
              id="range-title"
              className="font-heading text-[2.25rem] leading-[1.05] text-balance text-fg sm:text-[3rem] lg:col-span-5"
            >
              {range.heading}
            </h2>
            <div className="lg:col-span-7">
              <div className="max-w-[38rem] space-y-4 text-[1.0625rem] leading-relaxed text-pretty text-fg-muted">
                <Blocks blocks={range.blocks} />
              </div>
              <Suspense fallback={null}>
                <RangeKinds />
              </Suspense>
              <Link
                href="/collections/teran-premium"
                className="pill-hover mt-8 inline-flex h-12 items-center rounded-full bg-forest-900 px-7 text-[1rem] font-semibold text-ivory-50"
              >
                {tp('shopTeas')}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* 6. For businesses: the request, as at the end of the home page. */}
      <Suspense fallback={null}>
        <BusinessCloser />
      </Suspense>

      {/* 7. Further: the journal and Tea 101 (the profiles are in the footer just below). */}
      <FurtherLinks
        label={tn('brandWorld')}
        links={[
          { href: '/journal', label: tn('journal'), text: tn('journalText') },
          { href: '/tea-101', label: tn('tea101'), text: tt('tagline') },
          { href: '/media', label: tn('media'), text: tn('photosText') },
        ]}
      />
    </>
  );
}

/** The kinds of tea and drinks TERAN stocks, as links (never placed against a pouch). */
async function RangeKinds() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const tree = categoryTree(await getCategories(locale).catch(() => []));
  const kinds = tree
    .flatMap((top) => (top.children.length > 0 ? top.children : [top]))
    .filter((category) => category.productCount > 0)
    .slice(0, 8);
  if (kinds.length === 0) return null;
  return (
    <ul className="mt-6 flex flex-wrap gap-2">
      {kinds.map((category) => (
        <li key={category.path}>
          <Link
            href={`/${category.path}`}
            className="inline-flex h-10 items-center rounded-full border border-line-strong/45 bg-surface px-4 text-body-sm font-medium text-fg transition-colors duration-150 hover:border-brand/60"
          >
            {category.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
