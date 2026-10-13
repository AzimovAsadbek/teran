import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  articleListQuerySchema,
  localeQuerySchema,
  slugSchema,
  type ArticleDetailDto,
  type ArticleSummaryDto,
  type LocaleQuery,
  type Paginated,
  type PublicSettingsDto,
} from '@teran/contracts';
import type { z } from 'zod';
import { ArticlesService } from './articles.service.js';
import { SettingsService } from './settings.service.js';

const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(
    private readonly settings: SettingsService,
    private readonly articles: ArticlesService,
  ) {}

  @Get('settings')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({
    summary: 'Public site settings: announcement bar and configured contact channels',
  })
  @ApiOkResponse({ description: 'PublicSettingsDto' })
  publicSettings(
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
  ): Promise<PublicSettingsDto> {
    return this.settings.getPublic(query.locale);
  }

  @Get('articles')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'Published journal articles' })
  @ApiOkResponse({ description: 'Paginated<ArticleSummaryDto>' })
  listArticles(
    @Query({ schema: articleListQuerySchema }) query: z.output<typeof articleListQuerySchema>,
  ): Promise<Paginated<ArticleSummaryDto>> {
    return this.articles.list(query.locale, query.page, query.pageSize);
  }

  @Get('articles/:slug')
  @Header('Cache-Control', PUBLIC_CACHE)
  @ApiOperation({ summary: 'One published journal article' })
  @ApiOkResponse({ description: 'ArticleDetailDto' })
  article(
    @Param('slug', { schema: slugSchema }) slug: string,
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
  ): Promise<ArticleDetailDto> {
    return this.articles.get(slug, query.locale);
  }
}
