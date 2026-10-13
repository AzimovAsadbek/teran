import { Injectable } from '@nestjs/common';
import {
  normalizeSearchText,
  type CategoryDto,
  type CollectionDto,
  type FacetsDto,
  type Locale,
  type ProductDetailDto,
  type ProductListDto,
  type ProductListQuery,
  type ProductSummaryDto,
  type SearchSuggestionsDto,
  type SitemapEntriesDto,
} from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { ApiException } from '../common/errors/api-exception.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import { toMoney } from '../common/money.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  asIllustrationKey,
  detailInclude,
  summaryInclude,
  toProductDetail,
  toProductSummary,
} from './catalog.mapper.js';
import { visibleProductWhere } from './product-visibility.js';

const RELATED_LIMIT = 4;
const SUGGESTION_LIMIT = 6;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(locale: Locale): Promise<CategoryDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        translations: { where: { locale: { in: localeChain(locale) } } },
        _count: { select: { products: { where: visibleProductWhere() } } },
      },
    });
    return categories.map((category) => {
      const translation = pickTranslation(category.translations, locale);
      return {
        id: category.id,
        slug: category.slug,
        name: translation?.name ?? category.slug,
        description: translation?.description ?? null,
        illustrationKey: asIllustrationKey(category.illustrationKey),
        productCount: category._count.products,
        seoTitle: translation?.seoTitle ?? null,
        seoDescription: translation?.seoDescription ?? null,
      };
    });
  }

  async listCollections(locale: Locale): Promise<CollectionDto[]> {
    const collections = await this.prisma.collection.findMany({
      where: { isActive: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        translations: { where: { locale: { in: localeChain(locale) } } },
        _count: { select: { products: { where: { product: visibleProductWhere() } } } },
      },
    });
    return collections.map((collection) => {
      const translation = pickTranslation(collection.translations, locale);
      return {
        id: collection.id,
        slug: collection.slug,
        name: translation?.name ?? collection.slug,
        description: translation?.description ?? null,
        illustrationKey: asIllustrationKey(collection.illustrationKey),
        productCount: collection._count.products,
        seoTitle: translation?.seoTitle ?? null,
        seoDescription: translation?.seoDescription ?? null,
      };
    });
  }

  async listProducts(query: ProductListQuery): Promise<ProductListDto> {
    const where = this.listWhere(query);
    const facetWhere = this.listWhere({ ...query, format: undefined });
    const skip = (query.page - 1) * query.pageSize;

    // Independent reads: run them concurrently on pooled connections (no transaction needed).
    const [total, products, formatGroups, priceRange] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: this.listOrder(query),
        skip,
        take: query.pageSize,
        include: summaryInclude(query.locale),
      }),
      this.prisma.product.groupBy({
        by: ['format'],
        where: facetWhere,
        _count: { _all: true },
        orderBy: { format: 'asc' },
      }),
      this.prisma.product.aggregate({
        where: facetWhere,
        _min: { minPrice: true },
        _max: { minPrice: true },
      }),
    ]);

    const now = new Date();
    const facets: FacetsDto = {
      formats: formatGroups.map((group) => ({
        value: group.format,
        count: typeof group._count === 'object' ? (group._count._all ?? 0) : 0,
      })),
      priceRange:
        priceRange._min.minPrice && priceRange._max.minPrice
          ? { min: toMoney(priceRange._min.minPrice), max: toMoney(priceRange._max.minPrice) }
          : null,
    };

    return {
      items: products.map((product) => toProductSummary(product, query.locale, now)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      facets,
    };
  }

  async getProduct(slug: string, locale: Locale): Promise<ProductDetailDto> {
    const product = await this.prisma.product.findFirst({
      where: { slug, ...visibleProductWhere() },
      include: detailInclude(locale),
    });
    if (!product) {
      throw ApiException.notFound('Product not found');
    }
    return toProductDetail(product, locale);
  }

  async getRelatedProducts(slug: string, locale: Locale): Promise<ProductSummaryDto[]> {
    const product = await this.prisma.product.findFirst({
      where: { slug, ...visibleProductWhere() },
      select: { id: true, categoryId: true },
    });
    if (!product) {
      throw ApiException.notFound('Product not found');
    }
    const related = await this.prisma.product.findMany({
      where: { ...visibleProductWhere(), categoryId: product.categoryId, id: { not: product.id } },
      orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
      take: RELATED_LIMIT,
      include: summaryInclude(locale),
    });

    // Small categories: top up with featured products from elsewhere so the section is useful.
    if (related.length < RELATED_LIMIT) {
      const excluded = [product.id, ...related.map((item) => item.id)];
      const extra = await this.prisma.product.findMany({
        where: { ...visibleProductWhere(), id: { notIn: excluded } },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        take: RELATED_LIMIT - related.length,
        include: summaryInclude(locale),
      });
      related.push(...extra);
    }
    const now = new Date();
    return related.map((item) => toProductSummary(item, locale, now));
  }

  async suggest(q: string, locale: Locale): Promise<SearchSuggestionsDto> {
    const needle = normalizeSearchText(q);
    const [products, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { ...visibleProductWhere(), ...this.searchWhere(needle, locale) },
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        take: SUGGESTION_LIMIT,
        include: summaryInclude(locale),
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          translations: {
            some: {
              locale: { in: localeChain(locale) },
              name: { contains: q, mode: 'insensitive' },
            },
          },
        },
        include: { translations: { where: { locale: { in: localeChain(locale) } } } },
        take: 4,
      }),
    ]);
    const now = new Date();
    return {
      products: products.map((product) => toProductSummary(product, locale, now)),
      categories: categories.map((category) => ({
        slug: category.slug,
        name: pickTranslation(category.translations, locale)?.name ?? category.slug,
      })),
    };
  }

  async sitemapEntries(): Promise<SitemapEntriesDto> {
    const [products, categories, collections, articles] = await Promise.all([
      this.prisma.product.findMany({
        where: visibleProductWhere(),
        select: { slug: true, updatedAt: true },
        orderBy: { slug: 'asc' },
      }),
      this.prisma.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.collection.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.article.findMany({
        where: { status: 'PUBLISHED', publishedAt: { lte: new Date() } },
        select: { slug: true, updatedAt: true },
      }),
    ]);
    const toEntry = (entry: { slug: string; updatedAt: Date }) => ({
      slug: entry.slug,
      updatedAt: entry.updatedAt.toISOString(),
    });
    return {
      products: products.map(toEntry),
      categories: categories.map(toEntry),
      collections: collections.map(toEntry),
      articles: articles.map(toEntry),
    };
  }

  private listWhere(
    query: Omit<ProductListQuery, 'format'> & { format?: ProductListQuery['format'] },
  ) {
    const conditions: Prisma.ProductWhereInput[] = [visibleProductWhere()];
    if (query.category) conditions.push({ category: { slug: query.category, isActive: true } });
    if (query.collection) {
      conditions.push({
        collections: { some: { collection: { slug: query.collection, isActive: true } } },
      });
    }
    if (query.format?.length) conditions.push({ format: { in: query.format } });
    if (query.featured) conditions.push({ isFeatured: true });
    if (query.inStock)
      conditions.push({ variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } });
    if (query.minPrice !== undefined) conditions.push({ minPrice: { gte: query.minPrice } });
    if (query.maxPrice !== undefined) conditions.push({ minPrice: { lte: query.maxPrice } });
    if (query.q) conditions.push(this.searchWhere(normalizeSearchText(query.q), query.locale));
    return { AND: conditions } satisfies Prisma.ProductWhereInput;
  }

  /** Substring match on normalised search text (served by the pg_trgm GIN index). */
  private searchWhere(needle: string, locale: Locale): Prisma.ProductWhereInput {
    return {
      translations: {
        some: { locale: { in: localeChain(locale) }, searchText: { contains: needle } },
      },
    };
  }

  private listOrder(query: ProductListQuery): Prisma.ProductOrderByWithRelationInput[] {
    switch (query.sort) {
      case 'newest':
        return [{ publishedAt: 'desc' }, { id: 'asc' }];
      case 'price_asc':
        return [{ minPrice: 'asc' }, { id: 'asc' }];
      case 'price_desc':
        return [{ minPrice: 'desc' }, { id: 'asc' }];
      default:
        return [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { id: 'asc' }];
    }
  }
}
