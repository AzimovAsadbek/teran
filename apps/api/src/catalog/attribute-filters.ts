import {
  FILTERABLE_ATTRIBUTE_KINDS,
  type AttributeFacetDto,
  type AttributeKind,
  type Locale,
} from '@teran/contracts';
import { Prisma } from '../generated/prisma/client.js';
import { pickTranslation } from '../common/i18n.js';

/** A filterable attribute definition, as needed to interpret `attr.<key>` query parameters. */
export interface FilterableAttribute {
  id: string;
  key: string;
  kind: AttributeKind;
}

/**
 * A validated attribute filter. The same key can be defined by several product types (e.g. a net
 * weight for coffee and for sweets); the filter then applies to all of them.
 */
export type AttributeFilter =
  | { key: string; kind: 'SELECT' | 'MULTI_SELECT'; attributeIds: string[]; optionKeys: string[] }
  | { key: string; kind: 'BOOLEAN'; attributeIds: string[]; value: boolean }
  | { key: string; kind: 'NUMBER'; attributeIds: string[]; min?: string; max?: string };

/**
 * Turns the `attributes` part of a listing query into filters. Keys that are not filterable
 * attributes and values that do not fit the attribute's kind are ignored, so an outdated link
 * shows a wider listing rather than an error.
 */
export function parseAttributeFilters(
  requested: Readonly<Record<string, readonly string[]>> | undefined,
  definitions: readonly FilterableAttribute[],
): AttributeFilter[] {
  if (!requested) return [];
  const filters: AttributeFilter[] = [];
  for (const [key, values] of Object.entries(requested)) {
    const matching = definitions.filter(
      (definition) =>
        definition.key === key && FILTERABLE_ATTRIBUTE_KINDS.includes(definition.kind),
    );
    const first = matching[0];
    if (!first) continue;
    const attributeIds = matching
      .filter((definition) => definition.kind === first.kind)
      .map((definition) => definition.id);

    switch (first.kind) {
      case 'SELECT':
      case 'MULTI_SELECT': {
        const optionKeys = [...new Set(values.filter((value) => !value.includes('~')))];
        if (optionKeys.length > 0) {
          filters.push({ key, kind: first.kind, attributeIds, optionKeys });
        }
        break;
      }
      case 'BOOLEAN': {
        const flags = new Set(values.filter((value) => value === 'true' || value === 'false'));
        // Both values selected means "either", which is no filter at all.
        if (flags.size === 1)
          filters.push({ key, kind: 'BOOLEAN', attributeIds, value: flags.has('true') });
        break;
      }
      case 'NUMBER': {
        const range = values.find((value) => value.includes('~'));
        if (!range) break;
        const [min = '', max = ''] = range.split('~');
        if (min === '' && max === '') break;
        if (min !== '' && max !== '' && new Prisma.Decimal(min).greaterThan(max)) break;
        filters.push({
          key,
          kind: 'NUMBER',
          attributeIds,
          ...(min !== '' && { min }),
          ...(max !== '' && { max }),
        });
        break;
      }
      default:
        break;
    }
  }
  return filters;
}

/** Products matching one attribute filter (choices within one attribute are alternatives). */
export function attributeFilterWhere(filter: AttributeFilter): Prisma.ProductWhereInput {
  const attributeId = { in: filter.attributeIds };
  switch (filter.kind) {
    case 'SELECT':
    case 'MULTI_SELECT':
      return {
        attributeValues: {
          some: { attributeId, option: { key: { in: filter.optionKeys } } },
        },
      };
    case 'BOOLEAN':
      return { attributeValues: { some: { attributeId, booleanValue: filter.value } } };
    case 'NUMBER':
      return {
        attributeValues: {
          some: {
            attributeId,
            numberValue: {
              ...(filter.min !== undefined && { gte: new Prisma.Decimal(filter.min) }),
              ...(filter.max !== undefined && { lte: new Prisma.Decimal(filter.max) }),
            },
          },
        },
      };
  }
}

/** One row of `productAttributeValue.groupBy` over the products of a listing. */
export interface FacetGroupRow {
  attributeId: string;
  optionId: string | null;
  booleanValue: boolean | null;
  count: number;
  min: Prisma.Decimal | null;
  max: Prisma.Decimal | null;
}

export interface FacetDefinition {
  id: string;
  key: string;
  kind: AttributeKind;
  unit: string | null;
  position: number;
  typePosition: number;
  translations: { locale: string; label: string }[];
  options: {
    id: string;
    key: string;
    position: number;
    translations: { locale: string; label: string }[];
  }[];
}

interface FacetDraft {
  facet: AttributeFacetDto;
  order: [number, number];
  options: Map<string, { label: string; count: number; position: number }>;
  min: Prisma.Decimal | null;
  max: Prisma.Decimal | null;
}

/**
 * Builds the attribute filters shown next to a listing from per-value product counts. Attributes
 * with the same key are merged; options a visitor has selected stay visible (with their count,
 * possibly zero) so the selection can always be undone. Yes/no options use the keys "true" and
 * "false" as labels; the storefront translates them.
 */
export function buildAttributeFacets(
  rows: readonly FacetGroupRow[],
  definitions: readonly FacetDefinition[],
  filters: readonly AttributeFilter[],
  locale: Locale,
): AttributeFacetDto[] {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const drafts = new Map<string, FacetDraft>();

  const draftFor = (definition: FacetDefinition): FacetDraft | undefined => {
    let draft = drafts.get(definition.key);
    if (!draft) {
      draft = {
        facet: {
          key: definition.key,
          label: pickTranslation(definition.translations, locale)?.label ?? definition.key,
          kind: definition.kind,
          unit: definition.unit,
          options: [],
          range: null,
        },
        order: [definition.typePosition, definition.position],
        options: new Map(),
        min: null,
        max: null,
      };
      drafts.set(definition.key, draft);
    }
    // A key reused with another kind cannot be merged; the first definition wins.
    return draft.facet.kind === definition.kind ? draft : undefined;
  };

  const addOption = (
    draft: FacetDraft,
    key: string,
    label: string,
    position: number,
    count: number,
  ) => {
    const entry = draft.options.get(key) ?? { label, count: 0, position };
    entry.count += count;
    draft.options.set(key, entry);
  };

  for (const row of rows) {
    const definition = byId.get(row.attributeId);
    if (!definition) continue;
    const draft = draftFor(definition);
    if (!draft) continue;
    switch (definition.kind) {
      case 'SELECT':
      case 'MULTI_SELECT': {
        const option = definition.options.find((candidate) => candidate.id === row.optionId);
        if (!option) break;
        const label = pickTranslation(option.translations, locale)?.label ?? option.key;
        addOption(draft, option.key, label, option.position, row.count);
        break;
      }
      case 'BOOLEAN': {
        if (row.booleanValue === null) break;
        const key = String(row.booleanValue);
        addOption(draft, key, key, row.booleanValue ? 0 : 1, row.count);
        break;
      }
      case 'NUMBER': {
        if (row.min && (draft.min === null || row.min.lessThan(draft.min))) draft.min = row.min;
        if (row.max && (draft.max === null || row.max.greaterThan(draft.max))) draft.max = row.max;
        break;
      }
      default:
        break;
    }
  }

  for (const filter of filters) {
    for (const attributeId of filter.attributeIds) {
      const definition = byId.get(attributeId);
      const draft = definition && draftFor(definition);
      if (!definition || !draft) continue;
      if (filter.kind === 'SELECT' || filter.kind === 'MULTI_SELECT') {
        for (const option of definition.options) {
          if (!filter.optionKeys.includes(option.key)) continue;
          const label = pickTranslation(option.translations, locale)?.label ?? option.key;
          addOption(draft, option.key, label, option.position, 0);
        }
      } else if (filter.kind === 'BOOLEAN') {
        addOption(draft, String(filter.value), String(filter.value), filter.value ? 0 : 1, 0);
      }
    }
  }

  return [...drafts.values()]
    .map((draft) => ({
      ...draft.facet,
      options: [...draft.options.entries()]
        .sort(([keyA, a], [keyB, b]) => a.position - b.position || keyA.localeCompare(keyB))
        .map(([key, option]) => ({ key, label: option.label, count: option.count })),
      range:
        draft.min !== null && draft.max !== null
          ? { min: draft.min.toString(), max: draft.max.toString() }
          : null,
      order: draft.order,
    }))
    .filter((facet) => facet.options.length > 0 || facet.range !== null)
    .sort(
      (a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.key.localeCompare(b.key),
    )
    .map(({ order: _order, ...facet }) => facet);
}
