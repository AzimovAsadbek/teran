import { mkdirSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { Env } from './config/env.js';
import { createOriginCheckMiddleware } from './common/security/origin-check.middleware.js';
import { createValidationPipe } from './common/validation/validation-pipe.js';
import { providerBodyReader } from './payments/provider-body.middleware.js';

export const API_PREFIX = 'api';
const DOCS_PATH = `${API_PREFIX}/docs`;
const JSON_BODY_LIMIT = '100kb';

/**
 * Applies HTTP-level configuration shared by the real server and integration tests,
 * so tests exercise the same security headers, limits, validation and routing.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const allowedOrigins = [
    config.get('WEB_ORIGIN', { infer: true }),
    ...config.get('CORS_EXTRA_ORIGINS', { infer: true }),
  ];

  app.useLogger(app.get(Logger));
  app.set('trust proxy', config.get('TRUST_PROXY_HOPS', { infer: true }));

  // JSON API responses never need to load anything; Swagger UI needs its own scripts and styles.
  const apiHelmet = helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  });
  const docsHelmet = helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  });
  app.use((request: Request, response: Response, next: NextFunction) =>
    request.path.startsWith(`/${DOCS_PATH}`)
      ? docsHelmet(request, response, next)
      : apiHelmet(request, response, next),
  );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });
  app.use(cookieParser());
  // Payment provider callbacks read their own bodies first (Payme JSON-RPC, Click form data); the
  // JSON parser then skips them. See payments/provider-body.middleware.ts.
  app.use(`/${API_PREFIX}/v1/payments/payme`, providerBodyReader('json'));
  app.use(`/${API_PREFIX}/v1/payments/click`, providerBodyReader('form'));
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.use(createOriginCheckMiddleware(allowedOrigins));

  // Uploaded images are stored under random, content-specific keys, so they can be cached forever.
  const uploadsDir = resolve(config.get('UPLOADS_DIR', { infer: true }));
  mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads/',
    index: false,
    dotfiles: 'deny',
    immutable: true,
    maxAge: '365d',
    setHeaders: (response: ServerResponse) =>
      response.setHeader('X-Content-Type-Options', 'nosniff'),
  });

  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const document = new DocumentBuilder()
      .setTitle('TERAN API')
      .setDescription(
        'REST API for the TERAN tea storefront and administration. Authentication uses an HttpOnly session cookie; ' +
          'state-changing requests from browsers must originate from the storefront origin.',
      )
      .setVersion('1')
      .addCookieAuth(
        config.get('COOKIE_SECURE', { infer: true }) ? '__Host-teran_session' : 'teran_session',
      )
      .build();
    SwaggerModule.setup(DOCS_PATH, app, () => SwaggerModule.createDocument(app, document), {
      jsonDocumentUrl: `${DOCS_PATH}/openapi.json`,
    });
  }
}
