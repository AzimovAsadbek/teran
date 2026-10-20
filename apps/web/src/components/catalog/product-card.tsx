import type { ProductSummaryDto } from '@teran/contracts';
import { ArrowRight, Leaf, MapPin, Package, Thermometer, Timer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Price } from '@/components/ui/price';
import { PACK_COLOURS, teaCodeOf } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatMoney, packLabel } from '@/lib/format';
import { showPrices } from '@/lib/site';
import { ProductFilm } from './product-film';
import { ProductImage } from './product-image';
import { QuickAdd } from './quick-add';
import { Stars } from './stars';

/** Four columns from 1024 px, three from 768 px, two on phones (between the 1.5 rem gutters). */
export const PRODUCT_CARD_SIZES =
  '(min-width: 1024px) 22vw, (min-width: 768px) 30vw, calc(50vw - 1.75rem)';

/** The reference's badge: 14 px words in a 12 px-cornered outline (11 px on phones). */
const PILL =
  'rounded-[0.625rem] border-[0.75px] px-1.5 py-[3px] text-[0.6875rem] leading-4 font-medium min-[46.875rem]:rounded-[0.75rem] min-[46.875rem]:px-2 min-[46.875rem]:py-[4.5px] min-[46.875rem]:text-[0.875rem] min-[46.875rem]:leading-[1.3125rem]';

/** "-25 %" from the lowest price and the price it replaces (only when both are real numbers). */
function discountPercent(price: string, compareAt: string | null): number | null {
  if (!compareAt) return null;
  const now = Number(price);
  const before = Number(compareAt);
  if (!(before > now) || !(now > 0)) return null;
  const percent = Math.round((1 - now / before) * 100);
  return percent >= 1 ? percent : null;
}

/** "2" or "2.5" minutes from seconds, as the product page's brewing rows. */
function minutes(seconds: number): string {
  return Number.isInteger(seconds / 60) ? String(seconds / 60) : (seconds / 60).toFixed(1);
}

/**
 * Product card: a white card with 16 px corners on a soft shadow, lifting a little while pointed
 * at as its picture slowly grows; "new" and "few left" pills top-left, the discount top-right; the
 * second picture fades in while the pointer is on the picture and a first picture with a film comes
 * alive (product-film.tsx). The second picture also stands as a small round swatch in the lower
 * left on every device, ringed in the pack's colour for TERAN's teas, so cards that open on the same
 * cup still differ at a glance. Under the picture, from the product's own data and nothing
 * invented: the tea type, the name, the customers' stars and their number (before the first
 * review, an invitation to rate it; ADR-042), the origin, and chips for the brewing temperature,
 * time and pack size. Without prices an "Order" button closes the card, outlined and filled while
 * the card is pointed at, leading to the contact page with this tea already named; with prices,
 * the price row and the "Add to bag" pill over the picture (quick-add.tsx). The picture and the
 * name lead to the product, the stars to its reviews.
 */
export function ProductCard({
  product,
  priority = false,
  headingLevel = 'h3',
  sizes = PRODUCT_CARD_SIZES,
}: {
  product: ProductSummaryDto;
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
  sizes?: string;
}) {
  const t = useTranslations('Product');
  const tb = useTranslations('Brewing');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const Heading = headingLevel;
  const soldOut = product.stockLevel === 'out_of_stock';
  const discount =
    soldOut || !showPrices ? null : discountPercent(product.priceFrom, product.compareAtPriceFrom);
  const pack = product.defaultVariant
    ? packLabel(product.defaultVariant, product.format, locale, (key, values) =>
        t(`units.${key}`, values),
      )
    : null;

  const href = `/products/${product.slug}`;
  const hoverImage = soldOut ? null : product.hoverImage;
  const teaCode = teaCodeOf(product.slug);
  const packColour = teaCode ? PACK_COLOURS[teaCode] : null;
  const packPrice = product.defaultVariant
    ? formatMoney(product.defaultVariant.price, locale, tc('currency.UZS'))
    : null;
  // Cards kept in a visitor's browser (recently viewed) from before these fields lack them.
  const rating = product.rating ?? null;
  const brewing = product.brewing ?? null;
  const origin = product.origin ?? null;
  const average = rating
    ? new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
        rating.average,
      )
    : null;
  const chips = [
    brewing?.temperatureCelsius != null
      ? {
          key: 'temperature',
          icon: Thermometer,
          label:
            brewing.temperatureMaxCelsius != null
              ? tb('celsiusRange', {
                  min: brewing.temperatureCelsius,
                  max: brewing.temperatureMaxCelsius,
                })
              : tb('celsius', { value: brewing.temperatureCelsius }),
        }
      : null,
    brewing?.timeMinSeconds != null
      ? {
          key: 'time',
          icon: Timer,
          label:
            brewing.timeMaxSeconds != null && brewing.timeMaxSeconds !== brewing.timeMinSeconds
              ? tb('minutes', {
                  min: minutes(brewing.timeMinSeconds),
                  max: minutes(brewing.timeMaxSeconds),
                })
              : tb('minutesSingle', { min: minutes(brewing.timeMinSeconds) }),
        }
      : null,
    // With prices the pack follows the price instead.
    pack && !showPrices ? { key: 'pack', icon: Package, label: pack } : null,
  ].filter((chip) => chip !== null);

  return (
    <article className="group/card relative flex h-full flex-col overflow-hidden rounded-[1rem] bg-surface shadow-[0_1px_2px_rgb(0_0_0_/_0.04),0_12px_32px_-20px_rgb(0_0_0_/_0.35)] ring-1 ring-black/[0.06] transition-[translate,box-shadow] duration-300 ease-out pointer-fine:hover:shadow-[0_2px_4px_rgb(0_0_0_/_0.05),0_24px_48px_-22px_rgb(0_0_0_/_0.42)] motion-safe:pointer-fine:hover:-translate-y-1">
      <div className="group/gallery relative aspect-square overflow-hidden bg-surface">
        {/* The picture, its film and its second view grow together, so they stay aligned. */}
        <div className="absolute inset-0 transition-transform duration-700 ease-out motion-safe:pointer-fine:group-hover/card:scale-[1.04]">
          <ProductImage
            image={product.image}
            name={product.name}
            sizes={sizes}
            priority={priority}
            className={cn(soldOut && 'opacity-60')}
          />
          {/* A living picture (steam rising, the tea stirring) where the first picture has a film. */}
          {product.image?.film?.cardSrc && !soldOut ? (
            <ProductFilm film={product.image.film} size="card" />
          ) : null}
          {hoverImage ? (
            // Not displayed on touch screens, so it is never downloaded there.
            <ProductImage
              image={hoverImage}
              name={product.name}
              sizes={sizes}
              decorative
              className="absolute inset-0 hidden opacity-0 transition-opacity duration-200 ease-[ease] pointer-fine:block pointer-fine:group-hover/gallery:opacity-100"
            />
          ) : null}
        </div>
        {hoverImage ? (
          // The second picture (for TERAN's teas, their own dry leaf) as a swatch on every device,
          // ringed in the pack's colour: what tells cards with the same first picture apart. It
          // steps aside while the card is pointed at (the full second picture, or the quick add,
          // takes the picture's foot then).
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-2 z-[2] block h-12 w-12 overflow-hidden rounded-full border-[3px] bg-surface shadow-[0_2px_6px_rgb(0_0_0_/_0.22)] transition-[opacity,scale] duration-300 ease-out min-[46.875rem]:bottom-3 min-[46.875rem]:left-3 min-[46.875rem]:h-16 min-[46.875rem]:w-16 pointer-fine:group-hover/card:scale-90 pointer-fine:group-hover/card:opacity-0"
            style={{ borderColor: packColour ?? 'var(--color-surface)' }}
          >
            <ProductImage image={hoverImage} name={product.name} sizes="64px" decorative />
          </span>
        ) : null}
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 z-[1]" />
        <div className="pointer-events-none absolute inset-x-2 top-2 z-[2] flex items-start justify-between gap-2 min-[46.875rem]:inset-x-3 min-[46.875rem]:top-3">
          <div className="flex flex-wrap gap-1.5">
            {soldOut ? (
              <span className={cn(PILL, 'border-ink-700 bg-ink-700 text-ivory-50')}>
                {t('badgeSoldOut')}
              </span>
            ) : null}
            {!soldOut && product.isNew ? (
              <span className={cn(PILL, 'border-forest-700 bg-surface text-forest-700')}>
                {t('badgeNew')}
              </span>
            ) : null}
            {product.stockLevel === 'low_stock' ? (
              <span className={cn(PILL, 'border-gold-700 bg-surface text-gold-800')}>
                {t('lowStock')}
              </span>
            ) : null}
          </div>
          {discount ? (
            <span className={cn(PILL, 'shrink-0 border-forest-700 bg-forest-700 text-ivory-50')}>
              −{discount}%
            </span>
          ) : !soldOut && showPrices && product.onSale ? (
            <span className={cn(PILL, 'shrink-0 border-forest-700 bg-forest-700 text-ivory-50')}>
              {t('badgeSale')}
            </span>
          ) : null}
        </div>
        {showPrices ? (
          <QuickAdd variant={product.defaultVariant} productName={product.name} price={packPrice} />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-3 pt-3 pb-3 min-[46.875rem]:px-4 min-[46.875rem]:pt-3.5 min-[46.875rem]:pb-4">
        <p className="flex h-5 min-w-0 items-center gap-1.5 text-[0.8125rem] leading-5 font-medium text-leaf-700">
          <Leaf aria-hidden className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{product.category.name}</span>
        </p>
        <Heading className="mt-1 line-clamp-2 text-[1rem] leading-5 font-bold text-fg min-[46.875rem]:text-[1.0625rem] min-[46.875rem]:leading-6">
          <Link href={href} className="relative z-[1] hover:underline">
            {product.name}
          </Link>
        </Heading>
        <Link
          href={`${href}#reviews`}
          aria-label={
            rating && average
              ? t('ratingLabel', { average, count: rating.count })
              : t('rateFirstLabel', { name: product.name })
          }
          className="relative z-[1] mt-2 inline-flex min-h-6 w-fit items-center gap-1.5 text-[0.8125rem] leading-5 hover:underline hover:underline-offset-2"
        >
          <Stars value={rating?.average ?? 0} className="text-[0.875rem]" />
          {rating ? (
            <>
              <span className="font-semibold text-fg">{average}</span>
              <span className="text-fg-subtle">({rating.count})</span>
            </>
          ) : (
            <span className="text-fg-subtle">{t('rateFirst')}</span>
          )}
        </Link>
        {origin ? (
          <p className="mt-1 flex min-w-0 items-center gap-1 text-[0.8125rem] leading-5 text-fg-subtle">
            <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <span className="sr-only">{t('origin')}: </span>
            <span className="truncate">{origin}</span>
          </p>
        ) : null}
        {chips.length > 0 ? (
          // Two chips side by side even on a phone's half-width card.
          <ul className="mt-2.5 flex flex-wrap gap-1 min-[46.875rem]:gap-1.5">
            {chips.map(({ key, icon: Icon, label }) => (
              <li
                key={key}
                className="inline-flex h-[1.375rem] items-center gap-0.5 rounded-full bg-jade-100 px-1.5 text-[0.6875rem] leading-none font-medium whitespace-nowrap text-teal-ink min-[46.875rem]:h-6 min-[46.875rem]:gap-1 min-[46.875rem]:px-2 min-[46.875rem]:text-[0.75rem]"
              >
                <Icon
                  aria-hidden
                  className="h-3 w-3 shrink-0 min-[46.875rem]:h-3.5 min-[46.875rem]:w-3.5"
                />
                {label}
              </li>
            ))}
          </ul>
        ) : null}
        {showPrices ? (
          <p className="mt-auto flex min-h-6 flex-wrap items-baseline gap-x-1.5 pt-3 text-[1rem] leading-6 font-medium">
            <Price
              amount={product.priceFrom}
              compareAt={product.compareAtPriceFrom}
              from={product.variantCount > 1}
            />
            {pack ? <span className="text-[0.875rem] text-fg-muted">· {pack}</span> : null}
          </p>
        ) : soldOut ? null : (
          // Without prices there is no bag: the button leads to the contact page, where every
          // channel to order by is (ADR-045), with this tea named in the message.
          <div className="mt-auto pt-3.5">
            <Link
              href={`/contact?tea=${encodeURIComponent(product.slug)}`}
              aria-label={t('orderAction', { name: product.name })}
              // A phone's half-width card keeps the whole word: smaller type, no arrow.
              className="relative z-[1] inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border-[1.5px] border-forest-900 px-2 text-[0.875rem] font-semibold text-forest-900 transition-colors duration-200 hover:bg-forest-900 hover:text-ivory-50 min-[46.875rem]:px-3 min-[46.875rem]:text-[0.9375rem] pointer-fine:group-hover/card:bg-forest-900 pointer-fine:group-hover/card:text-ivory-50"
            >
              <span className="truncate">{t('orderNow')}</span>
              <ArrowRight aria-hidden className="hidden h-4 w-4 shrink-0 min-[46.875rem]:block" />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}
