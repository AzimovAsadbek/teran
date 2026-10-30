import type {
  ArticleDetailDto,
  ImageDto,
  Locale,
  ProductDetailDto,
  PublicReviewDto,
  VariantDto,
} from '@teran/contracts';
import { BRAND } from '@/content/brand';
import { routing } from '@/i18n/routing';
import { imageSources } from '@/lib/navigation';
import { absoluteUrl, siteUrl } from '@/lib/site';
import { BRAND_ID, ORGANIZATION_ID, WEBSITE_ID, type JsonLdObject } from './json-ld';
import { languageVersions, localizedUrl, type Href } from './urls';

/*
 * schema.org descriptions of what a page shows (ADR-060), built only from the page's own data:
 * nothing a visitor cannot see on the page, and no fact TERAN has not given.
 */

const CONTEXT = 'https://schema.org';
const LOGO = `${siteUrl}/brand/teran-logo.png`;
/** TERAN TRADE MChJ without its legal form, and the brand's name on Instagram (`terantea.uz`). */
const BRAND_ALTERNATE_NAMES = ['TERAN TRADE', 'TERAN Tea'] as const;

/** The largest rendition of an uploaded picture, as an absolute address. */
function largestImage(image: ImageDto): string {
  return absoluteUrl(imageSources(image, Number.MAX_SAFE_INTEGER).src);
}

/**
 * A pack's barcode as a GTIN: 8, 12, 13 or 14 digits with a correct GS1 check digit, else null
 * (the admin area accepts any 8 to 14 digits, internal codes included).
 */
export function validGtin(code: string | null | undefined): string | null {
  if (!code || !/^(?:\d{8}|\d{12,14})$/.test(code)) return null;
  const digits = [...code].map(Number);
  const check = digits.pop();
  // From the right, the digits before the check digit weigh 3, 1, 3, 1…
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check ? code : null;
}

/**
 * Whether a product is TERAN's own: its name carries the brand ("TERAN 8800"). No other product
 * has a brand recorded, so none is stated for teaware, chocolates or drinks.
 */
export function isOwnBrand(product: Pick<ProductDetailDto, 'name'>): boolean {
  return /\bTERAN\b/i.test(product.name);
}

const AVAILABILITY = {
  in_stock: 'https://schema.org/InStock',
  low_stock: 'https://schema.org/LimitedAvailability',
  out_of_stock: 'https://schema.org/OutOfStock',
} as const;

export interface ProductSchemaInput {
  product: ProductDetailDto;
  locale: Locale;
  /** The pack the page opens on: its SKU and barcode describe the product. */
  variant: VariantDto;
  /** The customers' reviews shown on the page (ADR-042); null when they could not be read. */
  reviews: readonly PublicReviewDto[] | null;
  /** Offers publish the prices: only while the shop shows them (ADR-027). */
  withOffers: boolean;
}

/** A product page (ADR-035, ADR-042): the product, its customers' ratings and, with prices, offers. */
export function productSchema({
  product,
  locale,
  variant,
  reviews,
  withOffers,
}: ProductSchemaInput): JsonLdObject {
  const url = localizedUrl(`/products/${product.slug}`, locale);
  const gtin = validGtin(variant.barcode);
  const rating = product.rating;
  return {
    '@context': CONTEXT,
    '@type': 'Product',
    '@id': `${url}#product`,
    url,
    name: product.name,
    description: product.shortDescription ?? product.description ?? undefined,
    image: product.images.map(largestImage),
    sku: variant.sku,
    ...(gtin ? { gtin } : {}),
    ...(isOwnBrand(product)
      ? { brand: { '@type': 'Brand', '@id': BRAND_ID, name: BRAND.name } }
      : {}),
    category: product.category.name,
    // The customers' average and the reviews the page shows, once there is a rating.
    ...(rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating.average,
            ratingCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
          ...(reviews && reviews.length > 0
            ? {
                review: reviews.map((review) => ({
                  '@type': 'Review',
                  author: { '@type': 'Person', name: review.authorName },
                  datePublished: review.createdAt.slice(0, 10),
                  inLanguage: review.locale,
                  ...(review.comment ? { reviewBody: review.comment } : {}),
                  reviewRating: { '@type': 'Rating', ratingValue: review.rating, bestRating: 5 },
                })),
              }
            : {}),
        }
      : {}),
    ...(withOffers
      ? {
          offers: product.variants.map((pack) => {
            const packGtin = validGtin(pack.barcode);
            return {
              '@type': 'Offer',
              sku: pack.sku,
              ...(packGtin ? { gtin: packGtin } : {}),
              price: pack.price,
              priceCurrency: pack.currency,
              availability: AVAILABILITY[pack.stockLevel],
              url: `${url}?variant=${encodeURIComponent(pack.sku)}`,
              itemCondition: 'https://schema.org/NewCondition',
            };
          }),
        }
      : {}),
  };
}

/** A journal article, written by TERAN itself: no individual author is invented. */
export function articleSchema({
  article,
  locale,
}: {
  article: ArticleDetailDto;
  locale: Locale;
}): JsonLdObject {
  const url = localizedUrl(`/journal/${article.slug}`, locale);
  // Without its own text in this language the page shows the Uzbek one, and says so.
  const written = languageVersions(article.locales).includes(locale)
    ? locale
    : routing.defaultLocale;
  return {
    '@context': CONTEXT,
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: article.title,
    description: article.excerpt ?? undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: written,
    mainEntityOfPage: url,
    ...(article.cover ? { image: absoluteUrl(imageSources(article.cover, 1280).src) } : {}),
    author: { '@type': 'Organization', '@id': ORGANIZATION_ID, name: BRAND.name },
    publisher: {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: BRAND.name,
      logo: { '@type': 'ImageObject', url: LOGO },
    },
  };
}

export interface Crumb {
  label: string;
  /** Path without locale prefix; omit for the current page. */
  href?: Href;
}

/**
 * The visible breadcrumb trail as a BreadcrumbList. Search engines need an address for every step
 * but the last, so a step without a page of its own (the collections heading) stays out.
 */
export function breadcrumbSchema(trail: readonly Crumb[], locale: Locale): JsonLdObject {
  const linked = trail.filter((crumb, index) => crumb.href || index === trail.length - 1);
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: linked.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: localizedUrl(crumb.href, locale) } : {}),
    })),
  };
}

/** Questions with the answers shown under them (the help centre, the wholesale page). */
export function faqSchema(items: readonly { question: string; answer: string }[]): JsonLdObject {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** A point of sale as the store locator shows it (Admin → Store addresses, the reader's language). */
export interface PointOfSale {
  name: string;
  address: string;
  phone: string | null;
  latitude: number;
  longitude: number;
  kinds: readonly string[];
}

/**
 * The points of sale on the store locator (ADR-068): each TERAN's own, at the address and the
 * place on the map that TERAN entered. A shop is a `Store`, a dealer or a wholesale point a
 * `LocalBusiness`. Opening hours are free text there, so they are not given as structured hours.
 */
export function pointsOfSaleSchema(
  stores: readonly PointOfSale[],
  locale: Locale,
): JsonLdObject | null {
  if (stores.length === 0) return null;
  const page = localizedUrl('/stores', locale);
  return {
    '@context': CONTEXT,
    '@graph': stores.map((store) => ({
      '@type': store.kinds.includes('SHOP') ? 'Store' : 'LocalBusiness',
      name: store.name,
      url: page,
      image: LOGO,
      address: { '@type': 'PostalAddress', streetAddress: store.address, addressCountry: 'UZ' },
      geo: { '@type': 'GeoCoordinates', latitude: store.latitude, longitude: store.longitude },
      ...(store.phone ? { telephone: store.phone } : {}),
      parentOrganization: { '@id': ORGANIZATION_ID },
      brand: { '@id': BRAND_ID },
    })),
  };
}

export interface StoreFacts {
  /** The brand's description and tagline in the page's language (content/brand.ts). */
  description: string;
  slogan: string;
  /** From Admin → Settings → Contact, already in international form. */
  phones: readonly string[];
  email: string | null;
  /** TERAN's own profiles on social networks. */
  profiles: readonly string[];
}

/**
 * The shop and the website (home page, ADR-035): TERAN TRADE MChJ in Namangan, its phones, e-mail
 * and networks. Only facts TERAN supplied: no street address, opening hours, languages of service
 * or ratings it has not given.
 */
export function storeSchema(facts: StoreFacts): JsonLdObject {
  const home = localizedUrl('/', routing.defaultLocale);
  return {
    '@context': CONTEXT,
    '@graph': [
      {
        '@type': 'OnlineStore',
        '@id': ORGANIZATION_ID,
        name: BRAND.name,
        // The names TERAN goes by: its company without the legal form (as in the domain and on
        // Telegram) and its Instagram name.
        alternateName: [...BRAND_ALTERNATE_NAMES],
        legalName: BRAND.company,
        description: facts.description,
        slogan: facts.slogan,
        url: home,
        logo: LOGO,
        address: { '@type': 'PostalAddress', addressLocality: 'Namangan', addressCountry: 'UZ' },
        ...(facts.email ? { email: facts.email } : {}),
        ...(facts.phones[0] ? { telephone: facts.phones[0] } : {}),
        ...(facts.phones.length > 0
          ? {
              contactPoint: facts.phones.map((telephone) => ({
                '@type': 'ContactPoint',
                telephone,
                contactType: 'sales',
                areaServed: 'UZ',
              })),
            }
          : {}),
        ...(facts.profiles.length > 0 ? { sameAs: [...facts.profiles] } : {}),
        brand: { '@id': BRAND_ID },
      },
      {
        '@type': 'Brand',
        '@id': BRAND_ID,
        name: BRAND.name,
        slogan: facts.slogan,
        logo: LOGO,
        url: home,
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: BRAND.name,
        url: home,
        inLanguage: [...routing.locales],
        publisher: { '@id': ORGANIZATION_ID },
      },
    ],
  };
}
