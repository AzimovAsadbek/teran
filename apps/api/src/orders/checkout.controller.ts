import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  checkoutQuoteSchema,
  checkoutSchema,
  localeQuerySchema,
  type CheckoutOptionsDto,
  type CheckoutPayload,
  type CheckoutQuoteDto,
  type CheckoutQuoteInput,
  type LocaleQuery,
  type PlacedOrderDto,
} from '@teran/contracts';
import type { Request } from 'express';
import { DeliveryService } from '../delivery/delivery.service.js';
import { PaymentConfig } from '../payments/payment-config.js';
import { OrdersService } from './orders.service.js';

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly orders: OrdersService,
    private readonly delivery: DeliveryService,
    private readonly payments: PaymentConfig,
  ) {}

  @Get('options')
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({ summary: 'Delivery and payment methods currently offered' })
  @ApiOkResponse({ description: 'CheckoutOptionsDto' })
  async options(
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
  ): Promise<CheckoutOptionsDto> {
    return {
      deliveryMethods: await this.delivery.listActive(query.locale),
      paymentMethods: this.payments.selectableMethods(),
      paymentOptions: this.payments.options(),
      onlinePaymentWindowMinutes: this.payments.windowMinutes,
    };
  }

  @Get('quote')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Server-calculated totals for the current cart and a delivery choice' })
  @ApiOkResponse({ description: 'CheckoutQuoteDto' })
  quote(
    @Req() request: Request,
    @Query({ schema: checkoutQuoteSchema }) query: CheckoutQuoteInput,
  ): Promise<CheckoutQuoteDto> {
    return this.orders.quote(request, query);
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Place an order from the current cart',
    description:
      'Prices, stock, delivery fee and totals are recalculated on the server. Repeating a request with the same ' +
      'idempotencyKey returns the original order instead of creating a duplicate.',
  })
  @ApiOkResponse({ description: 'PlacedOrderDto' })
  place(
    @Req() request: Request,
    @Body({ schema: checkoutSchema }) body: CheckoutPayload,
  ): Promise<PlacedOrderDto> {
    return this.orders.placeOrder(request, body);
  }
}
