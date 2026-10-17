import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  demoPaymentActionSchema,
  paymentTokenQuerySchema,
  startPaymentSchema,
  type DemoPaymentDto,
  type PaymentReturnDto,
  type PaymentSessionDto,
} from '@teran/contracts';
import { z } from 'zod';
import { OptionalAuth } from '../auth/auth.guard.js';
import type { RequestAuth } from '../auth/auth.types.js';
import { CheckoutEnabledGuard } from '../orders/checkout-enabled.guard.js';
import { PaymentsService } from './payments.service.js';

const orderNumberSchema = z.string().regex(/^TRN-[0-9A-Z]{8}$/);

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:number/payments')
  @UseGuards(CheckoutEnabledGuard)
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Start (or restart) the online payment of an order that still awaits payment',
    description:
      'Allowed for the signed-in owner or with the guest order token. Returns where to send the customer; ' +
      'the order is only marked paid when the provider confirms it to the API.',
  })
  @ApiOkResponse({ description: 'PaymentSessionDto' })
  start(
    @Param('number', { schema: orderNumberSchema }) number: string,
    @Body({ schema: startPaymentSchema }) body: z.output<typeof startPaymentSchema>,
    @OptionalAuth() auth: RequestAuth | null,
  ): Promise<PaymentSessionDto> {
    return this.payments.startPayment(number, body, auth);
  }

  @Get('payments/return')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Payment state for the page a customer returns to from a payment page' })
  @ApiOkResponse({ description: 'PaymentReturnDto' })
  returnInfo(
    @Query({ schema: paymentTokenQuerySchema }) query: z.output<typeof paymentTokenQuerySchema>,
  ): Promise<PaymentReturnDto> {
    return this.payments.returnInfo(query.token);
  }

  @Get('payments/demo')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Demonstration payment page data (demo mode only; no money moves)' })
  @ApiOkResponse({ description: 'DemoPaymentDto' })
  demo(
    @Query({ schema: paymentTokenQuerySchema }) query: z.output<typeof paymentTokenQuerySchema>,
  ): Promise<DemoPaymentDto> {
    return this.payments.demoView(query.token);
  }

  @Post('payments/demo')
  @UseGuards(CheckoutEnabledGuard)
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Apply a simulated outcome on the demonstration payment page (demo mode only)',
  })
  @ApiOkResponse({ description: 'DemoPaymentDto' })
  demoAction(
    @Body({ schema: demoPaymentActionSchema }) body: z.output<typeof demoPaymentActionSchema>,
  ): Promise<DemoPaymentDto> {
    return this.payments.demoAction(body.token, body.outcome);
  }
}
