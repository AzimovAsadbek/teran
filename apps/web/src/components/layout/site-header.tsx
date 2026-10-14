import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Wordmark } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import { getCategories, getCollections } from '@/lib/data/catalog';
import { AnnouncementBar } from './announcement-bar';
import { DesktopNav, type Navigation } from './desktop-nav';
import { HeaderActions } from './header-actions';
import { MobileMenu } from './mobile-menu';
import { StickyHeader } from './sticky-header';

/** Never rejects: without navigation data the menus still offer their fixed links. */
async function loadNavigation(): Promise<Navigation> {
  await connection();
  const locale = await getLocale();
  const [categories, collections] = await Promise.all([
    getCategories(locale).catch(() => []),
    getCollections(locale).catch(() => []),
  ]);
  return {
    categories: categories.map(({ slug, name, illustrationKey }) => ({
      slug,
      name,
      illustrationKey,
    })),
    collections: collections.map(({ slug, name }) => ({ slug, name })),
  };
}

/**
 * Header modelled on the reference's reading order — category triggers left, wordmark centred,
 * utilities right — with TERAN's own identity. The menus render (and work) immediately; only their
 * category and collection lists stream in, so a menu opened early stays open when data arrives.
 */
export async function SiteHeader() {
  const t = await getTranslations('Common');
  const navigation = loadNavigation();
  return (
    <>
      <AnnouncementBar />
      <StickyHeader>
        <header className="relative">
          <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 xl:h-[4.75rem]">
            <div className="flex min-w-0 items-center">
              <MobileMenu navigation={navigation} />
              <DesktopNav navigation={navigation} />
            </div>
            <Link
              href="/"
              aria-label={`TERAN — ${t('home')}`}
              className="flex justify-center rounded-control py-1"
            >
              <Wordmark priority />
            </Link>
            <HeaderActions />
          </div>
        </header>
      </StickyHeader>
    </>
  );
}
