'use client';

import { Search, ShoppingBag, Store } from 'lucide-react';
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

const loadSearch = () => import('@/components/search/search-dialog');
const SearchDialog = dynamic(() => loadSearch().then((module) => module.SearchDialog), {
  ssr: false,
});

/**
 * The bar's right side, as on the reference: a text utility link with its icon (TERAN's business
 * page, where the reference has its store finder), then search, account and bag as 44 px icons.
 * Below 1280 px only search and bag stay here (account and language are in the drawer).
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
    <div className="flex items-center justify-end xl:gap-4">
      <Link
        href="/wholesale"
        className="mr-3 hidden h-11 items-center gap-2 text-[0.9375rem] font-medium whitespace-nowrap text-fg transition-colors duration-150 hover:text-brand xl:inline-flex"
      >
        <Store aria-hidden className="h-5 w-5 text-forest-900" />
        {t('wholesale')}
      </Link>
      <IconButton
        label={t('search')}
        icon={<Search />}
        onClick={searchActions.open}
        onPointerEnter={() => void loadSearch()}
        onFocus={() => void loadSearch()}
        aria-haspopup="dialog"
      />
      <AccountMenu account={account} />
      <IconButton
        label={t('cartCount', { count })}
        icon={<ShoppingBag />}
        onClick={cartActions.openDrawer}
        aria-haspopup="dialog"
        badge={count > 0 ? (count > 99 ? '99+' : count) : null}
        badgeBump={bump}
        className="-mr-2 xl:mr-0"
      />
      {searchReady ? <SearchDialog open={searchOpen} onClose={searchActions.close} /> : null}
    </div>
  );
}
