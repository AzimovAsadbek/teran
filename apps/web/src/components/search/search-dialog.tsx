'use client';

import type { SearchSuggestionsDto } from '@teran/contracts';
import { ArrowRight, Loader2, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { ProductImage } from '@/components/catalog/product-image';
import { IconButton } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { Sheet } from '@/components/ui/sheet';
import { Link, useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

const DEBOUNCE_MS = 220;

/**
 * Search overlay: a large field across the top of the page, with tea types and products side by
 * side as you type (two characters or more). Enter opens the full results page.
 */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('Search');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [fetched, setFetched] = useState<{ query: string; data: SearchSuggestionsDto } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const trimmed = query.trim();
  const searchable = trimmed.length >= 2;

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Suggestions are derived from the last response; nothing is reset synchronously in the effect.
  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPending(true);
      apiRequest<SearchSuggestionsDto>(
        `/catalog/search/suggest?locale=${locale}&q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal },
      )
        .then((data) => setFetched({ query: trimmed, data }))
        .catch(() => {
          if (!controller.signal.aborted) setFetched(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setPending(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchable, trimmed, locale]);

  const results = searchable ? (fetched?.data ?? null) : null;
  const loading = searchable && pending;
  const empty =
    results !== null && results.products.length === 0 && results.categories.length === 0;

  const close = () => {
    onClose();
    setQuery('');
  };

  return (
    <Sheet open={open} onClose={close} side="top" title={t('title')} closeLabel={tc('close')} bare>
      <div className="container-page pt-4 pb-8 sm:pt-6">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed.length === 0) return;
            close();
            router.push(`/search?q=${encodeURIComponent(trimmed)}`);
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor={inputId} className="sr-only">
            {t('label')}
          </label>
          <div className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full border-2 border-forest-900 bg-surface px-5 transition-[box-shadow] focus-within:ring-[3px] focus-within:ring-forest-700/15">
            {loading ? (
              <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-fg-subtle" />
            ) : (
              <Search aria-hidden className="h-5 w-5 shrink-0 text-fg-subtle" />
            )}
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                // In a search field the browser's first Esc only clears the text; close at once.
                if (event.key === 'Escape') {
                  event.preventDefault();
                  close();
                }
              }}
              placeholder={t('placeholder')}
              autoComplete="off"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-body-lg text-fg outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <IconButton
                label={t('clear')}
                icon={<X />}
                size="sm"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              />
            ) : null}
          </div>
          <IconButton label={tc('close')} icon={<X />} onClick={close} className="-mr-2" />
        </form>

        <div aria-live="polite" className="mt-4 min-h-5 text-body-sm text-fg-subtle">
          {trimmed.length > 0 && trimmed.length < 2 ? t('minChars') : null}
          {empty ? (
            <span className="text-fg-muted">
              {t('noResults', { query: fetched?.query ?? trimmed })} {t('noResultsText')}
            </span>
          ) : null}
        </div>

        {results && !empty ? (
          <div className="mt-2 grid gap-8 md:grid-cols-12">
            {results.categories.length > 0 ? (
              <section className="md:col-span-4">
                <h3 className="text-eyebrow text-accent-fg">{t('categories')}</h3>
                <ul className="mt-3 space-y-1">
                  {results.categories.map((category) => (
                    <li key={category.slug}>
                      <Link
                        href={`/${category.path}`}
                        onClick={close}
                        className="flex min-h-11 items-center justify-between rounded-control px-3 text-body font-medium text-fg transition-colors hover:bg-surface-muted hover:text-brand"
                      >
                        {category.name}
                        <ArrowRight aria-hidden className="h-4 w-4 text-fg-subtle" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {results.products.length > 0 ? (
              <section
                className={results.categories.length > 0 ? 'md:col-span-8' : 'md:col-span-12'}
              >
                <h3 className="text-eyebrow text-accent-fg">{t('products')}</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {results.products.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={close}
                        className="group flex items-center gap-3.5 rounded-card border border-transparent p-2 transition-colors hover:border-line hover:bg-surface"
                      >
                        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-control bg-surface-muted">
                          <ProductImage image={product.image} name={product.name} sizes="64px" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-title-sm text-fg group-hover:text-brand">
                            {product.name}
                          </span>
                          <Price
                            amount={product.priceFrom}
                            from={product.variantCount > 1}
                            className="text-body-sm"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/search?q=${encodeURIComponent(trimmed)}`}
                  onClick={close}
                  className="group mt-5 inline-flex items-center gap-2 text-button text-brand hover:underline hover:underline-offset-4"
                >
                  {t('seeAll')}
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
