'use client';

import type { ProductSummaryDto } from '@teran/contracts';
import { useEffect, useSyncExternalStore } from 'react';
import { ProductRail, type RailLabels } from '@/components/home/product-rail';

const STORAGE_KEY = 'teran:recently-viewed';
const LIMIT = 8;
const EMPTY: ProductSummaryDto[] = [];

/*
 * The list lives in this device's local storage only (nothing is sent anywhere). The store below
 * lets React read it without an effect: the parsed list is cached per stored string, so the
 * snapshot stays the same object until the list really changes.
 */
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedItems: ProductSummaryDto[] = EMPTY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function getSnapshot(): ProductSummaryDto[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      cachedItems = Array.isArray(parsed) ? (parsed as ProductSummaryDto[]) : EMPTY;
    } catch {
      cachedItems = EMPTY;
    }
  }
  return cachedItems;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function remember(product: ProductSummaryDto) {
  const previous = getSnapshot().filter((item) => item.id !== product.id);
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([product, ...previous].slice(0, LIMIT)),
    );
  } catch {
    // Private mode or blocked storage: the row simply stays empty.
    return;
  }
  for (const listener of listeners) listener();
}

/**
 * The reference's "recently viewed" row: products this browser opened before, newest first,
 * without the current one. Shows nothing on a first visit or when storage is unavailable (and
 * nothing during server rendering, so the page hydrates without a mismatch).
 */
export function RecentlyViewed({
  current,
  title,
  cta,
  labels,
}: {
  current: ProductSummaryDto;
  title: string;
  cta: string;
  labels: RailLabels;
}) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const items = stored.filter((item) => item.id !== current.id).slice(0, LIMIT);

  // Recording the visit updates the external store (local storage), not React state.
  useEffect(() => {
    remember(current);
  }, [current]);

  if (items.length === 0) return null;
  return (
    <ProductRail
      tabs={[{ id: 'recent', label: title, products: items, href: '/catalog', cta }]}
      labels={labels}
      heading="serif"
    />
  );
}
