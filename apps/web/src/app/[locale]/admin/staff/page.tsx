import type { AdminStaffMember, CurrentUserDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { StaffManager } from '@/components/admin/staff-manager';
import { AccessDenied, AdminPageHeader } from '@/components/admin/ui';
import { adminGet } from '@/lib/admin/server';
import { apiGetAsVisitor } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('staff.title') };
}

export default async function AdminStaffPage() {
  const t = await getTranslations('Admin');
  const user = await apiGetAsVisitor<CurrentUserDto>('/auth/me');
  if (user?.role !== 'ADMIN') return <AccessDenied adminOnly />;
  const staff = await adminGet<AdminStaffMember[]>('/staff');
  if (!staff) return <AccessDenied adminOnly />;
  return (
    <>
      <AdminPageHeader title={t('staff.title')} />
      <StaffManager staff={staff} currentUserId={user.id} />
    </>
  );
}
