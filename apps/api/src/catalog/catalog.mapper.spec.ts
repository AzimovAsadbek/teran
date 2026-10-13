import { Prisma } from '../generated/prisma/client.js';
import {
  productStockLevel,
  toProductSummary,
  variantStockLevel,
  type SummaryProduct,
} from './catalog.mapper.js';

function variant(
  overrides: Partial<SummaryProduct['variants'][number]>,
): SummaryProduct['variants'][number] {
  return {
    id: '0192f7a0-0000-7000-8000-000000000001',
    productId: 'p',
    sku: 'SKU-1',
    weightGrams: 100,
    unitCount: null,
    price: new Prisma.Decimal('45000'),
    compareAtPrice: null,
    currency: 'UZS',
    stockQuantity: 10,
    lowStockThreshold: 5,
    barcode: null,
    isActive: true,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('stock levels', () => {
  it('classifies variants by their low-stock threshold', () => {
    expect(variantStockLevel({ stockQuantity: 0, lowStockThreshold: 5 })).toBe('out_of_stock');
    expect(variantStockLevel({ stockQuantity: 5, lowStockThreshold: 5 })).toBe('low_stock');
    expect(variantStockLevel({ stockQuantity: 6, lowStockThreshold: 5 })).toBe('in_stock');
  });

  it('uses the best pack size for the product', () => {
    expect(productStockLevel(['out_of_stock', 'low_stock'])).toBe('low_stock');
    expect(productStockLevel(['out_of_stock', 'in_stock'])).toBe('in_stock');
    expect(productStockLevel([])).toBe('out_of_stock');
  });
});

describe('toProductSummary', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  const product: SummaryProduct = {
    id: '0192f7a0-0000-7000-8000-0000000000aa',
    slug: 'classic-green-tea',
    status: 'ACTIVE',
    categoryId: 'c',
    format: 'LOOSE_LEAF',
    isFeatured: true,
    caffeineLevel: null,
    brewTempCelsius: null,
    brewTimeMinSeconds: null,
    brewTimeMaxSeconds: null,
    brewAmountGrams: null,
    illustrationKey: 'green',
    minPrice: new Prisma.Decimal('45000'),
    publishedAt: new Date('2026-10-01T00:00:00Z'),
    createdAt: now,
    updatedAt: now,
    translations: [
      {
        productId: 'p',
        locale: 'uz',
        name: 'Yashil choy',
        shortDescription: null,
        description: null,
        ingredients: null,
        tastingNotes: null,
        origin: null,
        seoTitle: null,
        seoDescription: null,
        searchText: '',
      },
    ],
    category: { slug: 'green-tea', translations: [{ locale: 'uz', name: 'Yashil choy' }] },
    variants: [
      variant({
        id: '0192f7a0-0000-7000-8000-000000000002',
        sku: 'BIG',
        price: new Prisma.Decimal('98000'),
        stockQuantity: 0,
      }),
      variant({
        sku: 'SMALL',
        price: new Prisma.Decimal('45000'),
        compareAtPrice: new Prisma.Decimal('52000'),
      }),
    ],
    images: [],
  };

  it('derives price, badges and the default variant from live data', () => {
    const summary = toProductSummary(product, 'ru', now);
    // Russian is missing, so the Uzbek translation is used.
    expect(summary.name).toBe('Yashil choy');
    expect(summary.priceFrom).toBe('45000.00');
    expect(summary.compareAtPriceFrom).toBe('52000.00');
    expect(summary.onSale).toBe(true);
    expect(summary.isNew).toBe(true);
    // The first purchasable pack is chosen, skipping the sold-out one.
    expect(summary.defaultVariant?.sku).toBe('SMALL');
    expect(summary.illustrationKey).toBe('green');
  });
});
