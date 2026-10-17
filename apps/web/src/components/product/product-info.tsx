import type {
  CheckoutOptionsDto,
  Locale,
  ProductAttributeDto,
  ProductDetailDto,
} from '@teran/contracts';
import { CreditCard, Leaf, Scale, Thermometer, Timer, Truck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { BRAND_VALUES, brandCopy, brandValueLabels } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { showPrices } from '@/lib/site';
import { formatMoney, namesFormat } from '@/lib/format';
import { imageSources } from '@/lib/navigation';
import { ProductTabs, type ProductTab } from './product-tabs';

/** Paragraphs from plain text (never rendered as HTML). */
function Paragraphs({ text }: { text: string }) {
  return (
    <div className="max-w-prose space-y-3">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

function minutes(seconds: number): string {
  return Number.isInteger(seconds / 60) ? String(seconds / 60) : (seconds / 60).toFixed(1);
}

/** An attribute value as text: options, yes/no, a number with its unit, or plain text. */
function attributeValue(
  attribute: ProductAttributeDto,
  t: (key: 'yes' | 'no') => string,
): string | null {
  switch (attribute.kind) {
    case 'SELECT':
    case 'MULTI_SELECT':
      return attribute.options.map((option) => option.label).join(', ') || null;
    case 'BOOLEAN':
      return attribute.boolean === null ? null : t(attribute.boolean ? 'yes' : 'no');
    case 'NUMBER':
      return attribute.number === null
        ? null
        : [attribute.number, attribute.unit].filter(Boolean).join(' ');
    default:
      return attribute.text;
  }
}

/**
 * The reference's tabs under the price, from the product data only: about (description), taste
 * (tasting notes), ingredients and details (format, origin, caffeine, SKU). A tab without content
 * is left out, so a gift set or a future product type shows only what it has; the type's
 * characteristics are always-visible rows under the tabs (AttributeRows).
 */
export async function ProductTabsSection({ product }: { product: ProductDetailDto }) {
  const t = await getTranslations('Product');
  const tc = await getTranslations('Catalog');

  const tabs: ProductTab[] = [];
  // The short description opens the first tab (the reference shows no text under the title).
  const about = [product.shortDescription, product.description].filter(Boolean).join('\n\n');
  if (about) {
    tabs.push({
      id: 'about',
      label: t('description'),
      content: <Paragraphs text={about} />,
    });
  }
  if (product.tastingNotes) {
    tabs.push({
      id: 'taste',
      label: t('tastingNotes'),
      content: <Paragraphs text={product.tastingNotes} />,
    });
  }
  if (product.ingredients) {
    tabs.push({
      id: 'ingredients',
      label: t('ingredients'),
      content: <Paragraphs text={product.ingredients} />,
    });
  }
  tabs.push({
    id: 'details',
    label: t('details'),
    content: (
      <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2.5 text-body-sm">
        {namesFormat(product.format) ? (
          <>
            <dt className="text-fg-subtle">{t('format')}</dt>
            <dd>{tc(`formats.${product.format}`)}</dd>
          </>
        ) : null}
        {product.origin ? (
          <>
            <dt className="text-fg-subtle">{t('origin')}</dt>
            <dd>{product.origin}</dd>
          </>
        ) : null}
        {product.caffeineLevel ? (
          <>
            <dt className="text-fg-subtle">{t('caffeine')}</dt>
            <dd>{t(`caffeineLevels.${product.caffeineLevel}`)}</dd>
          </>
        ) : null}
        <dt className="text-fg-subtle">{t('sku')}</dt>
        <dd className="font-mono text-helper leading-5">
          {product.variants.map((variant) => variant.sku).join(', ')}
        </dd>
      </dl>
    ),
  });
  return <ProductTabs tabs={tabs} label={product.name} />;
}

const CAFFEINE_DOTS = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 } as const;

/** The brewing values of a product, formatted (null when it has none). */
async function brewingFacts(brewing: ProductDetailDto['brewing']) {
  if (!brewing) return [];
  const tb = await getTranslations('Brewing');
  return [
    brewing.amountGrams !== null
      ? {
          key: 'amount',
          icon: Scale,
          label: tb('amount'),
          // A range when the pack gives one ("3–5 g").
          value:
            brewing.amountMaxGrams !== null
              ? tb('gramsRangePerCup', {
                  min: Number(brewing.amountGrams),
                  max: Number(brewing.amountMaxGrams),
                })
              : tb('gramsPerCup', { grams: Number(brewing.amountGrams) }),
        }
      : null,
    brewing.temperatureCelsius !== null
      ? {
          key: 'temperature',
          icon: Thermometer,
          label: tb('temperature'),
          value:
            brewing.temperatureMaxCelsius !== null
              ? tb('celsiusRange', {
                  min: brewing.temperatureCelsius,
                  max: brewing.temperatureMaxCelsius,
                })
              : tb('celsius', { value: brewing.temperatureCelsius }),
        }
      : null,
    brewing.timeMinSeconds !== null
      ? {
          key: 'time',
          icon: Timer,
          label: tb('time'),
          value:
            brewing.timeMaxSeconds !== null && brewing.timeMaxSeconds !== brewing.timeMinSeconds
              ? tb('minutes', {
                  min: minutes(brewing.timeMinSeconds),
                  max: minutes(brewing.timeMaxSeconds),
                })
              : tb('minutesSingle', { min: minutes(brewing.timeMinSeconds) }),
        }
      : null,
  ].filter((fact) => fact !== null);
}

/**
 * The reference's icon rows under the tabs, from TERAN's data: the product type's characteristics
 * (e.g. a honey's flower) and the caffeine level as filled dots. Only what the product has is
 * shown, so a gift set or a future non-tea product has no empty rows; brewing values have their
 * own cards under the product (PreparationSection).
 */
export async function AttributeRows({ product }: { product: ProductDetailDto }) {
  const t = await getTranslations('Product');
  const characteristics = product.attributes
    .map((attribute) => ({ attribute, value: attributeValue(attribute, (key) => t(key)) }))
    .filter((entry): entry is { attribute: ProductAttributeDto; value: string } =>
      Boolean(entry.value),
    );
  const caffeine = product.caffeineLevel;
  if (characteristics.length === 0 && !caffeine) return null;

  // Each row is a dt/dd pair on one line (valid <dl>), the icon in the dt at the row's left.
  const row = (key: string, icon: ReactNode, label: string, value: ReactNode) => (
    <div key={key} className="relative flex min-h-7 items-center gap-1.5 pl-[5.5rem] text-[1rem]">
      {/* The colon is drawn by CSS, so the term itself stays just its name. */}
      <dt className="text-fg-muted after:content-[':']">
        <span aria-hidden className="absolute top-1/2 left-0 flex -translate-y-1/2 text-jade-700">
          {icon}
        </span>
        {label}
      </dt>
      {/* Plain text from the product data, never HTML. */}
      <dd className="whitespace-pre-line text-fg">{value}</dd>
    </div>
  );

  return (
    <section aria-label={t('characteristics')} className="mt-10 border-b border-line pb-8">
      <dl className="space-y-6">
        {characteristics.map(({ attribute, value }) =>
          row(attribute.key, <Leaf className="h-6 w-6" />, attribute.label, value),
        )}
        {caffeine
          ? row(
              'caffeine',
              <span className="flex gap-2">
                {[1, 2, 3].map((dot) => (
                  <span
                    key={dot}
                    className={cn(
                      'h-4 w-4 rounded-full',
                      dot <= CAFFEINE_DOTS[caffeine] ? 'bg-jade-700' : 'bg-jade-200',
                    )}
                  />
                ))}
              </span>,
              t('caffeine'),
              t(`caffeineLevels.${caffeine}`),
            )
          : null}
      </dl>
    </section>
  );
}

/**
 * The reference's "preparation" row under the product: three grey cards, each a line icon and the
 * value in condensed capitals with its name — here the pack's amount, temperature and time.
 */
export async function PreparationSection({ product }: { product: ProductDetailDto }) {
  const tb = await getTranslations('Brewing');
  const facts = await brewingFacts(product.brewing);
  if (facts.length === 0) return null;
  return (
    <section aria-labelledby="preparation" className="mt-12 border-b border-line pb-12">
      <h2
        id="preparation"
        className="font-heading text-[1.5rem] leading-[1.2] text-fg sm:text-[2rem]"
      >
        {tb('method')}
      </h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-8">
        {facts.map(({ key, icon: Icon, label, value }) => (
          <li
            key={key}
            className="flex min-h-[7.5rem] items-center justify-center gap-6 rounded-[1rem] bg-ivory-100 px-6 py-5 sm:min-h-[9.875rem]"
          >
            <Icon
              aria-hidden
              strokeWidth={1.25}
              className="h-12 w-12 shrink-0 text-fg sm:h-14 sm:w-14"
            />
            <p className="flex flex-col">
              <span className="font-headline text-[2.25rem] leading-none text-fg [--headline-weight:500] sm:text-[2.75rem]">
                {value}
              </span>
              <span className="mt-1.5 font-headline text-[1.125rem] leading-none text-fg [--headline-weight:600]">
                {label}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A hand-drawn arrow from a note towards the circle (decorative). */
function NoteArrow({ side, low }: { side: 'left' | 'right'; low: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        'hidden h-14 w-28 text-fg lg:block',
        side === 'left' ? 'ml-auto' : 'mr-auto -scale-x-100',
        low && '-scale-y-100',
      )}
    >
      <path d="M6 44C30 8 78 6 112 30" />
      <path d="M100 18l12 12-16 6" />
    </svg>
  );
}

interface DifferenceNoteData {
  key: string;
  small: string;
  big: string;
}

/** One note beside the circle: a small line over a soft-serif one, and its arrow. */
function DifferenceNote({
  note,
  side,
  low,
}: {
  note: DifferenceNoteData;
  side: 'left' | 'right';
  low: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 text-center',
        side === 'left' ? 'lg:items-end' : 'lg:items-start',
      )}
    >
      {low ? <NoteArrow side={side} low /> : null}
      <p className="flex flex-col items-center">
        <span className="text-[1.125rem] leading-normal text-fg">{note.small}</span>
        <span className="font-heading text-[1.5rem] leading-[1.2] text-jade-700">{note.big}</span>
      </p>
      {low ? null : <NoteArrow side={side} low={false} />}
    </div>
  );
}

/**
 * The reference's "difference" section under the related products: a condensed heading, the
 * brand's line and the product in a large circle with short notes around it, two words each and
 * an arrow towards it. Here the pack's four values (natural product, refined taste…).
 */
export async function DifferenceSection({ product }: { product: ProductDetailDto }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('Product');
  const copy = brandCopy[locale];
  const labels = brandValueLabels[locale];
  const image =
    product.images.find((candidate) => candidate.transparent) ?? product.images[0] ?? null;
  const sources = image ? imageSources(image, 960) : null;
  const notes: DifferenceNoteData[] = BRAND_VALUES.map((value) => {
    const [first = '', ...rest] = labels[value].split(' ');
    return { key: value, small: rest.length > 0 ? first : '', big: rest.join(' ') || first };
  });
  return (
    <section aria-labelledby="difference" className="mt-section text-center">
      <h2
        id="difference"
        className="font-headline text-[2.5rem] leading-[0.85] text-jade-700 sm:text-[3rem]"
      >
        {t('differenceTitle')}
      </h2>
      <p className="mx-auto mt-5 max-w-[27rem] text-[1rem] leading-[1.6] text-fg">
        {copy.description}
      </p>
      <div className="mt-10 grid grid-cols-2 items-center gap-x-6 gap-y-10 lg:grid-cols-[1fr_minmax(0,34rem)_1fr] lg:gap-10">
        <div className="order-2 space-y-16 lg:order-1">
          <DifferenceNote note={notes[0]!} side="left" low={false} />
          <DifferenceNote note={notes[2]!} side="left" low />
        </div>
        <div className="order-1 col-span-2 mx-auto w-full max-w-[34rem] lg:order-2 lg:col-span-1">
          <div className="relative aspect-square rounded-full bg-ivory-200 p-[7%]">
            <div className="relative h-full w-full overflow-hidden rounded-full bg-jade-700">
              {image && sources ? (
                // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
                <img
                  src={sources.src}
                  srcSet={sources.srcSet}
                  sizes={
                    image.transparent
                      ? '(min-width: 640px) 21rem, calc(62vw - 1.9rem)'
                      : '(min-width: 640px) 29.25rem, calc(86vw - 2.6rem)'
                  }
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    'h-full w-full',
                    image.transparent ? 'object-contain p-[14%]' : 'object-cover',
                  )}
                />
              ) : null}
            </div>
          </div>
        </div>
        <div className="order-3 space-y-16">
          <DifferenceNote note={notes[1]!} side="right" low={false} />
          <DifferenceNote note={notes[3]!} side="right" low />
        </div>
      </div>
    </section>
  );
}

/** Delivery and payment facts generated from the configured methods (never hard-coded promises). */
export async function DeliveryInfo({ options }: { options: CheckoutOptionsDto | null }) {
  const t = await getTranslations('Product');
  const tco = await getTranslations('Checkout');
  const tc = await getTranslations('Common');
  const locale = await getLocale();
  const currency = tc('currency.UZS');

  return (
    <section aria-labelledby="delivery-info" className="mt-8">
      <h2 id="delivery-info" className="text-label text-fg">
        {/* Payment is shown with prices only, so without them the heading names delivery alone. */}
        {showPrices ? t('delivery') : t('deliveryOnly')}
      </h2>
      <ul className="mt-2.5 divide-y divide-line-subtle rounded-card border border-line bg-surface text-body-sm">
        {options && options.deliveryMethods.length > 0 ? (
          options.deliveryMethods.map((method) => (
            <li key={method.code} className="flex items-start gap-3 px-4 py-3">
              <Truck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-fg" />
              <span className="min-w-0 flex-1">
                <span className="block text-fg">{method.name}</span>
                {method.estimate ? (
                  <span className="block text-helper text-fg-subtle">{method.estimate}</span>
                ) : null}
              </span>
              {/* Fees are prices: hidden with them (lib/site showPrices). */}
              {showPrices ? (
                <span className="text-right">
                  <span className="block font-medium text-fg">
                    {Number(method.price) === 0
                      ? tco('free')
                      : formatMoney(method.price, locale, currency)}
                  </span>
                  {method.freeFromAmount ? (
                    <span className="block text-helper text-success">
                      {tco('freeFrom', {
                        amount: formatMoney(method.freeFromAmount, locale, currency),
                      })}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </li>
          ))
        ) : (
          <li className="flex items-start gap-3 px-4 py-3 text-fg-muted">
            <Truck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-fg" />
            {showPrices ? t('deliveryText') : t('deliveryTextByContact')}
          </li>
        )}
        {showPrices && options && options.paymentMethods.length > 0 ? (
          <li className="flex items-start gap-3 px-4 py-3 text-fg">
            <CreditCard aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-fg" />
            {/* Only methods that can be used now; simulated ones say so. */}
            {options.paymentOptions
              .filter((option) => option.availability !== 'unavailable')
              .map((option) =>
                option.availability === 'demo'
                  ? `${tco(`paymentMethods.${option.method}`)} (${tco('demoBadge')})`
                  : tco(`paymentMethods.${option.method}`),
              )
              .join(' · ')}
          </li>
        ) : null}
      </ul>
      <Link
        href="/delivery"
        className="mt-3 inline-block text-body-sm font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
      >
        {t('deliveryLink')}
      </Link>
    </section>
  );
}
