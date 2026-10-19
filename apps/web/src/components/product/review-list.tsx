'use client';

import type { Locale, ProductReviewsDto, PublicReviewDto } from '@teran/contracts';
import { BadgeCheck } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Stars } from '@/components/catalog/stars';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api/client';
import { formatDate } from '@/lib/format';

function Review({ review, locale }: { review: PublicReviewDto; locale: Locale }) {
  const t = useTranslations('Product');
  return (
    <li className="border-b border-line py-5 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="flex items-center gap-2">
          <Stars value={review.rating} className="text-[1.0625rem]" />
          <span className="sr-only">{t('reviews.starsOutOf', { count: review.rating })}</span>
        </p>
        <time dateTime={review.createdAt} className="text-body-sm text-fg-subtle">
          {formatDate(review.createdAt, locale)}
        </time>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-body font-semibold text-fg">
        {review.authorName}
        {review.verifiedPurchase ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-[0.75rem] leading-5 font-medium text-leaf-700">
            <BadgeCheck aria-hidden className="h-3.5 w-3.5" />
            {t('reviews.verified')}
          </span>
        ) : null}
      </p>
      {review.comment ? (
        // Plain text as the customer wrote it, in their language.
        <p lang={review.locale} className="mt-2 text-body whitespace-pre-line text-fg-muted">
          {review.comment}
        </p>
      ) : null}
    </li>
  );
}

/**
 * A product's published reviews, newest first: the first page comes with the page, "show more"
 * fetches the next ones from the API.
 */
export function ReviewList({ slug, initial }: { slug: string; initial: ProductReviewsDto }) {
  const t = useTranslations('Product');
  const locale = useLocale() as Locale;
  const [items, setItems] = useState(initial.items);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const more = page < initial.totalPages;

  async function loadMore() {
    setLoading(true);
    try {
      const next = await apiRequest<ProductReviewsDto>(
        `/catalog/products/${encodeURIComponent(slug)}/reviews?page=${page + 1}&pageSize=${initial.pageSize}`,
      );
      const seen = new Set(items.map((item) => item.id));
      setItems([...items, ...next.items.filter((item) => !seen.has(item.id))]);
      setPage(next.page);
    } catch {
      // The button stays; the visitor can try again.
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ul>
        {items.map((review) => (
          <Review key={review.id} review={review} locale={locale} />
        ))}
      </ul>
      {more ? (
        <Button variant="secondary" className="mt-6" loading={loading} onClick={loadMore}>
          {t('reviews.more')}
        </Button>
      ) : null}
    </>
  );
}
