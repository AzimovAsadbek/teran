import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Wordmark } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import { getCategories, getCollections } from '@/lib/data/catalog';
import { AnnouncementBar } from './announcement-bar';
import { DesktopNav, type NavCategory, type NavCollection } from './desktop-nav';
import { HeaderActions } from './header-actions';
import { MobileMenu } from './mobile-menu';
import { StickyHeader } from './sticky-header';

async function loadNavigation(): Promise<{
  categories: NavCategory[];
  collections: NavCollection[];
}> {
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

async function DesktopNavWithData() {
  const navigation = await loadNavigation();
  return <DesktopNav {...navigation} />;
}

async function MobileMenuWithData() {
  const navigation = await loadNavigation();
  return <MobileMenu {...navigation} />;
}

/**
 * Header modelled on the reference's reading order — category triggers left, wordmark centred,
 * utilities right — with TERAN's own identity. Navigation data streams in; until then the same
 * controls render with empty panels so layout never shifts.
 */
export async function SiteHeader() {
  const t = await getTranslations('Common');
  return (
    <>
      <AnnouncementBar />
      <StickyHeader>
        <header className="relative">
          <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 lg:h-[4.75rem]">
            <div className="flex items-center">
              <Suspense fallback={<MobileMenu categories={[]} collections={[]} />}>
                <MobileMenuWithData />
              </Suspense>
              <Suspense fallback={<DesktopNav categories={[]} collections={[]} />}>
                <DesktopNavWithData />
              </Suspense>
            </div>
            <Link href="/" aria-label={`TERAN — ${t('home')}`} className="flex justify-center">
              <Wordmark priority />
            </Link>
            <HeaderActions />
          </div>
        </header>
      </StickyHeader>
    </>
  );
}
