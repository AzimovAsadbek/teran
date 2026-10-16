import type { AdminAuditEntry, Locale, OrderStatus, Paginated } from '@teran/contracts';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import type { ReactNode } from 'react';
import { Pagination } from '@/components/catalog/pagination';
import { AccessDenied, AdminPageHeader, Cell, EmptyState, table } from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
import { adminGet, apiQuery, pageHref } from '@/lib/admin/server';
import { formatDateTime } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('audit.title') };
}

type Meta = Record<string, unknown>;
const text = (meta: Meta, key: string) =>
  typeof meta[key] === 'string' ? (meta[key] as string) : undefined;

export default async function AdminAuditPage({ searchParams }: PageProps<'/[locale]/admin/audit'>) {
  const [params, locale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
  ]);
  const entries = await adminGet<Paginated<AdminAuditEntry>>(
    `/audit${apiQuery(params, ['page'], { pageSize: '50' })}`,
  );
  if (!entries) return <AccessDenied adminOnly />;

  // Codes such as "inventory.adjust" in staff words; unknown ones stay as they are.
  type Key = Parameters<typeof t>[0];
  const known = (key: string, fallback: string) => (t.has(key as Key) ? t(key as Key) : fallback);
  const actionLabel = (action: string) =>
    known(`audit.actions.${action.replaceAll('.', '_')}`, action);
  const entityLabel = (entity: string) => known(`audit.entities.${entity}`, entity);
  const status = (value: string | undefined) =>
    value ? known(`orderStatus.${value as OrderStatus}`, value) : value;

  /** What changed, with a link to it where there is a page (record ids stay hidden). */
  const details = (entry: AdminAuditEntry): ReactNode => {
    const meta = (
      entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}
    ) as Meta;
    const number = text(meta, 'number');
    switch (entry.entityType) {
      case 'Order':
        return number ? (
          <>
            <Link href={`/admin/orders/${number}`} className={table.link}>
              {number}
            </Link>
            {text(meta, 'to')
              ? ` · ${status(text(meta, 'from'))} → ${status(text(meta, 'to'))}`
              : ''}
          </>
        ) : null;
      case 'Product':
        return entry.entityId ? (
          <Link href={`/admin/products/${entry.entityId}`} className={table.link}>
            {text(meta, 'slug') ?? t('common.open')}
          </Link>
        ) : null;
      case 'ProductVariant': {
        const delta = typeof meta.delta === 'number' ? meta.delta : null;
        const sku = text(meta, 'sku');
        return sku ? (
          <>
            <Link href={`/admin/inventory?q=${encodeURIComponent(sku)}`} className={table.link}>
              {sku}
            </Link>
            {delta !== null ? ` · ${delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}` : ''}
            {typeof meta.quantityAfter === 'number' ? ` → ${meta.quantityAfter}` : ''}
          </>
        ) : null;
      }
      case 'User':
        return text(meta, 'email') ?? null;
      case 'Article':
        return entry.entityId ? (
          <Link href={`/admin/journal/${entry.entityId}`} className={table.link}>
            {text(meta, 'slug') ?? t('common.open')}
          </Link>
        ) : null;
      default:
        return text(meta, 'slug') ?? null;
    }
  };

  return (
    <>
      <AdminPageHeader title={t('audit.title')} description={t('audit.intro')} />
      {entries.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('audit.action')}
                </th>
                <th scope="col" className={table.th}>
                  {t('audit.entity')}
                </th>
                <th scope="col" className={table.th}>
                  {t('audit.who')}
                </th>
                <th scope="col" className={table.th}>
                  {t('audit.when')}
                </th>
                <th scope="col" className={table.th}>
                  {t('audit.ip')}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.items.map((entry) => {
                const detail = details(entry);
                return (
                  <tr key={entry.id}>
                    <Cell primary className="font-semibold text-fg">
                      {actionLabel(entry.action)}
                    </Cell>
                    <Cell label={t('audit.entity')}>
                      {entityLabel(entry.entityType)}
                      {detail ? (
                        <span className="block text-xs text-fg-subtle">{detail}</span>
                      ) : null}
                    </Cell>
                    <Cell label={t('audit.who')} className="break-words">
                      {entry.actorName ?? t('orders.system')}
                    </Cell>
                    <Cell label={t('audit.when')} className="whitespace-nowrap text-fg-muted">
                      {formatDateTime(entry.createdAt, locale as Locale)}
                    </Cell>
                    <Cell label={t('audit.ip')} className="font-mono text-xs text-fg-subtle">
                      {entry.ipAddress ?? '—'}
                    </Cell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={entries.page}
        totalPages={entries.totalPages}
        hrefFor={(page) => pageHref('/admin/audit', params, [], page)}
      />
    </>
  );
}
