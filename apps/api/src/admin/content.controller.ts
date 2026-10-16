import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminSimpleListQuerySchema,
  announcementSettingSchema,
  articleUpsertSchema,
  contactSettingSchema,
  deliveryMethodUpsertSchema,
  idSchema,
  localeQuerySchema,
  type AdminArticle,
  type ArticleDetailDto,
  type AdminDeliveryMethod,
  type AnnouncementSetting,
  type ContactSetting,
  type LocaleQuery,
  type Paginated,
} from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { ApiException } from '../common/errors/api-exception.js';
import { ArticlesService } from '../content/articles.service.js';
import type { SettingValues } from '../content/settings.service.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminContentService } from './content.service.js';

type DeliveryPayload = z.output<typeof deliveryMethodUpsertSchema>;
type ArticlePayload = z.output<typeof articleUpsertSchema>;

@ApiTags('admin')
@Controller('admin')
@RequireStaff()
export class AdminContentController {
  constructor(
    private readonly content: AdminContentService,
    private readonly articlesPublic: ArticlesService,
  ) {}

  @Get('settings')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: '{ announcement, contact }' })
  settings(): Promise<SettingValues> {
    return this.content.getSettings();
  }

  @Put('settings/announcement')
  @RequireStaff(['ADMIN'])
  @ApiOperation({ summary: 'Storefront announcement bar (administrators only)' })
  updateAnnouncement(
    @Body({ schema: announcementSettingSchema }) body: AnnouncementSetting,
    @CurrentActor() actor: Actor,
  ): Promise<SettingValues> {
    return this.content.updateSetting('announcement', body, actor);
  }

  @Put('settings/contact')
  @RequireStaff(['ADMIN'])
  @ApiOperation({
    summary: 'Public contact details (administrators only; shown only when filled in)',
  })
  updateContact(
    @Body({ schema: contactSettingSchema }) body: ContactSetting,
    @CurrentActor() actor: Actor,
  ): Promise<SettingValues> {
    return this.content.updateSetting('contact', body, actor);
  }

  @Get('delivery-methods')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminDeliveryMethod[]' })
  deliveryMethods(): Promise<AdminDeliveryMethod[]> {
    return this.content.deliveryMethods();
  }

  @Post('delivery-methods')
  @RequireStaff(['ADMIN'])
  @ApiOkResponse({ description: 'AdminDeliveryMethod' })
  createDeliveryMethod(
    @Body({ schema: deliveryMethodUpsertSchema }) body: DeliveryPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminDeliveryMethod> {
    return this.content.saveDeliveryMethod(null, body, actor);
  }

  @Put('delivery-methods/:id')
  @RequireStaff(['ADMIN'])
  @ApiOkResponse({ description: 'AdminDeliveryMethod' })
  updateDeliveryMethod(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: deliveryMethodUpsertSchema }) body: DeliveryPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminDeliveryMethod> {
    return this.content.saveDeliveryMethod(id, body, actor);
  }

  @Get('articles')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'Paginated<AdminArticle>' })
  articles(
    @Query({ schema: adminSimpleListQuerySchema })
    query: z.output<typeof adminSimpleListQuerySchema>,
  ): Promise<Paginated<AdminArticle>> {
    return this.content.articles(query);
  }

  @Get('articles/:id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminArticle' })
  article(@Param('id', { schema: idSchema }) id: string): Promise<AdminArticle> {
    return this.content.article(id);
  }

  @Get('articles/:id/preview')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'The article as its storefront page shows it, drafts included' })
  @ApiOkResponse({ description: 'ArticleDetailDto' })
  articlePreview(
    @Param('id', { schema: idSchema }) id: string,
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
  ): Promise<ArticleDetailDto> {
    return this.articlesPublic.preview(id, query.locale);
  }

  @Post('articles')
  @ApiOkResponse({ description: 'AdminArticle' })
  createArticle(
    @Body({ schema: articleUpsertSchema }) body: ArticlePayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminArticle> {
    return this.content.saveArticle(null, body, actor);
  }

  @Put('articles/:id')
  @ApiOkResponse({ description: 'AdminArticle' })
  updateArticle(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: articleUpsertSchema }) body: ArticlePayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminArticle> {
    return this.content.saveArticle(id, body, actor);
  }

  @Post('articles/:id/cover')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Set the cover picture (JPEG, PNG, WebP or AVIF)' })
  @ApiOkResponse({ description: 'AdminArticle' })
  setArticleCover(
    @Param('id', { schema: idSchema }) id: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<AdminArticle> {
    if (!file) throw ApiException.badRequest('BAD_REQUEST', 'Attach an image in the "file" field');
    return this.content.setArticleCover(id, file.buffer, actor);
  }

  @Delete('articles/:id/cover')
  @ApiOperation({ summary: 'Remove the cover picture (not while the article is published)' })
  @ApiOkResponse({ description: 'AdminArticle' })
  removeArticleCover(
    @Param('id', { schema: idSchema }) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<AdminArticle> {
    return this.content.removeArticleCover(id, actor);
  }
}
