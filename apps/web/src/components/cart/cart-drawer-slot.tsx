'use client';

import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { cartActions, useCart } from '@/features/cart/cart-store';
import { whenIdle } from '@/lib/when-idle';
import { showPrices } from '@/lib/site';

const loadDrawer = () => import('./cart-drawer');
const CartDrawer = dynamic(() => loadDrawer().then((module) => module.CartDrawer), {
  ssr: false,
});

/**
 * The bag drawer, kept off the page's first load: the bag itself is fetched at once (the header
 * shows its count), the drawer's code once the page is idle, so it is ready before anyone opens
 * it and still opens with its slide-in. Opened earlier than that, it appears as soon as its code
 * arrives.
 */
export function CartDrawerSlot() {
  const locale = useLocale();
  const { drawerOpen } = useCart();
  const [ready, setReady] = useState(false);
  if (drawerOpen && !ready) setReady(true);

  useEffect(() => {
    if (showPrices) void cartActions.load(locale);
  }, [locale]);

  useEffect(
    () =>
      showPrices
        ? whenIdle(() => {
            void loadDrawer().then(() => setReady(true));
          })
        : undefined,
    [],
  );

  return showPrices && ready ? <CartDrawer /> : null;
}
