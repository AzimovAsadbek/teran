import {
  formatUzPhone,
  normalizeUzPhone,
  storePictureSlot,
  type ContactSetting,
  type ImageDto,
  type Locale,
  type StoresSetting,
  type VisualsSetting,
} from '@teran/contracts';
import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { StoresForm } from '@/components/admin/stores-form';
import { AccessDenied, AdminPageHeader, Panel } from '@/components/admin/ui';
import { VisualsManager, type VisualPlace } from '@/components/admin/visuals-manager';
import { Link } from '@/i18n/navigation';
import { currentUser } from '@/lib/account';
import { adminGet } from '@/lib/admin/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('stores.title') };
}

/**
 * The store locator's addresses (/stores) on a page of their own: the stores' cards (with the
 * map to place each one), then each saved store's picture. Kept in the `stores` site setting,
 * administrators only, as the API's settings are.
 */
export default async function AdminStoresPage() {
  const t = await getTranslations('Admin');
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return <AccessDenied adminOnly />;
  const settings = await adminGet<{
    contact: ContactSetting;
    stores?: StoresSetting;
    visuals?: VisualsSetting;
  }>('/settings');
  if (!settings) return <AccessDenied />;

  const stores = settings.stores ?? [];
  const visuals = settings.visuals ?? {};
  const toImage = (stored: VisualsSetting[string]['image']): ImageDto => ({
    src: `/uploads/${stored.key}`,
    widths: stored.widths,
    width: stored.width,
    height: stored.height,
    alt: '',
    transparent: false,
  });
  const pictures: VisualPlace[] = stores.map((store) => {
    const visual = visuals[storePictureSlot(store.id)];
    return {
      slot: storePictureSlot(store.id),
      label: t('settings.visualSlots.storePicture', { name: store.name }),
      hint: t('settings.visualSizeTile'),
      picture: visual
        ? {
            image: toImage(visual.image),
            mobile: visual.mobile ? toImage(visual.mobile) : null,
            source: visual.source,
          }
        : null,
      film: false,
    };
  });
  // A new store starts with the shop's own phone and hours (Settings → Contact details).
  const phone = settings.contact.phone;
  const defaults = {
    phone: phone ? formatUzPhone(normalizeUzPhone(phone) ?? phone) : '',
    hours: settings.contact.workingHours ?? { uz: '', ru: '', en: '' },
  };

  return (
    <>
      <AdminPageHeader
        title={t('stores.title')}
        description={t('stores.intro')}
        actions={
          <Link
            href="/stores"
            target="_blank"
            className="inline-flex min-h-10 items-center gap-1.5 text-body-sm font-semibold text-fg hover:underline"
          >
            {t('stores.viewOnSite')}
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </Link>
        }
      />
      <div className="space-y-6">
        <Panel title={t('stores.listTitle')}>
          <StoresForm value={stores} defaults={defaults} />
        </Panel>
        {pictures.length > 0 ? (
          <Panel title={t('stores.picturesTitle')}>
            <p className="mb-4 text-body-sm text-fg-subtle">{t('stores.picturesHint')}</p>
            <VisualsManager places={pictures} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
