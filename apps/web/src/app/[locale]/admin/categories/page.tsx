import type { AdminProductType, AdminTaxonomy, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { TaxonomyManager } from '@/components/admin/taxonomy-manager';
import { AccessDenied, AdminPageHeader } from '@/components/admin/ui';
import { adminGet } from '@/lib/admin/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('taxonomy.categories') };
}

export default async function AdminCategoriesPage() {
  const t = await getTranslations('Admin');
  const [items, productTypes] = await Promise.all([
    adminGet<AdminTaxonomy[]>('/categories'),
    // Only offers a default type; the list still works without it.
    adminGet<AdminProductType[]>('/product-types').catch(() => null),
  ]);
  if (!items) return <AccessDenied />;
  return (
    <>
      <AdminPageHeader
        title={t('taxonomy.categories')}
        description={t('taxonomy.categoriesIntro')}
      />
      <TaxonomyManager kind="categories" items={items} productTypes={productTypes ?? []} />
    </>
  );
}
