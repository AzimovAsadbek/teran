import { Body, Controller, Get, Header, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminSimpleListQuerySchema,
  announcementSettingSchema,
  articleUpsertSchema,
  contactSettingSchema,
  deliveryMethodUpsertSchema,
  idSchema,
  type AdminArticle,
  type AdminDeliveryMethod,
  type AnnouncementSetting,
  type ContactSetting,
  type Paginated,
} from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import type { SettingValues } from '../content/settings.service.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminContentService } from './content.service.js';

type DeliveryPayload = z.output<typeof deliveryMethodUpsertSchema>;
type ArticlePayload = z.output<typeof articleUpsertSchema>;

@ApiTags('admin')
@Controller('admin')
@RequireStaff()
export class AdminContentController {
  constructor(private readonly content: AdminContentService) {}

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
}
