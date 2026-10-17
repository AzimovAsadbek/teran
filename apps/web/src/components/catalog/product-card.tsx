import type { ProductSummaryDto } from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatMoney, packLabel } from '@/lib/format';
import { ProductImage } from './product-image';
import { QuickAdd } from './quick-add';

/** Four columns from 1024 px, three from 768 px, two on phones (between the 1.5 rem gutters). */
export const PRODUCT_CARD_SIZES =
  '(min-width: 1024px) 22vw, (min-width: 768px) 30vw, calc(50vw - 1.75rem)';

const PILL = 'rounded-full px-2.5 py-1 text-[0.8125rem] leading-none font-medium';

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
 * Product card on the reference's model: a white card lifted off the page, the picture on white,
 * an outlined "new" pill top-left and the discount top-right, then the tea type in italics, the
 * name and price · pack size. With a mouse the card rises a little when pointed at, the picture
 * changes to the product's second one and an "Add to bag · price" pill comes up over its foot;
 * touch screens show the round bag button instead (quick-add.tsx). The name is a stretched link
 * (one tab stop per card). No rating row: TERAN has no reviews, and none is invented.
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
  const discount = soldOut ? null : discountPercent(product.priceFrom, product.compareAtPriceFrom);
  const pack = product.defaultVariant
    ? packLabel(product.defaultVariant, product.format, locale, (key, values) =>
        t(`units.${key}`, values),
      )
    : null;

  const hoverImage = soldOut ? null : product.hoverImage;
  const packPrice = product.defaultVariant
    ? formatMoney(product.defaultVariant.price, locale, tc('currency.UZS'))
    : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-sm bg-surface shadow-card transition-[translate,box-shadow] duration-250 ease-out hover:shadow-lift pointer-fine:hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-surface">
        <ProductImage
          image={product.image}
          name={product.name}
          sizes={sizes}
          priority={priority}
          className={cn(
            hoverImage
              ? 'transition-opacity duration-300 ease-out pointer-fine:group-hover:opacity-0'
              : 'transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-[1.03]',
            soldOut && 'opacity-60',
          )}
        />
        {hoverImage ? (
          // Not displayed on touch screens, so it is never downloaded there.
          <ProductImage
            image={hoverImage}
            name={product.name}
            sizes={sizes}
            decorative
            className="absolute inset-0 hidden opacity-0 transition-opacity duration-300 ease-out pointer-fine:block pointer-fine:group-hover:opacity-100"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
          <div className="flex flex-wrap gap-1.5">
            {soldOut ? (
              <span className={cn(PILL, 'bg-ink-700 text-ivory-50')}>{t('badgeSoldOut')}</span>
            ) : null}
            {!soldOut && product.isNew ? (
              <span className={cn(PILL, 'border border-forest-700 bg-surface text-forest-800')}>
                {t('badgeNew')}
              </span>
            ) : null}
            {product.stockLevel === 'low_stock' ? (
              <span className={cn(PILL, 'border border-gold-600 bg-surface text-gold-800')}>
                {t('lowStock')}
              </span>
            ) : null}
          </div>
          {discount ? (
            <span className={cn(PILL, 'shrink-0 bg-forest-900 text-ivory-50')}>−{discount}%</span>
          ) : !soldOut && product.onSale ? (
            <span className={cn(PILL, 'shrink-0 bg-forest-900 text-ivory-50')}>
              {t('badgeSale')}
            </span>
          ) : null}
        </div>
        <QuickAdd variant={product.defaultVariant} productName={product.name} price={packPrice} />
      </div>

      <div className="flex flex-1 flex-col px-2 pt-3 pb-4 sm:px-2.5">
        <p className="truncate text-[0.875rem] text-fg-muted italic">{product.category.name}</p>
        <Heading className="mt-1 text-[0.9375rem] leading-snug font-bold text-fg sm:text-[1rem]">
          <Link
            href={`/products/${product.slug}`}
            className={cn(
              'decoration-brand/35 decoration-1 underline-offset-[0.2em] group-hover:underline',
              'after:absolute after:inset-0 focus-visible:outline-none',
              'focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus focus-visible:after:outline-solid',
            )}
          >
            {product.name}
          </Link>
        </Heading>
        <p className="mt-auto flex flex-wrap items-baseline gap-x-1.5 pt-3 text-[0.9375rem] sm:text-[1rem]">
          <Price
            amount={product.priceFrom}
            compareAt={product.compareAtPriceFrom}
            from={product.variantCount > 1}
          />
          {pack ? <span className="text-[0.875rem] text-fg-muted">· {pack}</span> : null}
        </p>
      </div>
    </article>
  );
}
