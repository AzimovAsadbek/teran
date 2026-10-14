import { canTransitionOrder, normalizeUzPhone, REGION_CODES } from '@teran/contracts';
import { orderHistory } from './activity.js';
import {
  DEMO_CONTACT_INQUIRIES,
  DEMO_CUSTOMERS,
  DEMO_ORDERS,
  DEMO_SUBSCRIBERS,
  DEMO_WHOLESALE_INQUIRIES,
} from './demo-activity.js';
import { DEMO_CATEGORIES, DEMO_COLLECTIONS, DEMO_PRODUCTS } from './demo-catalog.js';
import { DEMO_DELIVERY_METHODS } from './demo-content.js';
import { assertResetAllowed, assertSeedAllowed, databaseTarget, describeTarget } from './guard.js';

const IDENTIFIERS = ['XC2025', 'G8810', 'HET8800', '8830', 'STD8009'];
const LOCAL_URL = 'postgresql://teran:not-a-real-password@127.0.0.1:5434/teran_demo?schema=public';
const REMOTE_URL = 'postgresql://teran:not-a-real-password@db.example.net:5432/teran_demo';

const variants = new Map(
  DEMO_PRODUCTS.flatMap((product) =>
    product.variants.map((variant) => [variant.sku, { product, variant }] as const),
  ),
);

describe('demo seed guards', () => {
  it('refuses to load demo data into production unless explicitly allowed', () => {
    expect(() => assertSeedAllowed({ NODE_ENV: 'production', DATABASE_URL: LOCAL_URL })).toThrow(
      /ALLOW_DEMO_SEED/,
    );
    expect(
      assertSeedAllowed({
        NODE_ENV: 'production',
        ALLOW_DEMO_SEED: 'true',
        DATABASE_URL: LOCAL_URL,
      }).database,
    ).toBe('teran_demo');
    expect(() => assertSeedAllowed({ NODE_ENV: 'development' })).toThrow(/DATABASE_URL/);
  });

  it('describes the target without credentials', () => {
    const target = databaseTarget(LOCAL_URL);
    expect(target).toEqual({ host: '127.0.0.1', port: '5434', database: 'teran_demo' });
    expect(describeTarget(target)).not.toContain('not-a-real-password');
  });

  it('never resets in production, even when confirmed', () => {
    expect(() =>
      assertResetAllowed({
        env: { NODE_ENV: 'production', DATABASE_URL: LOCAL_URL },
        confirm: 'teran_demo',
        allowRemote: true,
      }),
    ).toThrow(/production/);
  });

  it('requires the database name to be repeated exactly', () => {
    const env = { NODE_ENV: 'development', DATABASE_URL: LOCAL_URL };
    expect(() => assertResetAllowed({ env, confirm: undefined, allowRemote: false })).toThrow(
      /--confirm=teran_demo/,
    );
    expect(() => assertResetAllowed({ env, confirm: 'teran', allowRemote: false })).toThrow(
      /does not match/,
    );
    expect(assertResetAllowed({ env, confirm: 'teran_demo', allowRemote: false }).host).toBe(
      '127.0.0.1',
    );
  });

  it('refuses a database on another machine unless --allow-remote is given', () => {
    const env = { NODE_ENV: 'development', DATABASE_URL: REMOTE_URL };
    expect(() => assertResetAllowed({ env, confirm: 'teran_demo', allowRemote: false })).toThrow(
      /--allow-remote/,
    );
    expect(assertResetAllowed({ env, confirm: 'teran_demo', allowRemote: true }).host).toBe(
      'db.example.net',
    );
  });
});

describe('demo catalogue fixtures', () => {
  it('is a coherent range of 15–25 products with unique slugs and SKUs', () => {
    expect(DEMO_PRODUCTS.length).toBeGreaterThanOrEqual(15);
    expect(DEMO_PRODUCTS.length).toBeLessThanOrEqual(25);
    expect(new Set(DEMO_PRODUCTS.map((product) => product.slug)).size).toBe(DEMO_PRODUCTS.length);
    expect(variants.size).toBe(DEMO_PRODUCTS.flatMap((product) => product.variants).length);
    const categories = new Set(DEMO_CATEGORIES.map((category) => category.slug));
    const collections = new Set(DEMO_COLLECTIONS.map((collection) => collection.slug));
    for (const product of DEMO_PRODUCTS) {
      expect(categories.has(product.category)).toBe(true);
      for (const slug of product.collections) expect(collections.has(slug)).toBe(true);
      expect(product.variants.length).toBeGreaterThan(0);
      for (const variant of product.variants) expect(Number(variant.price)).toBeGreaterThan(0);
    }
  });

  it('lists each TERAN identifier once, in the premium collection, labelled as a demo', () => {
    const premium = DEMO_PRODUCTS.filter((product) =>
      product.collections.includes('teran-premium'),
    );
    expect(premium.map((product) => product.name.en).sort()).toEqual(
      IDENTIFIERS.map((code) => `TERAN ${code}`).sort(),
    );
    for (const product of premium) {
      expect(product.description.en).toMatch(/placeholders, not information about the actual/);
      expect(product.description.ru).toMatch(/условные/);
      expect(product.description.uz).toMatch(/taxminiy/);
    }
  });

  it('says on every product that it is a demonstration and makes no unverified claims', () => {
    for (const product of DEMO_PRODUCTS) {
      expect(product.description.en).toMatch(/demonstration/i);
      expect(product.description.ru).toMatch(/демонстрац/i);
      expect(product.description.uz).toMatch(/namoyish/i);
      const copy = [
        product.name.en,
        product.shortDescription.en,
        product.description.en,
        product.tastingNotes?.en ?? '',
      ].join(' ');
      expect(copy).not.toMatch(
        /certif|organic|health|antioxid|caffeine|award|review|yunnan|fujian|anhui|zhejiang|harvest/i,
      );
    }
  });

  it('demonstrates the out-of-stock, low-stock, sale and draft states', () => {
    const all = DEMO_PRODUCTS.flatMap((product) => product.variants);
    expect(all.some((variant) => variant.stock === 0)).toBe(true);
    expect(
      all.some((variant) => variant.stock > 0 && variant.stock <= (variant.lowStockThreshold ?? 5)),
    ).toBe(true);
    expect(all.some((variant) => variant.compareAtPrice)).toBe(true);
    expect(DEMO_PRODUCTS.some((product) => product.status === 'DRAFT')).toBe(true);
  });
});

describe('demo activity fixtures', () => {
  const customers = new Map(DEMO_CUSTOMERS.map((customer) => [customer.email, customer]));
  const ordersOldestFirst = [...DEMO_ORDERS].sort((a, b) => b.ageHours - a.ageHours);

  it('uses order numbers that can never collide with real ones', () => {
    expect(new Set(DEMO_ORDERS.map((order) => order.number)).size).toBe(DEMO_ORDERS.length);
    for (const order of DEMO_ORDERS) {
      expect(order.number).toMatch(/^TRN-DEMO\d{4}$/);
      // Same shape the storefront and admin accept…
      expect(order.number).toMatch(/^TRN-[0-9A-Z]{8}$/);
      // …but real numbers use Crockford base32, which has no letter O.
      expect(order.number).toContain('O');
    }
  });

  it('only contains invented, unreachable contact details', () => {
    const emails = [
      ...DEMO_CUSTOMERS.map((customer) => customer.email),
      ...DEMO_SUBSCRIBERS.map((subscriber) => subscriber.email),
      ...DEMO_CONTACT_INQUIRIES.flatMap((inquiry) => (inquiry.email ? [inquiry.email] : [])),
      ...DEMO_WHOLESALE_INQUIRIES.flatMap((inquiry) => (inquiry.email ? [inquiry.email] : [])),
      ...DEMO_ORDERS.flatMap((order) =>
        typeof order.customer !== 'string' && order.customer.email ? [order.customer.email] : [],
      ),
    ];
    for (const email of emails) expect(email).toMatch(/^[a-z.]+@example\.com$/);

    const phones = [
      ...DEMO_CUSTOMERS.map((customer) => customer.phone),
      ...DEMO_WHOLESALE_INQUIRIES.map((inquiry) => inquiry.phone),
      ...DEMO_CONTACT_INQUIRIES.flatMap((inquiry) => (inquiry.phone ? [inquiry.phone] : [])),
      ...DEMO_ORDERS.flatMap((order) =>
        typeof order.customer === 'string' ? [] : [order.customer.phone],
      ),
    ];
    for (const phone of phones) {
      expect(phone).toMatch(/^\+99890000\d{4}$/);
      expect(normalizeUzPhone(phone)).toBe(phone);
    }
    for (const inquiry of DEMO_WHOLESALE_INQUIRIES)
      expect(inquiry.companyName).toMatch(/\(demo\)$/);
  });

  it('references existing customers, delivery methods, regions and products', () => {
    const methods = new Map(DEMO_DELIVERY_METHODS.map((method) => [method.code, method]));
    for (const order of DEMO_ORDERS) {
      if (typeof order.customer === 'string') expect(customers.has(order.customer)).toBe(true);
      const method = methods.get(order.delivery.method);
      expect(method?.regionCodes).toContain(order.delivery.regionCode);
      expect(REGION_CODES).toContain(order.delivery.regionCode);
      for (const item of order.items) {
        const entry = variants.get(item.sku);
        expect(entry, item.sku).toBeDefined();
        expect(entry!.product.status ?? 'ACTIVE').toBe('ACTIVE');
        // The product was on sale before the order was placed.
        expect(entry!.product.publishedDaysAgo * 24).toBeGreaterThan(order.ageHours);
      }
    }
  });

  it('follows the allowed status transitions, all in the past', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    for (const order of DEMO_ORDERS) {
      const placedAt = new Date(now.getTime() - order.ageHours * 3_600_000);
      const history = orderHistory(order, placedAt);
      expect(history[0]).toMatchObject({ from: null, to: 'PENDING' });
      for (const step of history.slice(1)) {
        if (step.paymentStatus === 'PAID') {
          // Recording cash does not change the status.
          expect(step.from).toBe('DELIVERED');
          expect(step.to).toBe('DELIVERED');
        } else {
          expect(canTransitionOrder(step.from!, step.to), `${order.number} ${step.to}`).toBe(true);
        }
        expect(step.at.getTime()).toBeLessThan(now.getTime());
      }
      expect(history.filter((step) => step.from !== step.to).at(-1)?.to).toBe(order.status);
      if (order.paid) expect(order.status).toBe('DELIVERED');
      if (order.status === 'CANCELLED') expect(order.cancelled?.reason).toBeTruthy();
    }
  });

  it('never sells more than the stock, and restocks before the next order is placed', () => {
    const stock = new Map([...variants].map(([sku, { variant }]) => [sku, variant.stock]));
    const now = new Date('2026-01-01T12:00:00Z');
    ordersOldestFirst.forEach((order, index) => {
      for (const item of order.items) {
        const left = stock.get(item.sku)! - item.quantity;
        expect(left, `${order.number} ${item.sku}`).toBeGreaterThanOrEqual(0);
        stock.set(item.sku, left);
      }
      if (order.status !== 'CANCELLED') return;
      for (const item of order.items) stock.set(item.sku, stock.get(item.sku)! + item.quantity);
      const next = ordersOldestFirst[index + 1];
      if (!next) return;
      const placedAt = new Date(now.getTime() - order.ageHours * 3_600_000);
      const cancelledAt = orderHistory(order, placedAt).at(-1)!.at.getTime();
      expect(cancelledAt).toBeLessThan(now.getTime() - next.ageHours * 3_600_000);
    });
  });
});
