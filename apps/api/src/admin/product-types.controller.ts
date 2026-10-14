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
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { idSchema, productTypeUpsertSchema, type AdminProductType } from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminProductTypesService } from './product-types.service.js';

type ProductTypePayload = z.output<typeof productTypeUpsertSchema>;

@ApiTags('admin')
@Controller('admin/product-types')
@RequireStaff()
export class AdminProductTypesController {
  constructor(private readonly productTypes: AdminProductTypesService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminProductType[]' })
  list(): Promise<AdminProductType[]> {
    return this.productTypes.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create a product type with its attribute definitions' })
  @ApiOkResponse({ description: 'AdminProductType' })
  create(
    @Body({ schema: productTypeUpsertSchema }) body: ProductTypePayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminProductType> {
    return this.productTypes.create(body, actor);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Replace a product type and its attribute list',
    description: 'Attributes and options used by products cannot be removed or change kind.',
  })
  @ApiOkResponse({ description: 'AdminProductType' })
  update(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: productTypeUpsertSchema }) body: ProductTypePayload,
    @CurrentActor() actor: Actor,
  ): Promise<AdminProductType> {
    return this.productTypes.update(id, body, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', { schema: idSchema }) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    return this.productTypes.remove(id, actor);
  }
}
