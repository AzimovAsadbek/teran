import type { FacetsDto } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import {
  hasRefinements,
  parseCatalogFilters,
  toApiQuery,
  toSearchParams,
  toggleAttribute,
  toggleCaffeine,
  toggleFormat,
  usefulFacets,
} from './query';

describe('catalogue URL filters', () => {
  it('reads caffeine levels, drops unknown ones and writes them in their natural order', () => {
    const filters = parseCatalogFilters({ caffeine: ['HIGH,BOGUS', 'NONE', 'HIGH'] });
    expect(filters.caffeine).toEqual(['HIGH', 'NONE']);
    expect(toSearchParams(filters)).toBe('caffeine=NONE%2CHIGH');
    expect(toSearchParams(toggleCaffeine(filters, 'NONE'))).toBe('caffeine=HIGH');
  });

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
      caffeine: [],
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

describe('usefulFacets', () => {
  const none = parseCatalogFilters({});
  const facets = (overrides: Partial<FacetsDto>): FacetsDto => ({
    formats: [],
    caffeine: [],
    priceRange: null,
    attributes: [],
    ...overrides,
  });

  it('drops a caffeine level every product shares, keeps one that narrows', () => {
    expect(
      usefulFacets(facets({ caffeine: [{ value: 'HIGH', count: 2 }] }), none, 2).caffeine,
    ).toEqual([]);
    const mixed = [
      { value: 'HIGH' as const, count: 1 },
      { value: 'LOW' as const, count: 1 },
    ];
    expect(usefulFacets(facets({ caffeine: mixed }), none, 2).caffeine).toEqual(mixed);
  });

  it('keeps an applied filter even when it no longer narrows, so it can be undone', () => {
    const applied = parseCatalogFilters({ caffeine: 'HIGH' });
    const caffeine = [{ value: 'HIGH' as const, count: 2 }];
    expect(usefulFacets(facets({ caffeine }), applied, 2).caffeine).toEqual(caffeine);
  });

  it('drops a yes/no held by none or all, and a number range of one value', () => {
    const yesNo = (count: number) => ({
      key: 'sparkling',
      label: 'Sparkling',
      kind: 'BOOLEAN' as const,
      unit: null,
      options: [{ key: 'true', label: 'Yes', count }],
      range: null,
    });
    const number = (min: string, max: string) => ({
      key: 'volume',
      label: 'Volume',
      kind: 'NUMBER' as const,
      unit: 'ml',
      options: [],
      range: { min, max },
    });
    const kept = (attribute: FacetsDto['attributes'][number]) =>
      usefulFacets(facets({ attributes: [attribute] }), none, 4).attributes.length;
    expect(kept(yesNo(0))).toBe(0);
    expect(kept(yesNo(4))).toBe(0);
    expect(kept(yesNo(1))).toBe(1);
    expect(kept(number('500', '500'))).toBe(0);
    expect(kept(number('330', '1000'))).toBe(1);
  });
});
