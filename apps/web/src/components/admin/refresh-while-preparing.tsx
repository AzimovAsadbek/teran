'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

/**
 * While a film on the list is being made ready (ADR-062), the list looks again every few seconds,
 * so its "being prepared" mark turns into "ready" (or "refused") without a reload.
 */
export function RefreshWhilePreparing({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(timer);
  }, [active, router]);
  return null;
}
