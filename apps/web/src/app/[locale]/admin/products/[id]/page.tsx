import type { AdminProductDetail, AdminProductType, AdminTaxonomy, Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { SuccessMessage } from '@/components/account/auth-forms';
import { ProductEditor } from '@/components/admin/product-editor';
import { ProductImages } from '@/components/admin/product-images';
import { AdminPageHeader, ProductStatusPill } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet, getTelegramSettings } from '@/lib/admin/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('products.editProduct') };
}

export default async function EditProductPage({
  params,
  searchParams,
}: PageProps<'/[locale]/admin/products/[id]'>) {
  const [{ id }, query, t] = await Promise.all([params, searchParams, getTranslations('Admin')]);
  if (!UUID.test(id)) notFound();
  const [product, categories, collections, productTypes, telegram] = await Promise.all([
    adminGet<AdminProductDetail>(`/products/${id}`).catch(() => null),
    adminGet<AdminTaxonomy[]>('/categories'),
    adminGet<AdminTaxonomy[]>('/collections'),
    adminGet<AdminProductType[]>('/product-types'),
    getTelegramSettings(),
  ]);
  if (!product || !categories || !collections || !productTypes) notFound();

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-fg hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('products.title')}
      </Link>
      <AdminPageHeader
        title={product.translations.uz.name}
        description={<ProductStatusPill status={product.status} />}
      />
      {query.created === '1' ? (
        <div className="mb-6">
          <SuccessMessage>
            {t('products.created')}{' '}
            {product.status === 'ACTIVE' ? t('products.createdActive') : t('products.createdDraft')}
          </SuccessMessage>
        </div>
      ) : null}
      <ProductEditor
        key={product.updatedAt}
        product={product}
        categories={categories}
        collections={collections}
        productTypes={productTypes}
        telegram={telegram}
        images={
          <ProductImages
            productId={product.id}
            images={product.images}
            name={product.translations.uz.name}
          />
        }
      />
    </>
  );
}
