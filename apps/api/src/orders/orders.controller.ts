import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  orderLookupQuerySchema,
  paginationQuerySchema,
  type OrderDto,
  type Paginated,
  type PaginationQuery,
} from '@teran/contracts';
import { z } from 'zod';
import { CurrentAuth, RequireAuth } from '../auth/auth.guard.js';
import type { RequestAuth } from '../auth/auth.types.js';
import { OrdersService } from './orders.service.js';

const orderNumberSchema = z.string().regex(/^TRN-[0-9A-Z]{8}$/);

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders/:number')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Guest order status, authorised by the secret token from the order confirmation link',
  })
  @ApiOkResponse({ description: 'OrderDto' })
  guestOrder(
    @Param('number', { schema: orderNumberSchema }) number: string,
    @Query({ schema: orderLookupQuerySchema }) query: z.output<typeof orderLookupQuerySchema>,
  ): Promise<OrderDto> {
    return this.orders.findForGuest(number, query.token);
  }

  @Get('account/orders')
  @RequireAuth()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: "The signed-in customer's orders" })
  @ApiOkResponse({ description: 'Paginated<OrderDto>' })
  myOrders(
    @CurrentAuth() auth: RequestAuth,
    @Query({ schema: paginationQuerySchema }) query: PaginationQuery,
  ): Promise<Paginated<OrderDto>> {
    return this.orders.listForCustomer(auth.userId, query.page, Math.min(query.pageSize, 20));
  }

  @Get('account/orders/:number')
  @RequireAuth()
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'One order of the signed-in customer' })
  @ApiOkResponse({ description: 'OrderDto' })
  myOrder(
    @CurrentAuth() auth: RequestAuth,
    @Param('number', { schema: orderNumberSchema }) number: string,
  ): Promise<OrderDto> {
    return this.orders.findForCustomer(auth.userId, number);
  }
}
