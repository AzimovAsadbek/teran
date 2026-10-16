import type { AdminDeliveryMethod, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { DeliveryManager } from '@/components/admin/delivery-manager';
import { AccessDenied, AdminPageHeader } from '@/components/admin/ui';
import { adminGet } from '@/lib/admin/server';
import { currentUser } from '@/lib/account';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('delivery.title') };
}

export default async function AdminDeliveryPage() {
  const t = await getTranslations('Admin');
  const [methods, user] = await Promise.all([
    adminGet<AdminDeliveryMethod[]>('/delivery-methods'),
    currentUser(),
  ]);
  if (!methods) return <AccessDenied />;
  return (
    <>
      <AdminPageHeader title={t('delivery.title')} />
      <DeliveryManager methods={methods} canEdit={user?.role === 'ADMIN'} />
    </>
  );
}
