import type { ProductSummaryDto } from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatMoney, packLabel } from '@/lib/format';
import { showPrices } from '@/lib/site';
import { ProductFilm } from './product-film';
import { ProductImage } from './product-image';
import { OrderAction } from './order-action';
import { QuickAdd } from './quick-add';

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

/**
 * Product card on the reference's model: a white card (8 px corners) lifted off the page by a
 * soft shadow, the picture on white, an outlined "new" pill top-left and the discount top-right,
 * then the tea type in italics, the name and price · pack size. As on the reference the picture and
 * the name lead to the product (the name, underlined while pointed at, is the keyboard's stop),
 * the card itself does not move and the second picture fades in while the pointer is on the
 * picture; a first picture with a film comes alive (product-film.tsx). While the card is pointed
 * at, the "Add to bag · price" pill shows over the picture's
 * foot (a round bag button on touch screens, quick-add.tsx); without prices, an "Order" pill to
 * the product page's ordering block (order-action.tsx). No rating row: TERAN has no reviews, and
 * none is invented.
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
  const packPrice = product.defaultVariant
    ? formatMoney(product.defaultVariant.price, locale, tc('currency.UZS'))
    : null;

  return (
    <article className="group/card relative flex h-full flex-col overflow-hidden rounded-[0.5rem] bg-surface shadow-card">
      <div className="group/gallery relative aspect-square overflow-hidden rounded-t-[0.75rem] bg-surface">
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
        <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 z-[1]" />
        <div className="pointer-events-none absolute inset-x-2 top-2 z-[2] flex items-start justify-between gap-2 min-[46.875rem]:inset-x-4 min-[46.875rem]:top-4">
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
        {/* Without prices there is no bag: the pill leads to the product page's ordering block. */}
        {showPrices ? (
          <QuickAdd variant={product.defaultVariant} productName={product.name} price={packPrice} />
        ) : soldOut ? null : (
          <OrderAction href={href} productName={product.name} />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2 pt-2 pb-2">
        <p className="h-6 truncate text-[0.875rem] leading-6 font-medium text-fg italic">
          {product.category.name}
        </p>
        <Heading className="line-clamp-2 min-h-8 text-[1rem] leading-4 font-bold text-fg">
          <Link href={href} className="relative z-[1] hover:underline">
            {product.name}
          </Link>
        </Heading>
        {showPrices ? (
          <p className="mt-auto flex min-h-6 flex-wrap items-baseline gap-x-1.5 text-[1rem] leading-6 font-medium">
            <Price
              amount={product.priceFrom}
              compareAt={product.compareAtPriceFrom}
              from={product.variantCount > 1}
            />
            {pack ? <span className="text-[0.875rem] text-fg-muted">· {pack}</span> : null}
          </p>
        ) : pack ? (
          <p className="mt-auto min-h-6 text-[1rem] leading-6 font-medium text-fg">{pack}</p>
        ) : null}
      </div>
    </article>
  );
}
