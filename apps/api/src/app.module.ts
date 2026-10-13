import { randomUUID } from 'node:crypto';
import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import { validateEnv, type Env } from './config/env.js';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import { isInternalRequest, redactUrl } from './common/security/internal-request.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { SessionMiddleware } from './auth/session.middleware.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { ContentModule } from './content/content.module.js';
import { CoreModule } from './core/core.module.js';
import { HealthModule } from './health/health.module.js';
import { InquiriesModule } from './inquiries/inquiries.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

/** Reuses a well-formed X-Request-Id from the proxy so logs correlate end to end. */
function requestId(request: IncomingMessage): string {
  const header = request.headers['x-request-id'];
  return typeof header === 'string' && REQUEST_ID_PATTERN.test(header) ? header : randomUUID();
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isDevelopment = config.get('NODE_ENV', { infer: true }) === 'development';
        return {
          pinoHttp: {
            level: config.get('LOG_LEVEL', { infer: true }),
            genReqId: (request, response) => {
              const id = requestId(request);
              response.setHeader('X-Request-Id', id);
              return id;
            },
            // Never log credentials, session/cart cookies or personal data sent in bodies.
            redact: {
              paths: [
                'req.headers.cookie',
                'req.headers.authorization',
                'res.headers["set-cookie"]',
              ],
              remove: true,
            },
            serializers: {
              req: (request: { id: string; method: string; url: string }) => ({
                id: request.id,
                method: request.method,
                url: redactUrl(request.url),
              }),
              res: (response: { statusCode: number }) => ({ statusCode: response.statusCode }),
            },
            autoLogging: { ignore: (request) => request.url?.includes('/health/') ?? false },
            transport: isDevelopment
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          },
        };
      },
    }),
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
    ContentModule,
    OrdersModule,
    AuthModule,
    InquiriesModule,
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
