import type { StaticImageData } from 'next/image';
import black from '../../../public/brand/leaves/black.webp';
import green from '../../../public/brand/leaves/green.webp';
import oolong from '../../../public/brand/leaves/oolong.webp';
import puerh from '../../../public/brand/leaves/puerh.webp';
import white from '../../../public/brand/leaves/white.webp';

/**
 * The owner's photographs of each kind of tea's dry leaf (public/brand/leaves), by the slug of its
 * category: what a tea-type listing shows in its header (never one of its products' pictures).
 */
export const LEAF_BY_CATEGORY: Record<string, StaticImageData> = {
  'green-tea': green,
  'black-tea': black,
  'white-tea': white,
  oolong,
  'pu-erh': puerh,
};
