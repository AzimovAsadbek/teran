import { isStaffRole, type CategoryDto, type CurrentUserDto } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { Wordmark } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import { apiGetAsVisitor } from '@/lib/api/server';
import { getCategories, getCollections } from '@/lib/data/catalog';
import { hasSessionCookie, type HeaderAccount } from '@/lib/session';
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
    categories: categoryTree(categories),
    collections: collections.map(({ slug, name }) => ({ slug, name })),
  };
}

/** Top-level categories with their subcategories, from the API's flat, ordered list. */
function categoryTree(categories: CategoryDto[]): Navigation['categories'] {
  const node = (category: CategoryDto) => ({
    slug: category.slug,
    path: category.path,
    name: category.name,
    illustrationKey: category.illustrationKey,
  });
  return categories
    .filter((category) => category.parentSlug === null && category.productCount > 0)
    .map((top) => ({
      ...node(top),
      children: categories
        .filter((child) => child.parentSlug === top.slug && child.productCount > 0)
        .map(node),
    }));
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
 * Header modelled on the reference's reading order — category triggers left, wordmark centred,
 * utilities right — with TERAN's own identity. The menus render (and work) immediately; only their
 * category and collection lists stream in, so a menu opened early stays open when data arrives.
 */
export async function SiteHeader() {
  const t = await getTranslations('Common');
  const navigation = loadNavigation();
  const account = loadAccount();
  return (
    <>
      <AnnouncementBar />
      <StickyHeader>
        <header className="relative">
          <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 xl:h-[4.75rem]">
            <div className="flex min-w-0 items-center">
              <MobileMenu navigation={navigation} account={account} />
              <DesktopNav navigation={navigation} />
            </div>
            <Link
              href="/"
              aria-label={`TERAN — ${t('home')}`}
              className="flex justify-center rounded-control py-1"
            >
              <Wordmark priority />
            </Link>
            <HeaderActions account={account} />
          </div>
        </header>
      </StickyHeader>
    </>
  );
}
