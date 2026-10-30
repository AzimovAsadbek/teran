'use client';

import { BUSINESS_TYPES, type BusinessType } from '@teran/contracts/constants';
import { useSearchParams } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

/*
 * The kind of business a visitor came from (`/wholesale?type=HOTEL#request`, the home page's
 * business index), handed to the request form that is already on the page: the form takes it as
 * its chosen kind without being rendered again, so nothing typed is lost (as the contact form's
 * order line, ./order-line.ts).
 */

let linked: BusinessType | null = null;
const listeners = new Set<() => void>();

function setLinked(value: BusinessType | null) {
  linked = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The kind of business named in the page's address, else null. */
export function useLinkedBusinessType(): BusinessType | null {
  return useSyncExternalStore(
    subscribe,
    () => linked,
    () => null,
  );
}

/** Reads `?type=` (inside a Suspense boundary) and announces it to the form. */
export function BusinessTypeFromLink() {
  const type = useSearchParams().get('type');
  const value = BUSINESS_TYPES.find((known) => known === type) ?? null;
  useEffect(() => {
    setLinked(value);
    return () => setLinked(null);
  }, [value]);
  return null;
}
