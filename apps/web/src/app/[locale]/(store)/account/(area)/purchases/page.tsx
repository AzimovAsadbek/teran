import type { Locale, PurchasedProductDto } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AccountPageHeader } from '@/components/account/account-ui';
import { ProductImage } from '@/components/catalog/product-image';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/account';
import { apiGetAsVisitor } from '@/lib/api/server';
import { cn } from '@/lib/cn';
import { formatDate, packLabel } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({ title: t('purchases'), href: '/account/purchases', locale, noIndex: true });
}

async function Purchases() {
  const locale = (await rootParams.locale()) as Locale;
  const [t, tc, tp] = await Promise.all([
    getTranslations('Account'),
    getTranslations('Checkout'),
    getTranslations('Product'),
  ]);
  await requireUser(locale, '/account/purchases');
  const products = await apiGetAsVisitor<PurchasedProductDto[]>(
    `/account/purchases?locale=${locale}`,
  ).catch(() => null);

  return (
    <div className="space-y-6">
      <AccountPageHeader title={t('purchases')} text={t('purchasesText')} />
      {!products ? (
        <Notice tone="danger" role="alert">
          {tc('loadError')}
        </Notice>
      ) : products.length === 0 ? (
        <div className="rounded-panel border border-line bg-surface p-7">
          <p className="text-body text-fg-muted">{t('purchasesEmpty')}</p>
          <ButtonLink href="/catalog" variant="secondary" className="mt-5">
            {tc('continueShopping')}
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <li
              key={product.sku}
              className="flex gap-4 rounded-card border border-line bg-surface p-4"
            >
              <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-control bg-surface-muted">
                <ProductImage image={product.image} name={product.productName} sizes="80px" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-title-sm text-fg">{product.productName}</span>
                <span className="block text-body-sm text-fg-subtle">
                  {packLabel(product, product.format, locale, (key, values) =>
                    tp(`units.${key}`, values),
                  )}
                </span>
                <span className="mt-1 block text-caption text-fg-muted">
                  {t('purchasedSummary', {
                    count: product.totalQuantity,
                    date: formatDate(product.lastOrderedAt, locale),
                  })}
                </span>
                <span
                  className={cn(
                    'mt-1 block text-caption font-semibold',
                    product.available ? 'text-success' : 'text-fg-subtle',
                  )}
                >
                  {product.available ? t('availableNow') : t('unavailableNow')}
                </span>
                {product.available ? (
                  <Link
                    href={`/products/${product.productSlug}`}
                    className="mt-2 inline-block text-body-sm font-semibold text-brand underline-offset-4 hover:underline"
                  >
                    {t('viewProduct')}
                  </Link>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PurchasesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-12 w-1/2" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-card" />
            <Skeleton className="h-28 rounded-card" />
          </div>
        </div>
      }
    >
      <Purchases />
    </Suspense>
  );
}
