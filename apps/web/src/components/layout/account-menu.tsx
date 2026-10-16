'use client';

import { ChevronDown, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, use, useEffect, useRef } from 'react';
import { useLogout } from '@/components/account/logout';
import { iconButtonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import type { HeaderAccount } from '@/lib/session';

/*
 * Same footprint in every state, so the header does not shift when the account state arrives.
 * Below 360 px the row has no room for it beside the menu, wordmark, search and bag (it would push
 * the wordmark over the menu button); the drawer offers the same links there.
 */
const SLOT = 'flex items-center justify-end max-[22.5rem]:hidden lg:min-w-[10.5rem]';
const TEXT_LINK =
  'inline-flex h-10 items-center rounded-control px-2.5 text-body-sm font-semibold whitespace-nowrap text-fg transition-colors duration-150 hover:text-brand';

/**
 * Sign-in and registration for visitors, an account menu for customers. The state is resolved on
 * the server in the same response as the page (see SiteHeader); until it streams in, the slot
 * shows an account icon that already works.
 */
export function AccountMenu({ account }: { account: Promise<HeaderAccount> }) {
  return (
    <Suspense fallback={<AccountFallback />}>
      <ResolvedAccountMenu account={account} />
    </Suspense>
  );
}

function AccountFallback() {
  const t = useTranslations('Nav');
  return (
    <div className={SLOT}>
      <Link href="/account" aria-label={t('account')} className={iconButtonClasses('ghost', 'md')}>
        <UserRound aria-hidden />
      </Link>
    </div>
  );
}

function ResolvedAccountMenu({ account }: { account: Promise<HeaderAccount> }) {
  const user = use(account);
  return user ? <CustomerMenu user={user} /> : <GuestLinks />;
}

function GuestLinks() {
  const t = useTranslations('Nav');
  return (
    <div className={SLOT}>
      <Link
        href="/account/login"
        aria-label={t('signIn')}
        className={iconButtonClasses('ghost', 'md', 'lg:hidden')}
      >
        <UserRound aria-hidden />
      </Link>
      <div className="hidden items-center lg:flex">
        <Link href="/account/login" className={cn(TEXT_LINK, 'gap-1.5')}>
          <UserRound aria-hidden className="h-4 w-4" />
          {t('signIn')}
        </Link>
        <span aria-hidden className="h-4 w-px bg-line" />
        <Link href="/account/register" className={TEXT_LINK}>
          {t('register')}
        </Link>
      </div>
    </div>
  );
}

/**
 * Disclosure menu (a <details> element, so it opens with Enter, Space or a click even before the
 * page is interactive). With JavaScript, Esc closes it and returns focus to the button, and a
 * click outside or following a link closes it.
 */
function CustomerMenu({ user }: { user: NonNullable<HeaderAccount> }) {
  const t = useTranslations('Nav');
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { pending, logout } = useLogout();

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const onPointerDown = (event: PointerEvent) => {
      if (details.open && event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !details.open) return;
      details.open = false;
      details.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const close = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };
  const item =
    'flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-body-sm font-medium text-fg transition-colors hover:bg-surface-muted hover:text-brand';

  return (
    <div className={SLOT}>
      <details ref={detailsRef} className="group relative">
        <summary
          aria-label={t('accountMenu')}
          className={cn(
            iconButtonClasses('ghost', 'md'),
            'cursor-pointer list-none lg:w-auto lg:gap-1.5 lg:rounded-control lg:px-3 [&::-webkit-details-marker]:hidden',
          )}
        >
          <UserRound aria-hidden />
          <span className="hidden max-w-[7rem] truncate text-body-sm font-semibold lg:inline">
            {user.firstName}
          </span>
          <ChevronDown
            aria-hidden
            className="hidden h-4 w-4 transition-transform duration-150 group-open:rotate-180 lg:block"
          />
        </summary>
        <div className="absolute top-full right-0 z-40 mt-2 w-64 rounded-card border border-line bg-surface p-2 shadow-overlay motion-safe:animate-pop-in">
          <p className="truncate px-3 pt-2 pb-2.5 text-caption text-fg-subtle">
            {t('signedInAs', { name: user.firstName })}
          </p>
          <nav aria-label={t('accountMenu')}>
            <ul onClick={(event) => (event.target as HTMLElement).closest('a') && close()}>
              <li>
                <Link href="/account" className={item}>
                  {t('myAccount')}
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className={item}>
                  {t('myOrders')}
                </Link>
              </li>
              <li>
                <Link href="/account/addresses" className={item}>
                  {t('addresses')}
                </Link>
              </li>
              {user.staff ? (
                <li>
                  <Link href="/admin" className={item}>
                    <ShieldCheck aria-hidden className="h-4 w-4 text-fg-subtle" />
                    {t('staffArea')}
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
          <div className="mt-1 border-t border-line-subtle pt-1">
            <button
              type="button"
              onClick={() => void logout()}
              disabled={pending}
              aria-busy={pending}
              className={cn(item, 'disabled:opacity-60')}
            >
              <LogOut aria-hidden className="h-4 w-4 text-fg-subtle" />
              {t('signOut')}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
