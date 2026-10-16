import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import type {
  AdminArticle,
  AdminProductDetail,
  AdminTelegramPost,
  AdminTelegramPostList,
  ArticleUpsertInput,
  ProductUpsertInput,
  TelegramPreview,
} from '@teran/contracts';
import type { TelegramService } from '../src/telegram/telegram.service.js';
import type { TestApp } from './helpers/app.js';
import { TEST_PASSWORD, createCategory, createUser, resetDatabase } from './helpers/fixtures.js';
import { testImage } from './helpers/publishing.js';

const API = '/api/v1';
const TOKEN = '1234567890:AAH-test_token_never_shown_anywhere_000';
const ENV_KEYS = [
  'TELEGRAM_MODE',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHANNEL_ID',
  'TELEGRAM_API_BASE',
];

interface Call {
  method: string;
  path: string;
  contentType: string;
  body: Buffer;
}

/**
 * Configuration is read when the application module is first loaded, so each suite sets its
 * environment and then loads a fresh copy of the application.
 */
async function freshApp(): Promise<{ ctx: TestApp; service: () => TelegramService }> {
  vi.resetModules();
  const { createTestApp } = await import('./helpers/app.js');
  const { TelegramService: Service } = await import('../src/telegram/telegram.service.js');
  const ctx = await createTestApp();
  return { ctx, service: () => ctx.app.get(Service) };
}

/** A stand-in for the Bot API: records every call and answers as scripted. */
function mockTelegram() {
  const calls: Call[] = [];
  const replies: { status: number; body: unknown }[] = [];
  let nextId = 100;
  const server: Server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      calls.push({
        method: (req.url ?? '').split('/').pop() ?? '',
        path: req.url ?? '',
        contentType: req.headers['content-type'] ?? '',
        body: Buffer.concat(chunks),
      });
      const reply = replies.shift() ?? {
        status: 200,
        body: { ok: true, result: { message_id: nextId++ } },
      };
      res.writeHead(reply.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });
  return { server, calls, replies };
}

function product(
  categoryId: string,
  overrides: Partial<ProductUpsertInput> = {},
): ProductUpsertInput {
  return {
    slug: 'channel-tea',
    status: 'DRAFT',
    categoryId,
    format: 'LOOSE_LEAF',
    isFeatured: false,
    caffeineLevel: null,
    brewTempCelsius: 85,
    brewTimeMinSeconds: 120,
    brewTimeMaxSeconds: 180,
    brewAmountGrams: 5,
    illustrationKey: null,
    collectionIds: [],
    translations: {
      uz: { name: 'Kanal choyi', shortDescription: 'Yengil va xushboʻy yashil choy.' },
      ru: null,
      en: null,
    },
    variants: [
      {
        sku: 'TG-100',
        weightGrams: 100,
        unitCount: null,
        price: '79000',
        compareAtPrice: null,
        lowStockThreshold: 2,
        barcode: null,
        isActive: true,
        initialStock: 5,
      },
      {
        sku: 'TG-250',
        weightGrams: 250,
        unitCount: null,
        price: '159000',
        compareAtPrice: null,
        lowStockThreshold: 2,
        barcode: null,
        isActive: true,
        initialStock: 5,
      },
    ],
    ...overrides,
  };
}

describe('Telegram announcements', () => {
  describe('live mode (against a mock Bot API)', () => {
    let ctx: TestApp;
    let telegramService: () => TelegramService;
    const telegram = mockTelegram();

    beforeAll(async () => {
      await new Promise<void>((resolve) => telegram.server.listen(0, '127.0.0.1', resolve));
      const { port } = telegram.server.address() as AddressInfo;
      Object.assign(process.env, {
        TELEGRAM_MODE: 'live',
        TELEGRAM_BOT_TOKEN: TOKEN,
        TELEGRAM_CHANNEL_ID: '@teran_test_channel',
        TELEGRAM_API_BASE: `http://127.0.0.1:${port}`,
      });
      ({ ctx, service: telegramService } = await freshApp());
    });

    afterAll(async () => {
      await ctx.close();
      await new Promise<void>((resolve) => telegram.server.close(() => resolve()));
      for (const key of ENV_KEYS) delete process.env[key];
    });

    beforeEach(async () => {
      await resetDatabase(ctx.prisma);
      telegram.calls.length = 0;
      telegram.replies.length = 0;
    });

    const server = () => ctx.app.getHttpServer();

    async function admin() {
      const user = await createUser(ctx.prisma, 'MANAGER');
      const agent = request.agent(server());
      await agent
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      return agent;
    }

    async function pictured(agent: request.Agent, categoryId: string): Promise<AdminProductDetail> {
      const draft = (
        await agent
          .post(`${API}/admin/products`)
          .send(product(categoryId, { announceOnTelegram: true }))
          .expect(201)
      ).body as AdminProductDetail;
      await agent
        .post(`${API}/admin/products/${draft.id}/images`)
        .attach('file', await testImage(420, 12), { filename: 'tea.png', contentType: 'image/png' })
        .expect(201);
      return draft;
    }

    function publish(draft: AdminProductDetail, categoryId: string, overrides = {}) {
      return product(categoryId, {
        status: 'ACTIVE',
        announceOnTelegram: true,
        variants: product(categoryId).variants.map((variant, index) => ({
          ...variant,
          id: draft.variants[index]!.id,
        })),
        ...overrides,
      });
    }

    it('announces a product once it is published, with its picture, real price and link', async () => {
      const agent = await admin();
      const category = await createCategory(ctx.prisma, 'green-tea');
      const draft = await pictured(agent, category.id);
      // A draft is never announced, whatever its switch says.
      expect(telegram.calls).toHaveLength(0);

      const preview = (
        await agent.get(`${API}/admin/telegram/preview/product/${draft.id}`).expect(200)
      ).body as TelegramPreview;
      expect(preview).toMatchObject({ mode: 'live', eligible: false, blockers: ['not_published'] });

      const published = (
        await agent
          .put(`${API}/admin/products/${draft.id}`)
          .send(publish(draft, category.id))
          .expect(200)
      ).body as AdminProductDetail;
      expect(published.telegram).toMatchObject({ status: 'SENT', dryRun: false, canRetry: false });
      expect(telegram.calls.map((call) => call.method)).toEqual(['sendPhoto']);
      const [call] = telegram.calls;
      expect(call!.path).toBe(`/bot${TOKEN}/sendPhoto`);
      const form = call!.body.toString('latin1');
      expect(form).toContain('@teran_test_channel');
      expect(Buffer.from(form, 'latin1').toString('utf8')).toContain('Kanal choyi');
      expect(Buffer.from(form, 'latin1').toString('utf8')).toContain('79 000 soʻmdan');
      expect(form).toContain('http://localhost:3000/products/channel-tea');
      // The photo is a JPEG made from the stored renditions.
      expect(call!.body.includes(Buffer.from([0xff, 0xd8, 0xff]))).toBe(true);

      // Saved again: the same item is never announced twice.
      await agent
        .put(`${API}/admin/products/${draft.id}`)
        .send(publish(draft, category.id))
        .expect(200);
      expect(telegram.calls).toHaveLength(1);

      const history = (await agent.get(`${API}/admin/telegram/posts`).expect(200))
        .body as AdminTelegramPostList;
      expect(history).toMatchObject({ mode: 'live', channel: '@teran_test_channel', total: 1 });
      expect(history.items[0]).toMatchObject({
        entityType: 'PRODUCT',
        entityTitle: 'Kanal choyi',
        status: 'SENT',
        messageIds: ['100'],
      });
      // The token never leaves the server.
      expect(JSON.stringify(history)).not.toContain(TOKEN);
      expect(JSON.stringify(published)).not.toContain(TOKEN);
    });

    it('does not announce products whose switch is off (nothing is posted automatically)', async () => {
      const agent = await admin();
      const category = await createCategory(ctx.prisma, 'black-tea');
      const draft = await pictured(agent, category.id);
      await agent
        .put(`${API}/admin/products/${draft.id}`)
        .send(publish(draft, category.id, { announceOnTelegram: false }))
        .expect(200);
      expect(telegram.calls).toHaveLength(0);
      expect(await ctx.prisma.telegramPost.count()).toBe(0);
    });

    it('keeps a failed post visible with its reason, and retries it on request', async () => {
      const agent = await admin();
      const category = await createCategory(ctx.prisma, 'oolong');
      const draft = await pictured(agent, category.id);
      telegram.replies.push({
        status: 400,
        body: { ok: false, error_code: 400, description: 'Bad Request: chat not found' },
      });
      const published = (
        await agent
          .put(`${API}/admin/products/${draft.id}`)
          .send(publish(draft, category.id))
          .expect(200)
      ).body as AdminProductDetail;
      // The product is on the site whatever happened on Telegram.
      expect(published.status).toBe('ACTIVE');
      await request(server()).get(`${API}/catalog/products/channel-tea?locale=uz`).expect(200);
      expect(published.telegram).toMatchObject({
        status: 'FAILED',
        canRetry: true,
        lastError: 'telegram_error: Bad Request: chat not found',
      });

      const retried = (
        await agent.post(`${API}/admin/telegram/posts/${published.telegram!.id}/retry`).expect(200)
      ).body as AdminTelegramPost;
      expect(retried).toMatchObject({ status: 'SENT', attempts: 2 });
      expect(telegram.calls).toHaveLength(2);
      // A delivered post is never sent again.
      await agent.post(`${API}/admin/telegram/posts/${published.telegram!.id}/retry`).expect(409);
      expect(telegram.calls).toHaveLength(2);
    });

    it('waits when Telegram asks to, and never resends a post whose outcome is unknown', async () => {
      const agent = await admin();
      const category = await createCategory(ctx.prisma, 'white-tea');
      const draft = await pictured(agent, category.id);
      telegram.replies.push({
        status: 429,
        body: {
          ok: false,
          error_code: 429,
          description: 'Too Many Requests',
          parameters: { retry_after: 30 },
        },
      });
      const published = (
        await agent
          .put(`${API}/admin/products/${draft.id}`)
          .send(publish(draft, category.id))
          .expect(200)
      ).body as AdminProductDetail;
      expect(published.telegram?.status).toBe('PENDING');
      const post = await ctx.prisma.telegramPost.findFirstOrThrow();
      expect(post.nextAttemptAt!.getTime()).toBeGreaterThan(Date.now() + 20_000);

      // Not due yet: the processor leaves it alone; once due, it is delivered.
      const service = telegramService();
      expect(await service.processDue()).toEqual({ sent: 0, failed: 0 });
      expect(await service.processDue(5, new Date(Date.now() + 60_000))).toEqual({
        sent: 0,
        failed: 0,
      });
      await ctx.prisma.telegramPost.update({
        where: { id: post.id },
        data: { nextAttemptAt: new Date(0) },
      });
      expect(await service.processDue()).toEqual({ sent: 1, failed: 0 });

      // A send that never reported back (the process stopped): marked for a human decision.
      await ctx.prisma.telegramPost.update({
        where: { id: post.id },
        data: { status: 'SENDING', lockedUntil: new Date(Date.now() - 1000) },
      });
      await service.processDue();
      expect(
        await ctx.prisma.telegramPost.findUniqueOrThrow({ where: { id: post.id } }),
      ).toMatchObject({
        status: 'FAILED',
        lastError: 'unknown_outcome',
      });
    });

    it('announces a published article with its cover and a link to it', async () => {
      const agent = await admin();
      const body: ArticleUpsertInput = {
        slug: 'first-flush',
        status: 'DRAFT',
        illustrationKey: null,
        announceOnTelegram: true,
        translations: {
          uz: {
            title: 'Bahorgi hosil',
            excerpt: 'Yangi mavsum haqida qisqacha.',
            body: 'Maqola matni yigirma belgidan uzunroq.',
          },
          ru: null,
          en: null,
        },
      };
      const draft = (await agent.post(`${API}/admin/articles`).send(body).expect(201))
        .body as AdminArticle;
      await agent
        .post(`${API}/admin/articles/${draft.id}/cover`)
        .attach('file', await testImage(500, 33), {
          filename: 'cover.png',
          contentType: 'image/png',
        })
        .expect(201);
      const published = (
        await agent
          .put(`${API}/admin/articles/${draft.id}`)
          .send({ ...body, status: 'PUBLISHED' })
          .expect(200)
      ).body as AdminArticle;
      expect(published.telegram?.status).toBe('SENT');
      const text = telegram.calls[0]!.body.toString('utf8');
      expect(text).toContain('Bahorgi hosil');
      expect(text).toContain('http://localhost:3000/journal/first-flush');
    });
  });

  describe('dry-run mode', () => {
    let ctx: TestApp;

    beforeAll(async () => {
      Object.assign(process.env, { TELEGRAM_MODE: 'dry-run' });
      ({ ctx } = await freshApp());
    });

    afterAll(async () => {
      await ctx.close();
      for (const key of ENV_KEYS) delete process.env[key];
    });

    it('composes and records the post without contacting Telegram', async () => {
      await resetDatabase(ctx.prisma);
      const user = await createUser(ctx.prisma, 'ADMIN');
      const agent = request.agent(ctx.app.getHttpServer());
      await agent
        .post(`${API}/auth/login`)
        .send({ email: user.email, password: TEST_PASSWORD })
        .expect(200);
      const category = await createCategory(ctx.prisma, 'pu-erh');
      const draft = (
        await agent
          .post(`${API}/admin/products`)
          .send(product(category.id, { announceOnTelegram: true }))
          .expect(201)
      ).body as AdminProductDetail;
      await agent
        .post(`${API}/admin/products/${draft.id}/images`)
        .attach('file', await testImage(400, 44), { filename: 'tea.png', contentType: 'image/png' })
        .expect(201);
      const published = (
        await agent
          .put(`${API}/admin/products/${draft.id}`)
          .send(
            product(category.id, {
              status: 'ACTIVE',
              announceOnTelegram: true,
              variants: product(category.id).variants.map((variant, index) => ({
                ...variant,
                id: draft.variants[index]!.id,
              })),
            }),
          )
          .expect(200)
      ).body as AdminProductDetail;
      expect(published.telegram).toMatchObject({ status: 'SENT', dryRun: true });
      const post = await ctx.prisma.telegramPost.findFirstOrThrow();
      expect(post.text).toContain('Kanal choyi');
      expect(post.messageIds).toEqual([]);
    });
  });
});
