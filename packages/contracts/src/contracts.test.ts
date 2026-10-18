import { describe, expect, it } from 'vitest';
import {
  announcementSettingSchema,
  FIXED_VISUAL_SLOTS,
  ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  buildSearchText,
  canTransitionOrder,
  checkoutSchema,
  contactInquirySchema,
  formatUzPhone,
  listingBannerSlot,
  normalizeSearchText,
  normalizeUzPhone,
  productListQuerySchema,
  productUpsertSchema,
  regionName,
  visualSlotSchema,
  visualsSettingSchema,
} from './index.js';

describe('normalizeUzPhone', () => {
  it.each([
    ['+998 90 123-45-67', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['90 123 45 67', '+998901234567'],
    ['(71) 200-00-00', '+998712000000'],
  ])('normalises %s', (input, expected) => {
    expect(normalizeUzPhone(input)).toBe(expected);
  });

  it.each(['12345', '+7 916 123 45 67', '+998 01 234 56 78', ''])('rejects %s', (input) => {
    expect(normalizeUzPhone(input)).toBeNull();
  });

  it('formats E.164 numbers for display', () => {
    expect(formatUzPhone('+998901234567')).toBe('+998 90 123 45 67');
  });
});

describe('search text normalisation', () => {
  it('treats every Uzbek apostrophe variant the same', () => {
    expect(normalizeSearchText('Oʻtli choy')).toBe(normalizeSearchText("O'tli choy"));
    expect(normalizeSearchText('Oʻtli choy')).toBe(normalizeSearchText('O‘tli choy'));
    expect(normalizeSearchText('Ta’m')).toBe(normalizeSearchText('Taʼm'));
  });

  it('lower-cases and collapses whitespace', () => {
    expect(buildSearchText(['  Yashil   CHOY ', null, 'Yasmin'])).toBe('yashil choy yasmin');
  });
});

describe('regionName', () => {
  it('returns localised names and falls back to the code', () => {
    expect(regionName('UZ-TK', 'uz')).toBe('Toshkent shahri');
    expect(regionName('UZ-SA', 'ru')).toBe('Самаркандская область');
    expect(regionName('XX', 'en')).toBe('XX');
  });
});

describe('order status transitions', () => {
  it('only allows forward moves or cancellation', () => {
    expect(canTransitionOrder('PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransitionOrder('PENDING', 'DELIVERED')).toBe(false);
    expect(canTransitionOrder('DELIVERED', 'CANCELLED')).toBe(false);
    expect(canTransitionOrder('CANCELLED', 'PENDING')).toBe(false);
  });

  it('defines transitions for every status', () => {
    for (const status of ORDER_STATUSES) {
      expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });
});

const validCheckout = {
  idempotencyKey: '7b7a3f0e-3c2b-4d3f-9a55-2b5c1f0d9e11',
  locale: 'uz',
  customer: { name: 'Dilnoza Karimova', phone: '90 123 45 67', email: '' },
  delivery: {
    methodCode: 'courier-tashkent',
    regionCode: 'UZ-TK',
    city: 'Yunusobod',
    addressLine: ' 12-uy ',
    landmark: '',
  },
  paymentMethod: 'CASH_ON_DELIVERY',
  acceptTerms: true,
};

describe('checkoutSchema', () => {
  it('normalises phone, trims text and drops empty optionals', () => {
    const parsed = checkoutSchema.parse(validCheckout);
    expect(parsed.customer.phone).toBe('+998901234567');
    expect(parsed.customer.email).toBeUndefined();
    expect(parsed.delivery.addressLine).toBe('12-uy');
    expect(parsed.delivery.landmark).toBeUndefined();
  });

  it('requires accepting the terms', () => {
    const result = checkoutSchema.safeParse({ ...validCheckout, acceptTerms: false });
    expect(result.success).toBe(false);
  });

  it('rejects unknown regions and invalid phones', () => {
    const result = checkoutSchema.safeParse({
      ...validCheckout,
      customer: { ...validCheckout.customer, phone: '123' },
      delivery: { ...validCheckout.delivery, regionCode: 'UZ-XX' },
    });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((issue) => issue.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['customer.phone', 'delivery.regionCode']));
  });

  it('never accepts client-supplied prices or totals as authoritative fields', () => {
    const parsed = checkoutSchema.parse({ ...validCheckout, total: '1.00', subtotal: '1.00' });
    expect(parsed).not.toHaveProperty('total');
    expect(parsed).not.toHaveProperty('subtotal');
  });
});

describe('contactInquirySchema', () => {
  it('requires at least one way to reply', () => {
    const result = contactInquirySchema.safeParse({
      name: 'Ali',
      message: 'Salom, savolim bor edi.',
      locale: 'uz',
    });
    expect(result.success).toBe(false);
  });
});

describe('productListQuerySchema', () => {
  it('parses comma separated formats and boolean strings', () => {
    const parsed = productListQuerySchema.parse({
      format: 'LOOSE_LEAF,TEA_BAGS',
      inStock: 'true',
      page: '2',
    });
    expect(parsed.format).toEqual(['LOOSE_LEAF', 'TEA_BAGS']);
    expect(parsed.inStock).toBe(true);
    expect(parsed.page).toBe(2);
    expect(parsed.sort).toBe('featured');
  });

  it('rejects an inverted price range', () => {
    expect(productListQuerySchema.safeParse({ minPrice: '500', maxPrice: '100' }).success).toBe(
      false,
    );
  });
});

describe('productUpsertSchema', () => {
  const base = {
    slug: 'classic-black-tea',
    status: 'ACTIVE',
    categoryId: '0192f7a0-0000-7000-8000-000000000001',
    format: 'LOOSE_LEAF',
    isFeatured: false,
    caffeineLevel: null,
    brewTempCelsius: 95,
    brewTimeMinSeconds: 180,
    brewTimeMaxSeconds: 300,
    brewAmountGrams: 2.5,
    illustrationKey: 'black',
    collectionIds: [],
    translations: { uz: { name: 'Klassik qora choy' }, ru: null, en: null },
    variants: [
      {
        sku: 'TRN-BLK-100',
        weightGrams: 100,
        unitCount: null,
        price: '45000.00',
        compareAtPrice: null,
        lowStockThreshold: 5,
        barcode: null,
        isActive: true,
      },
    ],
  };

  it('accepts a valid product', () => {
    expect(productUpsertSchema.safeParse(base).success).toBe(true);
  });

  it('requires compare-at price to be above the price', () => {
    const result = productUpsertSchema.safeParse({
      ...base,
      variants: [{ ...base.variants[0], compareAtPrice: '40000.00' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate SKUs and inverted brewing times', () => {
    const variant = base.variants[0];
    const result = productUpsertSchema.safeParse({
      ...base,
      brewTimeMinSeconds: 300,
      brewTimeMaxSeconds: 60,
      variants: [variant, variant],
    });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toEqual(expect.arrayContaining(['duplicate_sku', 'brew_time_order']));
  });
});

describe('page pictures', () => {
  const id = '01a139dd-acff-735f-b882-7227b6c2d156';
  const picture = {
    key: `visuals/${id}/abcdefghijkl`,
    widths: [320, 640],
    width: 640,
    height: 400,
  };

  it('accepts the fixed places and listing banners by id', () => {
    for (const slot of FIXED_VISUAL_SLOTS)
      expect(visualSlotSchema.safeParse(slot).success).toBe(true);
    expect(visualSlotSchema.safeParse(listingBannerSlot('category', id)).success).toBe(true);
    expect(visualSlotSchema.safeParse(listingBannerSlot('collection', id)).success).toBe(true);
  });

  it('refuses unknown places, slugs and anything else', () => {
    for (const slot of [
      'about.idea.4',
      'home.hero',
      'banner:category:green-tea',
      'banner:product:' + id,
      '',
    ]) {
      expect(visualSlotSchema.safeParse(slot).success).toBe(false);
    }
  });

  it('keeps a picture with an optional phone crop and source', () => {
    const parsed = visualsSettingSchema.parse({ 'about.hero': { image: picture } });
    expect(parsed['about.hero']).toEqual({
      image: picture,
      mobile: null,
      video: null,
      mobileVideo: null,
      source: null,
    });
    expect(
      visualsSettingSchema.safeParse({ 'about.hero': { image: { ...picture, widths: [] } } })
        .success,
    ).toBe(false);
  });

  it('keeps a film with its poster, MP4 or WebM only', () => {
    const film = {
      key: 'visuals/' + id + '/film',
      type: 'video/mp4',
      width: 596,
      height: 336,
      focusX: 60,
      focusY: 45,
    };
    const parsed = visualsSettingSchema.parse({ 'home.hero.1': { image: picture, video: film } });
    expect(parsed['home.hero.1']?.video).toEqual(film);
    expect(
      visualsSettingSchema.safeParse({
        'home.hero.1': { image: picture, video: { ...film, type: 'video/quicktime' } },
      }).success,
    ).toBe(false);
    // Older settings without a size still read.
    const sizeless = visualsSettingSchema.parse({
      'home.hero.1': { image: picture, video: { key: film.key, type: 'video/webm' } },
    });
    expect(sizeless['home.hero.1']?.video).toEqual({
      key: film.key,
      type: 'video/webm',
      width: null,
      height: null,
      focusX: 50,
      focusY: 50,
    });
  });
});

describe('announcementSettingSchema', () => {
  const setting = (href: string | null) => ({
    enabled: true,
    text: { uz: 'Xush kelibsiz', ru: 'Добро пожаловать', en: 'Welcome' },
    href,
  });

  it('accepts a path on the site and no link', () => {
    expect(announcementSettingSchema.safeParse(setting('/catalog')).success).toBe(true);
    expect(announcementSettingSchema.safeParse(setting('/tea/green-tea?page=2')).success).toBe(
      true,
    );
    expect(announcementSettingSchema.safeParse(setting(null)).success).toBe(true);
  });

  it('refuses addresses on another site, including protocol-relative ones', () => {
    for (const href of ['https://example.com', '//example.com', '//2130706433', 'catalog']) {
      expect(announcementSettingSchema.safeParse(setting(href)).success).toBe(false);
    }
  });
});
