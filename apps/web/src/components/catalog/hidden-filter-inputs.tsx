import type { CatalogFilters } from '@/features/catalog/query';

/**
 * The current filters as hidden fields, so a small GET form (price, a number range) keeps the
 * other filters when it is submitted without JavaScript.
 */
export function HiddenFilterInputs({
  filters,
  omitPrice = false,
  omitAttribute,
}: {
  filters: CatalogFilters;
  omitPrice?: boolean;
  omitAttribute?: string;
}) {
  return (
    <>
      {filters.format.length > 0 ? (
        <input type="hidden" name="format" value={[...filters.format].sort().join(',')} />
      ) : null}
      {filters.inStock ? <input type="hidden" name="inStock" value="true" /> : null}
      {filters.sort !== 'featured' ? (
        <input type="hidden" name="sort" value={filters.sort} />
      ) : null}
      {!omitPrice && filters.minPrice !== undefined ? (
        <input type="hidden" name="minPrice" value={filters.minPrice} />
      ) : null}
      {!omitPrice && filters.maxPrice !== undefined ? (
        <input type="hidden" name="maxPrice" value={filters.maxPrice} />
      ) : null}
      {Object.entries(filters.attributes)
        .filter(([key]) => key !== omitAttribute)
        .map(([key, values]) => (
          <input key={key} type="hidden" name={`attr.${key}`} value={values.join(',')} />
        ))}
    </>
  );
}
