import type { ProductSummaryDto } from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { packLabel } from '@/lib/format';
import { ProductImage } from './product-image';
import { QuickAdd } from './quick-add';

export const PRODUCT_CARD_SIZES = '(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw';

/**
 * Product card: image, tea type, name, then price · pack size. Status (sold out, new, sale, low
 * stock) sits on the image as badges, so prices line up across a row whatever the name length.
 * The name is a stretched link (one tab stop per card); the focus ring outlines the whole card.
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
  const locale = useLocale();
  const Heading = headingLevel;
  const soldOut = product.stockLevel === 'out_of_stock';
  const pack = product.defaultVariant
    ? packLabel(product.defaultVariant, product.format, locale, (key, values) =>
        t(`units.${key}`, values),
      )
    : null;

  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-square overflow-hidden rounded-card bg-surface-muted">
        <ProductImage
          image={product.image}
          name={product.name}
          sizes={sizes}
          priority={priority}
          className={cn(
            'transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-[1.03]',
            soldOut && 'opacity-60',
          )}
        />
        <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 sm:top-3 sm:left-3">
          {soldOut ? <Badge tone="muted">{t('badgeSoldOut')}</Badge> : null}
          {!soldOut && product.isNew ? <Badge tone="new">{t('badgeNew')}</Badge> : null}
          {!soldOut && product.onSale ? <Badge tone="sale">{t('badgeSale')}</Badge> : null}
          {product.stockLevel === 'low_stock' ? (
            <Badge tone="outline">{t('lowStock')}</Badge>
          ) : null}
        </div>
        <QuickAdd variant={product.defaultVariant} productName={product.name} />
      </div>

      <div className="flex flex-1 flex-col pt-3 sm:pt-3.5">
        <p className="text-micro tracking-[0.12em] text-fg-subtle uppercase">
          {product.category.name}
        </p>
        <Heading className="mt-1 text-title-sm text-fg sm:text-title">
          <Link
            href={`/products/${product.slug}`}
            className={cn(
              'decoration-brand/35 decoration-1 underline-offset-[0.2em] group-hover:underline',
              'after:absolute after:inset-0 after:rounded-card focus-visible:outline-none',
              'focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-focus focus-visible:after:outline-solid',
            )}
          >
            {product.name}
          </Link>
        </Heading>
        <p className="mt-auto flex flex-wrap items-baseline gap-x-1.5 pt-2 text-body-sm sm:text-body">
          <Price
            amount={product.priceFrom}
            compareAt={product.compareAtPriceFrom}
            from={product.variantCount > 1}
          />
          {pack ? <span className="text-body-sm text-fg-subtle">· {pack}</span> : null}
        </p>
      </div>
    </article>
  );
}
