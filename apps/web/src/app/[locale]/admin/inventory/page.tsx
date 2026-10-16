import type { AdminInventoryRow, Locale, Paginated } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Pagination } from '@/components/catalog/pagination';
import { InventoryRowActions } from '@/components/admin/inventory-row-actions';
import {
  AccessDenied,
  AdminPageHeader,
  Cell,
  EmptyState,
  FilterForm,
  Pill,
  table,
} from '@/components/admin/ui';
import { Checkbox } from '@/components/ui/field';
import { Link } from '@/i18n/navigation';
import { packLabel } from '@/lib/admin/pack';
import { adminGet, apiQuery, pageHref, param } from '@/lib/admin/server';
import { cn } from '@/lib/cn';

const FILTERS = ['q', 'lowStockOnly'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('inventory.title') };
}

export default async function AdminInventoryPage({
  searchParams,
}: PageProps<'/[locale]/admin/inventory'>) {
  const [params, t] = await Promise.all([searchParams, getTranslations('Admin')]);
  const rows = await adminGet<Paginated<AdminInventoryRow>>(
    `/inventory${apiQuery(params, [...FILTERS, 'page'], { pageSize: '50' })}`,
  );
  if (!rows) return <AccessDenied />;
  const lowOnly = param(params, 'lowStockOnly') === 'true';

  return (
    <>
      <AdminPageHeader title={t('inventory.title')} description={t('inventory.intro')} />
      <FilterForm
        action="/admin/inventory"
        q={param(params, 'q')}
        active={FILTERS.some((key) => param(params, key))}
      >
        <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-control border border-line-strong bg-surface px-3.5 text-body-sm shadow-xs">
          <Checkbox name="lowStockOnly" value="true" defaultChecked={lowOnly} />
          {t('inventory.lowStockOnly')}
        </label>
      </FilterForm>
      {rows.items.length === 0 ? (
        <EmptyState>{t('common.noResults')}</EmptyState>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('inventory.product')}
                </th>
                <th scope="col" className={table.th}>
                  {t('products.sku')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('inventory.stock')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('inventory.threshold')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.items.map((row) => {
                const out = row.isActive && row.stockQuantity === 0;
                const low = row.isActive && !out && row.stockQuantity <= row.lowStockThreshold;
                return (
                  <tr key={row.variantId} className={row.isActive ? undefined : 'opacity-60'}>
                    <Cell primary>
                      <Link href={`/admin/products/${row.productId}`} className={table.link}>
                        {row.productName}
                      </Link>
                      <span className="block text-xs text-fg-subtle">
                        {packLabel(row)}
                        {!row.isActive ? ` · ${t('common.inactive')}` : ''}
                      </span>
                    </Cell>
                    <Cell label={t('products.sku')} className="font-mono text-xs">
                      {row.sku}
                    </Cell>
                    <Cell
                      label={t('inventory.stock')}
                      className={cn(
                        'text-right font-semibold tabular-nums',
                        out ? 'text-danger' : low ? 'text-warning' : '',
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        {out ? <Pill tone="danger">{t('inventory.statusOut')}</Pill> : null}
                        {low ? <Pill tone="gold">{t('inventory.statusLow')}</Pill> : null}
                        {row.stockQuantity}
                      </span>
                    </Cell>
                    <Cell
                      label={t('inventory.threshold')}
                      className="text-right text-fg-subtle tabular-nums"
                    >
                      {row.lowStockThreshold}
                    </Cell>
                    <Cell className="text-right max-md:justify-end max-md:pt-2">
                      <InventoryRowActions row={row} />
                    </Cell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={rows.page}
        totalPages={rows.totalPages}
        hrefFor={(page) => pageHref('/admin/inventory', params, FILTERS, page)}
      />
    </>
  );
}
