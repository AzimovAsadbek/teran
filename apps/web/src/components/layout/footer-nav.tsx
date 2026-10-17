'use client';

import type { ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';

/**
 * The footer's link columns, which change on the for-business page as the reference's do on its
 * wholesale page (its own two short columns). The path is URL data, so this renders inside
 * Suspense with the standard columns as the fallback.
 */
export function FooterNavSwitch({
  standard,
  business,
}: {
  standard: ReactNode;
  business: ReactNode;
}) {
  const pathname = usePathname();
  return pathname === '/wholesale' ? business : standard;
}
