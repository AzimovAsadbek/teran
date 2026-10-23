import type { CategoryDto, CollectionDto } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import {
  browsableCategories,
  categoryTree,
  coverSizes,
  menuCategoryTree,
  navCollections,
} from './navigation';

function category(
  slug: string,
  productCount: number,
  parentSlug: string | null = null,
): CategoryDto {
  return {
    id: '00000000-0000-7000-8000-000000000000',
    slug,
    name: slug,
    description: null,
    illustrationKey: null,
    image: null,
    productCount,
    seoTitle: null,
    seoDescription: null,
    parentSlug,
    path: parentSlug ? `${parentSlug}/${slug}` : slug,
    body: null,
    position: 0,
    locales: ['uz', 'ru', 'en'],
  };
}

function collection(slug: string, productCount: number): CollectionDto {
  return {
    id: '00000000-0000-7000-8000-000000000001',
    slug,
    name: slug,
    description: null,
    illustrationKey: null,
    image: null,
    productCount,
    seoTitle: null,
    seoDescription: null,
    locales: ['uz', 'ru', 'en'],
  };
}

describe('the catalogue shoppers see', () => {
  it('lists only categories with products, a top-level one while any subcategory has some', () => {
    const tree = categoryTree([
      // The API counts a top-level category's subcategories' products in its own count.
      category('tea', 5),
      category('green-tea', 5, 'tea'),
      category('black-tea', 0, 'tea'),
      category('gift-sets', 0),
      category('coffee', 0),
    ]);
    expect(tree.map((top) => [top.slug, top.children.map((child) => child.slug)])).toEqual([
      ['tea', ['green-tea']],
    ]);
    expect(browsableCategories(tree).map((entry) => entry.slug)).toEqual(['green-tea']);
  });

  it('shows a new category, coffee say, by itself once it has products', () => {
    const tree = categoryTree([category('tea', 5), category('coffee', 2)]);
    expect(tree.map((top) => top.slug)).toEqual(['tea', 'coffee']);
  });

  it('gives the menus every category, empty ones too, in the API order', () => {
    const categories = [
      category('tea', 5),
      category('green-tea', 5, 'tea'),
      category('black-tea', 0, 'tea'),
      category('coffee', 0),
      category('coffee-beans', 0, 'coffee'),
      category('gift-sets', 0),
    ];
    const menu = menuCategoryTree(categories);
    expect(menu.map((top) => [top.slug, top.children.map((child) => child.slug)])).toEqual([
      ['tea', ['green-tea', 'black-tea']],
      ['coffee', ['coffee-beans']],
      ['gift-sets', []],
    ]);
    // Their counts stay, so the menus can mark the empty ones "coming soon".
    expect(menu.find((top) => top.slug === 'coffee')?.productCount).toBe(0);
    // The home page's sections still see only what is for sale.
    expect(categoryTree(categories).map((top) => top.slug)).toEqual(['tea']);
  });

  it('lists only collections with products', () => {
    expect(
      navCollections([
        collection('teran-premium', 5),
        collection('gift-ideas', 0),
        collection('test', 0),
      ]).map((entry) => entry.slug),
    ).toEqual(['teran-premium']);
  });
});

describe('sizes for a picture covering its frame', () => {
  const cards = [
    { media: '(min-width: 640px)', width: '17rem', ratio: 9 / 14 },
    { width: '15rem', ratio: 9 / 14 },
  ];

  it('asks for a wider file when a landscape picture fills a tall card', () => {
    // 16:9 in a 9:14 card is drawn at the card's height: 2.77 times the card's width.
    expect(coverSizes({ width: 1600, height: 900 }, cards)).toBe(
      '(min-width: 640px) calc(17rem * 2.77), calc(15rem * 2.77)',
    );
  });

  it('keeps the frame width for a picture no wider than its frame', () => {
    expect(coverSizes({ width: 900, height: 1400 }, cards)).toBe('(min-width: 640px) 17rem, 15rem');
    expect(coverSizes({ width: 600, height: 1200 }, cards)).toBe('(min-width: 640px) 17rem, 15rem');
  });
});
