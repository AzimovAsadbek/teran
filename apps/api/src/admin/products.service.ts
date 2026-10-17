import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildPaginated,
  buildSearchText,
  LOCALES,
  MAX_PRODUCT_IMAGES,
  missingRequired,
  normalizeSearchText,
  type adminProductListQuerySchema,
  type AdminProductDetail,
  type AdminProductListItem,
  type ImageAltInput,
  type Locale,
  type Paginated,
  type ProductDetailDto,
  type ProductUpsertPayload,
  type Readiness,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import {
  asIllustrationKey,
  detailInclude as storefrontInclude,
  toImageDto,
  toProductDetail,
} from '../catalog/catalog.mapper.js';
import {
  attributeDefinitionInclude,
  attributeSearchTerms,
  toAttributeInputs,
  validateAttributeValues,
  type AttributeDefinitionRow,
  type AttributeValueRow,
} from '../catalog/product-attributes.js';
import { refreshMinPrice } from '../catalog/product-pricing.js';
import { productSearchText } from '../catalog/product-search.js';
import { ApiException } from '../common/errors/api-exception.js';
import { toMoney, toMoneyOrNull } from '../common/money.js';
import type { Env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  contentHash,
  deleteStoredImage,
  imageStore,
  type ImageStore,
  productImagePrefix,
  storeImage,
} from '../media/image-processing.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { TelegramService } from '../telegram/telegram.service.js';
import { assertPublishable, productReadiness } from './readiness.js';
import { duplicateImage, uploadError } from './uploads.js';
import {
  nullable,
  pageArgs,
  toAdminTranslation,
  translationRows,
  type Actor,
} from './admin-support.js';

type ListQuery = z.output<typeof adminProductListQuerySchema>;

/** Required attributes of the product's type, to report which ones still lack a value. */
const requiredAttributesSelect = {
  attributes: {
    where: { isRequired: true },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      key: true,
      translations: { where: { locale: 'uz' }, select: { label: true } },
    },
  },
} satisfies Prisma.ProductTypeSelect;

const detailInclude = {
  translations: true,
  variants: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
  images: { orderBy: { position: 'asc' }, include: { translations: true } },
  collections: { select: { collectionId: true } },
  attributeValues: { orderBy: [{ attributeId: 'asc' }, { id: 'asc' }] },
  productType: { select: requiredAttributesSelect },
} satisfies Prisma.ProductInclude;

/** Labels of the required attributes without a value. */
function missingAttributeLabels(
  type: { attributes: { id: string; key: string; translations: { label: string }[] }[] } | null,
  valuedAttributeIds: Iterable<string>,
): string[] {
  if (!type) return [];
  const valued = new Set(valuedAttributeIds);
  return type.attributes
    .filter((attribute) => !valued.has(attribute.id))
    .map((attribute) => attribute.translations[0]?.label ?? attribute.key);
}

/** A product's validated attribute values and the definitions they were checked against. */
interface AttributeData {
  definitions: AttributeDefinitionRow[];
  rows: AttributeValueRow[];
}

type DetailRow = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class AdminProductsService {
  private readonly images: ImageStore;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
    private readonly telegram: TelegramService,
    config: ConfigService<Env, true>,
  ) {
    this.images = imageStore({
      uploadsDir: config.get('UPLOADS_DIR', { infer: true }),
      blobToken: config.get('BLOB_READ_WRITE_TOKEN', { infer: true }),
    });
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
          variants: { select: { price: true, stockQuantity: true, isActive: true } },
          images: { orderBy: { position: 'asc' }, take: 1, include: { translations: true } },
          attributeValues: { select: { attributeId: true } },
          productType: { select: requiredAttributesSelect },
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
        missing: missingRequired(
          productReadiness({
            slug: row.slug,
            hasCategory: true,
            translations: [
              {
                locale: 'uz',
                name,
                shortDescription: null,
                seoDescription: null,
              },
            ],
            variants: row.variants,
            images: row.images.map((entry) => ({
              altLocales: entry.translations.map((translation) => translation.locale),
            })),
            missingAttributes: missingAttributeLabels(
              row.productType,
              row.attributeValues.map((value) => value.attributeId),
            ),
          }),
        ),
      };
    });
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  /**
   * The product exactly as its storefront page would show it, whatever its status (drafts
   * included): the admin area previews the real page before anything is published.
   */
  async preview(id: string, locale: Locale): Promise<ProductDetailDto> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: storefrontInclude(locale),
    });
    if (!row) throw ApiException.notFound('Product not found');
    return toProductDetail(row, locale);
  }

  async get(id: string): Promise<AdminProductDetail> {
    const row = await this.prisma.product.findUnique({ where: { id }, include: detailInclude });
    if (!row) throw ApiException.notFound('Product not found');
    return this.toDetail(row, await this.telegram.statusFor('PRODUCT', id));
  }

  async create(input: ProductUpsertPayload, actor: Actor): Promise<AdminProductDetail> {
    const id = await this.prisma.$transaction(async (tx) => {
      await this.assertReferences(tx, input);
      await this.releaseSlug(tx, input.slug);
      const attributes = await this.attributeData(tx, input, null);
      // A new product has no images yet: it is created as a draft, then published.
      if (input.status === 'ACTIVE') {
        assertPublishable(this.inputReadiness(input, attributes, []), 'product');
      }
      const product = await tx.product.create({
        data: {
          ...this.scalarFields(input),
          publishedAt: input.status === 'ACTIVE' ? new Date() : null,
          translations: { create: this.translationData(input, attributes) },
          collections: {
            create: input.collectionIds.map((collectionId) => ({ collectionId })),
          },
        },
        select: { id: true },
      });
      await this.writeAttributeValues(tx, product.id, attributes.rows);
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
    await this.announce(id, input, actor);
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
        select: {
          slug: true,
          status: true,
          publishedAt: true,
          productTypeId: true,
          variants: { select: { id: true } },
        },
      });
      if (!existing) throw ApiException.notFound('Product not found');
      await this.assertReferences(tx, input);
      const attributes = await this.attributeData(tx, input, existing.productTypeId);
      if (input.status === 'ACTIVE') {
        const images = await tx.productImage.findMany({
          where: { productId: id },
          orderBy: { position: 'asc' },
          select: { translations: { select: { locale: true } } },
        });
        assertPublishable(this.inputReadiness(input, attributes, images), 'product');
      }
      if (existing.slug !== input.slug) {
        await this.releaseSlug(tx, input.slug);
        // Links to the old address keep working: they are redirected to the new one.
        await tx.slugRedirect.upsert({
          where: { entity_fromSlug: { entity: 'PRODUCT', fromSlug: existing.slug } },
          create: { entity: 'PRODUCT', fromSlug: existing.slug, toId: id },
          update: { toId: id },
        });
      }

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

      await this.writeAttributeValues(tx, id, attributes.rows);
      const rows = this.translationData(input, attributes);
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
            ...(existing.slug !== input.slug ? { previousSlug: existing.slug } : {}),
            ...(existing.productTypeId !== input.productTypeId
              ? { productTypeId: input.productTypeId }
              : {}),
            ...(removed.length > 0 ? { deactivatedVariants: removed } : {}),
          },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
    await this.announce(id, input, actor);
    return this.get(id);
  }

  /** After a committed save: an active product with its announcement on gets its Telegram post. */
  private async announce(id: string, input: ProductUpsertPayload, actor: Actor): Promise<void> {
    if (input.status === 'ACTIVE' && input.announceOnTelegram) {
      await this.telegram.requestAnnouncement('PRODUCT', id, actor.userId);
    }
  }

  /** Readiness of the product as it is about to be saved. */
  private inputReadiness(
    input: ProductUpsertPayload,
    attributes: AttributeData,
    images: readonly { translations: readonly { locale: string }[] }[],
  ): Readiness {
    const valued = new Set(attributes.rows.map((row) => row.attributeId));
    return productReadiness({
      slug: input.slug,
      hasCategory: true,
      translations: translationRows(input.translations).map((row) => ({
        locale: row.locale,
        name: row.name,
        shortDescription: row.shortDescription ?? null,
        seoDescription: row.seoDescription ?? null,
      })),
      variants: input.variants.map((variant) => ({
        isActive: variant.isActive,
        price: variant.price,
      })),
      images: images.map((image) => ({
        altLocales: image.translations.map((translation) => translation.locale),
      })),
      missingAttributes: attributes.definitions
        .filter((definition) => definition.isRequired && !valued.has(definition.id))
        .map(
          (definition) =>
            definition.translations.find((translation) => translation.locale === 'uz')?.label ??
            definition.key,
        ),
    });
  }

  /**
   * Adds an image after the existing ones. The file is validated by decoding it (the declared type
   * and name are ignored) and stored as WebP renditions; the same file is not stored twice for one
   * product. Additions to one product are serialised, so the image limit holds under concurrency.
   */
  async addImage(productId: string, file: Buffer, actor: Actor): Promise<AdminProductDetail> {
    const hash = contentHash(file);
    await this.assertImageSlot(productId, hash);
    let stored;
    try {
      stored = await storeImage(file, this.images, productImagePrefix(productId));
    } catch (error) {
      uploadError(error);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await this.lockProduct(tx, productId);
        const images = await tx.productImage.findMany({
          where: { productId },
          select: { position: true, contentHash: true },
        });
        if (images.length >= MAX_PRODUCT_IMAGES) throw this.tooManyImages();
        if (images.some((image) => image.contentHash === hash)) throw duplicateImage();
        const image = await tx.productImage.create({
          data: {
            productId,
            ...stored,
            contentHash: hash,
            position: Math.max(-1, ...images.map((entry) => entry.position)) + 1,
          },
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
      await deleteStoredImage(this.images, stored.storageKey);
      throw error;
    }
    this.revalidation.notify('catalog');
    return this.get(productId);
  }

  /**
   * Replaces an image's file, keeping its place in the order and its alternative text. The old
   * renditions are removed only after the change is committed.
   */
  async replaceImage(
    productId: string,
    imageId: string,
    file: Buffer,
    actor: Actor,
  ): Promise<AdminProductDetail> {
    const hash = contentHash(file);
    const current = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
      select: { storageKey: true },
    });
    if (!current) throw ApiException.notFound('Image not found');
    const twin = await this.prisma.productImage.findFirst({
      where: { productId, contentHash: hash, id: { not: imageId } },
      select: { id: true },
    });
    if (twin) throw duplicateImage();
    let stored;
    try {
      stored = await storeImage(file, this.images, productImagePrefix(productId));
    } catch (error) {
      uploadError(error);
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.productImage.update({
          where: { id: imageId },
          data: { ...stored, contentHash: hash },
        });
        await this.audit.record(
          {
            actorUserId: actor.userId,
            action: 'product.image.replace',
            entityType: 'Product',
            entityId: productId,
            metadata: { imageId },
            ipAddress: actor.ipAddress,
          },
          tx,
        );
      });
    } catch (error) {
      await deleteStoredImage(this.images, stored.storageKey);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw duplicateImage();
      }
      throw error;
    }
    await deleteStoredImage(this.images, current.storageKey);
    this.revalidation.notify('catalog');
    return this.get(productId);
  }

  /** Sets an image's alternative text per language (empty: the product's name is read). */
  async updateImageAlt(
    productId: string,
    imageId: string,
    input: ImageAltInput,
    actor: Actor,
  ): Promise<AdminProductDetail> {
    await this.prisma.$transaction(async (tx) => {
      const image = await tx.productImage.findFirst({
        where: { id: imageId, productId },
        select: { id: true },
      });
      if (!image) throw ApiException.notFound('Image not found');
      for (const locale of LOCALES) {
        const altText = input[locale]?.trim();
        if (altText) {
          await tx.productImageTranslation.upsert({
            where: { imageId_locale: { imageId, locale } },
            create: { imageId, locale, altText },
            update: { altText },
          });
        } else {
          await tx.productImageTranslation.deleteMany({ where: { imageId, locale } });
        }
      }
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'product.image.alt',
          entityType: 'Product',
          entityId: productId,
          metadata: { imageId },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    this.revalidation.notify('catalog');
    return this.get(productId);
  }

  /** Checks the limit and duplicates before any file is processed (cheap early refusal). */
  private async assertImageSlot(productId: string, hash: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { images: { select: { contentHash: true } } },
    });
    if (!product) throw ApiException.notFound('Product not found');
    if (product.images.length >= MAX_PRODUCT_IMAGES) throw this.tooManyImages();
    if (product.images.some((image) => image.contentHash === hash)) throw duplicateImage();
  }

  private tooManyImages(): ApiException {
    return ApiException.badRequest(
      'BAD_REQUEST',
      'This product already has the maximum number of images',
      { reason: 'too_many_images', max: MAX_PRODUCT_IMAGES },
    );
  }

  /** Serialises image changes of one product (row lock until the transaction ends). */
  private async lockProduct(tx: Prisma.TransactionClient, productId: string): Promise<void> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Product" WHERE id = ${productId}::uuid FOR UPDATE`;
    if (rows.length === 0) throw ApiException.notFound('Product not found');
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

  /**
   * Removes an image. The last image of an active product cannot be removed: the product would be
   * public without a picture (upload another one first, or take the product back to draft).
   */
  async deleteImage(productId: string, imageId: string, actor: Actor): Promise<AdminProductDetail> {
    const image = await this.prisma.$transaction(async (tx) => {
      await this.lockProduct(tx, productId);
      const found = await tx.productImage.findFirst({ where: { id: imageId, productId } });
      if (!found) throw ApiException.notFound('Image not found');
      const [product, count] = await Promise.all([
        tx.product.findUniqueOrThrow({ where: { id: productId }, select: { status: true } }),
        tx.productImage.count({ where: { productId } }),
      ]);
      if (product.status === 'ACTIVE' && count <= 1) {
        throw ApiException.conflict(
          'PUBLICATION_BLOCKED',
          'An active product must keep at least one image',
          { reason: 'last_image_of_active_product', missing: ['mainImage'] },
        );
      }
      await tx.productImage.delete({ where: { id: imageId } });
      // Positions stay contiguous, so "first" always means the main image.
      const rest = await tx.productImage.findMany({
        where: { productId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      for (const [position, entry] of rest.entries()) {
        await tx.productImage.update({ where: { id: entry.id }, data: { position } });
      }
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
    await deleteStoredImage(this.images, image.storageKey);
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

  /**
   * Loads the product type's attribute definitions and validates the submitted values against them.
   * A type can be newly assigned only while it is active; a visible product must have every
   * required attribute.
   */
  private async attributeData(
    tx: Prisma.TransactionClient,
    input: ProductUpsertPayload,
    currentTypeId: string | null,
  ): Promise<AttributeData> {
    if (input.productTypeId === null) {
      if (input.attributes.length > 0) {
        throw ApiException.badRequest('BAD_REQUEST', 'Choose a product type to set attributes');
      }
      return { definitions: [], rows: [] };
    }
    const type = await tx.productType.findUnique({
      where: { id: input.productTypeId },
      select: {
        isActive: true,
        attributes: { orderBy: { position: 'asc' }, include: attributeDefinitionInclude },
      },
    });
    if (!type) throw ApiException.badRequest('BAD_REQUEST', 'Unknown product type');
    if (!type.isActive && input.productTypeId !== currentTypeId) {
      throw ApiException.badRequest('BAD_REQUEST', 'This product type is not active');
    }
    // Missing required attributes are reported by the readiness check (PUBLICATION_BLOCKED), with
    // everything else a product needs before it can be published.
    const rows = validateAttributeValues(type.attributes, input.attributes, {
      requireComplete: false,
    });
    return { definitions: type.attributes, rows };
  }

  /** Replaces every attribute value of the product (values of a previous type go with it). */
  private async writeAttributeValues(
    tx: Prisma.TransactionClient,
    productId: string,
    rows: AttributeValueRow[],
  ): Promise<void> {
    await tx.productAttributeValue.deleteMany({ where: { productId } });
    if (rows.length === 0) return;
    await tx.productAttributeValue.createMany({
      data: rows.map((row) => ({
        productId,
        attributeId: row.attributeId,
        optionId: row.optionId,
        numberValue: row.numberValue,
        booleanValue: row.booleanValue,
        textValue: row.textValue ?? Prisma.DbNull,
      })),
    });
  }

  /** A slug that becomes current again no longer redirects elsewhere. */
  private async releaseSlug(tx: Prisma.TransactionClient, slug: string): Promise<void> {
    await tx.slugRedirect.deleteMany({ where: { entity: 'PRODUCT', fromSlug: slug } });
  }

  private scalarFields(input: ProductUpsertPayload) {
    return {
      slug: input.slug,
      status: input.status,
      categoryId: input.categoryId,
      productTypeId: input.productTypeId,
      format: input.format,
      isFeatured: input.isFeatured,
      caffeineLevel: input.caffeineLevel,
      brewTempCelsius: input.brewTempCelsius,
      brewTempMaxCelsius: input.brewTempMaxCelsius,
      brewTimeMinSeconds: input.brewTimeMinSeconds,
      brewTimeMaxSeconds: input.brewTimeMaxSeconds,
      brewAmountGrams:
        input.brewAmountGrams === null
          ? null
          : new Prisma.Decimal(input.brewAmountGrams.toFixed(1)),
      brewAmountMaxGrams:
        input.brewAmountMaxGrams === null
          ? null
          : new Prisma.Decimal(input.brewAmountMaxGrams.toFixed(1)),
      illustrationKey: input.illustrationKey,
      announceOnTelegram: input.announceOnTelegram,
    };
  }

  private translationData(input: ProductUpsertPayload, attributes: AttributeData) {
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
      searchText: buildSearchText([
        productSearchText(row),
        attributeSearchTerms(attributes.definitions, attributes.rows, row.locale),
      ]),
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

  private toDetail(row: DetailRow, telegram: AdminProductDetail['telegram']): AdminProductDetail {
    const name =
      row.translations.find((translation) => translation.locale === 'uz')?.name ?? row.slug;
    return {
      id: row.id,
      slug: row.slug,
      status: row.status,
      productTypeId: row.productTypeId,
      attributes: toAttributeInputs(row.attributeValues),
      categoryId: row.categoryId,
      format: row.format,
      isFeatured: row.isFeatured,
      caffeineLevel: row.caffeineLevel,
      brewTempCelsius: row.brewTempCelsius,
      brewTempMaxCelsius: row.brewTempMaxCelsius,
      brewTimeMinSeconds: row.brewTimeMinSeconds,
      brewTimeMaxSeconds: row.brewTimeMaxSeconds,
      brewAmountGrams: row.brewAmountGrams === null ? null : row.brewAmountGrams.toNumber(),
      brewAmountMaxGrams:
        row.brewAmountMaxGrams === null ? null : row.brewAmountMaxGrams.toNumber(),
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
      images: row.images.map((image) => {
        const alt = (locale: string) =>
          image.translations.find((translation) => translation.locale === locale)?.altText ?? null;
        return {
          id: image.id,
          ...toImageDto(image, alt('uz') ?? name),
          altTexts: { uz: alt('uz'), ru: alt('ru'), en: alt('en') },
        };
      }),
      announceOnTelegram: row.announceOnTelegram,
      telegram,
      readiness: productReadiness({
        slug: row.slug,
        hasCategory: true,
        translations: row.translations,
        variants: row.variants,
        images: row.images.map((image) => ({
          altLocales: image.translations.map((translation) => translation.locale),
        })),
        missingAttributes: missingAttributeLabels(
          row.productType,
          row.attributeValues.map((value) => value.attributeId),
        ),
      }),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
