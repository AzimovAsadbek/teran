/**
 * Removes demonstration data, and only demonstration data, matched by the keys the demo seed uses:
 * product, category, collection and article slugs; TRN-DEMO order numbers; the demo customers'
 * e-mail addresses (only accounts the seed created, which have no usable password); the demo
 * enquiries and newsletter sign-ups.
 *
 * Kept on purpose: staff accounts, real customers and their orders, delivery methods and site
 * settings (configuration the owner may have changed), the audit log, and categories or
 * collections that still hold products created in the admin area.
 *
 * Destructive: only ever called through the guarded reset command (reset.ts).
 */
import { deleteStoredImage } from '../../src/media/image-processing.js';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { DISABLED_PASSWORD_HASH } from './activity.js';
import {
  DEMO_CONTACT_INQUIRIES,
  DEMO_CUSTOMERS,
  DEMO_ORDER_PREFIX,
  DEMO_SOURCE,
  DEMO_SUBSCRIBERS,
  DEMO_WHOLESALE_INQUIRIES,
} from './demo-activity.js';
import {
  DEMO_CATEGORIES,
  DEMO_COLLECTIONS,
  DEMO_PRODUCT_TYPES,
  DEMO_PRODUCTS,
  RETIRED_DEMO,
} from './demo-catalog.js';
import { DEMO_ARTICLES } from './demo-content.js';

export interface RemovalReport {
  orders: number;
  products: number;
  categories: number;
  collections: number;
  articles: number;
  customers: number;
  contactInquiries: number;
  wholesaleInquiries: number;
  subscribers: number;
  /** Categories and collections left in place because admin-created products still use them. */
  kept: string[];
}

export async function removeDemoData(
  prisma: PrismaClient,
  uploadsDir: string,
): Promise<RemovalReport> {
  const kept: string[] = [];

  // Orders first: their ledger entries point at demo variants.
  const orders = await prisma.order.findMany({
    where: { number: { startsWith: DEMO_ORDER_PREFIX } },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);
  await prisma.inventoryMovement.deleteMany({ where: { orderId: { in: orderIds } } });
  const removedOrders = await prisma.order.deleteMany({ where: { id: { in: orderIds } } });

  // Products, with their image files. Real orders keep their purchase-time snapshots.
  const productSlugs = [...DEMO_PRODUCTS.map((product) => product.slug), ...RETIRED_DEMO.products];
  const products = await prisma.product.findMany({
    where: { slug: { in: productSlugs } },
    select: { id: true, images: { select: { storageKey: true } } },
  });
  await prisma.product.deleteMany({ where: { id: { in: products.map((product) => product.id) } } });
  for (const image of products.flatMap((product) => product.images)) {
    await deleteStoredImage(uploadsDir, image.storageKey);
  }

  // Product types the demo created, once no product uses them (their definitions go with them).
  for (const type of DEMO_PRODUCT_TYPES) {
    const found = await prisma.productType.findUnique({
      where: { key: type.key },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!found) continue;
    if (found._count.products > 0) {
      kept.push(`product type ${type.key}`);
      continue;
    }
    await prisma.productType.delete({ where: { id: found.id } });
  }

  let categories = 0;
  // Subcategories before their parents.
  const categorySlugs = [
    ...DEMO_CATEGORIES.filter((item) => item.parent).map((item) => item.slug),
    ...DEMO_CATEGORIES.filter((item) => !item.parent).map((item) => item.slug),
    ...RETIRED_DEMO.categories,
  ];
  for (const slug of categorySlugs) {
    const category = await prisma.category.findUnique({
      where: { slug },
      select: { id: true, _count: { select: { products: true, children: true } } },
    });
    if (!category) continue;
    if (category._count.products > 0 || category._count.children > 0) {
      kept.push(`category ${slug}`);
      continue;
    }
    await prisma.category.delete({ where: { id: category.id } });
    categories += 1;
  }

  let collections = 0;
  const collectionSlugs = [
    ...DEMO_COLLECTIONS.map((item) => item.slug),
    ...RETIRED_DEMO.collections,
  ];
  for (const slug of collectionSlugs) {
    const collection = await prisma.collection.findUnique({
      where: { slug },
      select: { id: true, _count: { select: { products: true } } },
    });
    if (!collection) continue;
    if (collection._count.products > 0) {
      kept.push(`collection ${slug}`);
      continue;
    }
    await prisma.collection.delete({ where: { id: collection.id } });
    collections += 1;
  }

  const articles = await prisma.article.deleteMany({
    where: { slug: { in: DEMO_ARTICLES.map((article) => article.slug) } },
  });

  const customers = await prisma.user.deleteMany({
    where: {
      email: { in: DEMO_CUSTOMERS.map((customer) => customer.email) },
      role: 'CUSTOMER',
      passwordHash: DISABLED_PASSWORD_HASH,
    },
  });

  let contactInquiries = 0;
  for (const inquiry of DEMO_CONTACT_INQUIRIES) {
    const removed = await prisma.contactInquiry.deleteMany({
      where: { name: inquiry.name, subject: inquiry.subject },
    });
    contactInquiries += removed.count;
  }
  const wholesaleInquiries = await prisma.wholesaleInquiry.deleteMany({
    where: { companyName: { in: DEMO_WHOLESALE_INQUIRIES.map((inquiry) => inquiry.companyName) } },
  });
  const subscribers = await prisma.newsletterSubscriber.deleteMany({
    where: {
      email: { in: DEMO_SUBSCRIBERS.map((subscriber) => subscriber.email) },
      source: DEMO_SOURCE,
    },
  });

  return {
    orders: removedOrders.count,
    products: products.length,
    categories,
    collections,
    articles: articles.count,
    customers: customers.count,
    contactInquiries,
    wholesaleInquiries: wholesaleInquiries.count,
    subscribers: subscribers.count,
    kept,
  };
}
