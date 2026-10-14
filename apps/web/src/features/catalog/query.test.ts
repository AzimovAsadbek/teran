import { describe, expect, it } from 'vitest';
import {
  hasRefinements,
  parseCatalogFilters,
  toApiQuery,
  toSearchParams,
  toggleAttribute,
  toggleFormat,
} from './query';

describe('catalogue URL filters', () => {
  it('parses valid values and ignores malformed ones', () => {
    const filters = parseCatalogFilters({
      format: 'TEA_BAGS,BOGUS,LOOSE_LEAF,TEA_BAGS',
      minPrice: '50000',
      maxPrice: 'abc',
      inStock: 'true',
      sort: 'random',
      page: '-3',
    });
    expect(filters).toEqual({
      format: ['TEA_BAGS', 'LOOSE_LEAF'],
      minPrice: 50000,
      maxPrice: undefined,
      attributes: {},
      inStock: true,
      sort: 'featured',
      page: 1,
    });
  });

  it('accepts repeated format parameters from checkbox forms', () => {
    expect(parseCatalogFilters({ format: ['TEA_BAGS', 'GIFT_SET,PYRAMIDS'] }).format).toEqual([
      'TEA_BAGS',
      'GIFT_SET',
      'PYRAMIDS',
    ]);
  });

  it('swaps an inverted price range instead of failing', () => {
    expect(parseCatalogFilters({ minPrice: '90000', maxPrice: '10000' })).toMatchObject({
      minPrice: 10000,
      maxPrice: 90000,
    });
  });

  it('only writes non-default values to the URL, in a stable order', () => {
    const filters = parseCatalogFilters({ format: 'TEA_BAGS,LOOSE_LEAF', sort: 'price_asc' });
    expect(toSearchParams(filters)).toBe('format=LOOSE_LEAF%2CTEA_BAGS&sort=price_asc');
    expect(toSearchParams(parseCatalogFilters({}))).toBe('');
  });

  it('builds a canonical API query so equal filters share a cache entry', () => {
    const a = toApiQuery(
      parseCatalogFilters({ format: 'TEA_BAGS,LOOSE_LEAF' }),
      { category: 'black-tea' },
      24,
    );
    const b = toApiQuery(
      parseCatalogFilters({ format: 'LOOSE_LEAF,TEA_BAGS' }),
      { category: 'black-tea' },
      24,
    );
    expect(a).toBe(b);
    expect(a).toContain('category=black-tea');
  });

  it('resets to the first page when a filter changes', () => {
    const filters = parseCatalogFilters({ page: '4' });
    expect(toggleFormat(filters, 'TEA_BAGS')).toMatchObject({ page: 1, format: ['TEA_BAGS'] });
  });

  it('detects refinements that should not be indexed', () => {
    expect(hasRefinements(parseCatalogFilters({ page: '2' }))).toBe(false);
    expect(hasRefinements(parseCatalogFilters({ inStock: 'true' }))).toBe(true);
  });

  it('reads attribute filters, drops malformed ones and writes them back in a stable order', () => {
    const filters = parseCatalogFilters({
      'attr.leaf-style': 'rolled,whole-leaf',
      'attr.flavoured': ['true'],
      'attr.Bad Key': 'x',
      'attr.roast': "dark'--",
      'attrmin.net-weight': '100',
      'attrmax.net-weight': '250',
    });
    expect(filters.attributes).toEqual({
      'leaf-style': ['rolled', 'whole-leaf'],
      flavoured: ['true'],
      'net-weight': ['100~250'],
    });
    expect(hasRefinements(filters)).toBe(true);
    expect(toSearchParams(filters)).toBe(
      'attr.flavoured=true&attr.leaf-style=rolled%2Cwhole-leaf&attr.net-weight=100%7E250',
    );
    expect(toApiQuery(filters, { category: 'tea' }, 24)).toContain(
      'attr.leaf-style=rolled%2Cwhole-leaf',
    );
  });

  it('toggles one attribute value and goes back to the first page', () => {
    const filters = { ...parseCatalogFilters({ 'attr.leaf-style': 'rolled' }), page: 3 };
    expect(toggleAttribute(filters, 'leaf-style', 'cut')).toMatchObject({
      attributes: { 'leaf-style': ['rolled', 'cut'] },
      page: 1,
    });
    expect(toggleAttribute(filters, 'leaf-style', 'rolled').attributes).toEqual({});
  });
});
