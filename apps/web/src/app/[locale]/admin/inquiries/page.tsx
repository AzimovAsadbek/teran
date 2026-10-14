import {
  INQUIRY_STATUSES,
  regionName,
  type AdminContactInquiry,
  type AdminWholesaleInquiry,
  type Locale,
  type Paginated,
} from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Pagination } from '@/components/catalog/pagination';
import { InquiryEditor } from '@/components/admin/inquiry-editor';
import {
  AccessDenied,
  AdminPageHeader,
  EmptyState,
  FilterSelect,
  InquiryStatusPill,
} from '@/components/admin/ui';
import { Link, getPathname } from '@/i18n/navigation';
import { adminGet, apiQuery, pageHref, param } from '@/lib/admin/server';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { buttonClasses } from '@/components/ui/button';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('inquiries.title') };
}

export default async function AdminInquiriesPage({
  searchParams,
}: PageProps<'/[locale]/admin/inquiries'>) {
  const [params, locale, t, tw] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
    getTranslations('Wholesale'),
  ]);
  const kind = param(params, 'type') === 'wholesale' ? 'wholesale' : 'contact';
  const query = apiQuery(params, ['status', 'page'], { pageSize: '20' });
  const data =
    kind === 'contact'
      ? await adminGet<Paginated<AdminContactInquiry>>(`/inquiries/contact${query}`)
      : await adminGet<Paginated<AdminWholesaleInquiry>>(`/inquiries/wholesale${query}`);
  if (!data) return <AccessDenied />;
  const tab = (target: 'contact' | 'wholesale') => (
    <Link
      href={target === 'contact' ? '/admin/inquiries' : '/admin/inquiries?type=wholesale'}
      aria-current={kind === target ? 'page' : undefined}
      className={cn(
        'rounded-full px-4 py-2 text-body-sm font-semibold',
        kind === target ? 'bg-brand text-fg-inverse' : 'text-forest-900 hover:bg-surface-muted',
      )}
    >
      {t(`inquiries.${target}`)}
    </Link>
  );

  return (
    <>
      <AdminPageHeader title={t('inquiries.title')} />
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <nav aria-label={t('inquiries.title')} className="flex gap-1 rounded-full bg-surface p-1">
          {tab('contact')}
          {tab('wholesale')}
        </nav>
        <form
          action={getPathname({ href: '/admin/inquiries', locale })}
          method="get"
          className="flex items-end gap-2"
        >
          {kind === 'wholesale' ? <input type="hidden" name="type" value="wholesale" /> : null}
          <FilterSelect
            name="status"
            label={t('common.status')}
            value={param(params, 'status')}
            options={[
              { value: '', label: t('common.all') },
              ...INQUIRY_STATUSES.map((status) => ({
                value: status,
                label: t(`inquiryStatus.${status}`),
              })),
            ]}
          />
          <button type="submit" className={buttonClasses('primary')}>
            {t('common.search')}
          </button>
        </form>
      </div>

      {data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-4">
          {data.items.map((item) => (
            <li key={item.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-forest-900">
                    {'companyName' in item
                      ? `${item.companyName} · ${item.contactName}`
                      : item.name}
                  </p>
                  <p className="text-body-sm text-fg-muted">
                    {[item.phone, item.email].filter(Boolean).join(' · ')}
                  </p>
                  {'businessType' in item ? (
                    <p className="text-body-sm text-fg-subtle">
                      {tw(`segments.${item.businessType}`)}
                      {item.regionCode ? ` · ${regionName(item.regionCode, locale as Locale)}` : ''}
                      {item.city ? `, ${item.city}` : ''}
                      {item.monthlyVolume
                        ? ` · ${t('inquiries.volume')}: ${item.monthlyVolume}`
                        : ''}
                    </p>
                  ) : item.subject ? (
                    <p className="text-body-sm text-fg-subtle">
                      {t('inquiries.subject')}: {item.subject}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-body-sm text-fg-subtle">
                  {formatDateTime(item.createdAt, locale as Locale)}
                  <InquiryStatusPill status={item.status} />
                </div>
              </div>
              {item.message ? (
                <p className="mt-3 whitespace-pre-line text-fg">{item.message}</p>
              ) : null}
              <InquiryEditor
                kind={kind}
                id={item.id}
                status={item.status}
                internalNote={item.internalNote}
              />
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        hrefFor={(page) => pageHref('/admin/inquiries', params, ['type', 'status'], page)}
      />
    </>
  );
}
