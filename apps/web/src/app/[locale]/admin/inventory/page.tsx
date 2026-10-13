import type { AdminInventoryRow, Locale, Paginated } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Pagination } from '@/components/catalog/pagination';
import { InventoryRowActions } from '@/components/admin/inventory-row-actions';
import {
  AccessDenied,
  AdminPageHeader,
  EmptyState,
  FilterForm,
  table,
} from '@/components/admin/ui';
import { Link } from '@/i18n/navigation';
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
      <AdminPageHeader title={t('inventory.title')} />
      <FilterForm action="/admin/inventory" q={param(params, 'q')}>
        <label className="flex h-11 items-center gap-2 rounded-full border border-sage-500 bg-white px-4 text-sm">
          <input
            type="checkbox"
            name="lowStockOnly"
            value="true"
            defaultChecked={lowOnly}
            className="h-4 w-4 accent-forest-900"
          />
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
                <th scope="col" className={table.th}>
                  {t('inventory.pack')}
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
                const low = row.isActive && row.stockQuantity <= row.lowStockThreshold;
                return (
                  <tr
                    key={row.variantId}
                    className={cn('hover:bg-ivory-50', !row.isActive && 'opacity-60')}
                  >
                    <td className={table.td}>
                      <Link href={`/admin/products/${row.productId}`} className={table.link}>
                        {row.productName}
                      </Link>
                      {!row.isActive ? (
                        <span className="ml-2 text-xs text-ink-500">({t('common.inactive')})</span>
                      ) : null}
                    </td>
                    <td className={`${table.td} font-mono text-xs`}>{row.sku}</td>
                    <td className={table.td}>
                      {[
                        row.weightGrams ? `${row.weightGrams} g` : null,
                        row.unitCount ? `× ${row.unitCount}` : null,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </td>
                    <td
                      className={cn(
                        table.td,
                        'text-right font-semibold tabular-nums',
                        row.stockQuantity === 0 ? 'text-danger-700' : low ? 'text-gold-800' : '',
                      )}
                    >
                      {row.stockQuantity}
                    </td>
                    <td className={`${table.td} text-right text-ink-500 tabular-nums`}>
                      {row.lowStockThreshold}
                    </td>
                    <td className={`${table.td} text-right`}>
                      <InventoryRowActions row={row} />
                    </td>
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
