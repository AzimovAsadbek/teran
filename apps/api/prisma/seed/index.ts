/**
 * Loads the DEMONSTRATION catalogue and content into the database configured by DATABASE_URL.
 *
 * - Idempotent and non-destructive: existing records (matched by slug, code or key) are left
 *   untouched, so re-running never overwrites changes made in the admin area.
 * - Refuses to run when NODE_ENV=production unless ALLOW_DEMO_SEED=true.
 *
 * Run with: pnpm --filter @teran/api db:seed
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { LOCALES, type Locale } from '@teran/contracts';
import { Prisma, PrismaClient } from '../../src/generated/prisma/client.js';
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

const DAY_MS = 86_400_000;
const seedDir = dirname(fileURLToPath(import.meta.url));

function assertSafeEnvironment(): void {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    throw new Error(
      'Refusing to load demo data into production. Set ALLOW_DEMO_SEED=true to override.',
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }
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

async function seedContent(prisma: PrismaClient): Promise<void> {
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

  for (const article of DEMO_ARTICLES) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: {
        slug: article.slug,
        status: 'PUBLISHED',
        illustrationKey: article.illustrationKey,
        publishedAt: new Date(Date.now() - article.publishedDaysAgo * DAY_MS),
        translations: {
          create: perLocale((locale) => ({
            title: article.title[locale],
            excerpt: article.excerpt[locale],
            body: article.body[locale],
          })),
        },
      },
    });
  }
}

async function createProduct(prisma: PrismaClient, demo: DemoProduct): Promise<string> {
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: demo.category } });
  const collections = await prisma.collection.findMany({
    where: { slug: { in: demo.collections } },
  });

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        slug: demo.slug,
        status: 'ACTIVE',
        categoryId: category.id,
        format: demo.format,
        isFeatured: demo.featured,
        illustrationKey: demo.illustrationKey,
        brewTempCelsius: demo.brewing?.tempC ?? null,
        brewTimeMinSeconds: demo.brewing?.minSeconds ?? null,
        brewTimeMaxSeconds: demo.brewing?.maxSeconds ?? null,
        brewAmountGrams:
          demo.brewing?.grams != null ? new Prisma.Decimal(demo.brewing.grams) : null,
        publishedAt: new Date(Date.now() - demo.publishedDaysAgo * DAY_MS),
        translations: {
          create: perLocale((locale) => ({
            name: demo.name[locale],
            shortDescription: demo.shortDescription[locale],
            description: demo.description[locale],
            searchText: productSearchText({
              name: demo.name[locale],
              shortDescription: demo.shortDescription[locale],
              description: demo.description[locale],
            }),
          })),
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
): Promise<void> {
  const uploadsDir = resolve(process.env.UPLOADS_DIR ?? './storage/uploads');
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

async function main(): Promise<void> {
  assertSafeEnvironment();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    await seedTaxonomies(prisma);
    await seedContent(prisma);

    const emblem = await readFile(resolve(seedDir, 'assets/teran-emblem.png'));
    let created = 0;
    for (const demo of DEMO_PRODUCTS) {
      const existing = await prisma.product.findUnique({
        where: { slug: demo.slug },
        select: { id: true },
      });
      if (existing) continue;
      const productId = await createProduct(prisma, demo);
      await attachDemoImages(prisma, productId, demo, emblem);
      created += 1;
    }
    console.log(
      `Demo seed complete: ${created} new product(s), ${DEMO_PRODUCTS.length - created} already present.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
