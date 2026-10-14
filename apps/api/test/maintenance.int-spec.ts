import request from 'supertest';
import { sha256 } from '../src/common/crypto.js';
import { MaintenanceService } from '../src/maintenance/maintenance.service.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import { createUser, resetDatabase } from './helpers/fixtures.js';
import { TEST_ENV } from './test-env.js';

describe('maintenance', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  it('removes expired sessions and carts and spent reset tokens, keeping live ones', async () => {
    const user = await createUser(ctx.prisma, 'CUSTOMER', 'tidy@example.com');
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60 * 60_000);
    await ctx.prisma.session.createMany({
      data: [
        { userId: user.id, tokenHash: sha256('session-expired'), expiresAt: past },
        { userId: user.id, tokenHash: sha256('session-live'), expiresAt: future },
      ],
    });
    await ctx.prisma.cart.createMany({
      data: [
        { tokenHash: sha256('cart-expired'), expiresAt: past },
        { tokenHash: sha256('cart-live'), expiresAt: future },
      ],
    });
    await ctx.prisma.passwordResetToken.createMany({
      data: [
        { userId: user.id, tokenHash: sha256('reset-expired'), expiresAt: past },
        { userId: user.id, tokenHash: sha256('reset-used'), expiresAt: future, usedAt: past },
        { userId: user.id, tokenHash: sha256('reset-live'), expiresAt: future },
      ],
    });

    const removed = await ctx.app.get(MaintenanceService).purgeExpired();

    expect(removed).toEqual({ sessions: 1, carts: 1, resetTokens: 2 });
    const remaining = async () => ({
      sessions: (await ctx.prisma.session.findMany()).map((row) => row.tokenHash),
      carts: (await ctx.prisma.cart.findMany()).map((row) => row.tokenHash),
      resetTokens: (await ctx.prisma.passwordResetToken.findMany()).map((row) => row.tokenHash),
    });
    expect(await remaining()).toEqual({
      sessions: [sha256('session-live')],
      carts: [sha256('cart-live')],
      resetTokens: [sha256('reset-live')],
    });
    // Nothing left to remove: a second run is a no-op.
    expect(await ctx.app.get(MaintenanceService).purgeExpired()).toEqual({
      sessions: 0,
      carts: 0,
      resetTokens: 0,
    });
  });

  it('runs the scheduled jobs on request, only with the cron secret', async () => {
    const user = await createUser(ctx.prisma, 'CUSTOMER', 'cron@example.com');
    await ctx.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: sha256('session-old'),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const server = ctx.app.getHttpServer();
    const path = '/api/v1/internal/jobs/run';

    // Without the secret the route does not exist.
    await request(server).get(path).expect(404);
    await request(server).get(path).set('Authorization', 'Bearer not-the-secret').expect(404);
    expect(await ctx.prisma.session.count()).toBe(1);

    const ran = await request(server)
      .get(path)
      .set('Authorization', `Bearer ${TEST_ENV.CRON_SECRET}`)
      .expect(200);
    expect(ran.body).toEqual({
      payments: { expired: 0, cancelledOrders: 0 },
      purged: { sessions: 1, carts: 0, resetTokens: 0 },
    });
    expect(await ctx.prisma.session.count()).toBe(0);
  });
});
