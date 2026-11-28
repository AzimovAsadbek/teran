import request from 'supertest';
import { IdentityProviders } from '../src/auth/identity-providers.js';
import { sha256 } from '../src/common/crypto.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import { createUser, resetDatabase, TEST_PASSWORD } from './helpers/fixtures.js';
import { captureVerificationMail, registration } from './helpers/verification.js';
const root = '/api/v1/auth';
describe('customer verification and connected identities', () => {
  let ctx: TestApp;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(async () => {
    await ctx.close();
  });
  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetDatabase(ctx.prisma);
  });
  const agent = () => request.agent(ctx.app.getHttpServer());
  const confirm = (b: ReturnType<typeof agent>, id: string, code: string) =>
    b.post(root + '/verification/confirm').send({ id, code });
  const start = (b: ReturnType<typeof agent>, body: object) =>
    b.post(root + '/verification/start').send(body);
  async function login(email: string) {
    const b = agent();
    await b
      .post(root + '/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    return b;
  }
  it('binds the challenge to the browser and permits exactly one concurrent verification', async () => {
    const email = 'race@example.test',
      mail = captureVerificationMail(ctx),
      b = agent();
    const c = (await start(b, registration(email)).expect(202)).body;
    expect(await ctx.prisma.user.count()).toBe(0);
    const code = mail.codeFor(email);
    expect(code).toMatch(/^\d{6}$/);
    expect(
      (await ctx.prisma.authChallenge.findUniqueOrThrow({ where: { id: c.id } })).codeHash,
    ).not.toBe(code);
    await confirm(agent(), c.id, code).expect(400);
    const results = await Promise.all([confirm(b, c.id, code), confirm(b, c.id, code)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    await confirm(b, c.id, code).expect(400);
    expect(await ctx.prisma.user.count()).toBe(1);
    expect(await ctx.prisma.session.count()).toBe(1);
    const u = (await b.get(root + '/me').expect(200)).body;
    expect(u).toMatchObject({ email, role: 'CUSTOMER', phone: '+998901234567' });
  });
  it('limits resends, caps wrong guesses, invalidates old codes, and enforces expiry', async () => {
    const email = 'limit@example.test',
      body = registration(email),
      mail = captureVerificationMail(ctx),
      b = agent();
    const c = (await start(b, body).expect(202)).body,
      code = mail.codeFor(email);
    await start(b, body).expect(429);
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await confirm(b, c.id, wrong).expect(400);
    await confirm(b, c.id, code).expect(400);
    await ctx.prisma.authChallenge.update({
      where: { id: c.id },
      data: { createdAt: new Date(Date.now() - 61_000) },
    });
    const next = (await start(b, body).expect(202)).body;
    await confirm(b, c.id, code).expect(400);
    await ctx.prisma.authChallenge.update({
      where: { id: next.id },
      data: { expiresAt: new Date(0) },
    });
    await confirm(b, next.id, mail.codeFor(email)).expect(400);
    expect(await ctx.prisma.user.count()).toBe(0);
  });
  it('returns the same login envelope for unknown accounts and sends only to a verified customer', async () => {
    const mail = captureVerificationMail(ctx),
      b = agent(),
      email = 'known@example.test';
    const u = await createUser(ctx.prisma, 'CUSTOMER', email);
    await ctx.prisma.user.update({ where: { id: u.id }, data: { emailVerifiedAt: new Date() } });
    const send = (address: string) =>
      start(b, { purpose: 'LOGIN', channel: 'EMAIL', locale: 'uz', email: address });
    const unknown = (await send('absent@example.test').expect(202)).body;
    const known = (await send(email).expect(202)).body;
    expect(Object.keys(unknown).sort()).toEqual(Object.keys(known).sort());
    await vi.waitFor(() => expect(mail.delivery).toHaveBeenCalledTimes(1));
    await confirm(b, known.id, mail.codeFor(email)).expect(200);
    expect((await b.get(root + '/me')).body.id).toBe(u.id);
  });
  it('never activates a customer when the email transport fails', async () => {
    const mail = captureVerificationMail(ctx);
    mail.delivery.mockRejectedValue(new Error('SMTP error'));
    await start(agent(), registration('failed@example.test')).expect(503);
    expect(await ctx.prisma.user.count()).toBe(0);
    expect(await ctx.prisma.authChallenge.count({ where: { consumedAt: null } })).toBe(0);
  });
  function telegram() {
    const providers = ctx.app.get(IdentityProviders);
    vi.spyOn(providers, 'telegram', 'get').mockReturnValue(true);
    vi.spyOn(providers, 'telegramLink').mockImplementation(
      (link) => 'https://t.me/teran_test_bot?start=' + link,
    );
    vi.spyOn(providers, 'verifyWebhook').mockImplementation((secret) => secret === 'test-webhook');
    return vi.spyOn(providers, 'telegramMessage').mockResolvedValue();
  }
  function update(message: unknown, secret = 'test-webhook') {
    return agent()
      .post(root + '/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', secret)
      .send({ message });
  }
  function privateMessage(text: string, id = 175104) {
    return { from: { id }, chat: { id, type: 'private' }, text };
  }
  it('delivers Telegram OTP only to the private numeric identity and keeps unverified email separate', async () => {
    const delivery = telegram(),
      b = agent(),
      body = { ...registration('contact@example.test'), channel: 'TELEGRAM' };
    const c = (await start(b, body).expect(202)).body,
      token = new URL(c.telegramUrl).searchParams.get('start')!;
    const m = privateMessage('/start ' + token);
    const status = root + '/verification/' + c.id + '/telegram-status';
    await b.get(status).expect(200, { state: 'waiting' });
    await agent().get(status).expect(400);
    await update(m, 'different').expect(403);
    await update({ ...m, chat: { id: m.chat.id, type: 'group' } }).expect(200);
    await update(privateMessage('/start ' + 'x'.repeat(43))).expect(200);
    expect(delivery).not.toHaveBeenCalled();
    await update(m).expect(200);
    await update(m).expect(200);
    await b.get(status).expect(200, { state: 'opened' });
    expect(delivery).toHaveBeenCalledTimes(1);
    await confirm(b, c.id, delivery.mock.calls[0]![2]!).expect(200);
    await b.get(status).expect(200, { state: 'ended' });
    const user = await ctx.prisma.user.findFirstOrThrow({ include: { identities: true } });
    expect(user).toMatchObject({
      email: null,
      contactEmail: 'contact@example.test',
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      identities: [{ provider: 'TELEGRAM', subject: '175104' }],
    });
    await b.delete(root + '/connections/TELEGRAM').expect(409);
    const other = agent();
    const auth = (
      await start(other, { purpose: 'LOGIN', channel: 'TELEGRAM', locale: 'en' }).expect(202)
    ).body;
    await update(
      privateMessage('/start ' + new URL(auth.telegramUrl).searchParams.get('start')),
    ).expect(200);
    await confirm(other, auth.id, delivery.mock.calls[1]![2]!).expect(200);
    expect((await other.get(root + '/me')).body.id).toBe(user.id);
  });
  it('requires the contact of the same Telegram user to change a phone', async () => {
    const delivered = telegram(),
      u = await createUser(ctx.prisma),
      b = await login(u.email);
    const c = (
      await start(b, {
        purpose: 'PHONE_CHANGE',
        channel: 'TELEGRAM',
        phone: '+998901112233',
        locale: 'en',
      }).expect(202)
    ).body;
    const msg = privateMessage('/start ' + new URL(c.telegramUrl).searchParams.get('start'));
    await update(msg).expect(200);
    const contact = (user_id: number, phone_number: string) => ({
      ...msg,
      text: undefined,
      contact: { user_id, phone_number },
    });
    await update(contact(msg.from.id + 1, '998901112233')).expect(200);
    await update(contact(msg.from.id, '998901112234')).expect(200);
    expect(delivered).toHaveBeenCalledTimes(1);
    await update(contact(msg.from.id, '998901112233')).expect(200);
    await confirm(b, c.id, delivered.mock.calls[1]![2]!).expect(200);
    expect(
      (await ctx.prisma.user.findUniqueOrThrow({ where: { id: u.id } })).phoneVerifiedAt,
    ).toBeInstanceOf(Date);
  });
  it('invalidates the challenge if the bot cannot deliver', async () => {
    const delivery = telegram();
    delivery.mockRejectedValue(new Error('blocked'));
    const b = agent();
    const c = (
      await start(b, { ...registration('tg@example.test'), channel: 'TELEGRAM' }).expect(202)
    ).body;
    await update(
      privateMessage('/start ' + new URL(c.telegramUrl).searchParams.get('start')),
    ).expect(200);
    expect(await ctx.prisma.authChallenge.count({ where: { id: c.id, consumedAt: null } })).toBe(0);
    await b
      .get(root + '/verification/' + c.id + '/telegram-status')
      .expect(200, { state: 'ended' });
  });
  function google(email: string) {
    const p = ctx.app.get(IdentityProviders);
    vi.spyOn(p, 'google', 'get').mockReturnValue(true);
    vi.spyOn(p, 'googleUrl').mockImplementation(
      (state) => 'https://accounts.google.com/o/oauth2/v2/auth?state=' + state,
    );
    return vi.spyOn(p, 'googleIdentity').mockResolvedValue({
      subject: 'test-google-subject',
      email,
      firstName: 'Aziza',
      lastName: 'T',
    });
  }
  async function begin(b: ReturnType<typeof agent>, purpose = 'LOGIN') {
    const r = await b
      .post(root + '/google/start')
      .send({ purpose, next: '/checkout', locale: 'en' })
      .expect(200);
    return new URL(r.body.url).searchParams.get('state')!;
  }
  const callback = (b: ReturnType<typeof agent>, state: string) =>
    b.get(root + '/google/callback').query({ state, code: 'verified-by-test-issuer' });
  it('binds Google state to the browser, collects the missing profile and refuses callback replay', async () => {
    const proof = google('google@example.test'),
      b = agent(),
      state = await begin(b);
    expect((await callback(agent(), state)).headers.location).toContain('authError=invalid');
    expect(proof).not.toHaveBeenCalled();
    const landing = new URL((await callback(b, state).expect(303)).headers.location!);
    const id = landing.searchParams.get('google')!;
    await b.get(root + '/google/profile/' + id).expect(200);
    expect(await ctx.prisma.user.count()).toBe(0);
    await b
      .post(root + '/google/profile/' + id)
      .send({ firstName: 'Aziza', lastName: 'T', phone: '+998901234567' })
      .expect(200);
    await b.get(root + '/google/profile/' + id).expect(400);
    expect((await callback(b, state)).headers.location).toContain('authError=invalid');
    const b2 = agent();
    expect((await callback(b2, await begin(b2))).headers.location).toBe(
      'http://localhost:3000/en/checkout',
    );
    expect(await ctx.prisma.user.count()).toBe(1);
  });
  it('requires explicit linking to a matching Google email and recent sign-in for account changes', async () => {
    const u = await createUser(ctx.prisma);
    google(u.email);
    const stranger = agent();
    expect((await callback(stranger, await begin(stranger))).headers.location).toContain(
      'authError=link',
    );
    const b = await login(u.email);
    await callback(b, await begin(b, 'LINK')).expect(303);
    expect((await b.get(root + '/connections')).body.google).toBe(true);
    await ctx.prisma.session.updateMany({
      where: { userId: u.id },
      data: { createdAt: new Date(Date.now() - 20 * 60_000) },
    });
    await b.delete(root + '/connections/GOOGLE').expect(403);
  });
  it('rotates the opaque session, preserves expiry and revokes both credentials on sign-out', async () => {
    const u = await createUser(ctx.prisma),
      b = await login(u.email);
    const before = await ctx.prisma.session.findFirstOrThrow();
    const rotated = await b.post(root + '/session/refresh').expect(204);
    const cookie = (rotated.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    const after = await ctx.prisma.session.findFirstOrThrow();
    expect(after.tokenHash).toBe(sha256(cookie.split('=')[1]!));
    expect(after.previousTokenHash).toBe(before.tokenHash);
    expect(after.expiresAt).toEqual(before.expiresAt);
    await b.get(root + '/me').expect(200);
    await b.post(root + '/logout').expect(204);
    await agent()
      .get(root + '/me')
      .set('Cookie', cookie)
      .expect(401);
  });
});
