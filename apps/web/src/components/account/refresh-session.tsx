'use client';

import { useEffect } from 'react';
import { apiRequest } from '@/lib/api/client';

export function RefreshSession() {
  useEffect(() => {
    const period = 15 * 60_000;
    let last = Date.now();
    function refresh() {
      if (document.visibilityState !== 'visible' || Date.now() - last < period) return;
      last = Date.now();
      void apiRequest('/auth/session/refresh', { method: 'POST' }).catch(() => {});
    }
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return null;
}
