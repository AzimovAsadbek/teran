import { PRODUCT_SORTS } from '@teran/contracts/constants';
import { showPrices } from '@/lib/site';

export function visibleSorts(hasPricedTea: boolean) {
  return PRODUCT_SORTS.filter(
    (sort) => (showPrices && hasPricedTea) || (sort !== 'price_asc' && sort !== 'price_desc'),
  );
}
