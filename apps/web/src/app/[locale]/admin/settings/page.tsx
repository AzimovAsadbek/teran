import {
  type AdminTaxonomy,
  type AnnouncementSetting,
  type ContactSetting,
  type ImageDto,
  type Locale,
  type VisualsSetting,
} from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { AnnouncementForm, ContactForm } from '@/components/admin/settings-forms';
import { VisualsManager, type VisualPlace } from '@/components/admin/visuals-manager';
import { AccessDenied, AdminPageHeader, Panel } from '@/components/admin/ui';
import { helpCentre } from '@/content/pages/faq';
import { adminGet } from '@/lib/admin/server';
import { currentUser } from '@/lib/account';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('settings.title') };
}

export default async function AdminSettingsPage() {
  const t = await getTranslations('Admin');
  const user = await currentUser();
  if (user?.role !== 'ADMIN') return <AccessDenied adminOnly />;
  const [settings, categories, collections] = await Promise.all([
    adminGet<{
      announcement: AnnouncementSetting | null;
      contact: ContactSetting;
      visuals?: VisualsSetting;
    }>('/settings'),
    adminGet<AdminTaxonomy[]>('/categories').catch(() => null),
    adminGet<AdminTaxonomy[]>('/collections').catch(() => null),
  ]);
  if (!settings) return <AccessDenied />;

  // Every place a page picture can go (contracts: FIXED_VISUAL_SLOTS, listingBannerSlot).
  const visuals = settings.visuals ?? {};
  const toImage = (stored: VisualsSetting[string]['image']): ImageDto => ({
    src: `/uploads/${stored.key}`,
    widths: stored.widths,
    width: stored.width,
    height: stored.height,
    alt: '',
    transparent: false,
  });
  const place = (slot: string, label: string, hint: string): VisualPlace => {
    const visual = visuals[slot];
    return {
      slot,
      label,
      hint,
      picture: visual
        ? {
            image: toImage(visual.image),
            mobile: visual.mobile ? toImage(visual.mobile) : null,
            source: visual.source,
          }
        : null,
      film: Boolean(visual?.video ?? visual?.mobileVideo),
    };
  };
  const banner = t('settings.visualSizeBanner');
  const places: VisualPlace[] = [
    place('about.hero', t('settings.visualSlots.aboutHero'), t('settings.visualSizeHero')),
    ...[1, 2, 3].map((number) =>
      place(
        `about.idea.${number}`,
        t('settings.visualSlots.aboutIdea', { number }),
        t('settings.visualSizePicture'),
      ),
    ),
    place('about.showcase', t('settings.visualSlots.aboutShowcase'), t('settings.visualSizeHero')),
    place('banner:catalog', t('settings.visualSlots.catalogBanner'), banner),
    place(
      'contact.picture',
      t('settings.visualSlots.contactPicture'),
      t('settings.visualSizePortrait'),
    ),
    place('help.banner', t('settings.visualSlots.helpBanner'), banner),
    place('wholesale.hero', t('settings.visualSlots.wholesaleHero'), t('settings.visualSizeSlide')),
    ...[1, 2, 3].map((number) =>
      place(
        `wholesale.card.${number}`,
        t('settings.visualSlots.wholesaleCard', { number }),
        t('settings.visualSizeTile'),
      ),
    ),
    place('wholesale.why', t('settings.visualSlots.wholesaleWhy'), t('settings.visualSizeTile')),
    place(
      'wholesale.community',
      t('settings.visualSlots.wholesaleCommunity'),
      t('settings.visualSizeTile'),
    ),
    place(
      'wholesale.flavour',
      t('settings.visualSlots.wholesaleFlavour'),
      t('settings.visualSizeSlide'),
    ),
    place('wholesale.map', t('settings.visualSlots.wholesaleMap'), t('settings.visualSizeSlide')),
    place('tea101.amount', t('settings.visualSlots.tea101Amount'), t('settings.visualSizeSlide')),
    ...helpCentre('uz', false).map((category) =>
      place(
        `help.${category.id}`,
        t('settings.visualSlots.helpCategory', { name: category.heading }),
        t('settings.visualSizeTile'),
      ),
    ),
    // The home page's pictured places, in its order (components/home): the first view, the range's
    // first family and the story's three pictured steps. The other `home.*` slots (the banners,
    // bento tiles, values band and pair of the earlier home page) keep their stored pictures but
    // are no longer shown, so they are not offered here.
    place('home.hero.1', t('settings.visualSlots.homeHero'), t('settings.visualSizeSlide')),
    place('home.bento.1', t('settings.visualSlots.homeRange'), t('settings.visualSizeTile')),
    place('home.values', t('settings.visualSlots.homeStoryGarden'), t('settings.visualSizeSlide')),
    place('home.feature', t('settings.visualSlots.homeStoryBrew'), t('settings.visualSizeSlide')),
    place('home.banner.3', t('settings.visualSlots.homeStoryGuest'), t('settings.visualSizeSlide')),
    place('menu.shop', t('settings.visualSlots.menuShop'), t('settings.visualSizeMenu')),
    place(
      'menu.collections',
      t('settings.visualSlots.menuCollections'),
      t('settings.visualSizeMenu'),
    ),
    place('menu.learn', t('settings.visualSlots.menuLearn'), t('settings.visualSizeMenu')),
    place('menu.about', t('settings.visualSlots.menuAbout'), t('settings.visualSizeMenu')),
    ...(categories ?? []).map((item) =>
      place(
        `banner:category:${item.id}`,
        t('settings.visualSlots.categoryBanner', { name: item.translations.uz.name }),
        banner,
      ),
    ),
    ...(collections ?? []).map((item) =>
      place(
        `banner:collection:${item.id}`,
        t('settings.visualSlots.collectionBanner', { name: item.translations.uz.name }),
        banner,
      ),
    ),
  ];
  return (
    <>
      <AdminPageHeader title={t('settings.title')} />
      <div className="space-y-6">
        <Panel title={t('settings.announcement')}>
          <AnnouncementForm value={settings.announcement} />
        </Panel>
        <Panel title={t('settings.contact')}>
          <p className="mb-4 text-body-sm text-fg-subtle">{t('settings.contactHint')}</p>
          <ContactForm value={settings.contact} />
        </Panel>
        <Panel title={t('settings.visuals')}>
          <p className="mb-4 text-body-sm text-fg-subtle">{t('settings.visualsHint')}</p>
          <VisualsManager places={places} />
        </Panel>
      </div>
    </>
  );
}
