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
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations('Common');
  const item =
    'inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors';

  return (
    <nav aria-label={t('pagination')} className="mt-14 flex justify-center">
      <ul className="flex items-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              className={cn(item, 'text-forest-900 hover:bg-forest-900/[0.06]')}
              aria-label={t('previousPage')}
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </Link>
          ) : null}
        </li>
        {pageWindow(page, totalPages).map((entry, index) =>
          entry === null ? (
            <li key={`gap-${index}`} aria-hidden className="px-1 text-ink-500">
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
                    ? 'bg-forest-900 text-ivory-50'
                    : 'text-forest-900 hover:bg-forest-900/[0.06]',
                )}
              >
                {entry}
              </Link>
            </li>
          ),
        )}
        <li>
          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              className={cn(item, 'text-forest-900 hover:bg-forest-900/[0.06]')}
              aria-label={t('nextPage')}
            >
              <ChevronRight aria-hidden className="h-4 w-4" />
            </Link>
          ) : null}
        </li>
      </ul>
    </nav>
  );
}
