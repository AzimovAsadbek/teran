import type { BrewingDto, Locale, ProductSummaryDto } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Image, { type StaticImageData } from 'next/image';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type CSSProperties } from 'react';
import { BrewingGauge } from '@/components/brand/brewing-gauge';
import { PACK_IMAGES } from '@/components/brand/pack-images';
import { FiveTeas } from '@/components/brand/five-teas';
import { ProductCard } from '@/components/catalog/product-card';
import { FurtherLinks } from '@/components/content/further-links';
import { Link } from '@/i18n/navigation';
import { brewingMeasures } from '@/lib/brewing';
import { cn } from '@/lib/cn';
import { getCategories, getProductList } from '@/lib/data/catalog';
import { pageMetadata } from '@/lib/seo';
import blackLeaves from '../../../../../public/brand/leaves/black.webp';
import greenLeaves from '../../../../../public/brand/leaves/green.webp';
import oolongLeaves from '../../../../../public/brand/leaves/oolong.webp';
import puerhLeaves from '../../../../../public/brand/leaves/puerh.webp';
import whiteLeaves from '../../../../../public/brand/leaves/white.webp';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Tea101' });
  return pageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    href: '/tea-101',
    locale,
  });
}

/** A kind's brewing as its text states it, for the gauge (no amount: the kinds' texts give none). */
function stated(temperature: [number, number], time: [number, number] | null): BrewingDto {
  return {
    temperatureCelsius: temperature[0],
    temperatureMaxCelsius: temperature[1] !== temperature[0] ? temperature[1] : null,
    timeMinSeconds: time ? time[0] : null,
    timeMaxSeconds: time ? time[1] : null,
    amountGrams: null,
    amountMaxGrams: null,
  };
}

type KindKey = 'white' | 'green' | 'oolong' | 'black' | 'puerh';

/**
 * The kinds TERAN deals in, from the least processed to the most, each with the category it is
 * sold from, its dry leaves (the owner's photographs), the colour of its cup (art direction, not a
 * claim: pale straw to deep ruby, deepening as the leaf is more oxidised), which tints its band,
 * and the brewing its text states (messages: Tea101.types.*.text; pu-erh's gives no figures).
 */
const KINDS: {
  key: KindKey;
  slug: string;
  leaves: StaticImageData;
  cup: string;
  brewing: BrewingDto | null;
}[] = [
  {
    key: 'white',
    slug: 'white-tea',
    leaves: whiteLeaves,
    cup: '#d6bf7c',
    brewing: stated([80, 85], null),
  },
  {
    key: 'green',
    slug: 'green-tea',
    leaves: greenLeaves,
    cup: '#b4aa3c',
    brewing: stated([75, 90], [120, 180]),
  },
  {
    key: 'oolong',
    slug: 'oolong-tea',
    leaves: oolongLeaves,
    cup: '#c9862c',
    brewing: stated([90, 95], null),
  },
  {
    key: 'black',
    slug: 'black-tea',
    leaves: blackLeaves,
    cup: '#a8441f',
    brewing: stated([90, 100], [180, 300]),
  },
  { key: 'puerh', slug: 'puerh-tea', leaves: puerhLeaves, cup: '#6b2a1c', brewing: null },
];

/** A kind's band: its cup's colour, faint, on warm paper. */
const tintOf = (cup: string) => `color-mix(in oklab, ${cup} 16%, var(--color-paper))`;
/** Its cup's colour deepened, for the gauge's drawings on that band (3:1 and more against it). */
const inkOf = (cup: string) => `color-mix(in oklab, ${cup} 62%, black)`;

/** The three steps and the measure each is about, as TERAN's teas give them (Tea101.steps). */
const STEPS = [
  { key: 'measure', measure: 'amount' },
  { key: 'water', measure: 'temperature' },
  { key: 'steep', measure: 'time' },
] as const;
const STEP_BREWING: BrewingDto = {
  amountGrams: '3',
  amountMaxGrams: '5',
  temperatureCelsius: 80,
  temperatureMaxCelsius: 90,
  timeMinSeconds: 120,
  timeMaxSeconds: 180,
};

/** "One pack makes about 80–130 cups" (Tea101.amountText), as cups. */
const CUPS = { least: 80, most: 130 };

/**
 * Tea 101 as the brewing page (ADR-051): the kinds' dry leaves as the way in, from white tea to
 * pu-erh; a band a kind whose colour deepens from the one before as it comes into view, the
 * brewing its text states drawn on the gauge, and its teas where TERAN stocks it (for green tea,
 * TERAN's five on one ruler); how much a pack makes, as cups; the three steps, each with its
 * measure. Only the copy's own facts and the products' own brewing.
 */
export default async function TeaBasicsPage() {
  const [t, tb, tn] = await Promise.all([
    getTranslations('Tea101'),
    getTranslations('Brewing'),
    getTranslations('Nav'),
  ]);
  const stepMeasures = brewingMeasures(STEP_BREWING, tb);

  return (
    <>
      <header className="container-page pt-10 pb-12 sm:pt-14 lg:pt-16 lg:pb-16">
        <div className="grid grid-cols-1 gap-x-14 gap-y-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h1 className="font-heading text-[clamp(3.25rem,2rem+4.5vw,5.5rem)] leading-[0.98] text-fg">
              {t('title')}
            </h1>
            <p className="mt-5 max-w-[36rem] text-[1.125rem] leading-relaxed text-pretty text-fg-muted sm:text-[1.25rem]">
              {t('tagline')}
            </p>
          </div>
          <div className="lg:col-span-5">
            <h2
              id="what-is-tea"
              className="font-heading text-[1.5rem] leading-tight text-fg sm:text-[1.75rem]"
            >
              {t('whatTitle')}
            </h2>
            <p className="mt-3 max-w-[34rem] text-[1.0625rem] leading-relaxed text-pretty text-fg-muted">
              {t('whatText')}
            </p>
          </div>
        </div>
        {/* The five kinds as their dry leaves, the least processed first: a way to each. */}
        <nav aria-label={t('kinds')} className="mt-10 lg:mt-14">
          <ol className="grid grid-cols-5 gap-2 sm:gap-6">
            {KINDS.map((kind) => (
              <li key={kind.key}>
                <a
                  href={`#tea-${kind.key}`}
                  className="group flex flex-col items-center gap-3 rounded-2xl text-center"
                >
                  <span
                    className="block aspect-square w-full max-w-[9rem] overflow-hidden rounded-full ring-1 ring-line transition-[box-shadow] duration-300 group-hover:ring-4"
                    style={{ '--tw-ring-color': inkOf(kind.cup) } as CSSProperties}
                  >
                    <Image
                      src={kind.leaves}
                      alt=""
                      priority
                      sizes="(min-width: 1024px) 9rem, 18vw"
                      className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:rotate-12"
                    />
                  </span>
                  <span className="text-[0.8125rem] leading-tight font-semibold text-balance text-fg sm:text-[1rem]">
                    {t(`types.${kind.key}.title`)}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      {KINDS.map((kind, index) => {
        const measures = brewingMeasures(kind.brewing, tb);
        const before = KINDS[index - 1];
        return (
          <section
            key={kind.key}
            id={`tea-${kind.key}`}
            aria-labelledby={`tea-${kind.key}-title`}
            className="kind-deepen py-14 lg:py-20"
            style={
              {
                '--tint': tintOf(kind.cup),
                '--tint-from': before ? tintOf(before.cup) : 'var(--color-canvas)',
              } as CSSProperties
            }
          >
            <div className="container-page grid grid-cols-1 gap-x-14 gap-y-6 lg:grid-cols-12">
              <div className="flex items-center gap-5 lg:col-span-4 lg:flex-col lg:items-start lg:gap-6">
                <Image
                  src={kind.leaves}
                  alt=""
                  sizes="(min-width: 1024px) 11rem, 6rem"
                  className="scroll-unfurl size-24 shrink-0 rounded-full object-cover ring-4 ring-ivory-50 lg:size-44"
                />
                <h2
                  id={`tea-${kind.key}-title`}
                  className="font-heading text-[2.25rem] leading-[1.05] text-balance text-fg sm:text-[2.75rem]"
                >
                  {t(`types.${kind.key}.title`)}
                </h2>
              </div>
              <div className="lg:col-span-8 lg:pt-2">
                <p className="max-w-[65ch] text-[1.0625rem] leading-relaxed text-pretty text-fg">
                  {t(`types.${kind.key}.text`)}
                </p>
                <BrewingGauge
                  measures={measures}
                  colour={inkOf(kind.cup)}
                  className="mt-6 max-w-[36rem] border-t border-ink-900/15 pt-5"
                />
              </div>
              <div className="lg:col-span-12">
                <Suspense fallback={null}>
                  <KindProducts
                    kind={kind.key}
                    slug={kind.slug}
                    shop={t(`types.${kind.key}.shop`)}
                  />
                </Suspense>
              </div>
            </div>
          </section>
        );
      })}

      {/* How much a pack makes: the pouch, and its 80–130 cups (full, then the range's empty ones). */}
      <section aria-labelledby="tea-amount" className="bg-paper">
        <div className="container-page grid grid-cols-1 gap-x-14 gap-y-10 py-16 lg:grid-cols-12 lg:items-center lg:py-24">
          <div className="lg:col-span-6">
            <h2
              id="tea-amount"
              className="font-heading text-[2.25rem] leading-[1.05] text-balance text-fg sm:text-[2.75rem]"
            >
              {t('amountTitle')}
            </h2>
            <div className="mt-5 max-w-[34rem] space-y-4 text-[1.0625rem] leading-relaxed text-pretty">
              <p className="text-fg">{t('amountText')}</p>
              <p className="text-fg-muted">{t('amountKeep')}</p>
            </div>
          </div>
          <div aria-hidden className="flex items-end gap-6 sm:gap-10 lg:col-span-6">
            <Image
              src={PACK_IMAGES.XC2025}
              alt=""
              sizes="(min-width: 1024px) 10rem, 28vw"
              className="h-auto w-[28%] max-w-[10rem] shrink-0 drop-shadow-[0_18px_18px_rgb(32_24_8_/_0.25)]"
            />
            <span className="cups-pour flex flex-1 flex-wrap-reverse content-start gap-1.5 sm:gap-2">
              {Array.from({ length: CUPS.most }, (_, cup) => (
                <span
                  key={cup}
                  className={cn(
                    'aspect-square w-[calc((100%-9*0.375rem)/10)] rounded-full sm:w-[calc((100%-12*0.5rem)/13)]',
                    cup < CUPS.least
                      ? 'bg-[radial-gradient(circle,#908943_56%,transparent_60%)] ring-1 ring-ink-900/25'
                      : 'ring-1 ring-ink-900/25',
                  )}
                />
              ))}
            </span>
          </div>
        </div>
      </section>

      {/* Brewing: the three steps, each with its measure as TERAN's teas give it. */}
      <section aria-labelledby="tea-brew" className="container-page py-16 lg:py-24">
        <div className="max-w-[40rem]">
          <h2
            id="tea-brew"
            className="font-heading text-[2.25rem] leading-[1.05] text-balance text-fg sm:text-[2.75rem]"
          >
            {t('brewTitle')}
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-pretty text-fg-muted">
            {t('brewText')}
          </p>
        </div>
        <ol className="mt-10 grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-3">
          {STEPS.map((step) => {
            const measure = stepMeasures.find((candidate) => candidate.key === step.measure);
            return (
              <li key={step.key} className="border-t border-line pt-6">
                <h3 className="font-heading text-[1.375rem] leading-tight text-fg sm:text-[1.5rem]">
                  {t(`steps.${step.key}.title`)}
                </h3>
                <p className="mt-2 text-[1rem] leading-relaxed text-pretty text-fg-muted">
                  {t(`steps.${step.key}.text`)}
                </p>
                {measure ? (
                  <BrewingGauge
                    measures={[measure]}
                    colour="var(--color-forest-900)"
                    className="mt-5"
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <FurtherLinks
        label={tn('brandWorld')}
        links={[
          { href: '/journal', label: tn('journal'), text: tn('journalText') },
          { href: '/about', label: tn('about'), text: tn('aboutText') },
        ]}
      />
    </>
  );
}

/**
 * The cards' columns by how many there are (at most four): from 768 px never one alone in a row;
 * on a phone two across, every card the same size.
 */
function cardGrid(count: number) {
  if (count === 1) return 'grid-cols-2 md:grid-cols-1 max-w-[60rem]';
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-2 md:grid-cols-3';
  return 'grid-cols-2 lg:grid-cols-4';
}

/**
 * A kind's teas, only where TERAN stocks it: for green tea, TERAN's five on one ruler; for the
 * others up to four cards (one alone lies down from 768 px). Then the way to the whole category.
 */
async function KindProducts({ kind, slug, shop }: { kind: KindKey; slug: string; shop: string }) {
  await connection();
  const locale = (await getLocale()) as Locale;
  const category = (await getCategories(locale).catch(() => [])).find(
    (candidate) => candidate.slug === slug && candidate.productCount > 0,
  );
  if (!category) return null;
  const href = `/${category.path}`;
  const more = (
    <Link
      href={href}
      className="pill-hover mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-forest-900 px-7 text-[1rem] font-semibold text-ivory-50"
    >
      {shop}
      <ArrowRight aria-hidden className="h-4 w-4" />
    </Link>
  );

  if (kind === 'green') {
    const five = await FiveTeas({ locale, id: 'tea-five', footer: more });
    if (five) return <div className="mt-8">{five}</div>;
  }

  const list = await getProductList(locale, `category=${slug}&pageSize=4&sort=featured`).catch(
    () => null,
  );
  const items: ProductSummaryDto[] = list?.items ?? [];
  return (
    <div className="mt-8">
      {items.length > 0 ? (
        <ul className={cn('grid gap-3 sm:gap-5', cardGrid(items.length))}>
          {items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} layout={items.length === 1 ? 'feature' : 'card'} />
            </li>
          ))}
        </ul>
      ) : null}
      {more}
    </div>
  );
}
