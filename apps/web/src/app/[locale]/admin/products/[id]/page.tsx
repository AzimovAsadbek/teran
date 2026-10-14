import type { AdminProductDetail, AdminTaxonomy, Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { SuccessMessage } from '@/components/account/auth-forms';
import { ProductEditor } from '@/components/admin/product-editor';
import { ProductImages } from '@/components/admin/product-images';
import { AdminPageHeader, Panel, ProductStatusPill } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/admin/server';

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
  const [product, categories, collections] = await Promise.all([
    adminGet<AdminProductDetail>(`/products/${id}`).catch(() => null),
    adminGet<AdminTaxonomy[]>('/categories'),
    adminGet<AdminTaxonomy[]>('/collections'),
  ]);
  if (!product || !categories || !collections) notFound();

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-forest-900 hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('products.title')}
      </Link>
      <AdminPageHeader
        title={product.translations.uz.name}
        description={<ProductStatusPill status={product.status} />}
      />
      {query.created === '1' || query.saved === '1' ? (
        <div className="mb-6">
          <SuccessMessage>
            {query.created === '1' ? t('products.created') : t('common.saved')}
          </SuccessMessage>
        </div>
      ) : null}
      <div className="mb-6">
        <Panel title={t('products.images')}>
          <ProductImages
            productId={product.id}
            images={product.images}
            name={product.translations.uz.name}
          />
        </Panel>
      </div>
      <ProductEditor
        key={product.updatedAt}
        product={product}
        categories={categories}
        collections={collections}
      />
    </>
  );
}
