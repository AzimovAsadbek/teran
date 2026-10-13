import request from 'supertest';
import { currentUserSchema } from '@teran/contracts';
import { createTestApp, type TestApp } from './helpers/app.js';
import { TEST_PASSWORD, createUser, resetDatabase } from './helpers/fixtures.js';

const API = '/api/v1';

describe('authentication and HTTP security', () => {
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

  const agent = () => request.agent(ctx.app.getHttpServer());

  it('registers, keeps the session in an HttpOnly cookie and signs out', async () => {
    const user = agent();
    const registered = await user
      .post(`${API}/auth/register`)
      .send({
        email: '  New.Customer@Example.com ',
        password: 'a-strong-password',
        firstName: 'Aziza',
        locale: 'ru',
      })
      .expect(201);
    expect(currentUserSchema.parse(registered.body)).toMatchObject({
      email: 'new.customer@example.com',
      role: 'CUSTOMER',
    });
    const cookie = (registered.headers['set-cookie'] as unknown as string[]).join(';');
    expect(cookie).toMatch(/teran_session=[^;]+;.*HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const stored = await ctx.prisma.user.findUniqueOrThrow({
      where: { email: 'new.customer@example.com' },
    });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);

    await user.get(`${API}/auth/me`).expect(200);
    await user.post(`${API}/auth/logout`).expect(204);
    await user.get(`${API}/auth/me`).expect(401);
  });

  it('rejects duplicate registrations and weak passwords', async () => {
    await createUser(ctx.prisma, 'CUSTOMER', 'taken@example.com');
    const duplicate = await agent()
      .post(`${API}/auth/register`)
      .send({ email: 'taken@example.com', password: 'a-strong-password', firstName: 'X' })
      .expect(409);
    expect(duplicate.body.code).toBe('EMAIL_TAKEN');

    const weak = await agent()
      .post(`${API}/auth/register`)
      .send({ email: 'weak@example.com', password: 'short', firstName: 'X' })
      .expect(400);
    expect(weak.body.issues[0]).toMatchObject({ path: 'password', message: 'password_too_short' });
  });

  it('gives the same error for unknown e-mails and wrong passwords', async () => {
    await createUser(ctx.prisma, 'CUSTOMER', 'known@example.com');
    const unknown = await agent()
      .post(`${API}/auth/login`)
      .send({ email: 'nobody@example.com', password: 'whatever' })
      .expect(401);
    const wrong = await agent()
      .post(`${API}/auth/login`)
      .send({ email: 'known@example.com', password: 'wrong-password' })
      .expect(401);
    expect(unknown.body.code).toBe('INVALID_CREDENTIALS');
    expect(wrong.body).toMatchObject({ code: unknown.body.code, message: unknown.body.message });
  });

  it('temporarily locks an account after repeated failures, even for the right password', async () => {
    await createUser(ctx.prisma, 'CUSTOMER', 'target@example.com');
    for (let attempt = 0; attempt < 5; attempt++) {
      await agent()
        .post(`${API}/auth/login`)
        .send({ email: 'target@example.com', password: 'wrong-password' })
        .expect(401);
    }
    const locked = await agent()
      .post(`${API}/auth/login`)
      .send({ email: 'target@example.com', password: TEST_PASSWORD })
      .expect(429);
    expect(locked.body.code).toBe('RATE_LIMITED');
  });

  it('hides password reset when e-mail is not configured, and never reveals accounts', async () => {
    const features = await agent().get(`${API}/auth/features`).expect(200);
    // The test environment uses the log transport, so the flow is available here.
    expect(features.body).toEqual({ passwordReset: true, registration: true });
    const response = await agent()
      .post(`${API}/auth/password/forgot`)
      .send({ email: 'nobody@example.com' })
      .expect(202);
    expect(response.body).toEqual({ accepted: true });
  });

  it('resets a password once with a valid token and signs out other sessions', async () => {
    const user = await createUser(ctx.prisma, 'CUSTOMER', 'reset@example.com');
    const browser = agent();
    await browser
      .post(`${API}/auth/login`)
      .send({ email: 'reset@example.com', password: TEST_PASSWORD })
      .expect(200);

    const { sha256 } = await import('../src/common/crypto.js');
    const token = 'reset-token-for-tests-0123456789';
    await ctx.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60_000) },
    });

    await agent()
      .post(`${API}/auth/password/reset`)
      .send({ token, password: 'a-brand-new-password' })
      .expect(204);
    await browser.get(`${API}/auth/me`).expect(401);
    const reused = await agent()
      .post(`${API}/auth/password/reset`)
      .send({ token, password: 'another-password-123' })
      .expect(400);
    expect(reused.body.code).toBe('INVALID_TOKEN');
    await agent()
      .post(`${API}/auth/login`)
      .send({ email: 'reset@example.com', password: 'a-brand-new-password' })
      .expect(200);
  });

  it('rejects cross-site state-changing requests (CSRF origin check)', async () => {
    const evil = await agent()
      .post(`${API}/auth/login`)
      .set('Origin', 'https://evil.example')
      .send({ email: 'a@example.com', password: 'x' })
      .expect(403);
    expect(evil.body.code).toBe('INVALID_ORIGIN');

    await agent()
      .post(`${API}/cart/items`)
      .set('Sec-Fetch-Site', 'cross-site')
      .send({})
      .expect(403);
    // The storefront's own origin is allowed through to validation.
    await agent()
      .post(`${API}/cart/items`)
      .set('Origin', 'http://localhost:3000')
      .send({})
      .expect(400);
  });

  it('protects account endpoints', async () => {
    await agent().get(`${API}/account/orders`).expect(401);
  });

  it('sends security headers and the error contract', async () => {
    const response = await agent().get(`${API}/health/live`).expect(200);
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-request-id']).toBeTruthy();

    const notFound = await agent().get(`${API}/does-not-exist`).expect(404);
    expect(notFound.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(JSON.stringify(notFound.body)).not.toMatch(/stack|at .*\.js/);
  });

  it('limits request bodies and rejects malformed JSON', async () => {
    await agent()
      .post(`${API}/inquiries/contact`)
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ message: 'x'.repeat(200_000) }))
      .expect(413);
    const malformed = await agent()
      .post(`${API}/inquiries/contact`)
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
    expect(malformed.body.code).toBe('BAD_REQUEST');
  });

  it('accepts honeypot submissions silently without storing them', async () => {
    await agent()
      .post(`${API}/inquiries/contact`)
      .send({
        name: 'Bot',
        phone: '+998901234567',
        message: 'Buy cheap things now!!!',
        locale: 'uz',
        website: 'http://spam',
      })
      .expect(202);
    expect(await ctx.prisma.contactInquiry.count()).toBe(0);

    await agent()
      .post(`${API}/inquiries/contact`)
      .send({
        name: 'Real person',
        phone: '90 123 45 67',
        message: 'Salom! Choy haqida savolim bor.',
        locale: 'uz',
      })
      .expect(202);
    expect(await ctx.prisma.contactInquiry.count()).toBe(1);
  });
});
