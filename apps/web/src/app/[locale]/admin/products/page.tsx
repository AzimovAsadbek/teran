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
  EmptyState,
  FilterForm,
  FilterSelect,
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
      <FilterForm action="/admin/products" q={param(params, 'q')}>
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
                <tr key={product.id} className="hover:bg-ivory-50">
                  <td className={table.td}>
                    <div className="flex items-center gap-3">
                      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ivory-100">
                        <ProductImage
                          image={product.image}
                          illustrationKey={product.illustrationKey}
                          name={product.name}
                          sizes="48px"
                        />
                      </span>
                      <span className="min-w-0">
                        <Link href={`/admin/products/${product.id}`} className={table.link}>
                          {product.name}
                        </Link>
                        <span className="block text-xs text-ink-500">
                          {product.slug} ·{' '}
                          {t('products.variantsCount', { count: product.variantCount })}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className={table.td}>{product.categoryName}</td>
                  <td className={`${table.td} whitespace-nowrap tabular-nums`}>{price(product)}</td>
                  <td className={`${table.td} text-right tabular-nums`}>{product.totalStock}</td>
                  <td className={table.td}>
                    <ProductStatusPill status={product.status} />
                  </td>
                  <td className={`${table.td} whitespace-nowrap text-ink-700`}>
                    {formatDate(product.updatedAt, locale as Locale)}
                  </td>
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
