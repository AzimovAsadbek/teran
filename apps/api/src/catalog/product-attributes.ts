import { HttpStatus } from '@nestjs/common';
import {
  buildSearchText,
  type AttributeKind,
  type Locale,
  type ProductAttributeInput,
  type ValidationIssue,
} from '@teran/contracts';
import { Prisma } from '../generated/prisma/client.js';
import { ApiException } from '../common/errors/api-exception.js';
import { pickLocalizedText } from './catalog.mapper.js';

/** Largest magnitude a Decimal(14,3) column holds. */
const MAX_NUMBER = 99_999_999_999.999;

export interface AttributeDefinitionRow {
  id: string;
  key: string;
  kind: AttributeKind;
  unit: string | null;
  isRequired: boolean;
  isSearchable: boolean;
  translations: { locale: string; label: string }[];
  options: { id: string; key: string; translations: { locale: string; label: string }[] }[];
}

/** One row of ProductAttributeValue, ready to insert. */
export interface AttributeValueRow {
  attributeId: string;
  optionId: string | null;
  numberValue: Prisma.Decimal | null;
  booleanValue: boolean | null;
  textValue: Prisma.InputJsonValue | null;
}

export const attributeDefinitionInclude = {
  translations: true,
  options: { orderBy: [{ position: 'asc' }, { key: 'asc' }], include: { translations: true } },
} satisfies Prisma.AttributeDefinitionInclude;

/**
 * Validates a product's attribute values against its product type: every attribute must belong to
 * the type, appear once and carry a value of its own kind (options of that attribute, a finite
 * number, yes/no, or localised text with Uzbek). An attribute without a value is simply absent.
 * When the product is to be visible, every required attribute must have a value.
 *
 * Throws VALIDATION_FAILED listing every problem; returns the rows to store otherwise.
 */
export function validateAttributeValues(
  definitions: readonly AttributeDefinitionRow[],
  inputs: readonly ProductAttributeInput[],
  options: { requireComplete: boolean },
): AttributeValueRow[] {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const issues: ValidationIssue[] = [];
  const issue = (index: number, field: string, code: string) =>
    issues.push({ path: `attributes.${index}.${field}`, code, message: code });
  const seen = new Set<string>();
  const rows: AttributeValueRow[] = [];
  const valued = new Set<string>();

  inputs.forEach((input, index) => {
    const definition = byId.get(input.attributeId);
    if (!definition) return issue(index, 'attributeId', 'unknown_attribute');
    if (seen.has(definition.id)) return issue(index, 'attributeId', 'duplicate_attribute');
    seen.add(definition.id);
    const base = {
      attributeId: definition.id,
      optionId: null,
      numberValue: null,
      booleanValue: null,
      textValue: null,
    };

    switch (definition.kind) {
      case 'SELECT':
      case 'MULTI_SELECT': {
        const optionIds = [...new Set(input.optionIds ?? [])];
        if (optionIds.length === 0) return;
        if (definition.kind === 'SELECT' && optionIds.length > 1) {
          return issue(index, 'optionIds', 'single_option_only');
        }
        const own = new Set(definition.options.map((option) => option.id));
        if (!optionIds.every((optionId) => own.has(optionId))) {
          return issue(index, 'optionIds', 'unknown_option');
        }
        for (const optionId of optionIds) rows.push({ ...base, optionId });
        valued.add(definition.id);
        return;
      }
      case 'NUMBER': {
        if (input.number === undefined || input.number === null) return;
        if (!Number.isFinite(input.number) || Math.abs(input.number) > MAX_NUMBER) {
          return issue(index, 'number', 'invalid_number');
        }
        rows.push({ ...base, numberValue: new Prisma.Decimal(input.number.toFixed(3)) });
        valued.add(definition.id);
        return;
      }
      case 'BOOLEAN': {
        if (input.boolean === undefined || input.boolean === null) return;
        rows.push({ ...base, booleanValue: input.boolean });
        valued.add(definition.id);
        return;
      }
      case 'TEXT': {
        if (!input.text) return;
        const text: Record<string, string> = { uz: input.text.uz };
        if (input.text.ru) text.ru = input.text.ru;
        if (input.text.en) text.en = input.text.en;
        rows.push({ ...base, textValue: text });
        valued.add(definition.id);
        return;
      }
    }
  });

  if (options.requireComplete) {
    const missing = definitions.filter(
      (definition) => definition.isRequired && !valued.has(definition.id),
    );
    for (const definition of missing) {
      issues.push({
        path: 'attributes',
        code: 'required_attribute_missing',
        message: definition.key,
      });
    }
  }

  if (issues.length > 0) {
    throw new ApiException(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_FAILED',
      'Some product attributes are not valid',
      { issues },
    );
  }
  return rows;
}

/**
 * Words added to a product's search text for its searchable attributes, in one locale: option
 * labels, text values and numbers with their unit.
 */
export function attributeSearchTerms(
  definitions: readonly AttributeDefinitionRow[],
  rows: readonly AttributeValueRow[],
  locale: Locale,
): string {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const label = (translations: { locale: string; label: string }[]) =>
    translations.find((translation) => translation.locale === locale)?.label ??
    translations.find((translation) => translation.locale === 'uz')?.label ??
    null;
  const terms: (string | null)[] = [];
  for (const row of rows) {
    const definition = byId.get(row.attributeId);
    if (!definition?.isSearchable) continue;
    if (row.optionId) {
      const option = definition.options.find((candidate) => candidate.id === row.optionId);
      if (option) terms.push(label(option.translations) ?? option.key);
    } else if (row.textValue !== null) {
      terms.push(pickLocalizedText(row.textValue, locale));
    } else if (row.numberValue !== null) {
      terms.push([row.numberValue.toString(), definition.unit].filter(Boolean).join(' '));
    } else if (row.booleanValue === true) {
      terms.push(label(definition.translations));
    }
  }
  return buildSearchText(terms);
}

/** Stored values back into the admin editor's shape (one entry per attribute). */
export function toAttributeInputs(
  values: readonly {
    attributeId: string;
    optionId: string | null;
    numberValue: Prisma.Decimal | null;
    booleanValue: boolean | null;
    textValue: Prisma.JsonValue | null;
  }[],
): ProductAttributeInput[] {
  const byAttribute = new Map<string, ProductAttributeInput>();
  for (const value of values) {
    const entry = byAttribute.get(value.attributeId) ?? { attributeId: value.attributeId };
    if (value.optionId) entry.optionIds = [...(entry.optionIds ?? []), value.optionId];
    if (value.numberValue !== null) entry.number = value.numberValue.toNumber();
    if (value.booleanValue !== null) entry.boolean = value.booleanValue;
    if (
      value.textValue !== null &&
      typeof value.textValue === 'object' &&
      !Array.isArray(value.textValue)
    ) {
      const text = value.textValue as Record<string, unknown>;
      if (typeof text.uz === 'string') {
        entry.text = {
          uz: text.uz,
          ru: typeof text.ru === 'string' ? text.ru : undefined,
          en: typeof text.en === 'string' ? text.en : undefined,
        };
      }
    }
    byAttribute.set(value.attributeId, entry);
  }
  return [...byAttribute.values()];
}
