import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  idSchema,
  inventoryAdjustmentSchema,
  inventoryListQuerySchema,
  paginationQuerySchema,
  type AdminInventoryMovement,
  type AdminInventoryRow,
  type InventoryAdjustmentInput,
  type Paginated,
  type PaginationQuery,
} from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminInventoryService } from './inventory.service.js';

@ApiTags('admin')
@Controller('admin/inventory')
@RequireStaff()
export class AdminInventoryController {
  constructor(private readonly inventory: AdminInventoryService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Stock per variant (lowest first); lowStockOnly=true for the reorder list',
  })
  @ApiOkResponse({ description: 'Paginated<AdminInventoryRow>' })
  list(
    @Query({ schema: inventoryListQuerySchema }) query: z.output<typeof inventoryListQuerySchema>,
  ): Promise<Paginated<AdminInventoryRow>> {
    return this.inventory.list(query);
  }

  @Post(':variantId/adjustments')
  @ApiOperation({ summary: 'Restock, correct or return stock (recorded in the ledger)' })
  @ApiOkResponse({ description: 'AdminInventoryRow' })
  adjust(
    @Param('variantId', { schema: idSchema }) variantId: string,
    @Body({ schema: inventoryAdjustmentSchema }) body: InventoryAdjustmentInput,
    @CurrentActor() actor: Actor,
  ): Promise<AdminInventoryRow> {
    return this.inventory.adjust(variantId, body, actor);
  }

  @Get(':variantId/movements')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'Paginated<AdminInventoryMovement>' })
  movements(
    @Param('variantId', { schema: idSchema }) variantId: string,
    @Query({ schema: paginationQuerySchema }) query: PaginationQuery,
  ): Promise<Paginated<AdminInventoryMovement>> {
    return this.inventory.movements(variantId, query.page, Math.min(query.pageSize, 50));
  }
}
