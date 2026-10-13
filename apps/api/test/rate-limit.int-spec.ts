import request from 'supertest';
import type { TestApp } from './helpers/app.js';

const API = '/api/v1';
const INTERNAL_KEY = 'integration-only-internal-key-0123456789';

describe('rate limiting', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    // The shared test environment disables throttling; this file needs the production behaviour.
    // Configuration is read when the app module is first imported, hence the dynamic import.
    process.env.THROTTLE_DISABLED = 'false';
    process.env.INTERNAL_API_KEY = INTERNAL_KEY;
    const { createTestApp } = await import('./helpers/app.js');
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('limits each client IP but not the storefront server carrying the internal key', async () => {
    const server = ctx.app.getHttpServer();
    const path = `${API}/catalog/categories?locale=en`;

    for (let index = 0; index < 120; index++) {
      await request(server).get(path).expect(200);
    }
    const limited = await request(server).get(path).expect(429);
    expect(limited.body).toMatchObject({ code: 'RATE_LIMITED' });

    // Cached storefront loads serve every visitor from one IP, so they are exempt…
    await request(server).get(path).set('X-Internal-Key', INTERNAL_KEY).expect(200);
    // …but only with the exact key.
    await request(server).get(path).set('X-Internal-Key', `${INTERNAL_KEY}-guess`).expect(429);
  });
});
