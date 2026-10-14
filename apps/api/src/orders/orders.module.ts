import { Module } from '@nestjs/common';
import { CartController } from '../cart/cart.controller.js';
import { CartService } from '../cart/cart.service.js';
import { DeliveryService } from '../delivery/delivery.service.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { CheckoutController } from './checkout.controller.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

/** Cart, delivery pricing and order placement: the purchase journey kept in one module. */
@Module({
  imports: [PaymentsModule],
  controllers: [CartController, CheckoutController, OrdersController],
  providers: [CartService, DeliveryService, OrdersService],
  exports: [CartService, DeliveryService, OrdersService],
})
export class OrdersModule {}
