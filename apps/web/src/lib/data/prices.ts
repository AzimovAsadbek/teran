import type {
  FacetsDto,
  ProductDetailDto,
  ProductListDto,
  ProductSummaryDto,
  VariantDto,
} from '@teran/contracts';
import { showPrices } from '@/lib/site';

/*
 * While the storefront shows no prices (lib/site showPrices, ADR-027), none reaches its pages
 * either: the catalogue loaders send every price as 0 and no price range, so the placeholder
 * prices kept in the admin area are not in the page's data for scrapers and AI crawlers to read.
 * Nothing on the storefront displays a price in this mode, so the zeros are never shown.
 */

const HIDDEN = '0';

function variant(item: VariantDto): VariantDto {
  return { ...item, price: HIDDEN, compareAtPrice: null };
}

export function summaryPrices<T extends ProductSummaryDto>(product: T): T {
  if (showPrices) return product;
  return {
    ...product,
    priceFrom: HIDDEN,
    compareAtPriceFrom: null,
    defaultVariant: product.defaultVariant ? variant(product.defaultVariant) : null,
  };
}

export function detailPrices(product: ProductDetailDto): ProductDetailDto {
  if (showPrices) return product;
  return { ...summaryPrices(product), variants: product.variants.map(variant) };
}

function facetPrices(facets: FacetsDto): FacetsDto {
  return { ...facets, priceRange: null };
}

export function listPrices(list: ProductListDto): ProductListDto {
  if (showPrices) return list;
  return { ...list, items: list.items.map(summaryPrices), facets: facetPrices(list.facets) };
}
