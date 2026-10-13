import { Injectable } from '@nestjs/common';
import type { AdminTaxonomy, TaxonomyUpsertInput, taxonomyUpsertSchema } from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { asIllustrationKey } from '../catalog/catalog.mapper.js';
import { ApiException } from '../common/errors/api-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { nullable, toAdminTranslation, translationRows, type Actor } from './admin-support.js';

export type TaxonomyKind = 'category' | 'collection';
type TaxonomyPayload = z.output<typeof taxonomyUpsertSchema>;

interface TranslationRow {
  locale: string;
  name: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

interface TaxonomyRow {
  id: string;
  slug: string;
  position: number;
  isActive: boolean;
  illustrationKey: string | null;
  translations: TranslationRow[];
  _count: { products: number };
}

const ENTITY = { category: 'Category', collection: 'Collection' } as const;

/** Categories and collections share one shape: slug, order, visibility and translations. */
@Injectable()
export class AdminTaxonomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list(kind: TaxonomyKind): Promise<AdminTaxonomy[]> {
    const query = {
      orderBy: [{ position: 'asc' as const }, { slug: 'asc' as const }],
      include: { translations: true, _count: { select: { products: true } } },
    };
    const rows: TaxonomyRow[] =
      kind === 'category'
        ? await this.prisma.category.findMany(query)
        : await this.prisma.collection.findMany(query);
    return rows.map((row) => this.toDto(row));
  }

  async create(kind: TaxonomyKind, input: TaxonomyPayload, actor: Actor): Promise<AdminTaxonomy> {
    const id = await this.prisma.$transaction(async (tx) => {
      const data = {
        ...this.fields(input),
        translations: { create: this.translationData(input) },
      };
      const created =
        kind === 'category'
          ? await tx.category.create({ data, select: { id: true } })
          : await tx.collection.create({ data, select: { id: true } });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `${kind}.create`,
          entityType: ENTITY[kind],
          entityId: created.id,
          metadata: { slug: input.slug },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
      return created.id;
    });
    this.revalidation.notify('catalog');
    return this.get(kind, id);
  }

  async update(
    kind: TaxonomyKind,
    id: string,
    input: TaxonomyPayload,
    actor: Actor,
  ): Promise<AdminTaxonomy> {
    await this.prisma.$transaction(async (tx) => {
      const rows = this.translationData(input);
      const locales = rows.map((row) => row.locale);
      if (kind === 'category') {
        await tx.category.update({ where: { id }, data: this.fields(input) });
        await tx.categoryTranslation.deleteMany({
          where: { categoryId: id, locale: { notIn: locales } },
        });
        for (const row of rows) {
          await tx.categoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: id, locale: row.locale } },
            create: { ...row, categoryId: id },
            update: row,
          });
        }
      } else {
        await tx.collection.update({ where: { id }, data: this.fields(input) });
        await tx.collectionTranslation.deleteMany({
          where: { collectionId: id, locale: { notIn: locales } },
        });
        for (const row of rows) {
          await tx.collectionTranslation.upsert({
            where: { collectionId_locale: { collectionId: id, locale: row.locale } },
            create: { ...row, collectionId: id },
            update: row,
          });
        }
      }
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `${kind}.update`,
          entityType: ENTITY[kind],
          entityId: id,
          metadata: { slug: input.slug, isActive: input.isActive },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
    return this.get(kind, id);
  }

  /** Collections can always be removed; a category only when no product uses it. */
  async remove(kind: TaxonomyKind, id: string, actor: Actor): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (kind === 'category') {
        const products = await tx.product.count({ where: { categoryId: id } });
        if (products > 0) {
          throw ApiException.conflict(
            'CONFLICT',
            'Move or archive the products of this category first',
            {
              products,
            },
          );
        }
        await tx.category.delete({ where: { id } });
      } else {
        await tx.collection.delete({ where: { id } });
      }
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `${kind}.delete`,
          entityType: ENTITY[kind],
          entityId: id,
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
  }

  private async get(kind: TaxonomyKind, id: string): Promise<AdminTaxonomy> {
    const query = {
      where: { id },
      include: { translations: true, _count: { select: { products: true } } },
    };
    const row: TaxonomyRow | null =
      kind === 'category'
        ? await this.prisma.category.findUnique(query)
        : await this.prisma.collection.findUnique(query);
    if (!row) throw ApiException.notFound();
    return this.toDto(row);
  }

  private fields(input: TaxonomyUpsertInput) {
    return {
      slug: input.slug,
      position: input.position,
      isActive: input.isActive,
      illustrationKey: input.illustrationKey,
    };
  }

  private translationData(input: TaxonomyPayload) {
    return translationRows(input.translations).map((row) => ({
      locale: row.locale,
      name: row.name,
      description: nullable(row.description),
      seoTitle: nullable(row.seoTitle),
      seoDescription: nullable(row.seoDescription),
    }));
  }

  private toDto(row: TaxonomyRow): AdminTaxonomy {
    return {
      id: row.id,
      slug: row.slug,
      position: row.position,
      isActive: row.isActive,
      illustrationKey: asIllustrationKey(row.illustrationKey),
      productCount: row._count.products,
      translations: toAdminTranslation(row.translations, (translation) => ({
        name: translation.name,
        description: translation.description ?? undefined,
        seoTitle: translation.seoTitle ?? undefined,
        seoDescription: translation.seoDescription ?? undefined,
      })),
    };
  }
}
