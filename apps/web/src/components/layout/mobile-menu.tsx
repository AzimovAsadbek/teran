'use client';

import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, use, useId, useState, type MouseEvent } from 'react';
import { useLogout } from '@/components/account/logout';
import { CategoryThumb } from '@/components/catalog/category-thumb';
import { IconButton } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { EMPTY_NAVIGATION, type NavCategoryTree, type Navigation } from '@/lib/navigation';
import type { HeaderAccount } from '@/lib/session';
import { LanguageSwitcherSlot } from './language-switcher';

const ROW =
  'flex min-h-12 items-center justify-between gap-3 py-3 text-body font-medium text-fg transition-colors hover:text-brand';
const HEADING = 'text-eyebrow text-accent-fg';
/** Up to this many top-level categories, the first with subcategories starts open. */
const OPEN_FIRST_UP_TO = 3;

/**
 * Drawer navigation below 1280 px, from the same category tree as the desktop panels: the
 * catalogue first (each top-level category opens like an accordion to show its subcategories and
 * a link to the whole category), then collections, the brand's pages, help and the account. The
 * button and drawer work before the navigation data arrives; only the lists stream in, so a drawer
 * opened early stays open. Its contents are rendered the first time it opens (no page carries them
 * in its HTML) and kept afterwards. Esc, the close button and following a link close it; focus
 * returns to the menu button (native dialog).
 */
export function MobileMenu({
  navigation,
  account,
}: {
  navigation: Promise<Navigation>;
  account: Promise<HeaderAccount>;
}) {
  const t = useTranslations('Nav');
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  if (open && !opened) setOpened(true);
  // Following any link closes the drawer (no need to watch the URL).
  const closeOnLink = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) setOpen(false);
  };

  const groups = [
    {
      title: t('brandWorld'),
      links: [
        ['/about', t('about')],
        ['/journal', t('journal')],
        ['/media/photos', t('photos')],
        ['/media/videos', t('videos')],
        ['/wholesale', t('wholesale')],
      ],
    },
    {
      title: t('help'),
      links: [
        ['/contact', t('contact')],
        ['/delivery', t('delivery')],
        ['/faq', t('faq')],
      ],
    },
  ] as const;

  return (
    <>
      <IconButton
        label={t('openMenu')}
        icon={<Menu />}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="-ml-2 xl:hidden"
      />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        side="left"
        title={t('explore')}
        closeLabel={t('closeMenu')}
        footer={
          opened ? (
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-11 items-center gap-2 text-title-sm text-fg hover:text-brand"
              >
                <UserRound aria-hidden className="h-5 w-5" />
                {t('account')}
              </Link>
              <LanguageSwitcherSlot tone="light" />
            </div>
          ) : null
        }
      >
        {opened ? (
          <div className="space-y-9 px-5 py-6 sm:px-6" onClick={closeOnLink}>
            <Suspense fallback={<CatalogueLinks navigation={EMPTY_NAVIGATION} />}>
              <StreamedCatalogueLinks navigation={navigation} />
            </Suspense>

            <div className="grid gap-8 sm:grid-cols-2">
              {groups.map((group) => (
                <nav key={group.title} aria-label={group.title}>
                  <h3 className={HEADING}>{group.title}</h3>
                  <ul className="mt-2 divide-y divide-line-subtle border-y border-line-subtle">
                    {group.links.map(([href, label]) => (
                      <li key={href}>
                        <Link href={href} className={ROW}>
                          {label}
                          <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-fg-subtle" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>

            <Suspense fallback={null}>
              <AccountLinks account={account} onDone={() => setOpen(false)} />
            </Suspense>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function StreamedCatalogueLinks({ navigation }: { navigation: Promise<Navigation> }) {
  return <CatalogueLinks navigation={use(navigation)} />;
}

/** The catalogue: categories (accordion), "all products" and collections (empty while loading). */
function CatalogueLinks({ navigation }: { navigation: Navigation }) {
  const t = useTranslations('Nav');
  const { categories, collections } = navigation;
  const firstWithChildren =
    categories.length <= OPEN_FIRST_UP_TO
      ? categories.find((category) => category.children.length > 0)?.slug
      : undefined;
  return (
    <>
      <nav aria-label={t('shop')}>
        <h3 className={HEADING}>{t('shop')}</h3>
        <ul className="mt-3 space-y-2">
          {categories.map((category) => (
            <li key={category.slug}>
              {category.children.length > 0 ? (
                <CategoryAccordion
                  category={category}
                  defaultOpen={category.slug === firstWithChildren}
                />
              ) : (
                <Link href={`/${category.path}`} className={CATEGORY_ROW}>
                  <CategoryLabel
                    category={category}
                    count={t('menuCount', { count: category.productCount })}
                  />
                  <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-fg-subtle" />
                </Link>
              )}
            </li>
          ))}
        </ul>
        <Link
          href="/catalog"
          className="mt-3 flex min-h-12 items-center justify-between rounded-card bg-surface-inverse px-4 text-title-sm text-fg-inverse transition-colors hover:bg-forest-800"
        >
          {t('shopAll')}
          <ArrowRight aria-hidden className="h-4 w-4 text-accent-on-inverse" />
        </Link>
        <Link
          href="/assistant"
          className="mt-2 flex min-h-12 items-center gap-2 rounded-card border border-line bg-surface px-4 text-title-sm text-forest-900 transition-colors hover:border-gold-400"
        >
          <Sparkles aria-hidden className="h-4 w-4 text-accent-fg" />
          {t('assistant')}
        </Link>
      </nav>

      {collections.length > 0 ? (
        <nav aria-label={t('collections')}>
          <h3 className={HEADING}>{t('collections')}</h3>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {collections.map((collection) => (
              <li key={collection.slug} className="min-w-0">
                <Link
                  href={`/collections/${collection.slug}`}
                  className="flex h-full min-h-16 flex-col justify-center rounded-control border border-line-subtle bg-surface px-3 py-2.5 transition-colors hover:border-gold-400"
                >
                  <span className="text-body-sm font-semibold break-words text-fg">
                    {collection.name}
                  </span>
                  <span className="text-caption text-fg-subtle">
                    {t('menuCount', { count: collection.productCount })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </>
  );
}

const CATEGORY_ROW =
  'flex w-full min-h-16 items-center gap-3 rounded-card border border-line bg-surface px-3 py-2.5 text-left transition-colors duration-150 hover:border-gold-400';

function CategoryLabel({
  category,
  count,
}: {
  category: Pick<NavCategoryTree, 'name' | 'illustrationKey' | 'image'>;
  count: string;
}) {
  return (
    <>
      <CategoryThumb
        image={category.image}
        illustrationKey={category.illustrationKey}
        className="h-10 w-10"
        inset="p-1.5"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-title-sm break-words text-fg">{category.name}</span>
        <span className="block text-caption text-fg-subtle">{count}</span>
      </span>
    </>
  );
}

/**
 * A top-level category with subcategories: the row opens and closes the list (a disclosure
 * button), which starts with a link to the whole category.
 */
function CategoryAccordion({
  category,
  defaultOpen,
}: {
  category: NavCategoryTree;
  defaultOpen: boolean;
}) {
  const t = useTranslations('Nav');
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();
  return (
    <div className={cn('rounded-card', open && 'bg-ivory-100/70')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={regionId}
        onClick={() => setOpen((value) => !value)}
        className={cn(CATEGORY_ROW, open && 'border-gold-400/60')}
      >
        <CategoryLabel
          category={category}
          count={t('menuCount', { count: category.productCount })}
        />
        <ChevronDown
          aria-hidden
          className={cn(
            'h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-200 motion-reduce:transition-none',
            open && 'rotate-180 text-accent-fg',
          )}
        />
      </button>
      <ul id={regionId} hidden={!open} className="space-y-0.5 px-2 pt-1.5 pb-2">
        <li>
          <Link
            href={`/${category.path}`}
            className="flex min-h-12 items-center justify-between gap-3 rounded-control px-3 text-body font-semibold text-forest-900 hover:bg-surface"
          >
            {t('shopIn', { name: category.name })}
            <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-accent-fg" />
          </Link>
        </li>
        {category.children.map((child) => (
          <li key={child.slug}>
            <Link
              href={`/${child.path}`}
              className="flex min-h-12 items-center gap-3 rounded-control px-3 py-1.5 transition-colors hover:bg-surface"
            >
              <CategoryThumb
                image={child.image}
                illustrationKey={child.illustrationKey}
                className="h-8 w-8"
              />
              <span className="min-w-0 flex-1 text-body break-words text-fg">{child.name}</span>
              <span aria-hidden className="shrink-0 text-caption text-fg-subtle">
                {child.productCount > 0 ? child.productCount : t('menuSoon')}
              </span>
              <span className="sr-only">{t('menuCount', { count: child.productCount })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Sign-in and registration, or the customer's account shortcuts and sign-out. */
function AccountLinks({
  account,
  onDone,
}: {
  account: Promise<HeaderAccount>;
  onDone: () => void;
}) {
  const t = useTranslations('Nav');
  const user = use(account);
  const { pending, logout } = useLogout();
  const links = user
    ? ([
        ['/account', t('myAccount')],
        ['/account/orders', t('myOrders')],
        ['/account/addresses', t('addresses')],
        ...(user.staff ? ([['/admin', t('staffArea')]] as const) : []),
      ] as const)
    : ([
        ['/account/login', t('signIn')],
        ['/account/register', t('register')],
      ] as const);
  return (
    <section>
      <h3 className={HEADING}>{user ? t('signedInAs', { name: user.firstName }) : t('account')}</h3>
      <ul className="mt-2 divide-y divide-line-subtle border-y border-line-subtle">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className={ROW}>
              {label}
              <ChevronRight aria-hidden className="h-4 w-4 text-fg-subtle" />
            </Link>
          </li>
        ))}
        {user ? (
          <li>
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              onClick={() => {
                onDone();
                void logout();
              }}
              className={`${ROW} w-full disabled:opacity-60`}
            >
              {t('signOut')}
              <LogOut aria-hidden className="h-4 w-4 text-fg-subtle" />
            </button>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
