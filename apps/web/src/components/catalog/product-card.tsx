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

export function ProductCard({
  product,
  priority = false,
  headingLevel = 'h3',
}: {
  product: ProductSummaryDto;
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
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
    <article className="group relative flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-ivory-100">
        <ProductImage
          image={product.image}
          illustrationKey={product.illustrationKey}
          name={product.name}
          sizes={PRODUCT_CARD_SIZES}
          priority={priority}
          className={cn(
            'transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.04]',
            soldOut && 'opacity-70',
          )}
        />
        <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-1.5">
          {soldOut ? <Badge tone="muted">{t('badgeSoldOut')}</Badge> : null}
          {!soldOut && product.isNew ? <Badge tone="new">{t('badgeNew')}</Badge> : null}
          {!soldOut && product.onSale ? <Badge tone="sale">{t('badgeSale')}</Badge> : null}
        </div>
        <QuickAdd variant={product.defaultVariant} productName={product.name} />
      </div>

      <div className="mt-3.5 flex flex-1 flex-col gap-1 px-0.5">
        <p className="text-[0.7rem] font-bold tracking-[0.14em] text-gold-700 uppercase">
          {product.category.name}
        </p>
        <Heading className="font-display text-[1.35rem] leading-tight font-semibold text-forest-900">
          {/* Stretched link: the whole card is clickable with a single tab stop. */}
          <Link
            href={`/products/${product.slug}`}
            className="after:absolute after:inset-0 after:rounded-[var(--radius-card)]"
          >
            {product.name}
          </Link>
        </Heading>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1 text-[0.95rem]">
          <Price
            amount={product.priceFrom}
            compareAt={product.compareAtPriceFrom}
            from={product.variantCount > 1}
          />
          {pack ? <span className="text-sm text-ink-500">· {pack}</span> : null}
        </div>
        {product.stockLevel === 'low_stock' ? (
          <p className="text-xs font-semibold text-leaf-600">{t('lowStock')}</p>
        ) : null}
      </div>
    </article>
  );
}
