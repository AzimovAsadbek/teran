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
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { idSchema, taxonomyUpsertSchema, type AdminTaxonomy } from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
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
}
