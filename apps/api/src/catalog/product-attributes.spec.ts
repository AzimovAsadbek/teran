import { ApiException } from '../common/errors/api-exception.js';
import {
  attributeSearchTerms,
  validateAttributeValues,
  type AttributeDefinitionRow,
} from './product-attributes.js';

const definitions: AttributeDefinitionRow[] = [
  {
    id: '0192f7a0-0000-7000-8000-000000000001',
    key: 'roast-level',
    kind: 'SELECT',
    unit: null,
    isRequired: true,
    isSearchable: true,
    translations: [{ locale: 'uz', label: 'Qovurish' }],
    options: [
      {
        id: '0192f7a0-0000-7000-8000-0000000000a1',
        key: 'dark',
        translations: [
          { locale: 'uz', label: 'Toʻq' },
          { locale: 'ru', label: 'Тёмная' },
        ],
      },
      {
        id: '0192f7a0-0000-7000-8000-0000000000a2',
        key: 'light',
        translations: [{ locale: 'uz', label: 'Yengil' }],
      },
    ],
  },
  {
    id: '0192f7a0-0000-7000-8000-000000000002',
    key: 'flavours',
    kind: 'MULTI_SELECT',
    unit: null,
    isRequired: false,
    isSearchable: false,
    translations: [{ locale: 'uz', label: 'Taʼmlar' }],
    options: [
      { id: '0192f7a0-0000-7000-8000-0000000000b1', key: 'nutty', translations: [] },
      { id: '0192f7a0-0000-7000-8000-0000000000b2', key: 'fruity', translations: [] },
    ],
  },
  {
    id: '0192f7a0-0000-7000-8000-000000000003',
    key: 'net-weight',
    kind: 'NUMBER',
    unit: 'g',
    isRequired: false,
    isSearchable: true,
    translations: [{ locale: 'uz', label: 'Ogʻirligi' }],
    options: [],
  },
  {
    id: '0192f7a0-0000-7000-8000-000000000004',
    key: 'storage',
    kind: 'TEXT',
    unit: null,
    isRequired: false,
    isSearchable: false,
    translations: [{ locale: 'uz', label: 'Saqlash' }],
    options: [],
  },
];
const [roast, flavours, weight, storage] = definitions as [
  AttributeDefinitionRow,
  AttributeDefinitionRow,
  AttributeDefinitionRow,
  AttributeDefinitionRow,
];

function issuesOf(run: () => unknown): string[] {
  try {
    run();
    return [];
  } catch (error) {
    if (!(error instanceof ApiException)) throw error;
    return (error.extras.issues ?? []).map((issue) => `${issue.path}:${issue.code}`);
  }
}

describe('validateAttributeValues', () => {
  it('stores one row per value, typed by the attribute kind', () => {
    const rows = validateAttributeValues(
      definitions,
      [
        { attributeId: roast.id, optionIds: [roast.options[0]!.id] },
        { attributeId: flavours.id, optionIds: flavours.options.map((option) => option.id) },
        { attributeId: weight.id, number: 250 },
        { attributeId: storage.id, text: { uz: 'Quruq joyda', ru: undefined, en: undefined } },
      ],
      { requireComplete: true },
    );
    expect(rows).toHaveLength(5);
    expect(rows.find((row) => row.attributeId === weight.id)?.numberValue?.toString()).toBe('250');
    expect(rows.find((row) => row.attributeId === storage.id)?.textValue).toEqual({
      uz: 'Quruq joyda',
    });
  });

  it('rejects values that do not belong to the attribute or the product type', () => {
    expect(
      issuesOf(() =>
        validateAttributeValues(
          definitions,
          [
            { attributeId: roast.id, optionIds: [flavours.options[0]!.id] },
            { attributeId: '0192f7a0-0000-7000-8000-00000000ffff', boolean: true },
            { attributeId: weight.id, number: Number.POSITIVE_INFINITY },
            { attributeId: weight.id, number: 1 },
          ],
          { requireComplete: false },
        ),
      ),
    ).toEqual([
      'attributes.0.optionIds:unknown_option',
      'attributes.1.attributeId:unknown_attribute',
      'attributes.2.number:invalid_number',
      'attributes.3.attributeId:duplicate_attribute',
    ]);
  });

  it('allows one option for a single choice', () => {
    expect(
      issuesOf(() =>
        validateAttributeValues(
          definitions,
          [{ attributeId: roast.id, optionIds: roast.options.map((option) => option.id) }],
          { requireComplete: false },
        ),
      ),
    ).toEqual(['attributes.0.optionIds:single_option_only']);
  });

  it('requires the required attributes only for visible products', () => {
    expect(validateAttributeValues(definitions, [], { requireComplete: false })).toEqual([]);
    expect(
      issuesOf(() => validateAttributeValues(definitions, [], { requireComplete: true })),
    ).toEqual(['attributes:required_attribute_missing']);
  });
});

describe('attributeSearchTerms', () => {
  it('adds the searchable values in the language of the translation', () => {
    const rows = validateAttributeValues(
      definitions,
      [
        { attributeId: roast.id, optionIds: [roast.options[0]!.id] },
        { attributeId: flavours.id, optionIds: [flavours.options[0]!.id] },
        { attributeId: weight.id, number: 250 },
      ],
      { requireComplete: false },
    );
    expect(attributeSearchTerms(definitions, rows, 'ru')).toBe('тёмная 250 g');
    // Flavours are not searchable, so "nutty" is not added.
    expect(attributeSearchTerms(definitions, rows, 'uz')).toBe("to'q 250 g");
  });
});
