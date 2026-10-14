/**
 * Serverless entry for Vercel (`api/index.js` re-exports it; see vercel.json). The Nest application
 * is created once per function instance and reused by later requests; configureApp applies exactly
 * the same HTTP set-up as main.ts. Scheduled jobs run through GET /api/v1/internal/jobs/run (Vercel
 * Cron), because a suspended function instance cannot keep timers.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { NestExpressApplication } from '@nestjs/platform-express';

// The API sets statement_timeout as a connection start-up parameter, which PgBouncer poolers refuse;
// use the database's direct address when the host provides one (Neon on Vercel does).
if (process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

type RequestListener = (request: IncomingMessage, response: ServerResponse) => void;

let server: Promise<RequestListener> | undefined;

async function createServer(): Promise<RequestListener> {
  // Loaded lazily, after the DATABASE_URL choice above.
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('./app.module.js');
  const { configureApp } = await import('./configure-app.js');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance() as RequestListener;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  server ??= createServer().catch((error: unknown) => {
    server = undefined; // let the next request try again
    throw error;
  });
  const listener = await server;
  listener(request, response);
}
