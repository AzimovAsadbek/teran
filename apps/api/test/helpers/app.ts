import type { NestExpressApplication } from '@nestjs/platform-express';
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
