import type { IllustrationKey } from '@teran/contracts';
import {
  Citrus,
  Coffee,
  Droplets,
  Flower2,
  Gift,
  GlassWater,
  Leaf,
  type LucideIcon,
} from 'lucide-react';

/**
 * How a product family is presented across the catalogue (ADR-050): the mark beside its category
 * on a card, the ink of that line (AA on white), the field a cut-out stands on, the ring of its
 * second-picture swatch, and the light that crosses a card when it is pointed at — clear for the
 * glass of cold drinks and water, gold for gift sets, none for tea, which keeps its film and
 * leaves. Read from the product's illustration key, so a new product falls into its family by
 * itself.
 */
export interface ProductFamily {
  key: 'tea' | 'matcha' | 'infusion' | 'iced' | 'water' | 'juice' | 'teaware' | 'gift';
  icon: LucideIcon;
  /** The category line's ink (4.5:1 or more on white). */
  ink: string;
  /** The field behind a transparent picture. */
  field: string;
  /** The swatch's ring. */
  ring: string;
  sheen: 'clear' | 'gold' | null;
}

const FAMILIES: Record<ProductFamily['key'], ProductFamily> = {
  tea: { key: 'tea', icon: Leaf, ink: '#1f6b3d', field: '#eef3e8', ring: '#ffffff', sheen: null },
  matcha: {
    key: 'matcha',
    icon: Leaf,
    ink: '#1a6b40',
    field: '#e6f0d8',
    ring: '#7fa65a',
    sheen: null,
  },
  infusion: {
    key: 'infusion',
    icon: Flower2,
    ink: '#8a2846',
    field: '#f8ece6',
    ring: '#d58a8f',
    sheen: null,
  },
  iced: {
    key: 'iced',
    icon: GlassWater,
    ink: '#0d5560',
    field: '#e4eff2',
    ring: '#7bb8c2',
    sheen: 'clear',
  },
  water: {
    key: 'water',
    icon: Droplets,
    ink: '#003764',
    field: '#e7eef5',
    ring: '#8fb2d4',
    sheen: 'clear',
  },
  juice: {
    key: 'juice',
    icon: Citrus,
    ink: '#b83c0d',
    field: '#fae9dc',
    ring: '#eb9a5c',
    sheen: 'clear',
  },
  teaware: {
    key: 'teaware',
    icon: Coffee,
    ink: '#3d3d3d',
    field: '#efece6',
    ring: '#b5aa9b',
    sheen: null,
  },
  gift: {
    key: 'gift',
    icon: Gift,
    ink: '#710631',
    field: '#f4ece0',
    ring: '#c9a45c',
    sheen: 'gold',
  },
};

const BY_KEY: Partial<Record<IllustrationKey, ProductFamily['key']>> = {
  matcha: 'matcha',
  herbal: 'infusion',
  fruit: 'infusion',
  mint: 'infusion',
  iced: 'iced',
  water: 'water',
  juice: 'juice',
  teaware: 'teaware',
  gift: 'gift',
};

/** The family of a product (or category) by its illustration key; tea when it has none. */
export function productFamily(key: IllustrationKey | null | undefined): ProductFamily {
  return FAMILIES[(key && BY_KEY[key]) || 'tea'];
}
