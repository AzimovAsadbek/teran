import { isStaffRole, type CurrentUserDto } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { Wordmark } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import { apiGetAsVisitor } from '@/lib/api/server';
import { getCategories, getCollections } from '@/lib/data/catalog';
import { getArticles, getPublicSettings } from '@/lib/data/content';
import {
  categoryTree,
  navArticles,
  navCollections,
  type MenuPicture,
  type Navigation,
} from '@/lib/navigation';
import { visualFor } from '@/lib/visuals';
import { hasSessionCookie, type HeaderAccount } from '@/lib/session';
import { AnnouncementBar } from './announcement-bar';
import { DesktopNav } from './desktop-nav';
import { HeaderActions } from './header-actions';
import { MobileMenu } from './mobile-menu';
import { StickyHeader } from './sticky-header';

/** Never rejects: without navigation data the menus still offer their fixed links. */
async function loadNavigation(): Promise<Navigation> {
  await connection();
  const locale = await getLocale();
  const [categories, collections, articles, settings] = await Promise.all([
    getCategories(locale).catch(() => []),
    getCollections(locale).catch(() => []),
    getArticles(locale, 1, 5, true)
      .then((page) => page.items)
      .catch(() => []),
    getPublicSettings(locale).catch(() => null),
  ]);
  const pictures: Navigation['pictures'] = {};
  for (const menu of ['shop', 'collections', 'learn', 'about'] satisfies MenuPicture[]) {
    const picture = visualFor(settings, `menu.${menu}`);
    if (picture) pictures[menu] = picture;
  }
  // The same tree feeds the desktop panels, the drawer and the home page's category sections.
  return {
    categories: categoryTree(categories),
    collections: navCollections(collections),
    articles: navArticles(articles),
    pictures,
  };
}

/**
 * Who is signed in, resolved on the server in the same response as the page: no request at all
 * without a session cookie, one API call with it. Never rejects (an expired session or an API
 * hiccup shows the signed-out state).
 */
async function loadAccount(): Promise<HeaderAccount> {
  const cookieStore = await cookies();
  if (!hasSessionCookie(cookieStore)) return null;
  const user = await apiGetAsVisitor<CurrentUserDto>('/auth/me').catch(() => null);
  return user ? { firstName: user.firstName, staff: isStaffRole(user.role) } : null;
}

/**
 * Header on the reference layout (docs/design/reference-map.md): a 50 px announcement band, then
 * an 88 px bar with four menu triggers on the left, the wordmark centred and utilities on the right
 * (business link, search, account, bag). Both stay on top while the page scrolls. Below 1280 px the
 * bar is 48 px: menu on the left, wordmark centred, search and bag on the right (account and
 * language move into the drawer). The menus render and work immediately; only their lists stream in.
 */
export async function SiteHeader() {
  const t = await getTranslations('Common');
  const navigation = loadNavigation();
  const account = loadAccount();
  return (
    <StickyHeader>
      <AnnouncementBar />
      <header className="relative border-b border-line bg-canvas">
        <div className="container-page grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-2 xl:h-[5.5rem] xl:gap-6">
          <div className="flex items-center xl:min-w-0 xl:self-stretch">
            <MobileMenu navigation={navigation} account={account} />
            <DesktopNav navigation={navigation} />
          </div>
          <Link
            href="/"
            aria-label={`TERAN — ${t('home')}`}
            className="flex justify-center rounded-control py-1"
          >
            <Wordmark eager />
          </Link>
          <HeaderActions account={account} />
        </div>
      </header>
    </StickyHeader>
  );
}
