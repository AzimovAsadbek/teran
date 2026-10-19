import {
  isStaffRole,
  type Locale,
  type MyReviewDto,
  type ProductReviewsDto,
  type RatingBreakdownDto,
} from '@teran/contracts';
import { MessageSquareText } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Stars } from '@/components/catalog/stars';
import { ButtonLink } from '@/components/ui/button';
import { currentUser } from '@/lib/account';
import { apiGetAsVisitor } from '@/lib/api/server';
import { ReviewForm } from './review-form';
import { ReviewList } from './review-list';

const EMPTY: RatingBreakdownDto = { average: 0, count: 0, stars: [0, 0, 0, 0, 0] };

/** "4,8" in Uzbek and Russian, "4.8" in English. */
export function formatAverage(average: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);
}

/** The average in large type, its stars, how many ratings, and a bar per number of stars. */
async function Breakdown({ summary }: { summary: RatingBreakdownDto }) {
  const [t, locale] = await Promise.all([getTranslations('Product'), getLocale()]);
  const average = formatAverage(summary.average, locale as Locale);
  return (
    <div className="mt-6">
      <div className="flex items-end gap-4">
        {summary.count > 0 ? (
          <p className="font-heading text-[3.5rem] leading-none text-fg">
            <span aria-hidden>{average}</span>
            <span className="sr-only">{t('reviews.averageLabel', { average })}</span>
          </p>
        ) : null}
        <div className="pb-1">
          <Stars value={summary.average} className="text-[1.375rem]" />
          <p className="mt-1 text-body-sm text-fg-subtle">
            {summary.count > 0 ? t('reviews.basedOn', { count: summary.count }) : t('reviews.none')}
          </p>
        </div>
      </div>
      <ul className="mt-6 flex flex-col gap-2">
        {summary.stars.map((count, index) => {
          const stars = 5 - index;
          const share = summary.count > 0 ? (count / summary.count) * 100 : 0;
          return (
            <li key={stars} className="flex items-center gap-3 text-body-sm">
              <span className="sr-only">{t('reviews.barLabel', { stars, count })}</span>
              <span aria-hidden className="w-3 shrink-0 text-right font-semibold text-fg">
                {stars}
              </span>
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#f0a020]">
                <path
                  d="M12 2.6l2.83 5.94 6.53.79-4.8 4.5 1.22 6.47L12 17.15l-5.78 3.15 1.22-6.47-4.8-4.5 6.53-.79z"
                  fill="currentColor"
                />
              </svg>
              <span
                aria-hidden
                className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken"
              >
                <span
                  className="block h-full rounded-full bg-[#f0a020]"
                  style={{ width: `${share}%` }}
                />
              </span>
              <span aria-hidden className="w-6 shrink-0 text-right text-fg-subtle">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Who is visiting decides the form's place: a customer rates (their earlier review loaded with the
 * page), a visitor is offered to sign in or register and come back, a staff account is told why it
 * cannot rate. Resolved per request (cookies), so it streams in its own boundary.
 */
async function ReviewFormSlot({ slug }: { slug: string }) {
  const [t, user] = await Promise.all([getTranslations('Product'), currentUser()]);
  if (user && isStaffRole(user.role)) {
    return (
      <p className="rounded-tile bg-surface-muted p-5 text-body-sm text-fg-muted">
        {t('reviews.staffNote')}
      </p>
    );
  }
  if (!user) {
    const next = encodeURIComponent(`/products/${slug}`);
    return (
      <div className="rounded-tile bg-surface-muted p-5">
        <p className="text-body text-fg">{t('reviews.signInPrompt')}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href={`/account/login?next=${next}`} size="sm">
            {t('reviews.signIn')}
          </ButtonLink>
          <ButtonLink href={`/account/register?next=${next}`} variant="secondary" size="sm">
            {t('reviews.register')}
          </ButtonLink>
        </div>
      </div>
    );
  }
  const mine = await apiGetAsVisitor<{ review: MyReviewDto | null }>(
    `/catalog/products/${encodeURIComponent(slug)}/reviews/mine`,
  ).catch(() => null);
  return <ReviewForm slug={slug} initial={mine?.review ?? null} />;
}

/**
 * The product's reviews (ADR-042), after its details: the average and the stars' spread with the
 * way to rate on the left, the published reviews (newest first, each in its own language) on the
 * right. The product cards' stars lead here (#reviews).
 */
export async function ReviewsSection({
  slug,
  reviews,
}: {
  slug: string;
  reviews: ProductReviewsDto | null;
}) {
  const t = await getTranslations('Product');
  const summary = reviews?.summary ?? EMPTY;
  return (
    <section
      id="reviews"
      aria-labelledby="reviews-title"
      className="mt-12 scroll-mt-36 border-t border-line pt-10 sm:mt-16 sm:pt-14"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2
            id="reviews-title"
            className="font-heading text-[1.75rem] leading-tight text-fg sm:text-[2rem]"
          >
            {t('reviews.title')}
          </h2>
          <Breakdown summary={summary} />
          <div className="mt-8">
            <Suspense fallback={<div className="h-40 rounded-tile bg-surface-muted" aria-hidden />}>
              <ReviewFormSlot slug={slug} />
            </Suspense>
          </div>
        </div>
        <div>
          {reviews && reviews.items.length > 0 ? (
            <ReviewList slug={slug} initial={reviews} />
          ) : (
            <div className="flex flex-col items-center rounded-tile border border-dashed border-line px-6 py-12 text-center">
              <MessageSquareText aria-hidden className="h-8 w-8 text-fg-subtle" />
              <p className="mt-4 max-w-sm text-body text-fg-muted">{t('reviews.empty')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
