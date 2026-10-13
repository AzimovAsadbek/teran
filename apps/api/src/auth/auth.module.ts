import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [OrdersModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
