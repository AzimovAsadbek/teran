import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildPaginated,
  normalizeSearchText,
  type adminProductListQuerySchema,
  type AdminProductDetail,
  type AdminProductListItem,
  type Paginated,
  type ProductUpsertPayload,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { asIllustrationKey, toImageDto } from '../catalog/catalog.mapper.js';
import { refreshMinPrice } from '../catalog/product-pricing.js';
import { productSearchText } from '../catalog/product-search.js';
import { ApiException } from '../common/errors/api-exception.js';
import { toMoney, toMoneyOrNull } from '../common/money.js';
import type { Env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  deleteStoredImage,
  ImageRejectedError,
  productImagePrefix,
  storeImage,
} from '../media/image-processing.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import {
  nullable,
  pageArgs,
  toAdminTranslation,
  translationRows,
  type Actor,
} from './admin-support.js';

type ListQuery = z.output<typeof adminProductListQuerySchema>;

const MAX_IMAGES_PER_PRODUCT = 12;

const detailInclude = {
  translations: true,
  variants: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
  images: { orderBy: { position: 'asc' } },
  collections: { select: { collectionId: true } },
} satisfies Prisma.ProductInclude;

type DetailRow = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class AdminProductsService {
  private readonly uploadsDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
    config: ConfigService<Env, true>,
  ) {
    this.uploadsDir = config.get('UPLOADS_DIR', { infer: true });
  }

  async list(query: ListQuery): Promise<Paginated<AdminProductListItem>> {
    const search = query.q ? normalizeSearchText(query.q) : undefined;
    const where: Prisma.ProductWhereInput = {
      status: query.status,
      categoryId: query.categoryId,
      ...(search
        ? {
            OR: [
              { slug: { contains: search, mode: 'insensitive' } },
              { translations: { some: { searchText: { contains: search } } } },
              { variants: { some: { sku: { contains: search.toUpperCase() } } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        ...pageArgs(query.page, query.pageSize),
        include: {
          translations: { where: { locale: 'uz' }, select: { name: true } },
          category: {
            select: { translations: { where: { locale: 'uz' }, select: { name: true } } },
          },
          variants: { select: { price: true, stockQuantity: true } },
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
      }),
    ]);

    const items = rows.map((row): AdminProductListItem => {
      const name = row.translations[0]?.name ?? row.slug;
      const prices = row.variants.map((variant) => variant.price);
      const sorted = [...prices].sort((a, b) => a.comparedTo(b));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const image = row.images[0];
      return {
        id: row.id,
        slug: row.slug,
        name,
        status: row.status,
        categoryName: row.category.translations[0]?.name ?? '',
        variantCount: row.variants.length,
        priceMin: first ? toMoney(first) : null,
        priceMax: last ? toMoney(last) : null,
        totalStock: row.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0),
        image: image ? toImageDto(image, name) : null,
        illustrationKey: asIllustrationKey(row.illustrationKey),
        updatedAt: row.updatedAt.toISOString(),
      };
    });
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  async get(id: string): Promise<AdminProductDetail> {
    const row = await this.prisma.product.findUnique({ where: { id }, include: detailInclude });
    if (!row) throw ApiException.notFound('Product not found');
    return this.toDetail(row);
  }

  async create(input: ProductUpsertPayload, actor: Actor): Promise<AdminProductDetail> {
    const id = await this.prisma.$transaction(async (tx) => {
      await this.assertReferences(tx, input);
      const product = await tx.product.create({
        data: {
          ...this.scalarFields(input),
          publishedAt: input.status === 'ACTIVE' ? new Date() : null,
          translations: { create: this.translationData(input) },
          collections: {
            create: input.collectionIds.map((collectionId) => ({ collectionId })),
          },
        },
        select: { id: true },
      });
      for (const [position, variant] of input.variants.entries()) {
        await this.createVariant(tx, product.id, variant, position, actor);
      }
      await refreshMinPrice(tx, product.id);
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'product.create',
          entityType: 'Product',
          entityId: product.id,
          metadata: { slug: input.slug, status: input.status },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
      return product.id;
    });
    this.revalidation.notify('catalog');
    return this.get(id);
  }

  /**
   * Updates a product and its variants. Variants left out of the payload are deactivated, never
   * deleted, so order history and the stock ledger stay intact. Stock is not editable here: it
   * changes only through inventory adjustments and orders.
   */
  async update(id: string, input: ProductUpsertPayload, actor: Actor): Promise<AdminProductDetail> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
        select: { status: true, publishedAt: true, variants: { select: { id: true } } },
      });
      if (!existing) throw ApiException.notFound('Product not found');
      await this.assertReferences(tx, input);

      const ownVariantIds = new Set(existing.variants.map((variant) => variant.id));
      for (const variant of input.variants) {
        if (variant.id && !ownVariantIds.has(variant.id)) {
          throw ApiException.badRequest('BAD_REQUEST', 'A variant does not belong to this product');
        }
      }

      await tx.product.update({
        where: { id },
        data: {
          ...this.scalarFields(input),
          publishedAt:
            input.status === 'ACTIVE' && !existing.publishedAt ? new Date() : existing.publishedAt,
        },
      });

      const rows = this.translationData(input);
      await tx.productTranslation.deleteMany({
        where: { productId: id, locale: { notIn: rows.map((row) => row.locale) } },
      });
      for (const row of rows) {
        await tx.productTranslation.upsert({
          where: { productId_locale: { productId: id, locale: row.locale } },
          create: { ...row, productId: id },
          update: row,
        });
      }

      await tx.productCollection.deleteMany({ where: { productId: id } });
      if (input.collectionIds.length > 0) {
        await tx.productCollection.createMany({
          data: input.collectionIds.map((collectionId) => ({ collectionId, productId: id })),
        });
      }

      const keptIds = new Set<string>();
      for (const [position, variant] of input.variants.entries()) {
        if (variant.id) {
          keptIds.add(variant.id);
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { ...this.variantFields(variant), position },
          });
        } else {
          await this.createVariant(tx, id, variant, position, actor);
        }
      }
      const removed = [...ownVariantIds].filter((variantId) => !keptIds.has(variantId));
      if (removed.length > 0) {
        await tx.productVariant.updateMany({
          where: { id: { in: removed } },
          data: { isActive: false },
        });
      }

      await refreshMinPrice(tx, id);
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'product.update',
          entityType: 'Product',
          entityId: id,
          metadata: {
            slug: input.slug,
            status: input.status,
            ...(existing.status !== input.status ? { previousStatus: existing.status } : {}),
            ...(removed.length > 0 ? { deactivatedVariants: removed } : {}),
          },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
    return this.get(id);
  }

  async addImage(productId: string, file: Buffer, actor: Actor): Promise<AdminProductDetail> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { _count: { select: { images: true } } },
    });
    if (!product) throw ApiException.notFound('Product not found');
    if (product._count.images >= MAX_IMAGES_PER_PRODUCT) {
      throw ApiException.badRequest(
        'BAD_REQUEST',
        'This product already has the maximum number of images',
        {
          max: MAX_IMAGES_PER_PRODUCT,
        },
      );
    }

    let stored;
    try {
      stored = await storeImage(file, this.uploadsDir, productImagePrefix(productId));
    } catch (error) {
      if (error instanceof ImageRejectedError) {
        throw error.reason === 'too_small'
          ? ApiException.badRequest('BAD_REQUEST', 'The image is too small', {
              reason: error.reason,
            })
          : new ApiException(
              HttpStatus.UNSUPPORTED_MEDIA_TYPE,
              'UNSUPPORTED_MEDIA_TYPE',
              'Upload a JPEG, PNG, WebP or AVIF image',
              { details: { reason: error.reason } },
            );
      }
      throw error;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const { _max } = await tx.productImage.aggregate({
          where: { productId },
          _max: { position: true },
        });
        const image = await tx.productImage.create({
          data: { productId, ...stored, position: (_max.position ?? -1) + 1 },
          select: { id: true },
        });
        await this.audit.record(
          {
            actorUserId: actor.userId,
            action: 'product.image.add',
            entityType: 'Product',
            entityId: productId,
            metadata: { imageId: image.id },
            ipAddress: actor.ipAddress,
          },
          tx,
        );
      });
    } catch (error) {
      await deleteStoredImage(this.uploadsDir, stored.storageKey);
      throw error;
    }
    this.revalidation.notify('catalog');
    return this.get(productId);
  }

  async reorderImages(
    productId: string,
    imageIds: string[],
    actor: Actor,
  ): Promise<AdminProductDetail> {
    await this.prisma.$transaction(async (tx) => {
      const images = await tx.productImage.findMany({ where: { productId }, select: { id: true } });
      const current = new Set(images.map((image) => image.id));
      if (imageIds.length !== current.size || !imageIds.every((imageId) => current.has(imageId))) {
        throw ApiException.badRequest(
          'BAD_REQUEST',
          'The list must contain every image of the product once',
        );
      }
      for (const [position, imageId] of imageIds.entries()) {
        await tx.productImage.update({ where: { id: imageId }, data: { position } });
      }
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'product.image.reorder',
          entityType: 'Product',
          entityId: productId,
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
    return this.get(productId);
  }

  async deleteImage(productId: string, imageId: string, actor: Actor): Promise<AdminProductDetail> {
    const image = await this.prisma.$transaction(async (tx) => {
      const found = await tx.productImage.findFirst({ where: { id: imageId, productId } });
      if (!found) throw ApiException.notFound('Image not found');
      await tx.productImage.delete({ where: { id: imageId } });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'product.image.delete',
          entityType: 'Product',
          entityId: productId,
          metadata: { imageId },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
      return found;
    });
    // Files go only after the row is gone, so the storefront never references a missing file.
    await deleteStoredImage(this.uploadsDir, image.storageKey);
    this.revalidation.notify('catalog');
    return this.get(productId);
  }

  private async assertReferences(tx: Prisma.TransactionClient, input: ProductUpsertPayload) {
    const category = await tx.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) throw ApiException.badRequest('BAD_REQUEST', 'Unknown category');
    if (input.collectionIds.length > 0) {
      const found = await tx.collection.count({ where: { id: { in: input.collectionIds } } });
      if (found !== new Set(input.collectionIds).size) {
        throw ApiException.badRequest('BAD_REQUEST', 'Unknown collection');
      }
    }
  }

  private scalarFields(input: ProductUpsertPayload) {
    return {
      slug: input.slug,
      status: input.status,
      categoryId: input.categoryId,
      format: input.format,
      isFeatured: input.isFeatured,
      caffeineLevel: input.caffeineLevel,
      brewTempCelsius: input.brewTempCelsius,
      brewTimeMinSeconds: input.brewTimeMinSeconds,
      brewTimeMaxSeconds: input.brewTimeMaxSeconds,
      brewAmountGrams:
        input.brewAmountGrams === null
          ? null
          : new Prisma.Decimal(input.brewAmountGrams.toFixed(1)),
      illustrationKey: input.illustrationKey,
    };
  }

  private translationData(input: ProductUpsertPayload) {
    return translationRows(input.translations).map((row) => ({
      locale: row.locale,
      name: row.name,
      shortDescription: nullable(row.shortDescription),
      description: nullable(row.description),
      ingredients: nullable(row.ingredients),
      tastingNotes: nullable(row.tastingNotes),
      origin: nullable(row.origin),
      seoTitle: nullable(row.seoTitle),
      seoDescription: nullable(row.seoDescription),
      searchText: productSearchText(row),
    }));
  }

  private variantFields(variant: ProductUpsertPayload['variants'][number]) {
    return {
      sku: variant.sku,
      weightGrams: variant.weightGrams,
      unitCount: variant.unitCount,
      price: new Prisma.Decimal(variant.price),
      compareAtPrice:
        variant.compareAtPrice === null ? null : new Prisma.Decimal(variant.compareAtPrice),
      lowStockThreshold: variant.lowStockThreshold,
      barcode: variant.barcode,
      isActive: variant.isActive,
    };
  }

  private async createVariant(
    tx: Prisma.TransactionClient,
    productId: string,
    variant: ProductUpsertPayload['variants'][number],
    position: number,
    actor: Actor,
  ): Promise<void> {
    const stock = variant.initialStock ?? 0;
    const created = await tx.productVariant.create({
      data: { ...this.variantFields(variant), productId, position, stockQuantity: stock },
      select: { id: true },
    });
    if (stock > 0) {
      await tx.inventoryMovement.create({
        data: {
          variantId: created.id,
          delta: stock,
          quantityAfter: stock,
          reason: 'INITIAL_STOCK',
          actorUserId: actor.userId,
        },
      });
    }
  }

  private toDetail(row: DetailRow): AdminProductDetail {
    const name =
      row.translations.find((translation) => translation.locale === 'uz')?.name ?? row.slug;
    return {
      id: row.id,
      slug: row.slug,
      status: row.status,
      categoryId: row.categoryId,
      format: row.format,
      isFeatured: row.isFeatured,
      caffeineLevel: row.caffeineLevel,
      brewTempCelsius: row.brewTempCelsius,
      brewTimeMinSeconds: row.brewTimeMinSeconds,
      brewTimeMaxSeconds: row.brewTimeMaxSeconds,
      brewAmountGrams: row.brewAmountGrams === null ? null : row.brewAmountGrams.toNumber(),
      illustrationKey: asIllustrationKey(row.illustrationKey),
      collectionIds: row.collections.map((collection) => collection.collectionId),
      translations: toAdminTranslation(row.translations, (translation) => ({
        name: translation.name,
        shortDescription: translation.shortDescription ?? undefined,
        description: translation.description ?? undefined,
        ingredients: translation.ingredients ?? undefined,
        tastingNotes: translation.tastingNotes ?? undefined,
        origin: translation.origin ?? undefined,
        seoTitle: translation.seoTitle ?? undefined,
        seoDescription: translation.seoDescription ?? undefined,
      })),
      variants: row.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        weightGrams: variant.weightGrams,
        unitCount: variant.unitCount,
        price: toMoney(variant.price),
        compareAtPrice: toMoneyOrNull(variant.compareAtPrice),
        stockQuantity: variant.stockQuantity,
        lowStockThreshold: variant.lowStockThreshold,
        barcode: variant.barcode,
        isActive: variant.isActive,
      })),
      images: row.images.map((image) => ({ id: image.id, ...toImageDto(image, name) })),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
