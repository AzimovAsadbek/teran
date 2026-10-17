import {
  formatUzPhone,
  INQUIRY_STATUSES,
  regionName,
  type AdminContactInquiry,
  type AdminWholesaleInquiry,
  type Locale,
  type Paginated,
} from '@teran/contracts';
import { Mail, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Pagination } from '@/components/catalog/pagination';
import { InquiryEditor } from '@/components/admin/inquiry-editor';
import { FilterFormShell } from '@/components/admin/filter-form';
import {
  AccessDenied,
  AdminPageHeader,
  EmptyState,
  FilterSelect,
  InquiryStatusPill,
  StatusTabs,
  table,
} from '@/components/admin/ui';
import { getPathname } from '@/i18n/navigation';
import { adminGet, apiQuery, getAdminBadges, pageHref, param } from '@/lib/admin/server';
import { formatDateTime } from '@/lib/format';

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
  const [data, badges] = await Promise.all([
    kind === 'contact'
      ? adminGet<Paginated<AdminContactInquiry>>(`/inquiries/contact${query}`)
      : adminGet<Paginated<AdminWholesaleInquiry>>(`/inquiries/wholesale${query}`),
    getAdminBadges(),
  ]);
  if (!data) return <AccessDenied />;

  return (
    <>
      <AdminPageHeader title={t('inquiries.title')} description={t('inquiries.intro')} />
      <div className="mb-1 flex flex-wrap items-start justify-between gap-x-4">
        <StatusTabs
          label={t('inquiries.title')}
          tabs={(['contact', 'wholesale'] as const).map((target) => ({
            href: target === 'contact' ? '/admin/inquiries' : '/admin/inquiries?type=wholesale',
            label: t(`inquiries.${target}`),
            count: badges?.newInquiries[target],
            current: kind === target,
          }))}
        />
        <FilterFormShell
          action={getPathname({ href: '/admin/inquiries', locale })}
          className="mb-4 flex items-end gap-2"
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
        </FilterFormShell>
      </div>

      {data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-4">
          {data.items.map((item) => (
            <li key={item.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-fg">
                    {'companyName' in item
                      ? `${item.companyName} · ${item.contactName}`
                      : item.name}
                  </p>
                  <p className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
                    {item.phone ? (
                      <a
                        href={`tel:${item.phone}`}
                        className={`${table.link} inline-flex min-h-8 items-center gap-1.5`}
                      >
                        <Phone aria-hidden className="h-3.5 w-3.5" />
                        {formatUzPhone(item.phone)}
                      </a>
                    ) : null}
                    {item.email ? (
                      <a
                        href={`mailto:${item.email}`}
                        className={`${table.link} inline-flex min-h-8 items-center gap-1.5 break-all`}
                      >
                        <Mail aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        {item.email}
                      </a>
                    ) : null}
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
