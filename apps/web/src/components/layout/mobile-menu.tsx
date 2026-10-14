'use client';

import { ArrowRight, ChevronRight, LogOut, Menu, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, use, useState, type MouseEvent } from 'react';
import { useLogout } from '@/components/account/account-forms';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { IconButton } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';
import type { HeaderAccount } from '@/lib/session';
import type { Navigation } from './desktop-nav';
import { LanguageSwitcherSlot } from './language-switcher';

const ROW =
  'flex min-h-12 items-center justify-between gap-3 py-3 text-body font-medium text-fg transition-colors hover:text-brand';

/**
 * Drawer navigation below 1280 px: categories first (the way shoppers browse), then collections,
 * the rest and the account. The button and drawer work before the navigation data arrives; only
 * the lists stream in, so a drawer opened early stays open.
 */
export function MobileMenu({
  navigation,
  account,
}: {
  navigation: Promise<Navigation>;
  account: Promise<HeaderAccount>;
}) {
  const t = useTranslations('Nav');
  const tc = useTranslations('Common');
  const [open, setOpen] = useState(false);
  // Following any link closes the drawer (no need to watch the URL).
  const closeOnLink = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) setOpen(false);
  };

  const links = [
    ['/wholesale', t('wholesale')],
    ['/journal', t('journal')],
    ['/about', t('about')],
    ['/contact', t('contact')],
    ['/faq', t('faq')],
    ['/delivery', t('delivery')],
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
        }
      >
        <div className="space-y-8 px-5 py-6 sm:px-6" onClick={closeOnLink}>
          <Suspense fallback={<CatalogueLinks categories={[]} collections={[]} />}>
            <StreamedCatalogueLinks navigation={navigation} />
          </Suspense>

          <nav aria-label={tc('home')}>
            <ul className="divide-y divide-line-subtle border-y border-line-subtle">
              {links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className={ROW}>
                    {label}
                    <ChevronRight aria-hidden className="h-4 w-4 text-fg-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Suspense fallback={null}>
            <AccountLinks account={account} onDone={() => setOpen(false)} />
          </Suspense>
        </div>
      </Sheet>
    </>
  );
}

function StreamedCatalogueLinks({ navigation }: { navigation: Promise<Navigation> }) {
  return <CatalogueLinks {...use(navigation)} />;
}

/** Categories with their subcategories, "all products" and collections (empty while loading). */
function CatalogueLinks({ categories, collections }: Navigation) {
  const t = useTranslations('Nav');
  return (
    <>
      <section className="space-y-5">
        <h3 className="text-eyebrow text-accent-fg">{t('shop')}</h3>
        {categories.map((category) => (
          <div key={category.slug}>
            <Link
              href={`/${category.path}`}
              className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 text-title-sm text-fg transition-colors duration-150 hover:border-gold-400"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted p-1.5">
                <TeaTypeArt kind={category.illustrationKey} />
              </span>
              <span className="min-w-0 flex-1 leading-snug">{category.name}</span>
              <ChevronRight aria-hidden className="h-4 w-4 text-fg-subtle" />
            </Link>
            {category.children.length > 0 ? (
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {category.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/${child.path}`}
                      className="flex min-h-11 items-center gap-2 rounded-control border border-line-subtle bg-surface px-3 text-body-sm font-medium text-fg transition-colors hover:border-gold-400"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted p-1">
                        <TeaTypeArt kind={child.illustrationKey} />
                      </span>
                      <span className="min-w-0 leading-snug">{child.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
        <Link
          href="/catalog"
          className="flex min-h-12 items-center justify-between rounded-card bg-surface-inverse px-4 text-title-sm text-fg-inverse transition-colors hover:bg-forest-800"
        >
          {t('shopAll')}
          <ArrowRight aria-hidden className="h-4 w-4 text-accent-on-inverse" />
        </Link>
      </section>

      {collections.length > 0 ? (
        <section>
          <h3 className="text-eyebrow text-accent-fg">{t('collections')}</h3>
          <ul className="mt-2 divide-y divide-line-subtle">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link href={`/collections/${collection.slug}`} className={ROW}>
                  {collection.name}
                  <ChevronRight aria-hidden className="h-4 w-4 text-fg-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
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
      <h3 className="text-eyebrow text-accent-fg">
        {user ? t('signedInAs', { name: user.firstName }) : t('account')}
      </h3>
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
