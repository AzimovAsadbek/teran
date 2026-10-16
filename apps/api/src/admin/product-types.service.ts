import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  AdminProductType,
  AttributeKind,
  productTypeUpsertSchema,
  ValidationIssue,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { ApiException } from '../common/errors/api-exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { nullable, toAdminTranslation, translationRows, type Actor } from './admin-support.js';

type ProductTypePayload = z.output<typeof productTypeUpsertSchema>;

const typeInclude = {
  translations: true,
  _count: { select: { products: true } },
  attributes: {
    orderBy: [{ position: 'asc' }, { key: 'asc' }],
    include: {
      translations: true,
      _count: { select: { values: true } },
      options: {
        orderBy: [{ position: 'asc' }, { key: 'asc' }],
        include: { translations: true, _count: { select: { values: true } } },
      },
    },
  },
} satisfies Prisma.ProductTypeInclude;

type TypeRow = Prisma.ProductTypeGetPayload<{ include: typeof typeInclude }>;

function invalid(issues: ValidationIssue[], message: string): ApiException {
  return new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', message, { issues });
}

/**
 * Product types and their attribute definitions. Definitions that products use are protected: an
 * attribute or option with values cannot be removed, and its kind cannot change. An attribute key
 * shared by several types must keep one kind everywhere, because filters address attributes by key.
 */
@Injectable()
export class AdminProductTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list(): Promise<AdminProductType[]> {
    const rows = await this.prisma.productType.findMany({
      orderBy: [{ position: 'asc' }, { key: 'asc' }],
      include: typeInclude,
    });
    return rows.map((row) => this.toDto(row));
  }

  async create(input: ProductTypePayload, actor: Actor): Promise<AdminProductType> {
    const id = await this.prisma.$transaction(async (tx) => {
      await this.assertKeyKinds(tx, null, input);
      const created = await tx.productType.create({
        data: {
          key: input.key,
          isActive: input.isActive,
          position: input.position,
          brewingGuide: input.brewingGuide ?? false,
          translations: { create: this.typeTranslations(input) },
        },
        select: { id: true },
      });
      await this.syncAttributes(tx, created.id, input);
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'productType.create',
          entityType: 'ProductType',
          entityId: created.id,
          metadata: {
            key: input.key,
            attributes: input.attributes.map((attribute) => attribute.key),
          },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
      return created.id;
    });
    this.revalidation.notify('catalog');
    return this.get(id);
  }

  async update(id: string, input: ProductTypePayload, actor: Actor): Promise<AdminProductType> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.productType.findUnique({ where: { id }, select: { key: true } });
      if (!existing) throw ApiException.notFound('Product type not found');
      await this.assertKeyKinds(tx, id, input);
      await tx.productType.update({
        where: { id },
        data: {
          key: input.key,
          isActive: input.isActive,
          position: input.position,
          // Left out by the request: the current setting stays.
          ...(input.brewingGuide === undefined ? {} : { brewingGuide: input.brewingGuide }),
        },
      });
      const translations = this.typeTranslations(input);
      await tx.productTypeTranslation.deleteMany({
        where: { productTypeId: id, locale: { notIn: translations.map((row) => row.locale) } },
      });
      for (const row of translations) {
        await tx.productTypeTranslation.upsert({
          where: { productTypeId_locale: { productTypeId: id, locale: row.locale } },
          create: { ...row, productTypeId: id },
          update: row,
        });
      }
      await this.syncAttributes(tx, id, input);
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'productType.update',
          entityType: 'ProductType',
          entityId: id,
          metadata: {
            key: input.key,
            attributes: input.attributes.map((attribute) => attribute.key),
          },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
    return this.get(id);
  }

  /** Only a type that no product uses can be removed (with its definitions). */
  async remove(id: string, actor: Actor): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.count({ where: { productTypeId: id } });
      if (products > 0) {
        throw ApiException.conflict('CONFLICT', 'Products still use this product type', {
          products,
        });
      }
      const deleted = await tx.productType.deleteMany({ where: { id } });
      if (deleted.count === 0) throw ApiException.notFound('Product type not found');
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'productType.delete',
          entityType: 'ProductType',
          entityId: id,
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
  }

  private async get(id: string): Promise<AdminProductType> {
    const row = await this.prisma.productType.findUnique({ where: { id }, include: typeInclude });
    if (!row) throw ApiException.notFound('Product type not found');
    return this.toDto(row);
  }

  /** A key used by another type's attribute must have the same kind there. */
  private async assertKeyKinds(
    tx: Prisma.TransactionClient,
    typeId: string | null,
    input: ProductTypePayload,
  ): Promise<void> {
    if (input.attributes.length === 0) return;
    const others = await tx.attributeDefinition.findMany({
      where: {
        key: { in: input.attributes.map((attribute) => attribute.key) },
        ...(typeId ? { productTypeId: { not: typeId } } : {}),
      },
      select: { key: true, kind: true },
    });
    const kinds = new Map<string, AttributeKind>(others.map((other) => [other.key, other.kind]));
    const issues = input.attributes.flatMap((attribute, index) => {
      const kind = kinds.get(attribute.key);
      return kind && kind !== attribute.kind
        ? [{ path: `attributes.${index}.kind`, code: 'kind_conflict', message: kind }]
        : [];
    });
    if (issues.length > 0) {
      throw invalid(issues, 'An attribute with this key has another kind in another product type');
    }
  }

  /**
   * Makes the type's attributes (and their options) match the submitted list: updates existing
   * ones, adds new ones, removes the ones left out — unless products have values for them.
   */
  private async syncAttributes(
    tx: Prisma.TransactionClient,
    typeId: string,
    input: ProductTypePayload,
  ): Promise<void> {
    const existing = await tx.attributeDefinition.findMany({
      where: { productTypeId: typeId },
      include: {
        _count: { select: { values: true } },
        options: { include: { _count: { select: { values: true } } } },
      },
    });
    const byId = new Map(existing.map((attribute) => [attribute.id, attribute]));
    const issues: ValidationIssue[] = [];

    input.attributes.forEach((attribute, index) => {
      if (!attribute.id) return;
      const current = byId.get(attribute.id);
      if (!current) {
        issues.push({
          path: `attributes.${index}.id`,
          code: 'unknown_attribute',
          message: 'unknown',
        });
      } else if (current.kind !== attribute.kind && current._count.values > 0) {
        issues.push({ path: `attributes.${index}.kind`, code: 'kind_in_use', message: 'in use' });
      }
    });
    const keptIds = new Set(
      input.attributes.flatMap((attribute) => (attribute.id ? [attribute.id] : [])),
    );
    for (const attribute of existing) {
      if (!keptIds.has(attribute.id) && attribute._count.values > 0) {
        issues.push({ path: 'attributes', code: 'attribute_in_use', message: attribute.key });
      }
    }
    if (issues.length > 0) throw invalid(issues, 'Some attributes cannot be changed');

    // Removed attributes first, so a re-added key does not collide with the old row.
    const removed = existing.filter((attribute) => !keptIds.has(attribute.id));
    if (removed.length > 0) {
      await tx.attributeDefinition.deleteMany({
        where: { id: { in: removed.map((attribute) => attribute.id) } },
      });
    }

    for (const [position, attribute] of input.attributes.entries()) {
      const fields = {
        key: attribute.key,
        kind: attribute.kind,
        unit: nullable(attribute.unit),
        isRequired: attribute.isRequired,
        isFilterable: attribute.isFilterable,
        isSearchable: attribute.isSearchable,
        isVisible: attribute.isVisible,
        position,
      };
      const translations = translationRows(attribute.translations).map((row) => ({
        locale: row.locale,
        label: row.label,
        hint: nullable(row.hint),
      }));
      let attributeId: string;
      if (attribute.id) {
        attributeId = attribute.id;
        await tx.attributeDefinition.update({ where: { id: attributeId }, data: fields });
        await tx.attributeDefinitionTranslation.deleteMany({ where: { attributeId } });
      } else {
        attributeId = (
          await tx.attributeDefinition.create({
            data: { ...fields, productTypeId: typeId },
            select: { id: true },
          })
        ).id;
      }
      await tx.attributeDefinitionTranslation.createMany({
        data: translations.map((row) => ({ ...row, attributeId })),
      });
      await this.syncOptions(
        tx,
        attributeId,
        attribute.options,
        byId.get(attributeId)?.options ?? [],
      );
    }
  }

  private async syncOptions(
    tx: Prisma.TransactionClient,
    attributeId: string,
    options: ProductTypePayload['attributes'][number]['options'],
    existing: { id: string; key: string; _count: { values: number } }[],
  ): Promise<void> {
    const keptIds = new Set(options.flatMap((option) => (option.id ? [option.id] : [])));
    const own = new Set(existing.map((option) => option.id));
    if ([...keptIds].some((id) => !own.has(id))) {
      throw invalid(
        [{ path: 'options', code: 'unknown_option', message: 'unknown' }],
        'Unknown option',
      );
    }
    const blocked = existing.filter(
      (option) => !keptIds.has(option.id) && option._count.values > 0,
    );
    if (blocked.length > 0) {
      throw invalid(
        blocked.map((option) => ({ path: 'options', code: 'option_in_use', message: option.key })),
        'Options used by products cannot be removed',
      );
    }
    const removed = existing.filter((option) => !keptIds.has(option.id));
    if (removed.length > 0) {
      await tx.attributeOption.deleteMany({
        where: { id: { in: removed.map((option) => option.id) } },
      });
    }
    for (const [position, option] of options.entries()) {
      const labels = translationRows(option.translations).map((row) => ({
        locale: row.locale,
        label: row.label,
      }));
      let optionId: string;
      if (option.id) {
        optionId = option.id;
        await tx.attributeOption.update({
          where: { id: optionId },
          data: { key: option.key, position },
        });
        await tx.attributeOptionTranslation.deleteMany({ where: { optionId } });
      } else {
        optionId = (
          await tx.attributeOption.create({
            data: { attributeId, key: option.key, position },
            select: { id: true },
          })
        ).id;
      }
      await tx.attributeOptionTranslation.createMany({
        data: labels.map((row) => ({ ...row, optionId })),
      });
    }
  }

  private typeTranslations(input: ProductTypePayload) {
    return translationRows(input.translations).map((row) => ({
      locale: row.locale,
      name: row.name,
    }));
  }

  private toDto(row: TypeRow): AdminProductType {
    return {
      id: row.id,
      key: row.key,
      isActive: row.isActive,
      position: row.position,
      brewingGuide: row.brewingGuide,
      productCount: row._count.products,
      translations: toAdminTranslation(row.translations, (translation) => ({
        name: translation.name,
      })),
      attributes: row.attributes.map((attribute) => ({
        id: attribute.id,
        key: attribute.key,
        kind: attribute.kind,
        unit: attribute.unit,
        isRequired: attribute.isRequired,
        isFilterable: attribute.isFilterable,
        isSearchable: attribute.isSearchable,
        isVisible: attribute.isVisible,
        position: attribute.position,
        usageCount: attribute._count.values,
        translations: toAdminTranslation(attribute.translations, (translation) => ({
          label: translation.label,
          hint: translation.hint ?? undefined,
        })),
        options: attribute.options.map((option) => ({
          id: option.id,
          key: option.key,
          usageCount: option._count.values,
          translations: toAdminTranslation(option.translations, (translation) => ({
            label: translation.label,
          })),
        })),
      })),
    };
  }
}
