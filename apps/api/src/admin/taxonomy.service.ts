import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isReservedCategorySlug,
  type AdminTaxonomy,
  type TaxonomyUpsertInput,
  type taxonomyUpsertSchema,
} from '@teran/contracts';
import type { z } from 'zod';
import type { Prisma } from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { asIllustrationKey, coverImageDto, type CoverColumns } from '../catalog/catalog.mapper.js';
import { ApiException } from '../common/errors/api-exception.js';
import type { Env } from '../config/env.js';
import {
  deleteStoredImage,
  type ImageStore,
  storeImage,
  taxonomyImagePrefix,
} from '../media/image-processing.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { nullable, toAdminTranslation, translationRows, type Actor } from './admin-support.js';
import { taxonomyReadiness } from './readiness.js';
import { uploadError } from './uploads.js';
import { configuredImageStore } from '../media/configured-store.js';

export type TaxonomyKind = 'category' | 'collection';
type TaxonomyPayload = z.output<typeof taxonomyUpsertSchema>;

interface TranslationRow {
  locale: string;
  name: string;
  description: string | null;
  body?: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageAlt: string | null;
}

interface TaxonomyRow extends CoverColumns {
  id: string;
  slug: string;
  position: number;
  isActive: boolean;
  illustrationKey: string | null;
  parentId?: string | null;
  productTypeId?: string | null;
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
  private readonly images: ImageStore;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
    config: ConfigService<Env, true>,
  ) {
    this.images = configuredImageStore(config);
  }

  /**
   * Sets the cover picture (cards, menus, the listing header; small renditions serve as the
   * thumbnail). The previous picture's files are removed once the change is committed.
   */
  async setImage(
    kind: TaxonomyKind,
    id: string,
    file: Buffer,
    actor: Actor,
  ): Promise<AdminTaxonomy> {
    const previous = await this.coverKey(kind, id);
    let stored;
    try {
      stored = await storeImage(file, this.images, taxonomyImagePrefix(kind, id));
    } catch (error) {
      uploadError(error);
    }
    const data = {
      imageKey: stored.storageKey,
      imageWidths: stored.widths,
      imageWidth: stored.width,
      imageHeight: stored.height,
      imageTransparent: stored.transparent,
    };
    try {
      await this.prisma.$transaction(async (tx) => {
        if (kind === 'category') await tx.category.update({ where: { id }, data });
        else await tx.collection.update({ where: { id }, data });
        await this.audit.record(
          {
            actorUserId: actor.userId,
            action: `${kind}.image`,
            entityType: ENTITY[kind],
            entityId: id,
            ipAddress: actor.ipAddress,
          },
          tx,
        );
      });
    } catch (error) {
      await deleteStoredImage(this.images, stored.storageKey);
      throw error;
    }
    if (previous) await deleteStoredImage(this.images, previous);
    this.revalidation.notify('catalog');
    return this.get(kind, id);
  }

  /** Removes the cover picture: the storefront then shows the neutral TERAN visual. */
  async removeImage(kind: TaxonomyKind, id: string, actor: Actor): Promise<AdminTaxonomy> {
    const previous = await this.coverKey(kind, id);
    const data = {
      imageKey: null,
      imageWidths: [],
      imageWidth: null,
      imageHeight: null,
      imageTransparent: false,
    };
    await this.prisma.$transaction(async (tx) => {
      if (kind === 'category') await tx.category.update({ where: { id }, data });
      else await tx.collection.update({ where: { id }, data });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: `${kind}.image.remove`,
          entityType: ENTITY[kind],
          entityId: id,
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    if (previous) await deleteStoredImage(this.images, previous);
    this.revalidation.notify('catalog');
    return this.get(kind, id);
  }

  private async coverKey(kind: TaxonomyKind, id: string): Promise<string | null> {
    const row =
      kind === 'category'
        ? await this.prisma.category.findUnique({ where: { id }, select: { imageKey: true } })
        : await this.prisma.collection.findUnique({ where: { id }, select: { imageKey: true } });
    if (!row) throw ApiException.notFound();
    return row.imageKey;
  }

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
              data: {
                ...this.fields(input),
                parentId: input.parentId,
                productTypeId: input.productTypeId ?? null,
                translations,
              },
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
          data: {
            ...this.fields(input),
            parentId: input.parentId,
            // Left out by the request: the current default type stays.
            ...(input.productTypeId === undefined ? {} : { productTypeId: input.productTypeId }),
          },
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
    const cover = await this.coverKey(kind, id);
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
    if (cover) await deleteStoredImage(this.images, cover);
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
    const invalid = (code: string, message: string, path = 'parentId') =>
      new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', message, {
        issues: [{ path, code, message: code }],
      });
    if (
      input.productTypeId &&
      (await tx.productType.count({ where: { id: input.productTypeId } })) === 0
    ) {
      throw invalid('type_not_found', 'The product type does not exist', 'productTypeId');
    }
    if (input.parentId === null) return;
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
      imageAlt: nullable(row.imageAlt),
    }));
  }

  private toDto(row: TaxonomyRow): AdminTaxonomy {
    const uz = row.translations.find((translation) => translation.locale === 'uz');
    const kind = row.parentId !== undefined ? 'category' : 'collection';
    return {
      id: row.id,
      slug: row.slug,
      position: row.position,
      isActive: row.isActive,
      illustrationKey: asIllustrationKey(row.illustrationKey),
      productCount: row._count.products,
      parentId: row.parentId ?? null,
      childCount: row._count.children ?? 0,
      productTypeId: row.productTypeId ?? null,
      image: coverImageDto(row, uz?.imageAlt ?? uz?.name ?? row.slug),
      translations: toAdminTranslation(row.translations, (translation) => ({
        name: translation.name,
        description: translation.description ?? undefined,
        body: translation.body ?? undefined,
        seoTitle: translation.seoTitle ?? undefined,
        seoDescription: translation.seoDescription ?? undefined,
        imageAlt: translation.imageAlt ?? undefined,
      })),
      readiness: taxonomyReadiness({
        kind,
        slug: row.slug,
        // The tree rules are enforced on every save (checkCategory), so a stored parent is valid.
        parentValid: true,
        hasImage: row.imageKey !== null,
        translations: row.translations,
      }),
    };
  }
}
