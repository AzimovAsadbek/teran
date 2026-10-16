'use client';

import { useSyncExternalStore } from 'react';

/*
 * Whether the search overlay is open. Kept outside the header's components so the two buttons that
 * open it (an icon beside the menu button below 1280 px, the search box on wide screens) share one
 * overlay.
 */
let open = false;
const listeners = new Set<() => void>();

function setOpen(value: boolean): void {
  open = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const searchActions = {
  open: (): void => setOpen(true),
  close: (): void => setOpen(false),
};

export function useSearchOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}
