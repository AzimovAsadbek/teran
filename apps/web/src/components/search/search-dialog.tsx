'use client';

import type { SearchSuggestionsDto } from '@teran/contracts';
import { ArrowRight, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { ProductImage } from '@/components/catalog/product-image';
import { Price } from '@/components/ui/price';
import { Sheet } from '@/components/ui/sheet';
import { Link, useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

const DEBOUNCE_MS = 220;

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('Search');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchSuggestionsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const trimmed = query.trim();

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      apiRequest<SearchSuggestionsDto>(
        `/catalog/search/suggest?locale=${locale}&q=${encodeURIComponent(trimmed)}`,
        {
          signal: controller.signal,
        },
      )
        .then(setResults)
        .catch(() => {
          if (!controller.signal.aborted) setResults(null);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, locale]);

  const close = () => {
    onClose();
    setQuery('');
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      side="top"
      title={t('title')}
      closeLabel={tc('close')}
      hideTitle
    >
      <div className="px-5 pt-2 pb-6">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed.length === 0) return;
            close();
            router.push(`/search?q=${encodeURIComponent(trimmed)}`);
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            {t('label')}
          </label>
          <div className="flex items-center gap-3 rounded-full border border-sage-500 bg-white px-5 focus-within:border-forest-700">
            <Search aria-hidden className="h-5 w-5 text-ink-500" />
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('placeholder')}
              autoComplete="off"
              enterKeyHint="search"
              className="h-14 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-500"
            />
            <button
              type="submit"
              className="rounded-full bg-forest-900 px-4 py-2 text-sm font-semibold text-ivory-50 hover:bg-forest-800"
            >
              {t('submit')}
            </button>
          </div>
        </form>

        <div aria-live="polite" className="mt-5 min-h-6">
          {trimmed.length > 0 && trimmed.length < 2 ? (
            <p className="text-sm text-ink-500">{t('minChars')}</p>
          ) : null}
          {loading && !results ? <p className="text-sm text-ink-500">{tc('loading')}</p> : null}
          {results && results.products.length === 0 && results.categories.length === 0 ? (
            <p className="text-sm text-ink-700">{t('noResults', { query: trimmed })}</p>
          ) : null}
        </div>

        {results && results.categories.length > 0 ? (
          <section className="mt-2">
            <h3 className="text-eyebrow text-gold-700">{t('categories')}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {results.categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/catalog/${category.slug}`}
                    onClick={close}
                    className="inline-flex rounded-full border border-ivory-300 bg-white px-4 py-2 text-sm font-medium text-forest-900 hover:border-gold-500"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {results && results.products.length > 0 ? (
          <section className="mt-5">
            <h3 className="text-eyebrow text-gold-700">{t('products')}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {results.products.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.slug}`}
                    onClick={close}
                    className="flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-ivory-100"
                  >
                    <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ivory-100">
                      <ProductImage
                        image={product.image}
                        illustrationKey={product.illustrationKey}
                        name={product.name}
                        sizes="64px"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-forest-900">
                        {product.name}
                      </span>
                      <Price
                        amount={product.priceFrom}
                        from={product.variantCount > 1}
                        className="text-sm"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/search?q=${encodeURIComponent(trimmed)}`}
              onClick={close}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest-900 hover:underline"
            >
              {t('seeAll')} <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </section>
        ) : null}
      </div>
    </Sheet>
  );
}
