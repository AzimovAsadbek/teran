import type { AdminTaxonomy, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { TaxonomyManager } from '@/components/admin/taxonomy-manager';
import { AccessDenied, AdminPageHeader } from '@/components/admin/ui';
import { adminGet } from '@/lib/admin/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('taxonomy.collections') };
}

export default async function AdminCollectionsPage() {
  const t = await getTranslations('Admin');
  const items = await adminGet<AdminTaxonomy[]>('/collections');
  if (!items) return <AccessDenied />;
  return (
    <>
      <AdminPageHeader title={t('taxonomy.collections')} />
      <TaxonomyManager kind="collections" items={items} />
    </>
  );
}
