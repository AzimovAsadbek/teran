import { PRODUCT_SORTS } from '@teran/contracts/constants';
import { showPrices } from '@/lib/site';

export function visibleSorts(hasPricedProducts: boolean) {
  return PRODUCT_SORTS.filter(
    (sort) => (showPrices && hasPricedProducts) || (sort !== 'price_asc' && sort !== 'price_desc'),
  );
}
