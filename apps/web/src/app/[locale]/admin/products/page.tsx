import {
  PRODUCT_STATUSES,
  type AdminProductListItem,
  type AdminTaxonomy,
  type Locale,
  type Paginated,
} from '@teran/contracts';
import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { ProductImage } from '@/components/catalog/product-image';
import { Pagination } from '@/components/catalog/pagination';
import {
  AccessDenied,
  AdminPageHeader,
  Cell,
  EmptyState,
  FilterForm,
  FilterSelect,
  Pill,
  ProductStatusPill,
  table,
} from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { adminGet, apiQuery, pageHref, param } from '@/lib/admin/server';
import { formatDate, formatMoney } from '@/lib/format';

const FILTERS = ['q', 'status', 'categoryId'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('products.title') };
}

export default async function AdminProductsPage({
  searchParams,
}: PageProps<'/[locale]/admin/products'>) {
  const [params, locale, t, tc] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
    getTranslations('Common'),
  ]);
  const [products, categories] = await Promise.all([
    adminGet<Paginated<AdminProductListItem>>(
      `/products${apiQuery(params, [...FILTERS, 'page'], { pageSize: '25' })}`,
    ),
    adminGet<AdminTaxonomy[]>('/categories'),
  ]);
  if (!products || !categories) return <AccessDenied />;
  const currency = tc('currency.UZS');
  const price = (item: AdminProductListItem) => {
    if (!item.priceMin) return '—';
    const low = formatMoney(item.priceMin, locale, currency);
    return item.priceMax && item.priceMax !== item.priceMin
      ? `${low} – ${formatMoney(item.priceMax, locale, currency)}`
      : low;
  };

  return (
    <>
      <AdminPageHeader
        title={t('products.title')}
        actions={
          <ButtonLink href="/admin/products/new">
            <Plus aria-hidden className="h-4 w-4" />
            {t('products.newProduct')}
          </ButtonLink>
        }
      />
      <FilterForm
        action="/admin/products"
        q={param(params, 'q')}
        active={FILTERS.some((key) => param(params, key))}
      >
        <FilterSelect
          name="status"
          label={t('common.status')}
          value={param(params, 'status')}
          options={[
            { value: '', label: t('common.all') },
            ...PRODUCT_STATUSES.map((status) => ({
              value: status,
              label: t(`productStatus.${status}`),
            })),
          ]}
        />
        <FilterSelect
          name="categoryId"
          label={t('products.category')}
          value={param(params, 'categoryId')}
          options={[
            { value: '', label: t('products.allCategories') },
            ...categories.map((category) => ({
              value: category.id,
              label: category.translations[locale as Locale]?.name ?? category.translations.uz.name,
            })),
          ]}
        />
      </FilterForm>

      {products.items.length === 0 ? (
        <EmptyState>{t('common.noResults')}</EmptyState>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('products.name')}
                </th>
                <th scope="col" className={table.th}>
                  {t('products.category')}
                </th>
                <th scope="col" className={table.th}>
                  {t('products.price')}
                </th>
                <th scope="col" className={`${table.th} text-right`}>
                  {t('products.stock')}
                </th>
                <th scope="col" className={table.th}>
                  {t('common.status')}
                </th>
                <th scope="col" className={table.th}>
                  {t('common.updated')}
                </th>
              </tr>
            </thead>
            <tbody>
              {products.items.map((product) => (
                <tr key={product.id} className={table.row}>
                  <Cell primary>
                    <div className="flex items-center gap-3">
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-control bg-surface-muted">
                        <ProductImage image={product.image} name={product.name} sizes="48px" />
                      </span>
                      <span className="min-w-0">
                        <Link href={`/admin/products/${product.id}`} className={table.rowLink}>
                          {product.name}
                        </Link>
                        <span className="block text-xs text-fg-subtle">
                          {t('products.variantsCount', { count: product.variantCount })}
                        </span>
                      </span>
                    </div>
                  </Cell>
                  <Cell label={t('products.category')}>{product.categoryName}</Cell>
                  <Cell label={t('products.price')} className="whitespace-nowrap tabular-nums">
                    {price(product)}
                  </Cell>
                  <Cell label={t('products.stock')} className="text-right tabular-nums">
                    {/* A product on sale with nothing left shows as sold out on the site. */}
                    {product.totalStock === 0 && product.status === 'ACTIVE' ? (
                      <Pill tone="danger">{t('dashboard.outOfStock')}</Pill>
                    ) : (
                      product.totalStock
                    )}
                  </Cell>
                  <Cell label={t('common.status')}>
                    <span className="flex flex-col items-start gap-1">
                      <ProductStatusPill status={product.status} />
                      {product.missing.length > 0 ? (
                        <span
                          className="text-caption text-warning"
                          title={product.missing
                            .map((code) => t(`readiness.codes.${code}`))
                            .join(', ')}
                        >
                          {t('readiness.incompleteShort', { count: product.missing.length })}
                        </span>
                      ) : null}
                    </span>
                  </Cell>
                  <Cell label={t('common.updated')} className="whitespace-nowrap text-fg-muted">
                    {formatDate(product.updatedAt, locale as Locale)}
                  </Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={products.page}
        totalPages={products.totalPages}
        hrefFor={(page) => pageHref('/admin/products', params, FILTERS, page)}
      />
    </>
  );
}
