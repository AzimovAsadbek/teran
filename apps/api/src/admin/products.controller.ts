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
  adminProductListQuerySchema,
  idSchema,
  imageAltInputSchema,
  imageReorderSchema,
  localeQuerySchema,
  productUpsertSchema,
  type AdminProductDetail,
  type AdminProductListItem,
  type LocaleQuery,
  type Paginated,
  type ProductDetailDto,
  type ProductUpsertPayload,
} from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { ApiException } from '../common/errors/api-exception.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminProductsService } from './products.service.js';

@ApiTags('admin')
@Controller('admin/products')
@RequireStaff()
export class AdminProductsController {
  constructor(private readonly products: AdminProductsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Search and list products (all statuses)' })
  @ApiOkResponse({ description: 'Paginated<AdminProductListItem>' })
  list(
    @Query({ schema: adminProductListQuerySchema })
    query: z.output<typeof adminProductListQuerySchema>,
  ): Promise<Paginated<AdminProductListItem>> {
    return this.products.list(query);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminProductDetail' })
  get(@Param('id', { schema: idSchema }) id: string): Promise<AdminProductDetail> {
    return this.products.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product with its translations and variants' })
  @ApiOkResponse({ description: 'AdminProductDetail' })
  create(
    @Body({ schema: productUpsertSchema }) body: ProductUpsertPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminProductDetail> {
    return this.products.create(body, actor);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a product',
    description:
      'Variants missing from the payload are deactivated (never deleted). Stock changes go through inventory adjustments.',
  })
  @ApiOkResponse({ description: 'AdminProductDetail' })
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: productUpsertSchema }) body: ProductUpsertPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminProductDetail> {
    return this.products.update(id, body, actor);
  }

  @Get(':id/preview')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'The product as its storefront page shows it, drafts included' })
  @ApiOkResponse({ description: 'ProductDetailDto' })
  preview(
    @Param('id', { schema: idSchema }) id: string,
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
  ): Promise<ProductDetailDto> {
    return this.products.preview(id, query.locale);
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a product image (JPEG, PNG, WebP or AVIF)',
    description:
      'The image is decoded, stripped of metadata and re-encoded to WebP at fixed widths.',
  })
  @ApiOkResponse({ description: 'AdminProductDetail' })
  addImage(
    @Param('id', { schema: idSchema }) id: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<AdminProductDetail> {
    if (!file) throw ApiException.badRequest('BAD_REQUEST', 'Attach an image in the "file" field');
    return this.products.addImage(id, file.buffer, actor);
  }

  @Put(':id/images/order')
  @ApiOkResponse({ description: 'AdminProductDetail' })
  reorderImages(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: imageReorderSchema }) body: z.output<typeof imageReorderSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<AdminProductDetail> {
    return this.products.reorderImages(id, body.imageIds, actor);
  }

  @Post(':id/images/:imageId/file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Replace an image file, keeping its position and alternative text',
  })
  @ApiOkResponse({ description: 'AdminProductDetail' })
  replaceImage(
    @Param('id', { schema: idSchema }) id: string,
    @Param('imageId', { schema: idSchema }) imageId: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<AdminProductDetail> {
    if (!file) throw ApiException.badRequest('BAD_REQUEST', 'Attach an image in the "file" field');
    return this.products.replaceImage(id, imageId, file.buffer, actor);
  }

  @Put(':id/images/:imageId/alt')
  @ApiOperation({ summary: "Set an image's alternative text per language" })
  @ApiOkResponse({ description: 'AdminProductDetail' })
  updateImageAlt(
    @Param('id', { schema: idSchema }) id: string,
    @Param('imageId', { schema: idSchema }) imageId: string,
    @Body({ schema: imageAltInputSchema }) body: z.output<typeof imageAltInputSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<AdminProductDetail> {
    return this.products.updateImageAlt(id, imageId, body, actor);
  }

  @Delete(':id/images/:imageId')
  @ApiOkResponse({ description: 'AdminProductDetail' })
  deleteImage(
    @Param('id', { schema: idSchema }) id: string,
    @Param('imageId', { schema: idSchema }) imageId: string,
    @CurrentActor() actor: Actor,
  ): Promise<AdminProductDetail> {
    return this.products.deleteImage(id, imageId, actor);
  }
}
