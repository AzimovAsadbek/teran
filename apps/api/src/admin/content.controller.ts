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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminSimpleListQuerySchema,
  announcementSettingSchema,
  articleUpsertSchema,
  contactSettingSchema,
  deliveryMethodUpsertSchema,
  idSchema,
  localeQuerySchema,
  storeGeocodeQuerySchema,
  storesSettingSchema,
  visualSlotSchema,
  type AdminArticle,
  type ArticleDetailDto,
  type AdminDeliveryMethod,
  type AnnouncementSetting,
  type ContactSetting,
  type LocaleQuery,
  type Paginated,
  type StoreGeocodeDto,
  type StoreGeocodeQuery,
  type StoresSetting,
} from '@teran/contracts';
import { Throttle } from '@nestjs/throttler';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { ApiException } from '../common/errors/api-exception.js';
import { ArticlesService } from '../content/articles.service.js';
import type { SettingValues } from '../content/settings.service.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminContentService } from './content.service.js';
import { GeocodeService } from './geocode.service.js';

type DeliveryPayload = z.output<typeof deliveryMethodUpsertSchema>;
type ArticlePayload = z.output<typeof articleUpsertSchema>;

@ApiTags('admin')
@Controller('admin')
@RequireStaff()
export class AdminContentController {
  constructor(
    private readonly content: AdminContentService,
    private readonly articlesPublic: ArticlesService,
    private readonly geocode: GeocodeService,
  ) {}

  @Get('settings')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: '{ announcement, contact, visuals }' })
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

  @Put('settings/stores')
  @RequireStaff(['ADMIN'])
  @ApiOperation({
    summary: 'Points of sale on the store locator (administrators only; active ones are shown)',
  })
  updateStores(
    @Body({ schema: storesSettingSchema }) body: StoresSetting,
    @CurrentActor() actor: Actor,
  ): Promise<SettingValues> {
    return this.content.updateSetting('stores', body, actor);
  }

  @Get('settings/stores/geocode')
  @RequireStaff(['ADMIN'])
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: "Find a store's address on the map (OpenStreetMap; administrators only)",
  })
  geocodeStore(
    @Query({ schema: storeGeocodeQuerySchema }) query: StoreGeocodeQuery,
  ): Promise<StoreGeocodeDto> {
    return this.geocode.find(query.q, query.locale);
  }

  @Post('settings/visuals/:slot')
  @RequireStaff(['ADMIN'])
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'mobile', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Set the picture of a place on the storefront ("file"; optional taller "mobile" crop and "source")',
  })
  setVisual(
    @Param('slot') slot: string,
    @UploadedFiles() files: { file?: { buffer: Buffer }[]; mobile?: { buffer: Buffer }[] },
    @Body() body: { source?: unknown },
    @CurrentActor() actor: Actor,
  ): Promise<SettingValues> {
    const image = files?.file?.[0]?.buffer;
    if (!image) throw ApiException.badRequest('BAD_REQUEST', 'Attach an image in the "file" field');
    const source =
      typeof body?.source === 'string' && body.source.trim()
        ? body.source.trim().slice(0, 500)
        : null;
    return this.content.setVisual(
      visualSlot(slot),
      { image, mobile: files?.mobile?.[0]?.buffer ?? null },
      source,
      actor,
    );
  }

  @Post('settings/visuals/:slot/mobile')
  @RequireStaff(['ADMIN'])
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Set the taller phone crop of a place that has a picture ("file")' })
  setVisualMobile(
    @Param('slot') slot: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<SettingValues> {
    if (!file) throw ApiException.badRequest('BAD_REQUEST', 'Attach an image in the "file" field');
    return this.content.setVisualMobile(visualSlot(slot), file.buffer, actor);
  }

  @Delete('settings/visuals/:slot/mobile')
  @RequireStaff(['ADMIN'])
  @ApiOperation({ summary: 'Remove the phone crop of a place (the main picture is used)' })
  removeVisualMobile(
    @Param('slot') slot: string,
    @CurrentActor() actor: Actor,
  ): Promise<SettingValues> {
    return this.content.setVisualMobile(visualSlot(slot), null, actor);
  }

  @Delete('settings/visuals/:slot')
  @RequireStaff(['ADMIN'])
  @ApiOperation({ summary: 'Remove the picture of a place (TERAN artwork is shown again)' })
  removeVisual(@Param('slot') slot: string, @CurrentActor() actor: Actor): Promise<SettingValues> {
    return this.content.removeVisual(visualSlot(slot), actor);
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

/** A page-picture place from the address, or a 400 for an unknown one. */
function visualSlot(slot: string): string {
  const place = visualSlotSchema.safeParse(slot);
  if (!place.success) {
    throw ApiException.badRequest('BAD_REQUEST', 'Unknown picture place', {
      reason: 'invalid_visual_slot',
    });
  }
  return place.data;
}
