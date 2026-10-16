import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { idSchema, taxonomyUpsertSchema, type AdminTaxonomy } from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { ApiException } from '../common/errors/api-exception.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminTaxonomyService } from './taxonomy.service.js';

type TaxonomyPayload = z.output<typeof taxonomyUpsertSchema>;

@ApiTags('admin')
@Controller('admin/categories')
@RequireStaff()
export class AdminCategoriesController {
  constructor(private readonly taxonomy: AdminTaxonomyService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminTaxonomy[]' })
  list(): Promise<AdminTaxonomy[]> {
    return this.taxonomy.list('category');
  }

  @Post()
  @ApiOkResponse({ description: 'AdminTaxonomy' })
  create(
    @Body({ schema: taxonomyUpsertSchema }) body: TaxonomyPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminTaxonomy> {
    return this.taxonomy.create('category', body, actor);
  }

  @Put(':id')
  @ApiOkResponse({ description: 'AdminTaxonomy' })
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: taxonomyUpsertSchema }) body: TaxonomyPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminTaxonomy> {
    return this.taxonomy.update('category', id, body, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', { schema: idSchema }) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    return this.taxonomy.remove('category', id, actor);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Set the cover picture (JPEG, PNG, WebP or AVIF)' })
  @ApiOkResponse({ description: 'AdminTaxonomy' })
  setImage(
    @Param('id', { schema: idSchema }) id: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<AdminTaxonomy> {
    if (!file) throw ApiException.badRequest('BAD_REQUEST', 'Attach an image in the "file" field');
    return this.taxonomy.setImage('category', id, file.buffer, actor);
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Remove the cover picture (a neutral visual is shown instead)' })
  @ApiOkResponse({ description: 'AdminTaxonomy' })
  removeImage(
    @Param('id', { schema: idSchema }) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<AdminTaxonomy> {
    return this.taxonomy.removeImage('category', id, actor);
  }
}

@ApiTags('admin')
@Controller('admin/collections')
@RequireStaff()
export class AdminCollectionsController {
  constructor(private readonly taxonomy: AdminTaxonomyService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminTaxonomy[]' })
  list(): Promise<AdminTaxonomy[]> {
    return this.taxonomy.list('collection');
  }

  @Post()
  @ApiOkResponse({ description: 'AdminTaxonomy' })
  create(
    @Body({ schema: taxonomyUpsertSchema }) body: TaxonomyPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminTaxonomy> {
    return this.taxonomy.create('collection', body, actor);
  }

  @Put(':id')
  @ApiOkResponse({ description: 'AdminTaxonomy' })
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: taxonomyUpsertSchema }) body: TaxonomyPayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminTaxonomy> {
    return this.taxonomy.update('collection', id, body, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', { schema: idSchema }) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    return this.taxonomy.remove('collection', id, actor);
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Set the cover picture (JPEG, PNG, WebP or AVIF)' })
  @ApiOkResponse({ description: 'AdminTaxonomy' })
  setImage(
    @Param('id', { schema: idSchema }) id: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<AdminTaxonomy> {
    if (!file) throw ApiException.badRequest('BAD_REQUEST', 'Attach an image in the "file" field');
    return this.taxonomy.setImage('collection', id, file.buffer, actor);
  }

  @Delete(':id/image')
  @ApiOperation({ summary: 'Remove the cover picture (a neutral visual is shown instead)' })
  @ApiOkResponse({ description: 'AdminTaxonomy' })
  removeImage(
    @Param('id', { schema: idSchema }) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<AdminTaxonomy> {
    return this.taxonomy.removeImage('collection', id, actor);
  }
}
