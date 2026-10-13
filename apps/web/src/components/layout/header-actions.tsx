'use client';

import { Search, ShoppingBag, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { SearchDialog } from '@/components/search/search-dialog';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { Link } from '@/i18n/navigation';

const ICON_BUTTON =
  'relative inline-flex h-11 w-11 items-center justify-center rounded-full text-forest-900 transition-colors hover:bg-forest-900/[0.06]';

export function HeaderActions() {
  const t = useTranslations('Nav');
  const [searchOpen, setSearchOpen] = useState(false);
  const { cart } = useCart();
  const count = cart?.itemCount ?? 0;

  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label={t('search')}
        className={ICON_BUTTON}
      >
        <Search aria-hidden className="h-5 w-5" />
      </button>
      <Link
        href="/account"
        aria-label={t('account')}
        className={`${ICON_BUTTON} hidden sm:inline-flex`}
      >
        <UserRound aria-hidden className="h-5 w-5" />
      </Link>
      <button
        type="button"
        onClick={cartActions.openDrawer}
        aria-label={t('cartCount', { count })}
        className={ICON_BUTTON}
      >
        <ShoppingBag aria-hidden className="h-5 w-5" />
        {count > 0 ? (
          <span
            aria-hidden
            className="absolute top-1 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-500 px-1 text-[0.68rem] font-bold text-forest-950 tabular-nums"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
