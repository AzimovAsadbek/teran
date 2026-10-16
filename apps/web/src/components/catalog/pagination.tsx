import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

/** Pages to show: first, last, current ±1, with gaps marked as null. */
export function pageWindow(current: number, total: number): (number | null)[] {
  const pages = new Set(
    [1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total),
  );
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  for (const [index, page] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) result.push(null);
    result.push(page);
  }
  return result;
}

/** Crawlable page links (no infinite scroll), keeping the active filters. */
export async function Pagination({
  page,
  totalPages,
  hrefFor,
  tone = 'light',
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  /** `dark` on dark pages (the gallery). */
  tone?: 'light' | 'dark';
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations('Common');
  const item =
    'inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-body-sm font-semibold transition-colors duration-150';
  const dark = tone === 'dark';
  const arrow = dark
    ? 'border border-ivory-50/25 text-ivory-50 hover:border-ivory-50'
    : 'border border-line-strong/45 text-fg hover:border-brand';

  return (
    <nav
      aria-label={t('pagination')}
      className={cn(
        'mt-14 flex justify-center border-t pt-8',
        dark ? 'border-ivory-50/10' : 'border-line',
      )}
    >
      <ul className="flex items-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              className={cn(item, arrow)}
              aria-label={t('previousPage')}
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </Link>
          ) : null}
        </li>
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === null ? (
            <li
              key={`gap-${index}`}
              aria-hidden
              className={cn('px-1', dark ? 'text-ivory-100/60' : 'text-fg-subtle')}
            >
              …
            </li>
          ) : (
            <li key={entry}>
              <Link
                href={hrefFor(entry)}
                aria-current={entry === page ? 'page' : undefined}
                aria-label={t('pageN', { page: entry })}
                className={cn(
                  item,
                  entry === page
                    ? dark
                      ? 'bg-gold-300 text-forest-950'
                      : 'bg-brand text-fg-inverse'
                    : dark
                      ? 'text-ivory-50 hover:bg-ivory-50/10'
                      : 'text-fg hover:bg-brand/[0.06]',
                )}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} className={cn(item, arrow)} aria-label={t('nextPage')}>
              <ChevronRight aria-hidden className="h-4 w-4" />
            </Link>
          ) : null}
        </li>
      </ul>
    </nav>
  );
}
