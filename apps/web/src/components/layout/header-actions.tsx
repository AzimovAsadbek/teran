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
 * The bar's right side, as on the reference: its store finder as a text link with a solid pin,
 * then search, account and bag as 44 px icons. Below 1280 px only search and bag stay here
 * (account and language are in the drawer).
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
        href="/stores"
        className="hidden h-11 items-center gap-1 text-[0.9375rem] leading-6 font-medium whitespace-nowrap text-fg xl:inline-flex"
      >
        <PinMark />
        {t('findStore')}
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

/** The reference's solid location pin, 21 px. */
function PinMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[1.34rem] w-[1.34rem] text-fg">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 1.6a7.6 7.6 0 0 0-7.6 7.6c0 5.6 6.6 12.4 6.9 12.7a1 1 0 0 0 1.4 0c.3-.3 6.9-7.1 6.9-12.7A7.6 7.6 0 0 0 12 1.6Zm0 10.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
      />
    </svg>
  );
}
