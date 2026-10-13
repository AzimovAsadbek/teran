import { LOCALES, buildSearchText, type UserRole } from '@teran/contracts';
import { Prisma } from '../../src/generated/prisma/client.js';
import { hashPassword } from '../../src/auth/password.js';
import { refreshMinPrice } from '../../src/catalog/product-pricing.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { TEST_DATABASE_URL, assertTestDatabase } from '../test-env.js';

/** Empties every table of the test database (never runs against any other database). */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

let counter = 0;
const unique = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export async function createCategory(prisma: PrismaService, slug = unique('cat')) {
  return prisma.category.create({
    data: {
      slug,
      translations: { create: LOCALES.map((locale) => ({ locale, name: `${slug} ${locale}` })) },
    },
  });
}

export interface ProductFixtureOptions {
  categoryId: string;
  slug?: string;
  name?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  publishedAt?: Date | null;
  variants?: {
    sku?: string;
    price: string;
    stock: number;
    weightGrams?: number;
    isActive?: boolean;
  }[];
}

export async function createProduct(prisma: PrismaService, options: ProductFixtureOptions) {
  const slug = options.slug ?? unique('product');
  const name = options.name ?? `Test tea ${slug}`;
  const product = await prisma.product.create({
    data: {
      slug,
      status: options.status ?? 'ACTIVE',
      categoryId: options.categoryId,
      publishedAt:
        options.publishedAt === undefined ? new Date(Date.now() - 60_000) : options.publishedAt,
      translations: {
        create: LOCALES.map((locale) => ({ locale, name, searchText: buildSearchText([name]) })),
      },
      variants: {
        create: (options.variants ?? [{ price: '50000', stock: 10 }]).map((variant, position) => ({
          sku: variant.sku ?? unique('SKU').toUpperCase(),
          price: new Prisma.Decimal(variant.price),
          stockQuantity: variant.stock,
          weightGrams: variant.weightGrams ?? 100,
          isActive: variant.isActive ?? true,
          position,
        })),
      },
    },
    include: { variants: { orderBy: { position: 'asc' } } },
  });
  await prisma.$transaction((tx) => refreshMinPrice(tx, product.id));
  return product;
}

export async function createDeliveryMethod(
  prisma: PrismaService,
  options: {
    code?: string;
    price?: string;
    freeFromAmount?: string | null;
    regionCodes?: string[];
    requiresAddress?: boolean;
  } = {},
) {
  const code = options.code ?? unique('delivery');
  return prisma.deliveryMethod.create({
    data: {
      code,
      price: new Prisma.Decimal(options.price ?? '25000'),
      freeFromAmount: options.freeFromAmount ? new Prisma.Decimal(options.freeFromAmount) : null,
      regionCodes: options.regionCodes ?? ['UZ-TK'],
      requiresAddress: options.requiresAddress ?? true,
      translations: { create: LOCALES.map((locale) => ({ locale, name: `${code} ${locale}` })) },
    },
  });
}

export const TEST_PASSWORD = 'correct-horse-battery-staple';

export async function createUser(
  prisma: PrismaService,
  role: UserRole = 'CUSTOMER',
  email = `${unique('user')}@example.com`,
) {
  return prisma.user.create({
    data: { email, role, firstName: 'Test', passwordHash: await hashPassword(TEST_PASSWORD) },
  });
}
