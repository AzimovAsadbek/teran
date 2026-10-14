import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';
import { AddressesService } from './addresses.service.js';

/** The signed-in customer's account area: overview, orders, purchases, addresses and security. */
@Module({
  imports: [OrdersModule],
  controllers: [AccountController],
  providers: [AccountService, AddressesService],
})
export class AccountModule {}
