import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { MediaFilmsService } from './admin/media-films.service.js';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import type { Env } from './config/env.js';

async function bootstrap(): Promise<void> {
  // bodyParser is registered explicitly in configureApp (JSON only, with a size limit).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  configureApp(app);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const host = config.get('HOST', { infer: true });
  const port = config.get('PORT', { infer: true });
  await app.listen(port, host);
  // The one line that says the API is up, and how it is set up (the payment mode has its own).
  new Logger('Bootstrap').log(
    {
      env: config.get('NODE_ENV', { infer: true }),
      media: config.get('R2_PUBLIC_URL', { infer: true }) ? 'r2' : 'volume',
      films: await app.get(MediaFilmsService).mode(),
      mail: config.get('MAIL_TRANSPORT', { infer: true }),
      telegram: config.get('TELEGRAM_MODE', { infer: true }),
      checkout: config.get('CHECKOUT_ENABLED', { infer: true }),
    },
    `TERAN API listening on http://${host}:${port}`,
  );
}

await bootstrap();
