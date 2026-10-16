'use client';

import { Search, ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SearchDialog } from '@/components/search/search-dialog';
import { searchActions, useSearchOpen } from '@/components/search/search-store';
import { IconButton } from '@/components/ui/button';
import { cartActions, useCart } from '@/features/cart/cart-store';
import type { HeaderAccount } from '@/lib/session';
import { AccountMenu } from './account-menu';

/**
 * Search beside the menu button below 1280 px, so the row is balanced around the centred wordmark
 * (menu and search on one side, account and bag on the other). It opens the same overlay as the
 * search box in HeaderActions.
 */
export function SearchButton() {
  const t = useTranslations('Nav');
  return (
    <IconButton
      label={t('search')}
      icon={<Search />}
      onClick={searchActions.open}
      aria-haspopup="dialog"
      className="xl:hidden"
    />
  );
}

/**
 * Wide screens: a search box-like button (easier to discover than an icon), account and bag.
 * Below 1280 px: account and bag as 44 px icon buttons with accessible names (search moves next to
 * the menu button, see SearchButton).
 */
export function HeaderActions({ account }: { account: Promise<HeaderAccount> }) {
  const t = useTranslations('Nav');
  const ts = useTranslations('Search');
  const searchOpen = useSearchOpen();
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
    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={searchActions.open}
        aria-haspopup="dialog"
        className="mr-2 hidden h-10 w-56 items-center gap-2.5 rounded-control border border-line bg-surface px-3.5 text-body-sm text-fg-subtle shadow-xs transition-[border-color,color] duration-150 hover:border-line-strong hover:text-fg xl:inline-flex"
      >
        <Search aria-hidden className="h-4 w-4 shrink-0" />
        <span className="truncate">{ts('label')}</span>
      </button>
      <AccountMenu account={account} />
      <IconButton
        label={t('cartCount', { count })}
        icon={<ShoppingBag />}
        onClick={cartActions.openDrawer}
        aria-haspopup="dialog"
        badge={count > 0 ? (count > 99 ? '99+' : count) : null}
        badgeBump={bump}
      />
      <SearchDialog open={searchOpen} onClose={searchActions.close} />
    </div>
  );
}
