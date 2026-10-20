'use client';

import { useEffect, useSyncExternalStore } from 'react';

/*
 * The tea a visitor came to order (`/contact?tea=…`), handed from the order summary that streams
 * in above the contact form to the form itself, which is already on the page: the form takes it
 * into its subject and message without being rendered again, so nothing typed is lost.
 */

let line: string | null = null;
const listeners = new Set<() => void>();

function setOrderLine(value: string | null) {
  line = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The order line ("TERAN 8830 · 400 g") while an order summary is on the page, else null. */
export function useOrderLine(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => line,
    () => null,
  );
}

/** Announces the order line to the contact form for as long as it is mounted. */
export function OrderLine({ value }: { value: string }) {
  useEffect(() => {
    setOrderLine(value);
    return () => setOrderLine(null);
  }, [value]);
  return null;
}
