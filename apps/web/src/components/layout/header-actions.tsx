'use client';

import { Search, ShoppingBag } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { searchActions, useSearchOpen } from '@/components/search/search-store';
import { IconButton } from '@/components/ui/button';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { Link } from '@/i18n/navigation';
import type { HeaderAccount } from '@/lib/session';
import { whenIdle } from '@/lib/when-idle';
import { AccountMenu } from './account-menu';
import { showPrices } from '@/lib/site';

const loadSearch = () => import('@/components/search/search-dialog');
const SearchDialog = dynamic(() => loadSearch().then((module) => module.SearchDialog), {
  ssr: false,
});

/**
 * The bar's right side, as on the reference: a text link with a solid mark — here TERAN's way in
 * for businesses, where the reference has its store finder (TERAN sells mostly to businesses; the
 * store finder stays in the "About" menu, the drawer and the footer) — then search, account and
 * bag as 44 px icons. Below 1280 px only search and bag stay here (the drawer has the rest).
 */
export function HeaderActions({ account }: { account: Promise<HeaderAccount> }) {
  const t = useTranslations('Nav');
  const searchOpen = useSearchOpen();
  // The search's code is fetched once the page is idle (or when the button is pointed at), not
  // with the page; the dialog mounts once it is ready, so it still opens with its transition.
  const [searchReady, setSearchReady] = useState(false);
  if (searchOpen && !searchReady) setSearchReady(true);
  useEffect(() => whenIdle(() => void loadSearch().then(() => setSearchReady(true))), []);
  const { cart } = useCart();
  const count = cart?.itemCount ?? 0;

  // The badge pops when the count goes up after the bag has loaded (not on the first render).
  const [seenCount, setSeenCount] = useState<number | null>(null);
  const [bump, setBump] = useState(0);
  if (cart && seenCount !== count) {
    if (seenCount !== null && count > seenCount) setBump(bump + 1);
    setSeenCount(count);
  }

  return (
    // The reference's actions: 32 px apart (40 px from 1920 px) and unchanged when pointed at.
    <div className="flex items-center justify-end xl:gap-8 min-[120rem]:gap-10">
      <Link
        href="/wholesale"
        className="hidden h-11 items-center gap-1.5 text-[0.9375rem] leading-6 font-medium whitespace-nowrap text-fg xl:inline-flex"
      >
        <BriefcaseMark />
        {t('wholesale')}
      </Link>
      <IconButton
        label={t('search')}
        variant="plain"
        icon={<Search className="h-[1.77rem]! w-[1.77rem]!" />}
        onClick={searchActions.open}
        onPointerEnter={() => void loadSearch()}
        onFocus={() => void loadSearch()}
        aria-haspopup="dialog"
      />
      <AccountMenu account={account} />
      {showPrices ? (
        <IconButton
          label={t('cartCount', { count })}
          icon={<ShoppingBag />}
          onClick={cartActions.openDrawer}
          aria-haspopup="dialog"
          badge={count > 0 ? (count > 99 ? '99+' : count) : null}
          badgeBump={bump}
          className="-mr-2 xl:mr-0"
        />
      ) : null}
      {searchReady ? <SearchDialog open={searchOpen} onClose={searchActions.close} /> : null}
    </div>
  );
}

/** A solid briefcase, as large as the reference's solid pin (21 px). */
function BriefcaseMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[1.34rem] w-[1.34rem] text-fg">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M9 3.5A1.5 1.5 0 0 0 7.5 5v1.5H4.5A2.5 2.5 0 0 0 2 9v3.2c0 .5.3.9.8 1.1l7.2 2.6v-.9a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v.9l7.2-2.6c.5-.2.8-.6.8-1.1V9a2.5 2.5 0 0 0-2.5-2.5h-3V5A1.5 1.5 0 0 0 15 3.5H9Zm5.5 3V5.5h-5v1h5ZM2 15.4V18a2.5 2.5 0 0 0 2.5 2.5h15A2.5 2.5 0 0 0 22 18v-2.6l-8 2.9v.2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-.2l-8-2.9Z"
      />
    </svg>
  );
}
