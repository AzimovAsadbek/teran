import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import type { AssistantReplyDto, PublicSettingsDto } from '@teran/contracts';
import type { TestApp } from './helpers/app.js';
import {
  TEST_PASSWORD,
  createCategory,
  createProduct,
  createUser,
  resetDatabase,
} from './helpers/fixtures.js';

const API = '/api/v1';
const KEY = 'test-gemini-key-never-shown-0123456789';
const ENV_KEYS = ['GEMINI_API_KEY', 'GEMINI_API_BASE'];

interface Call {
  path: string;
  key: string | undefined;
  body: {
    systemInstruction: { parts: { text: string }[] };
    contents: { role: string; parts: { text: string }[] }[];
  };
}

/**
 * Configuration is read when the application module is first loaded, so the suite sets its
 * environment and then loads a fresh copy of the application.
 */
async function freshApp(): Promise<TestApp> {
  vi.resetModules();
  const { createTestApp } = await import('./helpers/app.js');
  return createTestApp();
}

/** Gemini's answer carrying the assistant's JSON. */
function answer(content: unknown) {
  return {
    candidates: [
      {
        content: { role: 'model', parts: [{ text: JSON.stringify(content) }] },
        finishReason: 'STOP',
      },
    ],
  };
}

/** A stand-in for Gemini's generateContent: records every call and answers as scripted. */
function mockGemini() {
  const calls: Call[] = [];
  const replies: { status: number; body: unknown }[] = [];
  const server: Server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      calls.push({
        path: req.url ?? '',
        key: req.headers['x-goog-api-key'] as string | undefined,
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as Call['body'],
      });
      const reply = replies.shift() ?? {
        status: 200,
        body: answer({ reply: 'Salom!', productSlugs: [], categorySlugs: [], links: [] }),
      };
      res.writeHead(reply.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(reply.body));
    });
  });
  return { server, calls, replies };
}

describe('AI assistant (against a mock Gemini)', () => {
  let ctx: TestApp;
  const gemini = mockGemini();

  beforeAll(async () => {
    await new Promise<void>((resolve) => gemini.server.listen(0, '127.0.0.1', resolve));
    const { port } = gemini.server.address() as AddressInfo;
    Object.assign(process.env, {
      GEMINI_API_KEY: KEY,
      GEMINI_API_BASE: `http://127.0.0.1:${port}`,
    });
    ctx = await freshApp();
  });

  afterAll(async () => {
    await ctx.close();
    await new Promise<void>((resolve) => gemini.server.close(() => resolve()));
    for (const key of ENV_KEYS) delete process.env[key];
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    gemini.calls.length = 0;
    gemini.replies.length = 0;
  });

  const server = () => ctx.app.getHttpServer();

  async function admin() {
    const user = await createUser(ctx.prisma, 'ADMIN');
    const agent = request.agent(server());
    await agent
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return agent;
  }

  async function switchOn(knowledge: string) {
    const agent = await admin();
    await agent
      .put(`${API}/admin/settings/assistant`)
      .send({ enabled: true, knowledge: { uz: knowledge, ru: '', en: '' } })
      .expect(200);
    return agent;
  }

  it('stays off until an administrator switches it on', async () => {
    const before = (await request(server()).get(`${API}/content/settings?locale=uz`).expect(200))
      .body as PublicSettingsDto;
    expect(before.assistant).toEqual({ enabled: false });
    const refused = await request(server())
      .post(`${API}/assistant/chat`)
      .send({ message: 'Salom' })
      .expect(503);
    expect(refused.body.code).toBe('FEATURE_DISABLED');

    // Only an administrator may change it.
    const manager = await createUser(ctx.prisma, 'MANAGER');
    const managerAgent = request.agent(server());
    await managerAgent
      .post(`${API}/auth/login`)
      .send({ email: manager.email, password: TEST_PASSWORD })
      .expect(200);
    await managerAgent
      .put(`${API}/admin/settings/assistant`)
      .send({ enabled: true, knowledge: { uz: '', ru: '', en: '' } })
      .expect(403);

    const agent = await switchOn('TERAN — Namangandagi choy kompaniyasi.');
    const after = (await request(server()).get(`${API}/content/settings?locale=uz`).expect(200))
      .body as PublicSettingsDto;
    expect(after.assistant).toEqual({ enabled: true });
    // TERAN's text stays out of the public settings; the admin sees it and the model.
    expect(JSON.stringify(after)).not.toContain('Namangandagi choy');
    const adminView = (await agent.get(`${API}/admin/settings`).expect(200)).body as {
      assistant: { knowledge: { uz: string } };
      assistantModel: string | null;
    };
    expect(adminView.assistant.knowledge.uz).toBe('TERAN — Namangandagi choy kompaniyasi.');
    expect(adminView.assistantModel).toBe('gemini-3.5-flash-lite');
    expect(gemini.calls).toHaveLength(0);
  });

  it('answers from TERAN’s text and the visible catalogue, with cards for visible products only', async () => {
    await switchOn('TERAN XC2025 — eng mashhur choyimiz.');
    const category = await createCategory(ctx.prisma, 'green-tea');
    await createProduct(ctx.prisma, {
      categoryId: category.id,
      slug: 'teran-xc2025',
      name: 'TERAN XC2025',
    });
    await createProduct(ctx.prisma, {
      categoryId: category.id,
      slug: 'secret-draft',
      name: 'Secret draft',
      status: 'DRAFT',
    });
    gemini.replies.push({
      status: 200,
      body: answer({
        reply: '**TERAN XC2025** — yashil choy, tavsiya qilaman.',
        productSlugs: ['teran-xc2025', 'secret-draft', 'made-up'],
        categorySlugs: ['green-tea', 'nowhere'],
        links: ['tea101', 'checkout'],
      }),
    });

    const reply = (
      await request(server())
        .post(`${API}/assistant/chat`)
        .send({
          locale: 'uz',
          message: 'Yashil choy kerak, raqamim +998 90 123 45 67',
          history: [{ role: 'assistant', text: 'Assalomu alaykum!' }],
        })
        .expect(200)
    ).body as AssistantReplyDto;
    expect(reply.reply).toBe('TERAN XC2025 — yashil choy, tavsiya qilaman.');
    expect(reply.products.map((product) => product.slug)).toEqual(['teran-xc2025']);
    expect(reply.categories.map((item) => item.slug)).toEqual(['green-tea']);
    expect(reply.links).toEqual(['tea101']);

    // What Gemini was sent: the key in a header, the rules with TERAN's text and the visible
    // products, and the visitor's words without their phone number.
    const [call] = gemini.calls;
    expect(call?.path).toBe('/v1beta/models/gemini-3.5-flash-lite:generateContent');
    expect(call?.key).toBe(KEY);
    const system = call?.body.systemInstruction.parts[0]?.text ?? '';
    expect(system).toContain('TERAN XC2025 — eng mashhur choyimiz.');
    expect(system).toContain('slug: teran-xc2025');
    expect(system).not.toContain('secret-draft');
    expect(call?.body.contents).toEqual([
      { role: 'user', parts: [{ text: 'Yashil choy kerak, raqamim [phone]' }] },
    ]);
  });

  it('tries once more when Gemini is busy, then says it cannot answer', async () => {
    await switchOn('TERAN');
    const busy = { status: 503, body: { error: { code: 503, status: 'UNAVAILABLE' } } };
    gemini.replies.push(busy, busy);
    const response = await request(server())
      .post(`${API}/assistant/chat`)
      .send({ message: 'Choy bormi?' })
      .expect(503);
    expect(response.body.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('Choy bormi');
    expect(gemini.calls).toHaveLength(2);
  });

  it('refuses a question that is too short or too long', async () => {
    await switchOn('TERAN');
    await request(server()).post(`${API}/assistant/chat`).send({ message: 'a' }).expect(400);
    await request(server())
      .post(`${API}/assistant/chat`)
      .send({ message: 'a'.repeat(501) })
      .expect(400);
    expect(gemini.calls).toHaveLength(0);
  });
});
