import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  categoryPathQuerySchema,
  localeQuerySchema,
  productListQuerySchema,
  searchSuggestQuerySchema,
  slugSchema,
  type CategoryDto,
  type CategoryPageDto,
  type CollectionDto,
  type LocaleQuery,
  type ProductDetailDto,
  type ProductListDto,
  type ProductListQuery,
  type ProductSummaryDto,
  type SearchSuggestionsDto,
  type SitemapEntriesDto,
} from '@teran/contracts';
import { z } from 'zod';
import { CatalogService } from './catalog.service.js';

const redirectEntitySchema = z.enum(['products', 'collections']);

/** Catalogue responses are identical for every visitor, so short shared caching is safe. */
const PUBLIC_CACHE = 'public, max-age=30, stale-while-revalidate=120';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary:
      'Public categories (top-level ones followed by their subcategories) with product counts',
  })
  @ApiOkResponse({ description: 'CategoryDto[]' })
  categories(@Query({ schema: localeQuerySchema }) query: LocaleQuery): Promise<CategoryDto[]> {
    return this.catalog.listCategories(query.locale);
  }

  @Get('category-page')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'A category page by its path, or the current path when the address has changed',
  })
  @ApiOkResponse({ description: 'CategoryPageDto' })
  categoryPage(
    @Query({ schema: categoryPathQuerySchema }) query: z.output<typeof categoryPathQuerySchema>,
  ): Promise<CategoryPageDto> {
    return this.catalog.getCategoryPage(query.path, query.locale);
  }

  @Get('redirects/:entity/:slug')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Current slug of a renamed product or collection (for permanent redirects)',
  })
  @ApiOkResponse({ description: '{ slug: string }' })
  redirect(
    @Param('entity', { schema: redirectEntitySchema })
    entity: z.output<typeof redirectEntitySchema>,
    @Param('slug', { schema: slugSchema }) slug: string,
  ): Promise<{ slug: string }> {
    return this.catalog.resolveRedirect(entity === 'products' ? 'PRODUCT' : 'COLLECTION', slug);
  }

  @Get('collections')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Active curated collections' })
  @ApiOkResponse({ description: 'CollectionDto[]' })
  collections(@Query({ schema: localeQuerySchema }) query: LocaleQuery): Promise<CollectionDto[]> {
    return this.catalog.listCollections(query.locale);
  }

  @Get('products')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Search, filter, sort and paginate visible products' })
  @ApiOkResponse({ description: 'ProductListDto' })
  products(
    @Query({ schema: productListQuerySchema }) query: ProductListQuery,
  ): Promise<ProductListDto> {
    return this.catalog.listProducts(query);
  }

  @Get('products/:slug')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Product detail with all active pack sizes' })
  @ApiOkResponse({ description: 'ProductDetailDto' })
  product(
    @Param('slug', { schema: slugSchema }) slug: string,
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
  ): Promise<ProductDetailDto> {
    return this.catalog.getProduct(slug, query.locale);
  }

  @Get('products/:slug/related')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Products related to a product (same category first)' })
  @ApiOkResponse({ description: 'ProductSummaryDto[]' })
  related(
    @Param('slug', { schema: slugSchema }) slug: string,
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
  ): Promise<ProductSummaryDto[]> {
    return this.catalog.getRelatedProducts(slug, query.locale);
  }

  @Get('search/suggest')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Instant search suggestions (products and categories)' })
  @ApiOkResponse({ description: 'SearchSuggestionsDto' })
  suggest(
    @Query({ schema: searchSuggestQuerySchema }) query: z.output<typeof searchSuggestQuerySchema>,
  ): Promise<SearchSuggestionsDto> {
    return this.catalog.suggest(query.q, query.locale);
  }

  @Get('sitemap')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Slugs and modification dates of every public catalogue page' })
  @ApiOkResponse({ description: 'SitemapEntriesDto' })
  sitemap(): Promise<SitemapEntriesDto> {
    return this.catalog.sitemapEntries();
  }
}
