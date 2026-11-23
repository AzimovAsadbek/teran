import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { createUser, TEST_PASSWORD } from './fixtures.js';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export interface TestApp {
  app: NestExpressApplication;
  prisma: PrismaService;
  close: () => Promise<void>;
}

/** Boots the real application exactly like main.ts (same middleware, guards, pipes, filters). */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    bufferLogs: true,
  });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), close: () => app.close() };
}

export async function signInShopper(
  ctx: TestApp,
  browser = request.agent(ctx.app.getHttpServer()),
) {
  const customer = await createUser(ctx.prisma);
  await browser
    .post('/api/v1/auth/login')
    .send({ email: customer.email, password: TEST_PASSWORD })
    .expect(200);
  return browser;
}
