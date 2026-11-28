import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

import { IdentityContext } from './identity-context.js';
import { IdentityProviders } from './identity-providers.js';
import { VerificationController } from './verification.controller.js';
import { VerificationService } from './verification.service.js';
import { GoogleSignInService } from './google-sign-in.service.js';

@Module({
  imports: [OrdersModule],
  controllers: [AuthController, VerificationController],
  providers: [
    AuthService,
    IdentityContext,
    IdentityProviders,
    VerificationService,
    GoogleSignInService,
  ],
})
export class AuthModule {}
