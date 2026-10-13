import type { AnnouncementSetting, ContactSetting, CurrentUserDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { AnnouncementForm, ContactForm } from '@/components/admin/settings-forms';
import { AccessDenied, AdminPageHeader, Panel } from '@/components/admin/ui';
import { adminGet } from '@/lib/admin/server';
import { apiGetAsVisitor } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('settings.title') };
}

export default async function AdminSettingsPage() {
  const t = await getTranslations('Admin');
  const user = await apiGetAsVisitor<CurrentUserDto>('/auth/me');
  if (user?.role !== 'ADMIN') return <AccessDenied adminOnly />;
  const settings = await adminGet<{
    announcement: AnnouncementSetting | null;
    contact: ContactSetting;
  }>('/settings');
  if (!settings) return <AccessDenied />;
  return (
    <>
      <AdminPageHeader title={t('settings.title')} />
      <div className="space-y-6">
        <Panel title={t('settings.announcement')}>
          <AnnouncementForm value={settings.announcement} />
        </Panel>
        <Panel title={t('settings.contact')}>
          <p className="mb-4 text-sm text-ink-500">{t('settings.contactHint')}</p>
          <ContactForm value={settings.contact} />
        </Panel>
      </div>
    </>
  );
}
