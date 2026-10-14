/**
 * Loads the demonstration catalogue and content: categories (Tea with the tea types as
 * subcategories, and gift sets), collections, product types with their attributes, products (with
 * images rendered from the TERAN packs, or code-drawn art, and demonstration attribute values),
 * delivery methods, site settings and journal articles.
 *
 * Insert-only: a record that already exists (matched by slug, code or key) is left untouched, so
 * re-running never overwrites changes made in the admin area. The exceptions are one-time
 * upgrades of records that still hold exactly what an earlier version of this seed wrote.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, type Locale } from '@teran/contracts';
import { Prisma, type PrismaClient } from '../../src/generated/prisma/client.js';
import { refreshMinPrice } from '../../src/catalog/product-pricing.js';
import { productSearchText } from '../../src/catalog/product-search.js';
import {
  deleteStoredImage,
  imageStore,
  type ImageStore,
  productImagePrefix,
  storeImage,
} from '../../src/media/image-processing.js';
import { renderLeafStudy, renderPackshot } from './demo-art.js';
import {
  DEMO_ATTRIBUTE_VALUES,
  DEMO_CATEGORIES,
  DEMO_COLLECTIONS,
  DEMO_PRODUCT_TYPES,
  DEMO_PRODUCTS,
  demoProductType,
  EARLIER_DEMO_COPY,
  type DemoProduct,
  type DemoVariant,
} from './demo-catalog.js';
import {
  DEMO_ANNOUNCEMENT,
  DEMO_ARTICLES,
  DEMO_DELIVERY_METHODS,
  EMPTY_CONTACT,
} from './demo-content.js';

export const DAY_MS = 86_400_000;

const seedDir = dirname(fileURLToPath(import.meta.url));

/** Where uploaded images live (UPLOADS_DIR, as for the API). */
export function uploadsDirectory(): string {
  return resolve(process.env.UPLOADS_DIR ?? './storage/uploads');
}

/** Images go where the API keeps them: Vercel Blob when BLOB_READ_WRITE_TOKEN is set, else the directory. */
export function seedImageStore(uploadsDir: string): ImageStore {
  return imageStore({ uploadsDir, blobToken: process.env.BLOB_READ_WRITE_TOKEN });
}

/** The real TERAN emblem, composited onto the demo packshots. */
export function readEmblem(): Promise<Buffer> {
  return readFile(resolve(seedDir, 'assets/teran-emblem.png'));
}

export interface CatalogueReport {
  products: number;
  articles: number;
  /**
   * Structural changes: categories and product types created, demo categories placed under their
   * parent, demo products given their product type, and identifier products updated to what their
   * packs say (databases seeded by earlier versions).
   */
  structure: number;
}

export interface CatalogueOptions {
  /** Directory for uploaded images (UPLOADS_DIR). */
  uploadsDir: string;
  /** The TERAN emblem composited onto packshots; null skips image rendering (tests). */
  emblem: Buffer | null;
  now?: Date;
}

function perLocale<T>(build: (locale: Locale) => T): (T & { locale: Locale })[] {
  return LOCALES.map((locale) => ({ locale, ...build(locale) }));
}

async function seedTaxonomies(prisma: PrismaClient): Promise<number> {
  let changes = 0;
  // Parents are listed before their subcategories.
  for (const [position, category] of DEMO_CATEGORIES.entries()) {
    const parent = category.parent
      ? await prisma.category.findUniqueOrThrow({
          where: { slug: category.parent },
          select: { id: true },
        })
      : null;
    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
      select: { id: true, parentId: true, _count: { select: { children: true } } },
    });
    if (existing) {
      // Databases seeded before categories had parents: put the demo tea types under "Tea" once.
      // No admin choice is overwritten, because a parent could not be set before.
      if (parent && existing.parentId === null && existing._count.children === 0) {
        await prisma.category.update({ where: { id: existing.id }, data: { parentId: parent.id } });
        changes += 1;
      }
      continue;
    }
    changes += 1;
    await prisma.category.create({
      data: {
        slug: category.slug,
        position,
        parentId: parent?.id ?? null,
        illustrationKey: category.illustrationKey,
        translations: {
          create: perLocale((locale) => ({
            name: category.name[locale],
            description: category.description[locale],
          })),
        },
      },
    });
  }
  for (const [position, collection] of DEMO_COLLECTIONS.entries()) {
    const earlier = EARLIER_DEMO_COPY.collections[collection.slug];
    if (earlier) {
      // Text an earlier version of this seed wrote, never edited since: bring it up to date.
      for (const locale of LOCALES) {
        const updated = await prisma.collectionTranslation.updateMany({
          where: { collection: { slug: collection.slug }, locale, description: earlier[locale] },
          data: { description: collection.description[locale] },
        });
        changes += updated.count;
      }
    }
    await prisma.collection.upsert({
      where: { slug: collection.slug },
      update: {},
      create: {
        slug: collection.slug,
        position,
        illustrationKey: collection.illustrationKey,
        translations: {
          create: perLocale((locale) => ({
            name: collection.name[locale],
            description: collection.description[locale],
          })),
        },
      },
    });
  }
  return changes;
}

async function seedProductTypes(prisma: PrismaClient): Promise<number> {
  let created = 0;
  for (const [position, type] of DEMO_PRODUCT_TYPES.entries()) {
    const existing = await prisma.productType.findUnique({ where: { key: type.key } });
    if (existing) continue;
    created += 1;
    await prisma.productType.create({
      data: {
        key: type.key,
        position,
        translations: { create: perLocale((locale) => ({ name: type.name[locale] })) },
        attributes: {
          create: type.attributes.map((attribute, attributePosition) => ({
            key: attribute.key,
            kind: attribute.kind,
            isFilterable: attribute.isFilterable,
            isVisible: true,
            position: attributePosition,
            translations: {
              create: perLocale((locale) => ({ label: attribute.label[locale] })),
            },
            options: {
              create: (attribute.options ?? []).map((option, optionPosition) => ({
                key: option.key,
                position: optionPosition,
                translations: {
                  create: perLocale((locale) => ({ label: option.label[locale] })),
                },
              })),
            },
          })),
        },
      },
    });
  }
  return created;
}

/**
 * Gives a demo product its product type and demonstration attribute values. Only for products
 * without a type yet (new products, or demo databases from before product types existed).
 */
async function assignDemoAttributes(
  prisma: Prisma.TransactionClient,
  productId: string,
  demo: DemoProduct,
): Promise<boolean> {
  const type = await prisma.productType.findUnique({
    where: { key: demoProductType(demo) },
    include: { attributes: { include: { options: true } } },
  });
  if (!type) return false;
  const updated = await prisma.product.updateMany({
    where: { id: productId, productTypeId: null },
    data: { productTypeId: type.id },
  });
  if (updated.count === 0) return false;
  const values = DEMO_ATTRIBUTE_VALUES[demo.slug] ?? {};
  for (const [key, value] of Object.entries(values)) {
    const attribute = type.attributes.find((candidate) => candidate.key === key);
    if (!attribute) continue;
    if (attribute.kind === 'SELECT') {
      const option = attribute.options.find((candidate) => candidate.key === value);
      if (option) {
        await prisma.productAttributeValue.create({
          data: { productId, attributeId: attribute.id, optionId: option.id },
        });
      }
    } else if (attribute.kind === 'BOOLEAN' && typeof value === 'boolean') {
      await prisma.productAttributeValue.create({
        data: { productId, attributeId: attribute.id, booleanValue: value },
      });
    } else if (attribute.kind === 'NUMBER' && typeof value === 'number') {
      await prisma.productAttributeValue.create({
        data: { productId, attributeId: attribute.id, numberValue: new Prisma.Decimal(value) },
      });
    }
  }
  return true;
}

async function seedContent(prisma: PrismaClient, now: Date): Promise<number> {
  for (const method of DEMO_DELIVERY_METHODS) {
    await prisma.deliveryMethod.upsert({
      where: { code: method.code },
      update: {},
      create: {
        code: method.code,
        position: method.position,
        price: new Prisma.Decimal(method.price),
        freeFromAmount: method.freeFromAmount ? new Prisma.Decimal(method.freeFromAmount) : null,
        regionCodes: method.regionCodes,
        requiresAddress: method.requiresAddress,
        translations: {
          create: perLocale((locale) => ({
            name: method.name[locale],
            description: method.description[locale],
            estimate: method.estimate[locale],
          })),
        },
      },
    });
  }

  await prisma.siteSetting.upsert({
    where: { key: 'announcement' },
    update: {},
    create: { key: 'announcement', value: DEMO_ANNOUNCEMENT },
  });
  await prisma.siteSetting.upsert({
    where: { key: 'contact' },
    update: {},
    create: { key: 'contact', value: EMPTY_CONTACT },
  });

  let created = 0;
  for (const article of DEMO_ARTICLES) {
    const existing = await prisma.article.findUnique({
      where: { slug: article.slug },
      select: { id: true },
    });
    if (existing) continue;
    const draft = article.status === 'DRAFT';
    await prisma.article.create({
      data: {
        slug: article.slug,
        status: draft ? 'DRAFT' : 'PUBLISHED',
        illustrationKey: article.illustrationKey,
        publishedAt: draft ? null : new Date(now.getTime() - article.publishedDaysAgo * DAY_MS),
        translations: {
          create: perLocale((locale) => ({
            title: article.title[locale],
            excerpt: article.excerpt[locale],
            body: article.body[locale],
          })),
        },
      },
    });
    created += 1;
  }
  return created;
}

async function createDemoVariant(
  tx: Prisma.TransactionClient,
  productId: string,
  variant: DemoVariant,
  position: number,
  stockedAt: Date,
): Promise<void> {
  const created = await tx.productVariant.create({
    data: {
      productId,
      sku: variant.sku,
      weightGrams: variant.weightGrams,
      unitCount: variant.unitCount ?? null,
      price: new Prisma.Decimal(variant.price),
      compareAtPrice: variant.compareAtPrice ? new Prisma.Decimal(variant.compareAtPrice) : null,
      stockQuantity: variant.stock,
      lowStockThreshold: variant.lowStockThreshold ?? 5,
      position,
    },
  });
  if (variant.stock > 0) {
    await tx.inventoryMovement.create({
      data: {
        variantId: created.id,
        delta: variant.stock,
        quantityAfter: variant.stock,
        reason: 'INITIAL_STOCK',
        note: 'Demo seed',
        createdAt: stockedAt,
      },
    });
  }
}

function translationCopy(demo: DemoProduct, locale: Locale) {
  return {
    name: demo.name[locale],
    shortDescription: demo.shortDescription[locale],
    description: demo.description[locale],
    tastingNotes: demo.tastingNotes?.[locale] ?? null,
    origin: demo.origin?.[locale] ?? null,
  };
}

async function createProduct(prisma: PrismaClient, demo: DemoProduct, now: Date): Promise<string> {
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: demo.category } });
  const collections = await prisma.collection.findMany({
    where: { slug: { in: demo.collections } },
  });
  const draft = demo.status === 'DRAFT';
  const publishedAt = draft ? null : new Date(now.getTime() - demo.publishedDaysAgo * DAY_MS);

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        slug: demo.slug,
        status: draft ? 'DRAFT' : 'ACTIVE',
        categoryId: category.id,
        format: demo.format,
        isFeatured: demo.featured,
        illustrationKey: demo.illustrationKey,
        brewTempCelsius: demo.brewing?.tempC ?? null,
        brewTimeMinSeconds: demo.brewing?.minSeconds ?? null,
        brewTimeMaxSeconds: demo.brewing?.maxSeconds ?? null,
        brewAmountGrams:
          demo.brewing?.grams != null ? new Prisma.Decimal(demo.brewing.grams) : null,
        publishedAt,
        translations: {
          create: perLocale((locale) => {
            const copy = translationCopy(demo, locale);
            return { ...copy, searchText: productSearchText(copy) };
          }),
        },
        collections: { create: collections.map((collection) => ({ collectionId: collection.id })) },
      },
    });

    for (const [position, variant] of demo.variants.entries()) {
      // Dated with the product, so the ledger reads in order next to demo orders.
      await createDemoVariant(tx, product.id, variant, position, publishedAt ?? now);
    }
    await refreshMinPrice(tx, product.id);
    await assignDemoAttributes(tx, product.id, demo);
    return product.id;
  });
}

/** The pack's front and back when the product has packaging, otherwise code-drawn art. */
async function demoImages(demo: DemoProduct, emblem: Buffer): Promise<Buffer[]> {
  if (demo.packaging) {
    return Promise.all(
      [demo.packaging.front, demo.packaging.back].map((file) =>
        readFile(resolve(seedDir, 'assets/packaging', file)),
      ),
    );
  }
  return [
    await renderPackshot({ style: demo.art.style, shape: demo.art.shape, emblem }),
    await renderLeafStudy({ style: demo.art.style, accent: demo.art.accent, seed: demo.slug }),
  ];
}

async function attachDemoImages(
  prisma: PrismaClient,
  productId: string,
  demo: DemoProduct,
  emblem: Buffer,
  uploadsDir: string,
): Promise<void> {
  const renders = await demoImages(demo, emblem);
  for (const [position, render] of renders.entries()) {
    const stored = await storeImage(
      render,
      seedImageStore(uploadsDir),
      productImagePrefix(productId),
    );
    await prisma.productImage.create({
      data: {
        productId,
        position,
        storageKey: stored.storageKey,
        widths: stored.widths,
        width: stored.width,
        height: stored.height,
      },
    });
  }
}

/**
 * Databases seeded before TERAN supplied its packs hold invented copy, pack sizes and art for the
 * identifiers that now have packaging. They are replaced once, and only while the product still
 * carries exactly the copy the earlier seed wrote, so nothing edited in the admin area is touched.
 * Earlier pack sizes stay (orders refer to them) but are switched off.
 */
async function upgradeToPackaging(
  prisma: PrismaClient,
  productId: string,
  demo: DemoProduct,
  options: CatalogueOptions,
  now: Date,
): Promise<boolean> {
  if (!demo.packaging) return false;
  const earlier = await prisma.productTranslation.findUnique({
    where: { productId_locale: { productId, locale: 'uz' } },
    select: { description: true },
  });
  if (!earlier?.description?.includes(EARLIER_DEMO_COPY.identifierMarker)) return false;

  const category = await prisma.category.findUniqueOrThrow({
    where: { slug: demo.category },
    select: { id: true },
  });
  const replacedImages = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        categoryId: category.id,
        isFeatured: demo.featured,
        illustrationKey: demo.illustrationKey,
        brewTempCelsius: demo.brewing?.tempC ?? null,
        brewTimeMinSeconds: demo.brewing?.minSeconds ?? null,
        brewTimeMaxSeconds: demo.brewing?.maxSeconds ?? null,
        brewAmountGrams:
          demo.brewing?.grams != null ? new Prisma.Decimal(demo.brewing.grams) : null,
      },
    });
    for (const locale of LOCALES) {
      const copy = translationCopy(demo, locale);
      await tx.productTranslation.update({
        where: { productId_locale: { productId, locale } },
        data: { ...copy, searchText: productSearchText(copy) },
      });
    }
    const skus = demo.variants.map((variant) => variant.sku);
    await tx.productVariant.updateMany({
      where: { productId, sku: { notIn: skus } },
      data: { isActive: false },
    });
    for (const [position, variant] of demo.variants.entries()) {
      const exists = await tx.productVariant.findUnique({ where: { sku: variant.sku } });
      if (!exists) await createDemoVariant(tx, productId, variant, position, now);
    }
    await refreshMinPrice(tx, productId);
    const images = await tx.productImage.findMany({
      where: { productId },
      select: { storageKey: true },
    });
    await tx.productImage.deleteMany({ where: { productId } });
    return images;
  });
  for (const image of replacedImages) {
    await deleteStoredImage(seedImageStore(options.uploadsDir), image.storageKey);
  }
  if (options.emblem) {
    await attachDemoImages(prisma, productId, demo, options.emblem, options.uploadsDir);
  }
  return true;
}

export async function seedCatalogue(
  prisma: PrismaClient,
  options: CatalogueOptions,
): Promise<CatalogueReport> {
  const now = options.now ?? new Date();
  let structure = await seedTaxonomies(prisma);
  structure += await seedProductTypes(prisma);
  const articles = await seedContent(prisma, now);

  let products = 0;
  for (const demo of DEMO_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { slug: demo.slug },
      select: { id: true, productTypeId: true },
    });
    if (existing) {
      if (existing.productTypeId === null) {
        const typed = await prisma.$transaction((tx) =>
          assignDemoAttributes(tx, existing.id, demo),
        );
        if (typed) structure += 1;
      }
      if (await upgradeToPackaging(prisma, existing.id, demo, options, now)) structure += 1;
      continue;
    }
    const productId = await createProduct(prisma, demo, now);
    if (options.emblem) {
      await attachDemoImages(prisma, productId, demo, options.emblem, options.uploadsDir);
    }
    products += 1;
  }
  return { products, articles, structure };
}
