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
  type Localized,
} from './demo-catalog.js';
import {
  ARTICLE_TEXT_FIXES,
  DEMO_ANNOUNCEMENT,
  DEMO_ARTICLES,
  DEMO_DELIVERY_METHODS,
  EMPTY_CONTACT,
  TERAN_CONTACT,
} from './demo-content.js';

export const DAY_MS = 86_400_000;

/**
 * Seeds may run against a remote database (Neon from a developer machine, for example), where a
 * transaction of a few dozen statements outlasts Prisma's 5-second default.
 */
export const SEED_TRANSACTION = { maxWait: 30_000, timeout: 120_000 } as const;

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
   * parent, demo products given their product type, identifier products updated to what their
   * packs say, and pack products given their cut-out image (databases seeded by earlier versions).
   */
  structure: number;
}

export interface CatalogueOptions {
  /** Directory for uploaded images (UPLOADS_DIR). */
  uploadsDir: string;
  /**
   * Load the generic test catalogue too (the end-to-end tests: SEED_TEST_CATALOGUE=true). Without
   * it the test range is archived where an earlier seed loaded it.
   */
  testCatalogue?: boolean;
  /** Records changed after this are left alone when the test range is archived (tests move it). */
  testRangeRetiredAt?: Date;
  /** The TERAN emblem composited onto packshots; null skips image rendering (tests). */
  emblem: Buffer | null;
  now?: Date;
}

function perLocale<T>(build: (locale: Locale) => T): (T & { locale: Locale })[] {
  return LOCALES.map((locale) => ({ locale, ...build(locale) }));
}

/** Translations an earlier seed wrote and nobody edited since: brought up to the current text. */
async function refreshEarlierText(
  update: (locale: Locale, earlier: string, current: string) => Promise<number>,
  earlier: Localized<string>[] | undefined,
  current: Localized<string>,
): Promise<number> {
  let changes = 0;
  for (const text of earlier ?? []) {
    for (const locale of LOCALES) changes += await update(locale, text[locale], current[locale]);
  }
  return changes;
}

async function seedTaxonomies(prisma: PrismaClient, options: CatalogueOptions): Promise<number> {
  let changes = 0;
  // Parents are listed before their subcategories.
  for (const [position, category] of DEMO_CATEGORIES.entries()) {
    if (category.testOnly && !options.testCatalogue) continue;
    changes += await refreshEarlierText(
      async (locale, earlier, current) =>
        (
          await prisma.categoryTranslation.updateMany({
            where: { category: { slug: category.slug }, locale, description: earlier },
            data: { description: current },
          })
        ).count,
      EARLIER_DEMO_COPY.categories[category.slug],
      category.description,
    );
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
    const productType = category.productType
      ? await prisma.productType.findUnique({
          where: { key: category.productType },
          select: { id: true },
        })
      : null;
    await prisma.category.create({
      data: {
        slug: category.slug,
        position,
        parentId: parent?.id ?? null,
        productTypeId: productType?.id ?? null,
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
    if (collection.testOnly && !options.testCatalogue) continue;
    changes += await refreshEarlierText(
      async (locale, earlier, current) =>
        (
          await prisma.collectionTranslation.updateMany({
            where: { collection: { slug: collection.slug }, locale, description: earlier },
            data: { description: current },
          })
        ).count,
      EARLIER_DEMO_COPY.collections[collection.slug],
      collection.description,
    );
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
        brewingGuide: type.brewingGuide,
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

/** True for a contact setting with no channel filled in (what earlier seeds wrote). */
function isEmptyContact(value: Prisma.JsonValue): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.keys(EMPTY_CONTACT).every((key) => (value as Record<string, unknown>)[key] == null);
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
  const contact = await prisma.siteSetting.findUnique({ where: { key: 'contact' } });
  if (!contact) {
    await prisma.siteSetting.create({ data: { key: 'contact', value: TERAN_CONTACT } });
  } else if (isEmptyContact(contact.value)) {
    // Still as an earlier seed left it (every channel empty): the owner's channels, once.
    await prisma.siteSetting.update({ where: { key: 'contact' }, data: { value: TERAN_CONTACT } });
  }

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
  return created + (await fixArticleText(prisma));
}

/** Applies ARTICLE_TEXT_FIXES where an article still carries the earlier words exactly. */
async function fixArticleText(prisma: PrismaClient): Promise<number> {
  let fixed = 0;
  for (const fix of ARTICLE_TEXT_FIXES) {
    const article = await prisma.article.findUnique({
      where: { slug: fix.slug },
      select: { id: true },
    });
    if (!article) continue;
    const key = { articleId_locale: { articleId: article.id, locale: fix.locale } };
    const translation = await prisma.articleTranslation.findUnique({
      where: key,
      select: { body: true, excerpt: true },
    });
    const text = translation?.[fix.field];
    if (!text?.includes(fix.from)) continue;
    await prisma.articleTranslation.update({
      where: key,
      data: { [fix.field]: text.replace(fix.from, fix.to) },
    });
    fixed += 1;
  }
  return fixed;
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
      barcode: variant.barcode ?? null,
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

/** The product's brewing columns, ranges included. */
function brewingFields(demo: DemoProduct) {
  const brewing = demo.brewing;
  return {
    brewTempCelsius: brewing?.tempC ?? null,
    brewTempMaxCelsius: brewing?.tempMaxC ?? null,
    brewTimeMinSeconds: brewing?.minSeconds ?? null,
    brewTimeMaxSeconds: brewing?.maxSeconds ?? null,
    brewAmountGrams: brewing?.grams != null ? new Prisma.Decimal(brewing.grams) : null,
    brewAmountMaxGrams: brewing?.gramsMax != null ? new Prisma.Decimal(brewing.gramsMax) : null,
  };
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
        ...brewingFields(demo),
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
  }, SEED_TRANSACTION);
}

/**
 * The pouch cut out, its photograph and the back of the pack when the product has packaging,
 * otherwise code-drawn art.
 */
async function demoImages(demo: DemoProduct, emblem: Buffer): Promise<Buffer[]> {
  if (demo.packaging) {
    // The cut-out first: cards and the product page show the whole pouch on white (a portrait
    // photograph would be cropped by their square frames); the photograph comes up on hover.
    const { front, back, cutout } = demo.packaging;
    return Promise.all(
      [...(cutout ? [cutout] : []), front, ...(back ? [back] : [])].map((file) =>
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
        transparent: stored.transparent,
      },
    });
  }
}

/** Before this date the test range was loaded everywhere; later changes are someone's choice. */
const TEST_RANGE_RETIRED = new Date('2026-10-18T00:00:00Z');

/**
 * Databases seeded before the owner described the teas (2026-10-17) hold the pack-based demo copy
 * (or, for 8800, an invented black tea). They get the owner's copy, brewing, a 400 g pack with its
 * barcode, normal demo stock and the pouch photographs once, and only while the product still
 * carries exactly what the earlier seed wrote, so nothing edited in the admin area is touched.
 * A product whose code changed (HET8800 → 8800, STD8009 → 8009) moves to its new address and
 * keeps a redirect from the old one; its pack keeps its row, so orders still point at it.
 */
async function upgradeToOwnerCopy(
  prisma: PrismaClient,
  existing: { id: string; slug: string },
  demo: DemoProduct,
  options: CatalogueOptions,
  now: Date,
): Promise<boolean> {
  if (demo.testOnly || !demo.packaging) return false;
  const productId = existing.id;
  const earlier = await prisma.productTranslation.findUnique({
    where: { productId_locale: { productId, locale: 'uz' } },
    select: { description: true },
  });
  const text = earlier?.description ?? '';
  if (
    !text.includes(EARLIER_DEMO_COPY.packMarker) &&
    !text.includes(EARLIER_DEMO_COPY.identifierMarker)
  ) {
    return false;
  }

  const category = await prisma.category.findUniqueOrThrow({
    where: { slug: demo.category },
    select: { id: true },
  });
  const collections = await prisma.collection.findMany({
    where: { slug: { in: demo.collections } },
    select: { id: true },
  });
  const replacedImages = await prisma.$transaction(async (tx) => {
    if (existing.slug !== demo.slug) {
      await tx.slugRedirect.upsert({
        where: { entity_fromSlug: { entity: 'PRODUCT', fromSlug: existing.slug } },
        update: { toId: productId },
        create: { entity: 'PRODUCT', fromSlug: existing.slug, toId: productId },
      });
    }
    await tx.product.update({
      where: { id: productId },
      data: {
        slug: demo.slug,
        categoryId: category.id,
        format: demo.format,
        isFeatured: demo.featured,
        illustrationKey: demo.illustrationKey,
        ...brewingFields(demo),
      },
    });
    for (const locale of LOCALES) {
      const copy = translationCopy(demo, locale);
      await tx.productTranslation.update({
        where: { productId_locale: { productId, locale } },
        data: { ...copy, searchText: productSearchText(copy) },
      });
    }
    for (const collection of collections) {
      await tx.productCollection.upsert({
        where: { collectionId_productId: { collectionId: collection.id, productId } },
        update: {},
        create: { collectionId: collection.id, productId },
      });
    }

    const skus = demo.variants.map((variant) => variant.sku);
    for (const [position, variant] of demo.variants.entries()) {
      const found =
        (await tx.productVariant.findUnique({ where: { sku: variant.sku } })) ??
        (await tx.productVariant.findFirst({
          where: { productId, sku: { in: variant.formerSkus ?? [] } },
        }));
      if (!found) {
        await createDemoVariant(tx, productId, variant, position, now);
        continue;
      }
      // The pack the owner describes: 400 g, no invented discount, the demo stock level.
      await tx.productVariant.update({
        where: { id: found.id },
        data: {
          sku: variant.sku,
          weightGrams: variant.weightGrams,
          unitCount: variant.unitCount ?? null,
          compareAtPrice: null,
          barcode: variant.barcode ?? null,
          lowStockThreshold: variant.lowStockThreshold ?? 5,
          stockQuantity: variant.stock,
          isActive: true,
          position,
        },
      });
      const delta = variant.stock - found.stockQuantity;
      if (delta !== 0) {
        await tx.inventoryMovement.create({
          data: {
            variantId: found.id,
            delta,
            quantityAfter: variant.stock,
            reason: 'MANUAL_ADJUSTMENT',
            note: "Demo seed: stock level reset with the owner's product data",
            createdAt: now,
          },
        });
      }
    }
    // Pack sizes the owner does not sell are switched off (orders refer to them).
    await tx.productVariant.updateMany({
      where: { productId, sku: { notIn: skus } },
      data: { isActive: false },
    });
    await refreshMinPrice(tx, productId);

    const images = await tx.productImage.findMany({
      where: { productId },
      select: { storageKey: true },
    });
    await tx.productImage.deleteMany({ where: { productId } });
    return images;
  }, SEED_TRANSACTION);
  for (const image of replacedImages) {
    await deleteStoredImage(seedImageStore(options.uploadsDir), image.storageKey);
  }
  if (options.emblem) {
    await attachDemoImages(prisma, productId, demo, options.emblem, options.uploadsDir);
  }
  return true;
}

/**
 * Without the test catalogue the generic range is archived where an earlier seed loaded it (once:
 * a product, category or collection changed after the retirement date is left as it is), and its
 * categories and collections are switched off when no product of the shop is left in them.
 * Archived products keep their orders; staff can bring any of them back from the admin area.
 */
async function retireTestCatalogue(prisma: PrismaClient, retiredAt: Date): Promise<number> {
  let changes = 0;
  const archived = await prisma.product.updateMany({
    where: {
      slug: {
        in: DEMO_PRODUCTS.filter((product) => product.testOnly).map((product) => product.slug),
      },
      status: { not: 'ARCHIVED' },
      updatedAt: { lt: retiredAt },
    },
    data: { status: 'ARCHIVED' },
  });
  changes += archived.count;

  const live = { status: { not: 'ARCHIVED' as const } };
  for (const category of DEMO_CATEGORIES.filter((entry) => entry.testOnly)) {
    const found = await prisma.category.findUnique({
      where: { slug: category.slug },
      select: {
        id: true,
        isActive: true,
        updatedAt: true,
        _count: { select: { products: { where: live } } },
      },
    });
    if (!found?.isActive || found.updatedAt >= retiredAt || found._count.products > 0) continue;
    await prisma.category.update({ where: { id: found.id }, data: { isActive: false } });
    changes += 1;
  }
  for (const collection of DEMO_COLLECTIONS.filter((entry) => entry.testOnly)) {
    const found = await prisma.collection.findUnique({
      where: { slug: collection.slug },
      select: {
        id: true,
        isActive: true,
        updatedAt: true,
        _count: { select: { products: { where: { product: live } } } },
      },
    });
    if (!found?.isActive || found.updatedAt >= retiredAt || found._count.products > 0) continue;
    await prisma.collection.update({ where: { id: found.id }, data: { isActive: false } });
    changes += 1;
  }
  return changes;
}

/**
 * Pack products seeded before cut-out images existed get theirs once (the home hero stands
 * products free in front of its moon gate): demo products with packaging only, while none of their
 * images is a cut-out, appended after their images, so nothing staff arranged is moved or replaced.
 */
async function attachDemoCutout(
  prisma: PrismaClient,
  productId: string,
  demo: DemoProduct,
  options: CatalogueOptions,
): Promise<boolean> {
  const cutout = demo.packaging?.cutout;
  // Like every image step, skipped when images are not rendered (tests).
  if (!cutout || !options.emblem) return false;
  const images = await prisma.productImage.findMany({
    where: { productId },
    select: { position: true, transparent: true },
  });
  if (images.length === 0 || images.some((image) => image.transparent)) return false;
  const stored = await storeImage(
    await readFile(resolve(seedDir, 'assets/packaging', cutout)),
    seedImageStore(options.uploadsDir),
    productImagePrefix(productId),
  );
  await prisma.productImage.create({
    data: {
      productId,
      position: Math.max(...images.map((image) => image.position)) + 1,
      storageKey: stored.storageKey,
      widths: stored.widths,
      width: stored.width,
      height: stored.height,
      transparent: stored.transparent,
    },
  });
  return true;
}

/**
 * A pack whose barcode the owner supplied after the product was loaded (XC2025, 8830 and 8009 on
 * 2026-10-18) gets it, once: only where the pack has none, so a barcode entered in the admin area
 * stays, and never one another pack already carries (barcodes are unique).
 */
async function fillMissingBarcodes(prisma: PrismaClient): Promise<number> {
  let filled = 0;
  for (const demo of DEMO_PRODUCTS) {
    if (demo.testOnly) continue;
    for (const variant of demo.variants) {
      if (!variant.barcode) continue;
      const taken = await prisma.productVariant.findUnique({
        where: { barcode: variant.barcode },
        select: { id: true },
      });
      if (taken) continue;
      const { count } = await prisma.productVariant.updateMany({
        where: { sku: variant.sku, barcode: null },
        data: { barcode: variant.barcode },
      });
      filled += count;
    }
  }
  return filled;
}

/** A product of the catalogue by its slug, or by a slug it had before. */
function findDemoProduct(prisma: PrismaClient, demo: DemoProduct) {
  return prisma.product.findFirst({
    where: { slug: { in: [demo.slug, ...(demo.formerSlugs ?? [])] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, slug: true, productTypeId: true },
  });
}

export async function seedCatalogue(
  prisma: PrismaClient,
  options: CatalogueOptions,
): Promise<CatalogueReport> {
  const now = options.now ?? new Date();
  // Types first: a new demo category starts with its default product type.
  let structure = await seedProductTypes(prisma);
  structure += await seedTaxonomies(prisma, options);
  const articles = await seedContent(prisma, now);

  let products = 0;
  for (const demo of DEMO_PRODUCTS) {
    if (demo.testOnly && !options.testCatalogue) continue;
    const existing = await findDemoProduct(prisma, demo);
    if (existing) {
      if (existing.productTypeId === null) {
        const typed = await prisma.$transaction(
          (tx) => assignDemoAttributes(tx, existing.id, demo),
          SEED_TRANSACTION,
        );
        if (typed) structure += 1;
      }
      if (await upgradeToOwnerCopy(prisma, existing, demo, options, now)) structure += 1;
      if (await attachDemoCutout(prisma, existing.id, demo, options)) structure += 1;
      continue;
    }
    const productId = await createProduct(prisma, demo, now);
    if (options.emblem) {
      await attachDemoImages(prisma, productId, demo, options.emblem, options.uploadsDir);
    }
    products += 1;
  }
  structure += await fillMissingBarcodes(prisma);
  if (!options.testCatalogue) {
    structure += await retireTestCatalogue(
      prisma,
      options.testRangeRetiredAt ?? TEST_RANGE_RETIRED,
    );
  }
  return { products, articles, structure };
}
