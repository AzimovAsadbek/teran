import { Injectable } from '@nestjs/common';
import {
  CAFFEINE_LEVELS,
  FILTERABLE_ATTRIBUTE_KINDS,
  normalizeSearchText,
  type AttributeFacetDto,
  type CategoryDto,
  type CategoryPageDto,
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
  attributeFilterWhere,
  buildAttributeFacets,
  parseAttributeFilters,
  type AttributeFilter,
} from './attribute-filters.js';
import {
  asIllustrationKey,
  categoryBreadcrumbs,
  categoryPath,
  coverImageDto,
  detailInclude,
  summaryInclude,
  toProductDetail,
  toProductSummary,
} from './catalog.mapper.js';
import { visibleProductWhere } from './product-visibility.js';

const RELATED_LIMIT = 4;
const SUGGESTION_LIMIT = 6;

/** Active, and below an active parent if it has one: the categories visitors can reach. */
const PUBLIC_CATEGORY_WHERE = {
  isActive: true,
  OR: [{ parentId: null }, { parent: { isActive: true } }],
} satisfies Prisma.CategoryWhereInput;

/**
 * A category shoppers are led to: visible products of its own or in an active subcategory. The
 * storefront lists only these (search suggestions, the sitemap, its menus), so a new category —
 * coffee, say — appears by itself once it has products.
 */
function stockedCategoryWhere(now: Date = new Date()): Prisma.CategoryWhereInput {
  const visible = visibleProductWhere(now);
  return {
    OR: [
      { products: { some: visible } },
      { children: { some: { isActive: true, products: { some: visible } } } },
    ],
  };
}

type StageImageRow = Prisma.ProductImageGetPayload<object>;
type CategoryRow = Prisma.CategoryGetPayload<{
  include: { translations: true; parent: { select: { slug: true } } };
}>;

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every public category, top-level categories each followed by their subcategories. A top-level
   * category counts the products of its subcategories too.
   */
  async listCategories(locale: Locale): Promise<CategoryDto[]> {
    const [categories, counts] = await Promise.all([
      this.prisma.category.findMany({
        where: PUBLIC_CATEGORY_WHERE,
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: {
          translations: { where: { locale: { in: localeChain(locale) } } },
          parent: { select: { slug: true } },
        },
      }),
      this.visibleProductCounts(),
    ]);

    const result: CategoryDto[] = [];
    for (const top of categories.filter((category) => category.parentId === null)) {
      const children = categories.filter((category) => category.parentId === top.id);
      const total = children.reduce(
        (sum, child) => sum + (counts.get(child.id) ?? 0),
        counts.get(top.id) ?? 0,
      );
      result.push(this.toCategoryDto(top, total, locale));
      for (const child of children) {
        result.push(this.toCategoryDto(child, counts.get(child.id) ?? 0, locale));
      }
    }
    return result;
  }

  /**
   * Resolves a category page address ("tea" or "tea/green-tea"). A category reached through an
   * outdated address (renamed slug, moved to another parent, old flat URL) answers with its
   * current path so the storefront can redirect permanently.
   */
  async getCategoryPage(path: string, locale: Locale): Promise<CategoryPageDto> {
    const slug = path.split('/').at(-1) ?? path;
    const category = await this.prisma.category.findFirst({
      where: { slug, ...PUBLIC_CATEGORY_WHERE },
      include: { parent: { select: { id: true, slug: true } } },
    });

    if (!category) {
      const redirect = await this.prisma.slugRedirect.findUnique({
        where: { entity_fromSlug: { entity: 'CATEGORY', fromSlug: slug } },
        select: { toId: true },
      });
      const target =
        redirect &&
        (await this.prisma.category.findFirst({
          where: { id: redirect.toId, ...PUBLIC_CATEGORY_WHERE },
          select: { slug: true, parent: { select: { slug: true } } },
        }));
      if (target) return { type: 'redirect', path: categoryPath(target) };
      throw ApiException.notFound('Category not found');
    }

    const currentPath = categoryPath(category);
    if (currentPath !== path) return { type: 'redirect', path: currentPath };

    const topId = category.parent?.id ?? category.id;
    const chain = localeChain(locale);
    const [family, counts] = await Promise.all([
      this.prisma.category.findMany({
        where: { AND: [PUBLIC_CATEGORY_WHERE, { OR: [{ id: topId }, { parentId: topId }] }] },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: {
          translations: { where: { locale: { in: chain } } },
          parent: { select: { slug: true } },
        },
      }),
      this.visibleProductCounts(),
    ]);
    const top = family.find((member) => member.id === topId);
    const self = family.find((member) => member.id === category.id);
    if (!top || !self) throw ApiException.notFound('Category not found');
    const children = family.filter((member) => member.parentId === topId);
    const topCount = children.reduce(
      (sum, child) => sum + (counts.get(child.id) ?? 0),
      counts.get(top.id) ?? 0,
    );
    const countOf = (member: CategoryRow) =>
      member.id === topId ? topCount : (counts.get(member.id) ?? 0);

    const selfDto = this.toCategoryDto(self, countOf(self), locale);
    const topDto = self.id === topId ? null : this.toCategoryDto(top, topCount, locale);
    return {
      type: 'category',
      category: selfDto,
      parent: topDto,
      subcategories: children.map((child) => this.toCategoryDto(child, countOf(child), locale)),
      breadcrumbs: categoryBreadcrumbs(
        {
          slug: self.slug,
          translations: self.translations,
          parent: topDto ? { slug: top.slug, translations: top.translations } : null,
        },
        locale,
      ),
    };
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
        image: coverImageDto(
          collection,
          translation?.imageAlt ?? translation?.name ?? collection.slug,
        ),
        productCount: collection._count.products,
        seoTitle: translation?.seoTitle ?? null,
        seoDescription: translation?.seoDescription ?? null,
      };
    });
  }

  async listProducts(query: ProductListQuery): Promise<ProductListDto> {
    const filters = await this.resolveAttributeFilters(query.attributes);
    const base = this.baseConditions(query);
    const formatCondition: Prisma.ProductWhereInput[] = query.format?.length
      ? [{ format: { in: query.format } }]
      : [];
    const caffeineCondition: Prisma.ProductWhereInput[] = query.caffeine?.length
      ? [{ caffeineLevel: { in: query.caffeine } }]
      : [];
    const attributeConditions = filters.map(attributeFilterWhere);
    const where = {
      AND: [...base, ...formatCondition, ...caffeineCondition, ...attributeConditions],
    };
    // Each filter's options are counted without that filter, so choosing one keeps the others.
    const formatFacetWhere = { AND: [...base, ...caffeineCondition, ...attributeConditions] };
    const caffeineFacetWhere = { AND: [...base, ...formatCondition, ...attributeConditions] };
    const skip = (query.page - 1) * query.pageSize;

    // Independent reads: run them concurrently on pooled connections (no transaction needed).
    const [total, products, formatGroups, caffeineGroups, priceRange, attributeFacets] =
      await Promise.all([
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
          where: formatFacetWhere,
          _count: { _all: true },
          orderBy: { format: 'asc' },
        }),
        this.prisma.product.groupBy({
          by: ['caffeineLevel'],
          where: { AND: [...caffeineFacetWhere.AND, { caffeineLevel: { not: null } }] },
          _count: { _all: true },
          orderBy: { caffeineLevel: 'asc' },
        }),
        this.prisma.product.aggregate({
          where: formatFacetWhere,
          _min: { minPrice: true },
          _max: { minPrice: true },
        }),
        this.attributeFacets(
          [...base, ...formatCondition, ...caffeineCondition],
          filters,
          query.locale,
        ),
      ]);

    const now = new Date();
    const stageImages = await this.stageImages(products.map((product) => product.id));
    const facets: FacetsDto = {
      // OTHER is no format to filter by: those products simply have none of the tea formats.
      formats: formatGroups
        .filter((group) => group.format !== 'OTHER')
        .map((group) => ({
          value: group.format,
          count: typeof group._count === 'object' ? (group._count._all ?? 0) : 0,
        })),
      caffeine: CAFFEINE_LEVELS.flatMap((level) => {
        const group = caffeineGroups.find((candidate) => candidate.caffeineLevel === level);
        const count = typeof group?._count === 'object' ? (group._count._all ?? 0) : 0;
        return count > 0 ? [{ value: level, count }] : [];
      }),
      priceRange:
        priceRange._min.minPrice && priceRange._max.minPrice
          ? { min: toMoney(priceRange._min.minPrice), max: toMoney(priceRange._max.minPrice) }
          : null,
      attributes: attributeFacets,
    };

    return {
      items: products.map((product) =>
        toProductSummary(product, query.locale, now, stageImages.get(product.id)),
      ),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      facets,
    };
  }

  /** The first cut-out image of each product, for presentations that stage the product. */
  private async stageImages(productIds: string[]) {
    if (productIds.length === 0) return new Map<string, StageImageRow>();
    const images = await this.prisma.productImage.findMany({
      where: { productId: { in: productIds }, transparent: true },
      orderBy: [{ productId: 'asc' }, { position: 'asc' }],
      distinct: ['productId'],
    });
    return new Map(images.map((image) => [image.productId, image]));
  }

  /**
   * The current slug of a product or collection that was renamed, so links to the old address can
   * be redirected permanently. 404 when the slug never belonged to a visible entity.
   */
  async resolveRedirect(entity: 'PRODUCT' | 'COLLECTION', slug: string): Promise<{ slug: string }> {
    const redirect = await this.prisma.slugRedirect.findUnique({
      where: { entity_fromSlug: { entity, fromSlug: slug } },
      select: { toId: true },
    });
    const target = redirect
      ? entity === 'PRODUCT'
        ? await this.prisma.product.findFirst({
            where: { id: redirect.toId, ...visibleProductWhere() },
            select: { slug: true },
          })
        : await this.prisma.collection.findFirst({
            where: { id: redirect.toId, isActive: true },
            select: { slug: true },
          })
      : null;
    if (!target || target.slug === slug) throw ApiException.notFound('No redirect');
    return { slug: target.slug };
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
          AND: [
            PUBLIC_CATEGORY_WHERE,
            stockedCategoryWhere(),
            {
              translations: {
                some: {
                  locale: { in: localeChain(locale) },
                  name: { contains: q, mode: 'insensitive' },
                },
              },
            },
          ],
        },
        include: {
          translations: { where: { locale: { in: localeChain(locale) } } },
          parent: { select: { slug: true } },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        take: 4,
      }),
    ]);
    const now = new Date();
    return {
      products: products.map((product) => toProductSummary(product, locale, now)),
      categories: categories.map((category) => ({
        slug: category.slug,
        name: pickTranslation(category.translations, locale)?.name ?? category.slug,
        path: categoryPath(category),
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
      // Categories and collections with products only: an empty one is a "coming soon" page.
      this.prisma.category.findMany({
        where: { AND: [PUBLIC_CATEGORY_WHERE, stockedCategoryWhere()] },
        select: { slug: true, updatedAt: true, parent: { select: { slug: true } } },
      }),
      this.prisma.collection.findMany({
        where: { isActive: true, products: { some: { product: visibleProductWhere() } } },
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
      categories: categories.map((category) => ({
        ...toEntry(category),
        path: categoryPath(category),
      })),
      collections: collections.map(toEntry),
      articles: articles.map(toEntry),
    };
  }

  /** Every listing condition except the format and attribute filters (which have facets). */
  private baseConditions(query: ProductListQuery): Prisma.ProductWhereInput[] {
    const conditions: Prisma.ProductWhereInput[] = [visibleProductWhere()];
    if (query.category) {
      // A top-level category lists its own products and those of its subcategories.
      conditions.push({
        category: {
          AND: [
            PUBLIC_CATEGORY_WHERE,
            { OR: [{ slug: query.category }, { parent: { slug: query.category } }] },
          ],
        },
      });
    }
    if (query.collection) {
      conditions.push({
        collections: { some: { collection: { slug: query.collection, isActive: true } } },
      });
    }
    if (query.type) conditions.push({ productType: { key: query.type, isActive: true } });
    if (query.featured) conditions.push({ isFeatured: true });
    if (query.inStock)
      conditions.push({ variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } });
    if (query.minPrice !== undefined) conditions.push({ minPrice: { gte: query.minPrice } });
    if (query.maxPrice !== undefined) conditions.push({ minPrice: { lte: query.maxPrice } });
    if (query.q) conditions.push(this.searchWhere(normalizeSearchText(query.q), query.locale));
    return conditions;
  }

  private async resolveAttributeFilters(
    requested: ProductListQuery['attributes'],
  ): Promise<AttributeFilter[]> {
    const keys = Object.keys(requested ?? {});
    if (keys.length === 0) return [];
    const definitions = await this.prisma.attributeDefinition.findMany({
      where: {
        key: { in: keys },
        isFilterable: true,
        kind: { in: [...FILTERABLE_ATTRIBUTE_KINDS] },
      },
      orderBy: [{ productType: { position: 'asc' } }, { position: 'asc' }, { id: 'asc' }],
      select: { id: true, key: true, kind: true },
    });
    return parseAttributeFilters(requested, definitions);
  }

  /**
   * Filter options for the attributes of the products in a listing, with product counts. An
   * attribute that is being filtered on is counted without its own filter (one extra grouped
   * query per active attribute filter, at most ten).
   */
  private async attributeFacets(
    conditions: Prisma.ProductWhereInput[],
    filters: AttributeFilter[],
    locale: Locale,
  ): Promise<AttributeFacetDto[]> {
    const filteredIds = filters.flatMap((filter) => filter.attributeIds);
    const filterable = { isFilterable: true, kind: { in: [...FILTERABLE_ATTRIBUTE_KINDS] } };
    const countValues = (
      productWhere: Prisma.ProductWhereInput,
      attributeWhere: Prisma.AttributeDefinitionWhereInput,
    ) =>
      this.prisma.productAttributeValue.groupBy({
        by: ['attributeId', 'optionId', 'booleanValue'],
        where: { product: productWhere, attribute: { ...filterable, ...attributeWhere } },
        _count: { _all: true },
        _min: { numberValue: true },
        _max: { numberValue: true },
      });

    const groups = await Promise.all([
      countValues(
        { AND: [...conditions, ...filters.map(attributeFilterWhere)] },
        filteredIds.length > 0 ? { id: { notIn: filteredIds } } : {},
      ),
      ...filters.map((filter) =>
        countValues(
          {
            AND: [
              ...conditions,
              ...filters.filter((other) => other !== filter).map(attributeFilterWhere),
            ],
          },
          { id: { in: filter.attributeIds } },
        ),
      ),
    ]);
    const rows = groups.flat().map((group) => ({
      attributeId: group.attributeId,
      optionId: group.optionId,
      booleanValue: group.booleanValue,
      count: typeof group._count === 'object' ? (group._count._all ?? 0) : 0,
      min: group._min?.numberValue ?? null,
      max: group._max?.numberValue ?? null,
    }));

    const attributeIds = [...new Set([...rows.map((row) => row.attributeId), ...filteredIds])];
    if (attributeIds.length === 0) return [];
    const chain = localeChain(locale);
    const definitions = await this.prisma.attributeDefinition.findMany({
      where: { id: { in: attributeIds } },
      include: {
        translations: { where: { locale: { in: chain } } },
        productType: { select: { position: true } },
        options: { include: { translations: { where: { locale: { in: chain } } } } },
      },
    });
    return buildAttributeFacets(
      rows,
      definitions.map((definition) => ({
        id: definition.id,
        key: definition.key,
        kind: definition.kind,
        unit: definition.unit,
        position: definition.position,
        typePosition: definition.productType.position,
        translations: definition.translations,
        options: definition.options,
      })),
      filters,
      locale,
    );
  }

  /** Visible products per category id. */
  private async visibleProductCounts(): Promise<Map<string, number>> {
    const groups = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: visibleProductWhere(),
      _count: { _all: true },
      orderBy: { categoryId: 'asc' },
    });
    return new Map(
      groups.map((group) => [
        group.categoryId,
        typeof group._count === 'object' ? (group._count._all ?? 0) : 0,
      ]),
    );
  }

  private toCategoryDto(category: CategoryRow, productCount: number, locale: Locale): CategoryDto {
    const translation = pickTranslation(category.translations, locale);
    return {
      id: category.id,
      slug: category.slug,
      name: translation?.name ?? category.slug,
      description: translation?.description ?? null,
      illustrationKey: asIllustrationKey(category.illustrationKey),
      productCount,
      seoTitle: translation?.seoTitle ?? null,
      seoDescription: translation?.seoDescription ?? null,
      parentSlug: category.parent?.slug ?? null,
      path: categoryPath(category),
      body: translation?.body ?? null,
      position: category.position,
      image: coverImageDto(category, translation?.imageAlt ?? translation?.name ?? category.slug),
    };
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
