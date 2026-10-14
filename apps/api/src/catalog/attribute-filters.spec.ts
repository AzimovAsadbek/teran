import { productListQuerySchema } from '@teran/contracts';
import { Prisma } from '../generated/prisma/client.js';
import {
  attributeFilterWhere,
  buildAttributeFacets,
  parseAttributeFilters,
  type FacetDefinition,
} from './attribute-filters.js';

const definitions = [
  { id: 'roast-coffee', key: 'roast-level', kind: 'SELECT' as const },
  { id: 'weight-coffee', key: 'net-weight', kind: 'NUMBER' as const },
  { id: 'weight-sweets', key: 'net-weight', kind: 'NUMBER' as const },
  { id: 'decaf', key: 'decaf', kind: 'BOOLEAN' as const },
  { id: 'notes', key: 'notes', kind: 'TEXT' as const },
];

describe('attribute filter query parameters', () => {
  it('collects attr.<key> parameters into one validated object', () => {
    const query = productListQuerySchema.parse({
      'attr.roast-level': 'dark,medium',
      'attr.net-weight': '100~250',
      'attr.decaf': ['true'],
      page: '2',
    });
    expect(query.attributes).toEqual({
      'roast-level': ['dark', 'medium'],
      'net-weight': ['100~250'],
      decaf: ['true'],
    });
    expect(query.page).toBe(2);
  });

  it('rejects malformed keys and values instead of passing them to the database', () => {
    expect(productListQuerySchema.safeParse({ 'attr.Roast Level': 'dark' }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ 'attr.roast-level': "dark'--" }).success).toBe(false);
  });
});

describe('parseAttributeFilters', () => {
  it('interprets values by the attribute kind and ignores what does not fit', () => {
    const filters = parseAttributeFilters(
      {
        'roast-level': ['dark', 'dark', 'medium'],
        'net-weight': ['100~250'],
        decaf: ['true'],
        notes: ['anything'],
        unknown: ['x'],
      },
      definitions,
    );
    expect(filters).toEqual([
      {
        key: 'roast-level',
        kind: 'SELECT',
        attributeIds: ['roast-coffee'],
        optionKeys: ['dark', 'medium'],
      },
      {
        key: 'net-weight',
        kind: 'NUMBER',
        attributeIds: ['weight-coffee', 'weight-sweets'],
        min: '100',
        max: '250',
      },
      { key: 'decaf', kind: 'BOOLEAN', attributeIds: ['decaf'], value: true },
    ]);
  });

  it('treats both yes and no, an empty range or an inverted range as no filter', () => {
    expect(
      parseAttributeFilters({ decaf: ['true', 'false'], 'net-weight': ['300~100'] }, definitions),
    ).toEqual([]);
    expect(parseAttributeFilters({ 'net-weight': ['~'] }, definitions)).toEqual([]);
    expect(parseAttributeFilters({ 'net-weight': ['~250'] }, definitions)[0]).toMatchObject({
      max: '250',
    });
  });

  it('builds a condition on the attribute values of the product', () => {
    expect(
      attributeFilterWhere({
        key: 'decaf',
        kind: 'BOOLEAN',
        attributeIds: ['decaf'],
        value: false,
      }),
    ).toEqual({
      attributeValues: { some: { attributeId: { in: ['decaf'] }, booleanValue: false } },
    });
  });
});

describe('buildAttributeFacets', () => {
  const facetDefinitions: FacetDefinition[] = [
    {
      id: 'roast-coffee',
      key: 'roast-level',
      kind: 'SELECT',
      unit: null,
      position: 0,
      typePosition: 1,
      translations: [{ locale: 'uz', label: 'Qovurish darajasi' }],
      options: [
        {
          id: 'o-light',
          key: 'light',
          position: 0,
          translations: [{ locale: 'uz', label: 'Yengil' }],
        },
        { id: 'o-dark', key: 'dark', position: 1, translations: [{ locale: 'uz', label: 'Toʻq' }] },
      ],
    },
    {
      id: 'weight-coffee',
      key: 'net-weight',
      kind: 'NUMBER',
      unit: 'g',
      position: 1,
      typePosition: 1,
      translations: [{ locale: 'uz', label: 'Ogʻirligi' }],
      options: [],
    },
  ];
  const row = (
    attributeId: string,
    optionId: string | null,
    count: number,
    min: string | null = null,
    max: string | null = null,
  ) => ({
    attributeId,
    optionId,
    booleanValue: null,
    count,
    min: min === null ? null : new Prisma.Decimal(min),
    max: max === null ? null : new Prisma.Decimal(max),
  });

  it('counts products per option, in the defined order, and reports number ranges', () => {
    const facets = buildAttributeFacets(
      [
        row('roast-coffee', 'o-dark', 3),
        row('roast-coffee', 'o-light', 1),
        row('weight-coffee', null, 4, '100', '250'),
      ],
      facetDefinitions,
      [],
      'ru',
    );
    expect(facets).toEqual([
      {
        key: 'roast-level',
        label: 'Qovurish darajasi',
        kind: 'SELECT',
        unit: null,
        options: [
          { key: 'light', label: 'Yengil', count: 1 },
          { key: 'dark', label: 'Toʻq', count: 3 },
        ],
        range: null,
      },
      {
        key: 'net-weight',
        label: 'Ogʻirligi',
        kind: 'NUMBER',
        unit: 'g',
        options: [],
        range: { min: '100', max: '250' },
      },
    ]);
  });

  it('keeps a selected option visible even when nothing matches it any more', () => {
    const facets = buildAttributeFacets(
      [],
      facetDefinitions,
      [
        {
          key: 'roast-level',
          kind: 'SELECT',
          attributeIds: ['roast-coffee'],
          optionKeys: ['dark'],
        },
      ],
      'uz',
    );
    expect(facets[0]?.options).toEqual([{ key: 'dark', label: 'Toʻq', count: 0 }]);
  });
});
