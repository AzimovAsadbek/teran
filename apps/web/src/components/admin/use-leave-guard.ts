'use client';

import { useEffect, useRef } from 'react';

/**
 * Asks before leaving a page that would lose something (ADR-063): while `active`, a link to
 * another page of the site is held back and handed to `onAttempt` (which asks, then goes on with
 * the address it was given); with `unload`, closing or reloading the tab gets the browser's own
 * question too (kept for what cannot be had again, such as an upload under way).
 */
export function useLeaveGuard(
  active: boolean,
  onAttempt: (href: string) => void,
  unload = false,
): void {
  const attempt = useRef(onAttempt);
  useEffect(() => {
    attempt.current = onAttempt;
  });

  useEffect(() => {
    if (!active) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank') return;
      if (anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      // Held before the link's own handler (the router) sees it.
      event.preventDefault();
      event.stopPropagation();
      attempt.current(`${url.pathname}${url.search}${url.hash}`);
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    document.addEventListener('click', onClick, true);
    if (unload) window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [active, unload]);
}
