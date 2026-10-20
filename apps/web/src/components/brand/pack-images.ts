import type { StaticImageData } from 'next/image';
import type { TeaCode } from '@/content/brand';
import pack8009 from '../../../public/brand/packs/8009.webp';
import pack8800 from '../../../public/brand/packs/8800.webp';
import pack8830 from '../../../public/brand/packs/8830.webp';
import packG8810 from '../../../public/brand/packs/g8810.webp';
import packXc2025 from '../../../public/brand/packs/xc2025.webp';

/** TERAN's five pouches cut out (public/brand/packs), as the first view and the stages show them. */
export const PACK_IMAGES: Record<TeaCode, StaticImageData> = {
  XC2025: packXc2025,
  G8810: packG8810,
  '8800': pack8800,
  '8830': pack8830,
  '8009': pack8009,
};
