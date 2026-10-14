import type { AdminProductType, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { ProductTypeManager } from '@/components/admin/product-type-manager';
import { AccessDenied, AdminPageHeader } from '@/components/admin/ui';
import { adminGet } from '@/lib/admin/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('productTypes.title') };
}

export default async function AdminProductTypesPage() {
  const t = await getTranslations('Admin');
  const types = await adminGet<AdminProductType[]>('/product-types');
  if (!types) return <AccessDenied />;
  return (
    <>
      <AdminPageHeader title={t('productTypes.title')} description={t('productTypes.intro')} />
      <ProductTypeManager types={types} />
    </>
  );
}
