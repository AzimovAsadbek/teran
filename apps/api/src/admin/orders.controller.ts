import { Body, Controller, Get, Header, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminOrderListQuerySchema,
  orderStatusUpdateSchema,
  recordPaymentSchema,
  recordRefundSchema,
  type AdminOrderDetail,
  type AdminOrderListItem,
  type OrderStatusUpdateInput,
  type Paginated,
} from '@teran/contracts';
import { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminOrdersService } from './orders.service.js';

const orderNumberSchema = z.string().regex(/^TRN-[0-9A-Z]{8}$/);

@ApiTags('admin')
@Controller('admin/orders')
@RequireStaff()
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Orders, newest first; search by number, name, e-mail or phone' })
  @ApiOkResponse({ description: 'Paginated<AdminOrderListItem>' })
  list(
    @Query({ schema: adminOrderListQuerySchema }) query: z.output<typeof adminOrderListQuerySchema>,
  ): Promise<Paginated<AdminOrderListItem>> {
    return this.orders.list(query);
  }

  @Get(':number')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AdminOrderDetail' })
  get(@Param('number', { schema: orderNumberSchema }) number: string): Promise<AdminOrderDetail> {
    return this.orders.get(number);
  }

  @Post(':number/status')
  @ApiOperation({
    summary: 'Move the order to its next status',
    description:
      'Only transitions allowed by ORDER_STATUS_TRANSITIONS succeed; cancelling restocks the items.',
  })
  @ApiOkResponse({ description: 'AdminOrderDetail' })
  updateStatus(
    @Param('number', { schema: orderNumberSchema }) number: string,
    @Body({ schema: orderStatusUpdateSchema }) body: OrderStatusUpdateInput,
    @CurrentActor() actor: Actor,
  ): Promise<AdminOrderDetail> {
    return this.orders.updateStatus(number, body, actor);
  }

  @Post(':number/payments')
  @ApiOperation({ summary: 'Record that the cash payment was received' })
  @ApiOkResponse({ description: 'AdminOrderDetail' })
  recordPayment(
    @Param('number', { schema: orderNumberSchema }) number: string,
    @Body({ schema: recordPaymentSchema }) body: z.output<typeof recordPaymentSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<AdminOrderDetail> {
    return this.orders.recordPayment(number, body.note, actor);
  }

  @Post(':number/refunds')
  @ApiOperation({
    summary: 'Record that a paid order was refunded',
    description:
      'The refund itself is made in cash or in the provider cabinet (Click). Payme refunds arrive from Payme automatically.',
  })
  @ApiOkResponse({ description: 'AdminOrderDetail' })
  recordRefund(
    @Param('number', { schema: orderNumberSchema }) number: string,
    @Body({ schema: recordRefundSchema }) body: z.output<typeof recordRefundSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<AdminOrderDetail> {
    return this.orders.recordRefund(number, body.note, actor);
  }
}
