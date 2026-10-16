'use client';

import type { Locale } from '@teran/contracts';
import { LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cartActions } from '@/features/cart/cart-store';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/*
 * Kept apart from the account forms: the site header signs people out on every page, and should
 * not pull the form validation code in with it.
 */

/** Signs out, then shows the empty bag of a signed-out visitor and goes home. */
export function useLogout(): { pending: boolean; logout: () => Promise<void> } {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      // The API also clears the bag cookie, so the next visitor starts from an empty bag.
      void cartActions.load(locale, true);
      router.replace('/');
      router.refresh();
    }
  }

  return { pending, logout };
}

export function LogoutButton() {
  const t = useTranslations('Account');
  const { pending, logout } = useLogout();

  return (
    <Button variant="ghost" onClick={() => void logout()} loading={pending}>
      {pending ? null : <LogOut aria-hidden className="h-4 w-4" />}
      {t('logout')}
    </Button>
  );
}
