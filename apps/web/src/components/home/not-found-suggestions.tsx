'use client';

import type { ProductSummaryDto } from '@teran/contracts';
import { useLocale } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';
import { preload } from 'react-dom';
import { ProductRail } from '@/components/home/product-rail';

/**
 * "Discover something new" under the missing page: TERAN's featured teas, fetched once the missing
 * page is shown (app/api/suggestions). The not-found boundary's element goes into every page's
 * payload, so rendered on the server it fetched them for every page (ADR-067); here a page that
 * is found never asks. Nothing is shown when the request fails or finds none.
 */
export function NotFoundSuggestions({
  fallback,
  label,
  cta,
  labels,
}: {
  /** Shown while the teas load, the size of the row. */
  fallback: ReactNode;
  label: string;
  cta: string;
  labels: { tabList: string; previous: string; next: string };
}) {
  const locale = useLocale();
  const [products, setProducts] = useState<ProductSummaryDto[] | null>(null);
  const url = `/api/suggestions?locale=${encodeURIComponent(locale)}`;
  // Asked for with the missing page's HTML, not once its code has run: the fetch below takes the
  // answer (the same address and mode).
  preload(url, { as: 'fetch', crossOrigin: 'anonymous' });

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: ProductSummaryDto[] }) => setProducts(body.items ?? []))
      .catch(() => {
        if (!controller.signal.aborted) setProducts([]);
      });
    return () => controller.abort();
  }, [url]);

  if (products === null) return fallback;
  if (products.length === 0) return null;
  return (
    <ProductRail
      tabs={[{ id: 'discover', label, products, href: '/catalog', cta }]}
      labels={labels}
      heading="condensed"
      frame="content"
    />
  );
}
