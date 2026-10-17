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
 * Same footprint in every state (a person icon with a chevron, as on the reference), so the bar
 * does not shift when the account state arrives. Below 1280 px the drawer offers the same links.
 */
const SLOT = 'hidden items-center xl:flex';
/** The reference's account button: a person and a teal caret, unchanged when pointed at. */
const SUMMARY =
  'inline-flex h-11 cursor-pointer list-none items-center gap-0 rounded-full px-1 text-fg [&::-webkit-details-marker]:hidden';
const PANEL =
  'absolute top-full right-0 z-40 mt-2 w-64 rounded-card border border-line bg-surface p-2 shadow-overlay motion-safe:animate-pop-in';
const ITEM =
  'flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-body-sm font-medium text-fg transition-colors hover:bg-surface-muted';

/** Esc closes an open <details> menu and returns focus to its button; a click outside closes it. */
function useDetailsDismiss() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
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
  return { detailsRef, close };
}

function AccountSummary({ label }: { label: string }) {
  return (
    <summary aria-label={label} className={SUMMARY}>
      <UserRound aria-hidden className="h-6 w-6" />
      <ChevronDown
        aria-hidden
        strokeWidth={2.25}
        className="ml-0.5 h-4 w-4 text-[#2d8f93] transition-transform duration-150 group-open:rotate-180"
      />
    </summary>
  );
}

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
  const { detailsRef, close } = useDetailsDismiss();
  return (
    <div className={SLOT}>
      <details ref={detailsRef} className="group relative">
        {/* "Account" for visitors; signed-in customers get the "Account menu". */}
        <AccountSummary label={t('account')} />
        <div className={PANEL}>
          <ul onClick={(event) => (event.target as HTMLElement).closest('a') && close()}>
            <li>
              <Link href="/account/login" className={ITEM}>
                <UserRound aria-hidden className="h-4 w-4 text-fg-subtle" />
                {t('signIn')}
              </Link>
            </li>
            <li>
              <Link href="/account/register" className={ITEM}>
                {t('register')}
              </Link>
            </li>
          </ul>
        </div>
      </details>
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
  const { detailsRef, close } = useDetailsDismiss();
  const { pending, logout } = useLogout();
  const item = ITEM;

  return (
    <div className={SLOT}>
      <details ref={detailsRef} className="group relative">
        <AccountSummary label={t('accountMenu')} />
        <div className={PANEL}>
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
