/**
 * Loads the demonstration catalogue and content: categories, collections, products (with
 * code-drawn images), delivery methods, site settings and journal articles.
 *
 * Insert-only: a record that already exists (matched by slug, code or key) is left untouched, so
 * re-running never overwrites changes made in the admin area.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, type Locale } from '@teran/contracts';
import { Prisma, type PrismaClient } from '../../src/generated/prisma/client.js';
import { refreshMinPrice } from '../../src/catalog/product-pricing.js';
import { productSearchText } from '../../src/catalog/product-search.js';
import { productImagePrefix, storeImage } from '../../src/media/image-processing.js';
import { renderLeafStudy, renderPackshot } from './demo-art.js';
import {
  DEMO_CATEGORIES,
  DEMO_COLLECTIONS,
  DEMO_PRODUCTS,
  type DemoProduct,
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

/** The real TERAN emblem, composited onto the demo packshots. */
export function readEmblem(): Promise<Buffer> {
  return readFile(resolve(seedDir, 'assets/teran-emblem.png'));
}

export interface CatalogueReport {
  products: number;
  articles: number;
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

async function seedTaxonomies(prisma: PrismaClient): Promise<void> {
  for (const [position, category] of DEMO_CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        slug: category.slug,
        position,
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
            const copy = {
              name: demo.name[locale],
              shortDescription: demo.shortDescription[locale],
              description: demo.description[locale],
              tastingNotes: demo.tastingNotes?.[locale] ?? null,
            };
            return { ...copy, searchText: productSearchText(copy) };
          }),
        },
        collections: { create: collections.map((collection) => ({ collectionId: collection.id })) },
      },
    });

    for (const [position, variant] of demo.variants.entries()) {
      const created = await tx.productVariant.create({
        data: {
          productId: product.id,
          sku: variant.sku,
          weightGrams: variant.weightGrams,
          unitCount: variant.unitCount ?? null,
          price: new Prisma.Decimal(variant.price),
          compareAtPrice: variant.compareAtPrice
            ? new Prisma.Decimal(variant.compareAtPrice)
            : null,
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
            // Dated with the product, so the ledger reads in order next to demo orders.
            createdAt: publishedAt ?? now,
          },
        });
      }
    }
    await refreshMinPrice(tx, product.id);
    return product.id;
  });
}

async function attachDemoImages(
  prisma: PrismaClient,
  productId: string,
  demo: DemoProduct,
  emblem: Buffer,
  uploadsDir: string,
): Promise<void> {
  const renders = [
    await renderPackshot({ style: demo.art.style, shape: demo.art.shape, emblem }),
    await renderLeafStudy({ style: demo.art.style, accent: demo.art.accent, seed: demo.slug }),
  ];
  for (const [position, render] of renders.entries()) {
    const stored = await storeImage(render, uploadsDir, productImagePrefix(productId));
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

export async function seedCatalogue(
  prisma: PrismaClient,
  options: CatalogueOptions,
): Promise<CatalogueReport> {
  const now = options.now ?? new Date();
  await seedTaxonomies(prisma);
  const articles = await seedContent(prisma, now);

  let products = 0;
  for (const demo of DEMO_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { slug: demo.slug },
      select: { id: true },
    });
    if (existing) continue;
    const productId = await createProduct(prisma, demo, now);
    if (options.emblem) {
      await attachDemoImages(prisma, productId, demo, options.emblem, options.uploadsDir);
    }
    products += 1;
  }
  return { products, articles };
}
