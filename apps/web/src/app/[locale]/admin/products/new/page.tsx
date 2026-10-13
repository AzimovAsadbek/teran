import type { AdminTaxonomy, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { ProductEditor } from '@/components/admin/product-editor';
import { AccessDenied, AdminPageHeader } from '@/components/admin/ui';
import { adminGet } from '@/lib/admin/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('products.newProduct') };
}

export default async function NewProductPage() {
  const t = await getTranslations('Admin');
  const [categories, collections] = await Promise.all([
    adminGet<AdminTaxonomy[]>('/categories'),
    adminGet<AdminTaxonomy[]>('/collections'),
  ]);
  if (!categories || !collections) return <AccessDenied />;
  return (
    <>
      <AdminPageHeader
        title={t('products.newProduct')}
        description={t('products.imagesAfterSave')}
      />
      <ProductEditor product={null} categories={categories} collections={collections} />
    </>
  );
}
