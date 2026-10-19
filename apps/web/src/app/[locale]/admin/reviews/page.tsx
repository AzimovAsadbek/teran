import type { AdminReviewDto, Locale, Paginated, ReviewStatus } from '@teran/contracts';
import { BadgeCheck, Mail } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Stars } from '@/components/catalog/stars';
import { Pagination } from '@/components/catalog/pagination';
import { ReviewActions } from '@/components/admin/review-actions';
import { Pill, type Tone } from '@/components/admin/pill';
import {
  AccessDenied,
  AdminPageHeader,
  EmptyState,
  StatusTabs,
  table,
} from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet, apiQuery, pageHref, param } from '@/lib/admin/server';
import { formatDateTime } from '@/lib/format';

const STATUS_TONES: Record<ReviewStatus, Tone> = { PUBLISHED: 'leaf', HIDDEN: 'muted' };

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('reviews.title') };
}

/**
 * Customers' ratings and reviews (ADR-042), newest first: all, shown or hidden. Each shows its
 * product, author, stars and words, with hide or show and delete. Reviews go live at once, so this
 * is where unsuitable ones are taken down.
 */
export default async function AdminReviewsPage({
  searchParams,
}: PageProps<'/[locale]/admin/reviews'>) {
  const [params, locale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
  ]);
  const status = param(params, 'status');
  const query = apiQuery(params, ['status', 'page'], { pageSize: '20' });
  const data = await adminGet<Paginated<AdminReviewDto>>(`/reviews${query}`);
  if (!data) return <AccessDenied />;

  return (
    <>
      <AdminPageHeader title={t('reviews.title')} description={t('reviews.intro')} />
      <StatusTabs
        label={t('reviews.title')}
        tabs={[
          { href: '/admin/reviews', label: t('common.all'), current: !status },
          {
            href: '/admin/reviews?status=PUBLISHED',
            label: t('reviews.status.PUBLISHED'),
            current: status === 'PUBLISHED',
          },
          {
            href: '/admin/reviews?status=HIDDEN',
            label: t('reviews.status.HIDDEN'),
            current: status === 'HIDDEN',
          },
        ]}
      />

      {data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-4">
          {data.items.map((review) => (
            <li key={review.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">
                    <Link href={`/products/${review.product.slug}#reviews`} className={table.link}>
                      {review.product.name}
                    </Link>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-fg-muted">
                    <span>{review.customer.name}</span>
                    <a
                      href={`mailto:${review.customer.email}`}
                      className={`${table.link} inline-flex min-h-8 items-center gap-1.5 break-all`}
                    >
                      <Mail aria-hidden className="h-3.5 w-3.5 shrink-0" />
                      {review.customer.email}
                    </a>
                    {review.verifiedPurchase ? (
                      <span className="inline-flex items-center gap-1 text-leaf-700">
                        <BadgeCheck aria-hidden className="h-3.5 w-3.5" />
                        {t('reviews.verified')}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-body-sm text-fg-subtle">
                  {formatDateTime(review.createdAt, locale as Locale)}
                  <Pill tone={STATUS_TONES[review.status]}>
                    {t(`reviews.status.${review.status}`)}
                  </Pill>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-2">
                <Stars value={review.rating} className="text-[1.125rem]" />
                <span className="text-body-sm font-semibold text-fg">
                  {t('reviews.stars', { count: review.rating })}
                </span>
              </p>
              {review.comment ? (
                <p lang={review.locale} className="mt-2 whitespace-pre-line text-fg">
                  {review.comment}
                </p>
              ) : (
                <p className="mt-2 text-body-sm text-fg-subtle">{t('reviews.noComment')}</p>
              )}
              <ReviewActions id={review.id} status={review.status} />
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        hrefFor={(page) => pageHref('/admin/reviews', params, ['status'], page)}
      />
    </>
  );
}
