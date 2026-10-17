import { PRODUCT_SORTS } from '@teran/contracts/constants';
import { showPrices } from '@/lib/site';

/** The sort orders on offer: the price orders only while the shop shows prices. */
export const VISIBLE_SORTS = PRODUCT_SORTS.filter(
  (sort) => showPrices || (sort !== 'price_asc' && sort !== 'price_desc'),
);
