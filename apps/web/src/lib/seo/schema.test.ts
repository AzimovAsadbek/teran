// @vitest-environment node
import type {
  ArticleDetailDto,
  ImageDto,
  ProductDetailDto,
  PublicReviewDto,
  VariantDto,
} from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import { siteUrl } from '@/lib/site';
import { ORGANIZATION_ID, serializeJsonLd, WEBSITE_ID } from './json-ld';
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  isOwnBrand,
  productSchema,
  storeSchema,
  validGtin,
} from './schema';

const image: ImageDto = {
  src: '/uploads/products/p1/abc',
  widths: [320, 640, 1280, 1920],
  width: 2400,
  height: 2400,
  alt: 'TERAN 8800',
  transparent: false,
};

function variant(overrides: Partial<VariantDto> = {}): VariantDto {
  return {
    id: '00000000-0000-7000-8000-000000000010',
    sku: 'TRN-8800-400',
    weightGrams: 400,
    unitCount: null,
    price: '85000.00',
    compareAtPrice: null,
    currency: 'UZS',
    stockLevel: 'in_stock',
    maxQuantity: 20,
    barcode: '4780179230045',
    ...overrides,
  };
}

function product(overrides: Partial<ProductDetailDto> = {}): ProductDetailDto {
  const pack = variant();
  return {
    id: '00000000-0000-7000-8000-000000000001',
    slug: 'teran-8800',
    name: 'TERAN 8800',
    shortDescription: 'Green tea from Hunan.',
    category: { slug: 'green-tea', name: 'Green tea', path: 'tea/green-tea' },
    format: 'LOOSE_LEAF',
    isFeatured: true,
    isNew: false,
    onSale: false,
    stockLevel: 'in_stock',
    priceFrom: '85000.00',
    compareAtPriceFrom: null,
    currency: 'UZS',
    variantCount: 1,
    defaultVariant: pack,
    image,
    stageImage: null,
    hoverImage: null,
    illustrationKey: null,
    origin: null,
    brewing: null,
    rating: null,
    productType: null,
    attributes: [],
    breadcrumbs: [],
    description: 'A longer description.',
    ingredients: null,
    tastingNotes: null,
    caffeineLevel: null,
    images: [image],
    variants: [pack],
    seoTitle: null,
    seoDescription: null,
    updatedAt: '2026-10-20T10:00:00.000Z',
    locales: ['uz', 'ru', 'en'],
    ...overrides,
  };
}

const review: PublicReviewDto = {
  id: '00000000-0000-7000-8000-000000000020',
  rating: 5,
  comment: 'Juda mazali </script>',
  authorName: 'Aziza K.',
  verifiedPurchase: true,
  locale: 'uz',
  createdAt: '2026-10-19T08:30:00.000Z',
  updatedAt: '2026-10-19T08:30:00.000Z',
};

describe('GTINs', () => {
  it('accept GS1 numbers of the four lengths with a correct check digit', () => {
    expect(validGtin('4780179230045')).toBe('4780179230045'); // EAN-13 on a TERAN pack
    expect(validGtin('96385074')).toBe('96385074'); // EAN-8
    expect(validGtin('036000291452')).toBe('036000291452'); // UPC-A
    expect(validGtin('10012345678902')).toBe('10012345678902'); // GTIN-14
  });

  it('refuse internal codes, wrong lengths and wrong check digits', () => {
    expect(validGtin('4780179230046')).toBeNull();
    expect(validGtin('1234567890')).toBeNull();
    expect(validGtin('47801792300451')).toBeNull();
    expect(validGtin('')).toBeNull();
    expect(validGtin(null)).toBeNull();
  });
});

describe('product structured data', () => {
  it('describes the product as the page shows it, without offers while prices are hidden', () => {
    const data = productSchema({
      product: product(),
      locale: 'en',
      variant: variant(),
      reviews: null,
      withOffers: false,
    });
    expect(data).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${siteUrl}/en/products/teran-8800#product`,
      url: `${siteUrl}/en/products/teran-8800`,
      name: 'TERAN 8800',
      description: 'Green tea from Hunan.',
      image: [`${siteUrl}/uploads/products/p1/abc/1920.webp`],
      sku: 'TRN-8800-400',
      gtin: '4780179230045',
      brand: { '@type': 'Brand', name: 'TERAN' },
      category: 'Green tea',
    });
  });

  it('states no brand that is not recorded, and no barcode that is not a GTIN', () => {
    const teapot = product({ slug: 'glass-teapot', name: 'Glass teapot, 600 ml' });
    const data = productSchema({
      product: teapot,
      locale: 'uz',
      variant: variant({ sku: 'POT-600', barcode: '12345678' }),
      reviews: null,
      withOffers: false,
    });
    expect(isOwnBrand(teapot)).toBe(false);
    expect(data).not.toHaveProperty('brand');
    expect(data).not.toHaveProperty('gtin');
    expect(data).not.toHaveProperty('offers');
    expect(data).not.toHaveProperty('aggregateRating');
  });

  it('publishes each pack as an offer once the shop shows prices', () => {
    const packs = [
      variant(),
      variant({ sku: 'TRN-8800-100', stockLevel: 'out_of_stock', barcode: null }),
    ];
    const data = productSchema({
      product: product({ variants: packs }),
      locale: 'uz',
      variant: packs[0]!,
      reviews: null,
      withOffers: true,
    });
    expect(data.offers).toEqual([
      {
        '@type': 'Offer',
        sku: 'TRN-8800-400',
        gtin: '4780179230045',
        price: '85000.00',
        priceCurrency: 'UZS',
        availability: 'https://schema.org/InStock',
        url: `${siteUrl}/products/teran-8800?variant=TRN-8800-400`,
        itemCondition: 'https://schema.org/NewCondition',
      },
      {
        '@type': 'Offer',
        sku: 'TRN-8800-100',
        price: '85000.00',
        priceCurrency: 'UZS',
        availability: 'https://schema.org/OutOfStock',
        url: `${siteUrl}/products/teran-8800?variant=TRN-8800-100`,
        itemCondition: 'https://schema.org/NewCondition',
      },
    ]);
  });

  it("adds the customers' rating and the reviews on the page, once rated", () => {
    const data = productSchema({
      product: product({ rating: { average: 4.5, count: 2 } }),
      locale: 'uz',
      variant: variant(),
      reviews: [review],
      withOffers: false,
    });
    expect(data.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.5,
      ratingCount: 2,
      bestRating: 5,
      worstRating: 1,
    });
    expect(data.review).toEqual([
      {
        '@type': 'Review',
        author: { '@type': 'Person', name: 'Aziza K.' },
        datePublished: '2026-10-19',
        inLanguage: 'uz',
        reviewBody: 'Juda mazali </script>',
        reviewRating: { '@type': 'Rating', ratingValue: 5, bestRating: 5 },
      },
    ]);
    expect(serializeJsonLd(data)).not.toContain('</script');
    // Reviews never appear without the rating they make up.
    const unrated = productSchema({
      product: product(),
      locale: 'uz',
      variant: variant(),
      reviews: [review],
      withOffers: false,
    });
    expect(unrated).not.toHaveProperty('review');
  });
});

describe('article structured data', () => {
  const article: ArticleDetailDto = {
    slug: 'brewing-green-tea',
    title: 'How to brew green tea',
    excerpt: 'Water, time and leaves.',
    illustrationKey: null,
    cover: { ...image, src: '/uploads/articles/a1/cover' },
    isFeatured: false,
    publishedAt: '2026-10-01T09:00:00.000Z',
    body: 'Text',
    seoTitle: null,
    seoDescription: null,
    updatedAt: '2026-10-02T09:00:00.000Z',
    media: [],
    locales: ['uz', 'ru'],
  };

  it('is written by TERAN, in the language of the text shown', () => {
    expect(articleSchema({ article, locale: 'ru' })).toMatchObject({
      '@type': 'Article',
      '@id': `${siteUrl}/ru/journal/brewing-green-tea#article`,
      headline: 'How to brew green tea',
      inLanguage: 'ru',
      mainEntityOfPage: `${siteUrl}/ru/journal/brewing-green-tea`,
      image: `${siteUrl}/uploads/articles/a1/cover/1280.webp`,
      datePublished: '2026-10-01T09:00:00.000Z',
      dateModified: '2026-10-02T09:00:00.000Z',
      author: { '@type': 'Organization', '@id': ORGANIZATION_ID, name: 'TERAN' },
      publisher: { '@id': ORGANIZATION_ID },
    });
    // No English text: the English page shows the Uzbek one.
    expect(articleSchema({ article, locale: 'en' }).inLanguage).toBe('uz');
  });
});

describe('breadcrumb structured data', () => {
  it('numbers the linked steps in order, the current page last without an address', () => {
    const data = breadcrumbSchema(
      [
        { label: 'Bosh sahifa', href: '/' },
        { label: 'Collections' },
        { label: 'Choy', href: '/tea' },
        { label: 'TERAN 8800' },
      ],
      'ru',
    );
    expect(data.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Bosh sahifa', item: `${siteUrl}/ru` },
      { '@type': 'ListItem', position: 2, name: 'Choy', item: `${siteUrl}/ru/tea` },
      { '@type': 'ListItem', position: 3, name: 'TERAN 8800' },
    ]);
  });
});

describe('FAQ structured data', () => {
  it('pairs each question with its answer', () => {
    expect(faqSchema([{ question: 'Q?', answer: 'A.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Q?', acceptedAnswer: { '@type': 'Answer', text: 'A.' } },
      ],
    });
  });
});

describe('the shop and the website', () => {
  const facts = {
    description: 'Premium Chinese tea.',
    slogan: 'Teran taʼm.',
    phones: ['+998975707007'],
    email: null,
    profiles: [],
  };

  it('states only facts TERAN gave, by stable ids', () => {
    const graph = storeSchema(facts)['@graph'] as Record<string, unknown>[];
    const [store, website] = graph;
    expect(store).toMatchObject({
      '@type': 'OnlineStore',
      '@id': ORGANIZATION_ID,
      name: 'TERAN',
      legalName: 'TERAN TRADE MChJ',
      url: `${siteUrl}/`,
      logo: `${siteUrl}/brand/teran-logo.png`,
      address: { '@type': 'PostalAddress', addressLocality: 'Namangan', addressCountry: 'UZ' },
      telephone: '+998975707007',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+998975707007',
          contactType: 'sales',
          areaServed: 'UZ',
        },
      ],
    });
    expect(store).not.toHaveProperty('email');
    expect(store).not.toHaveProperty('sameAs');
    expect(JSON.stringify(store)).not.toContain('availableLanguage');
    expect(website).toEqual({
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      name: 'TERAN',
      url: `${siteUrl}/`,
      inLanguage: ['uz', 'ru', 'en'],
      publisher: { '@id': ORGANIZATION_ID },
    });
  });

  it('lists the e-mail and profiles once they are set', () => {
    const graph = storeSchema({
      ...facts,
      email: 'info@terantrade.uz',
      profiles: ['https://t.me/TeranTrade'],
    })['@graph'] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({
      email: 'info@terantrade.uz',
      sameAs: ['https://t.me/TeranTrade'],
    });
  });
});
