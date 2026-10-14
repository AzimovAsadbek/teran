'use client';

import { Search, ShoppingBag, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SearchDialog } from '@/components/search/search-dialog';
import { IconButton, iconButtonClasses } from '@/components/ui/button';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { Link } from '@/i18n/navigation';

/**
 * Search, account and bag. Wide screens show a search box-like button (easier to discover than an
 * icon); every other breakpoint uses 44 px icon buttons with accessible names.
 */
export function HeaderActions() {
  const t = useTranslations('Nav');
  const ts = useTranslations('Search');
  const [searchOpen, setSearchOpen] = useState(false);
  const { cart } = useCart();
  const count = cart?.itemCount ?? 0;
  const openSearch = () => setSearchOpen(true);

  return (
    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={openSearch}
        aria-haspopup="dialog"
        className="mr-2 hidden h-10 w-56 items-center gap-2.5 rounded-control border border-line bg-surface px-3.5 text-body-sm text-fg-subtle shadow-xs transition-[border-color,color] duration-150 hover:border-line-strong hover:text-fg xl:inline-flex"
      >
        <Search aria-hidden className="h-4 w-4 shrink-0" />
        <span className="truncate">{ts('label')}</span>
      </button>
      <IconButton
        label={t('search')}
        icon={<Search />}
        onClick={openSearch}
        aria-haspopup="dialog"
        className="xl:hidden"
      />
      <Link href="/account" aria-label={t('account')} className={iconButtonClasses('ghost', 'md')}>
        <UserRound aria-hidden />
      </Link>
      <IconButton
        label={t('cartCount', { count })}
        icon={<ShoppingBag />}
        onClick={cartActions.openDrawer}
        aria-haspopup="dialog"
        badge={count > 0 ? (count > 99 ? '99+' : count) : null}
      />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
