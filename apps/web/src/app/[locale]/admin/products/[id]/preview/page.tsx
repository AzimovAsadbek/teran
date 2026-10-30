import type { AdminProductDetail, Locale, ProductDetailDto } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { AdminPageHeader, ProductStatusPill } from '@/components/admin/ui';
import { Badge } from '@/components/ui/badge';
import { CardIconSprite } from '@/components/catalog/card-icons';
import { ProductCard } from '@/components/catalog/product-card';
import { ProductGallery } from '@/components/product/product-gallery';
import { AttributeRows, ProductTabsSection } from '@/components/product/product-info';
import { Notice } from '@/components/ui/notice';
import { Price } from '@/components/ui/price';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/admin/server';
import { namesFormat, packLabel } from '@/lib/format';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('preview.productTitle') };
}

/**
 * The product page as shoppers would see it, drafts included, built from the same data and the
 * same components as the store (buttons that would act on the bag are inert here).
 */
export default async function ProductPreviewPage({
  params,
}: PageProps<'/[locale]/admin/products/[id]/preview'>) {
  const [{ id }, locale] = await Promise.all([params, getLocale() as Promise<Locale>]);
  if (!UUID.test(id)) notFound();
  const [t, tc, tp, product, admin] = await Promise.all([
    getTranslations('Admin'),
    getTranslations('Catalog'),
    getTranslations('Product'),
    adminGet<ProductDetailDto>(`/products/${id}/preview?locale=${locale}`).catch(() => null),
    adminGet<AdminProductDetail>(`/products/${id}`).catch(() => null),
  ]);
  if (!product || !admin) notFound();
  const missing = admin.readiness.items.filter((item) => item.required && !item.ok);

  return (
    <>
      <Link
        href={`/admin/products/${id}`}
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-fg hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('preview.backToEditor')}
      </Link>
      <AdminPageHeader
        title={t('preview.productTitle')}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ProductStatusPill status={admin.status} />
            {admin.status === 'ACTIVE' ? t('preview.live') : t('preview.notLive')}
          </span>
        }
      />
      {missing.length > 0 ? (
        <Notice tone="warning" className="mb-6" title={t('preview.incomplete')}>
          {missing.map((item) => t(`readiness.codes.${item.code}`)).join(', ')}
        </Notice>
      ) : null}

      <div className="rounded-panel border border-line bg-canvas p-5 sm:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ProductGallery images={product.images} name={product.name} />
          </div>
          <div className="lg:col-span-5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-eyebrow">
              <span className="text-accent-fg">{product.category.name}</span>
              {namesFormat(product.format) ? (
                <>
                  <span aria-hidden className="text-fg-subtle">
                    ·
                  </span>
                  <span className="text-fg-subtle">{tc(`formats.${product.format}`)}</span>
                </>
              ) : null}
            </p>
            <h2 className="mt-3 text-display-lg text-fg">{product.name}</h2>
            {product.isNew || product.onSale ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {product.isNew ? <Badge tone="new">{tp('badgeNew')}</Badge> : null}
                {product.onSale ? <Badge tone="sale">{tp('badgeSale')}</Badge> : null}
              </div>
            ) : null}
            {product.shortDescription ? (
              <p className="mt-4 text-body-lg text-fg-muted">{product.shortDescription}</p>
            ) : null}
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {product.variants.map((variant) => (
                <li key={variant.id} className="flex items-baseline justify-between gap-4 py-3">
                  <span className="text-body-sm text-fg">
                    {packLabel(variant, product.format, locale, (key, values) =>
                      tp(`units.${key}`, values),
                    )}
                  </span>
                  <Price amount={variant.price} compareAt={variant.compareAtPrice} />
                </li>
              ))}
              {product.variants.length === 0 ? (
                <li className="py-3 text-body-sm text-danger">
                  {t('readiness.codes.activeVariant')}
                </li>
              ) : null}
            </ul>
            <ProductTabsSection product={product} />
            <AttributeRows product={product} />
          </div>
        </div>
      </div>

      <h2 className="mt-10 text-title-lg text-fg">{t('preview.asCard')}</h2>
      <p className="mt-1 text-body-sm text-fg-muted">{t('preview.asCardHint')}</p>
      <div inert className="mt-4 w-64 max-w-full">
        <CardIconSprite />
        <ProductCard product={product} />
      </div>
    </>
  );
}
