import { HttpStatus, Injectable } from '@nestjs/common';
import {
  isReservedCategorySlug,
  type AdminTaxonomy,
  type TaxonomyUpsertInput,
  type taxonomyUpsertSchema,
} from '@teran/contracts';
import type { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
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
  body?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

interface TaxonomyRow {
  id: string;
  slug: string;
  position: number;
  isActive: boolean;
  illustrationKey: string | null;
  parentId?: string | null;
  translations: TranslationRow[];
  _count: { products: number; children?: number };
}

const REDIRECT_ENTITY = { category: 'CATEGORY', collection: 'COLLECTION' } as const;

const ENTITY = { category: 'Category', collection: 'Collection' } as const;

/**
 * Categories and collections share one shape: slug, order, visibility and translations.
 * Categories also form a two-level tree (top-level categories and their subcategories) and have
 * editorial text. Renaming a slug keeps the old address working through a permanent redirect.
 */
@Injectable()
export class AdminTaxonomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list(kind: TaxonomyKind): Promise<AdminTaxonomy[]> {
    const orderBy = [{ position: 'asc' as const }, { slug: 'asc' as const }];
    const rows: TaxonomyRow[] =
      kind === 'category'
        ? await this.prisma.category.findMany({
            orderBy,
            include: {
              translations: true,
              _count: { select: { products: true, children: true } },
            },
          })
        : await this.prisma.collection.findMany({
            orderBy,
            include: { translations: true, _count: { select: { products: true } } },
          });
    return rows.map((row) => this.toDto(row));
  }

  async create(kind: TaxonomyKind, input: TaxonomyPayload, actor: Actor): Promise<AdminTaxonomy> {
    const id = await this.prisma.$transaction(async (tx) => {
      if (kind === 'category') await this.checkCategory(tx, null, input);
      await this.releaseSlug(tx, kind, input.slug);
      const translations = { create: this.translationData(kind, input) };
      const created =
        kind === 'category'
          ? await tx.category.create({
              data: { ...this.fields(input), parentId: input.parentId, translations },
              select: { id: true },
            })
          : await tx.collection.create({
              data: { ...this.fields(input), translations },
              select: { id: true },
            });
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
      const rows = this.translationData(kind, input);
      const locales = rows.map((row) => row.locale);
      const previous =
        kind === 'category'
          ? await tx.category.findUnique({ where: { id }, select: { slug: true } })
          : await tx.collection.findUnique({ where: { id }, select: { slug: true } });
      if (!previous) throw ApiException.notFound();
      if (kind === 'category') await this.checkCategory(tx, id, input);
      if (previous.slug !== input.slug) {
        await this.releaseSlug(tx, kind, input.slug);
        // The old address keeps working: requests for it are redirected to the new one.
        await tx.slugRedirect.upsert({
          where: {
            entity_fromSlug: { entity: REDIRECT_ENTITY[kind], fromSlug: previous.slug },
          },
          create: { entity: REDIRECT_ENTITY[kind], fromSlug: previous.slug, toId: id },
          update: { toId: id },
        });
      }
      if (kind === 'category') {
        await tx.category.update({
          where: { id },
          data: { ...this.fields(input), parentId: input.parentId },
        });
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
          metadata: {
            slug: input.slug,
            isActive: input.isActive,
            ...(previous.slug !== input.slug ? { previousSlug: previous.slug } : {}),
          },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
    return this.get(kind, id);
  }

  /**
   * Collections can always be removed; a category only when no product and no subcategory uses it.
   * Redirects to the removed entity are removed with it.
   */
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
        const children = await tx.category.count({ where: { parentId: id } });
        if (children > 0) {
          throw ApiException.conflict(
            'CONFLICT',
            'Move or remove the subcategories of this category first',
            { children },
          );
        }
        await tx.category.delete({ where: { id } });
      } else {
        await tx.collection.delete({ where: { id } });
      }
      await tx.slugRedirect.deleteMany({ where: { entity: REDIRECT_ENTITY[kind], toId: id } });
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
    const row: TaxonomyRow | null =
      kind === 'category'
        ? await this.prisma.category.findUnique({
            where: { id },
            include: {
              translations: true,
              _count: { select: { products: true, children: true } },
            },
          })
        : await this.prisma.collection.findUnique({
            where: { id },
            include: { translations: true, _count: { select: { products: true } } },
          });
    if (!row) throw ApiException.notFound();
    return this.toDto(row);
  }

  /**
   * Category rules: the slug must not collide with the storefront's own pages (top-level category
   * pages live at the site root), and the tree has two levels — a parent must be a top-level
   * category, and a category with subcategories cannot itself become a subcategory.
   */
  private async checkCategory(
    tx: Prisma.TransactionClient,
    id: string | null,
    input: TaxonomyPayload,
  ): Promise<void> {
    if (isReservedCategorySlug(input.slug)) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_FAILED',
        'This address is reserved',
        {
          issues: [{ path: 'slug', code: 'reserved_slug', message: 'reserved_slug' }],
        },
      );
    }
    if (input.parentId === null) return;
    const invalid = (code: string, message: string) =>
      new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', message, {
        issues: [{ path: 'parentId', code, message: code }],
      });
    if (input.parentId === id) throw invalid('parent_self', 'A category cannot contain itself');
    const parent = await tx.category.findUnique({
      where: { id: input.parentId },
      select: { parentId: true },
    });
    if (!parent) throw invalid('parent_not_found', 'The parent category does not exist');
    if (parent.parentId !== null) {
      throw invalid('parent_not_top_level', 'Only top-level categories can contain subcategories');
    }
    if (id !== null && (await tx.category.count({ where: { parentId: id } })) > 0) {
      throw invalid('has_children', 'A category with subcategories must stay top-level');
    }
  }

  /** A slug that becomes current again no longer redirects elsewhere. */
  private async releaseSlug(
    tx: Prisma.TransactionClient,
    kind: TaxonomyKind,
    slug: string,
  ): Promise<void> {
    await tx.slugRedirect.deleteMany({ where: { entity: REDIRECT_ENTITY[kind], fromSlug: slug } });
  }

  private fields(input: TaxonomyUpsertInput) {
    return {
      slug: input.slug,
      position: input.position,
      isActive: input.isActive,
      illustrationKey: input.illustrationKey,
    };
  }

  private translationData(kind: TaxonomyKind, input: TaxonomyPayload) {
    return translationRows(input.translations).map((row) => ({
      locale: row.locale,
      name: row.name,
      description: nullable(row.description),
      // Editorial text exists for categories only.
      ...(kind === 'category' ? { body: nullable(row.body) } : {}),
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
      parentId: row.parentId ?? null,
      childCount: row._count.children ?? 0,
      translations: toAdminTranslation(row.translations, (translation) => ({
        name: translation.name,
        description: translation.description ?? undefined,
        body: translation.body ?? undefined,
        seoTitle: translation.seoTitle ?? undefined,
        seoDescription: translation.seoDescription ?? undefined,
      })),
    };
  }
}
