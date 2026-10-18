import type { CategoryDto, CollectionDto } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import { browsableCategories, categoryTree, navCollections } from './navigation';

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
