import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import { AccountModule } from './account/account.module.js';
import { AdminModule } from './admin/admin.module.js';
import { validateEnv, type Env } from './config/env.js';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { loggerParams } from './common/logging/logger-params.js';
import { isInternalRequest } from './common/security/internal-request.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { SessionMiddleware } from './auth/session.middleware.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { ContentModule } from './content/content.module.js';
import { CoreModule } from './core/core.module.js';
import { HealthModule } from './health/health.module.js';
import { InquiriesModule } from './inquiries/inquiries.module.js';
import { MaintenanceModule } from './maintenance/maintenance.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    LoggerModule.forRootAsync({ inject: [ConfigService], useFactory: loggerParams }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
        skipIf: (context) =>
          config.get('THROTTLE_DISABLED', { infer: true }) ||
          isInternalRequest(
            context.switchToHttp().getRequest<IncomingMessage>(),
            config.get('INTERNAL_API_KEY', { infer: true }),
          ),
      }),
    }),
    PrismaModule,
    CoreModule,
    HealthModule,
    CatalogModule,
    ReviewsModule,
    ContentModule,
    OrdersModule,
    PaymentsModule,
    AuthModule,
    AccountModule,
    InquiriesModule,
    AdminModule,
    MaintenanceModule,
  ],
  providers: [
    // Order matters: rate limiting runs before authorization.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SessionMiddleware).forRoutes('{*splat}');
  }
}
