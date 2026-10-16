import { Controller, Get, Header, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  idSchema,
  paginationQuerySchema,
  type AdminTelegramPost,
  type AdminTelegramPostList,
  type PaginationQuery,
  type TelegramPreview,
} from '@teran/contracts';
import { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { TelegramService } from '../telegram/telegram.service.js';

const entityParamSchema = z
  .enum(['product', 'article'])
  .transform((value) => (value === 'product' ? ('PRODUCT' as const) : ('ARTICLE' as const)));

/** Telegram announcements: delivery history, retry of failed posts and previews. */
@ApiTags('admin')
@Controller('admin/telegram')
@RequireStaff()
export class AdminTelegramController {
  constructor(private readonly telegram: TelegramService) {}

  @Get('posts')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminTelegramPostList, newest first, with the channel settings' })
  list(
    @Query({ schema: paginationQuerySchema }) query: PaginationQuery,
  ): Promise<AdminTelegramPostList> {
    return this.telegram.list(query.page, query.pageSize);
  }

  @Post('posts/:id/retry')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a failed post again (a delivered post is never resent)' })
  retry(@Param('id', { schema: idSchema }) id: string): Promise<AdminTelegramPost> {
    return this.telegram.retry(id);
  }

  @Get('preview/:entity/:id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'What would be posted for a product or an article; sends nothing' })
  preview(
    @Param('entity', { schema: entityParamSchema }) entity: 'PRODUCT' | 'ARTICLE',
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<TelegramPreview> {
    return this.telegram.preview(entity, id);
  }
}
