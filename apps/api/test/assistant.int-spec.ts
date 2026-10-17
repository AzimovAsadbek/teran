import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { buildSearchText, type AssistantResponse } from '@teran/contracts';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import type { TestApp } from './helpers/app.js';
import { createCategory, createProduct, resetDatabase } from './helpers/fixtures.js';

const API = '/api/v1';
const ENV_KEYS = ['ANTHROPIC_API_KEY', 'ASSISTANT_API_BASE', 'ASSISTANT_MODEL'];

async function freshApp(): Promise<TestApp> {
  vi.resetModules();
  const { createTestApp } = await import('./helpers/app.js');
  return createTestApp();
}

/** A small catalogue: tea (green, black) with a leaf-style attribute, and coffee. */
async function seedCatalogue(prisma: PrismaService) {
  const teaType = await prisma.productType.create({
    data: {
      key: 'tea',
      brewingGuide: true,
      translations: {
        create: [
          { locale: 'uz', name: 'Choy' },
          { locale: 'ru', name: 'Чай' },
          { locale: 'en', name: 'Tea' },
        ],
      },
      attributes: {
        create: {
          key: 'leaf-style',
          kind: 'SELECT',
          isFilterable: true,
          translations: {
            create: [
              { locale: 'uz', label: 'Barg turi' },
              { locale: 'en', label: 'Leaf style' },
            ],
          },
          options: {
            create: [
              {
                key: 'whole',
                translations: {
                  create: [
                    { locale: 'uz', label: 'Butun barg' },
                    { locale: 'en', label: 'Whole leaf' },
                  ],
                },
              },
              {
                key: 'broken',
                position: 1,
                translations: {
                  create: [
                    { locale: 'uz', label: 'Maydalangan barg' },
                    { locale: 'en', label: 'Broken leaf' },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    include: { attributes: { include: { options: true } } },
  });
  const coffeeType = await prisma.productType.create({
    data: {
      key: 'coffee',
      translations: {
        create: [
          { locale: 'uz', name: 'Qahva' },
          { locale: 'ru', name: 'Кофе' },
          { locale: 'en', name: 'Coffee' },
        ],
      },
    },
  });
  const named = async (slug: string, uz: string, en: string, parentId: string | null = null) => {
    const category = await createCategory(prisma, slug);
    await prisma.category.update({ where: { id: category.id }, data: { parentId } });
    await prisma.categoryTranslation.updateMany({
      where: { categoryId: category.id, locale: 'uz' },
      data: { name: uz },
    });
    await prisma.categoryTranslation.updateMany({
      where: { categoryId: category.id, locale: 'en' },
      data: { name: en },
    });
    return category;
  };
  const tea = await named('tea', 'Choy', 'Tea');
  const green = await named('green-tea', 'Yashil choy', 'Green tea', tea.id);
  const black = await named('black-tea', 'Qora choy', 'Black tea', tea.id);
  const coffee = await named('coffee', 'Qahva', 'Coffee');

  const attribute = teaType.attributes[0]!;
  const option = (key: string) => attribute.options.find((entry) => entry.key === key)!.id;
  const make = async (
    slug: string,
    categoryId: string,
    price: string,
    extra: { leaf?: string; notes?: string; typeId?: string } = {},
  ) => {
    const product = await createProduct(prisma, {
      categoryId,
      slug,
      name: slug,
      variants: [{ price, stock: 10 }],
    });
    await prisma.product.update({
      where: { id: product.id },
      data: {
        productTypeId: extra.typeId ?? teaType.id,
        brewTempCelsius: 80,
        brewTimeMinSeconds: 120,
        brewTimeMaxSeconds: 180,
      },
    });
    if (extra.notes) {
      await prisma.productTranslation.updateMany({
        where: { productId: product.id },
        data: { tastingNotes: extra.notes, searchText: buildSearchText([slug, extra.notes]) },
      });
    }
    if (extra.leaf) {
      await prisma.productAttributeValue.create({
        data: { productId: product.id, attributeId: attribute.id, optionId: option(extra.leaf) },
      });
    }
    return product;
  };
  const whole = await make('green-whole', green.id, '79000', { leaf: 'whole' });
  const premium = await make('green-premium', green.id, '120000', { leaf: 'broken' });
  // Recorded origins: "Xitoy, Yunnan" and "Xitoy, Hunan" (the others have none).
  for (const [product, uz, en] of [
    [whole, 'Xitoy, Yunnan', 'China, Yunnan'],
    [premium, 'Xitoy, Hunan', 'China, Hunan'],
  ] as const) {
    await prisma.productTranslation.updateMany({
      where: { productId: product.id, locale: { in: ['uz', 'ru'] } },
      data: { origin: uz },
    });
    await prisma.productTranslation.updateMany({
      where: { productId: product.id, locale: 'en' },
      data: { origin: en },
    });
  }
  await make('green-mild', green.id, '95000', { leaf: 'broken', notes: 'Yumshoq va toza taʼm' });
  await make('black-classic', black.id, '60000');
  await make('arabica', coffee.id, '150000', { typeId: coffeeType.id });
}

describe('product advisor', () => {
  describe('rule-based matching (no AI provider configured)', () => {
    let ctx: TestApp;

    beforeAll(async () => {
      for (const key of ENV_KEYS) delete process.env[key];
      ctx = await freshApp();
      await resetDatabase(ctx.prisma);
      await seedCatalogue(ctx.prisma);
    });

    afterAll(async () => {
      await ctx.close();
    });

    async function ask(
      message: string,
      history: { role: 'user' | 'assistant'; text: string }[] = [],
      prices = true,
    ) {
      return (
        await request(ctx.app.getHttpServer())
          .post(`${API}/assistant/recommend`)
          .send({ locale: 'uz', message, history, prices })
          .expect(200)
      ).body as AssistantResponse;
    }

    const slugs = (answer: AssistantResponse) =>
      answer.recommendations.map((entry) => entry.product.slug);

    it('applies a budget, a category and a descriptive word, with real prices and pages', async () => {
      const answer = await ask(
        "Budjetim 100 000 so'm. Yaxshi sifatli, yumshoq va oson damlanadigan yashil choy kerak.",
      );
      expect(answer.mode).toBe('basic');
      expect(answer.criteria).toMatchObject({
        maxPrice: 100_000,
        category: { slug: 'green-tea', path: 'tea/green-tea' },
        query: 'yumshoq',
      });
      expect(slugs(answer)).toEqual(['green-mild']);
      const [pick] = answer.recommendations;
      expect(pick!.product).toMatchObject({
        priceFrom: '95000.00',
        category: { path: 'tea/green-tea' },
      });
      expect(pick!.reasons).toEqual(
        expect.arrayContaining([
          'Narxi 95 000 soʻm — 100 000 soʻmlik byudjetingiz ichida',
          'Damlash: 80 °C, 2–3 daqiqa',
          'Tavsifida «yumshoq» deb yozilgan',
        ]),
      );
      // Quality and ease of brewing are not recorded: said plainly, not invented.
      expect(answer.notes.join(' ')).toContain('Sifat darajasi');
      expect(answer.notes.join(' ')).toContain('Damlash qulayligi');
    });

    it('keeps to the category asked for and asks for a budget', async () => {
      const answer = await ask('qora choy');
      expect(slugs(answer)).toEqual(['black-classic']);
      expect(answer.followUp).toBe('Byudjetingiz qancha?');
    });

    it('filters by a recorded attribute', async () => {
      const answer = await ask('butun barg yashil choy');
      expect(answer.criteria.attributes).toEqual([
        { key: 'leaf-style', label: 'Barg turi', values: [{ key: 'whole', label: 'Butun barg' }] },
      ]);
      expect(slugs(answer)).toEqual(['green-whole']);
    });

    it('says when nothing matches the budget and offers the closest of the kind asked for', async () => {
      const answer = await ask("yashil choy 10 000 so'mgacha");
      expect(answer.relaxed).toBe(true);
      expect(answer.message).toContain('10 000');
      expect(slugs(answer)).toEqual(['green-whole', 'green-mild', 'green-premium']);
      expect(answer.followUp).toBe('Byudjetni oshirasizmi yoki boshqa turini koʻramizmi?');
    });

    it('narrows to a place of origin the catalogue records', async () => {
      const answer = await ask('Yunnan choyi');
      expect(answer.criteria.origin).toBe('Yunnan');
      expect(slugs(answer)).toEqual(['green-whole']);
      expect(answer.recommendations[0]!.reasons).toContain('Kelib chiqishi: Xitoy, Yunnan');
      // Not every product records the country, so it narrows the choice too.
      expect(slugs(await ask('Xitoy choyi')).sort()).toEqual(['green-premium', 'green-whole']);
    });

    it('names no price or budget while the storefront shows none', async () => {
      const answer = await ask("yashil choy 10 000 so'mgacha", [], false);
      expect(answer.criteria).toMatchObject({
        maxPrice: null,
        minPrice: null,
        category: { slug: 'green-tea' },
      });
      expect(answer.relaxed).toBe(false);
      expect(answer.message).not.toContain('10 000');
      expect(slugs(answer)).toHaveLength(3);
      for (const pick of answer.recommendations) {
        expect(pick.reasons.join(' ')).not.toMatch(/soʻm|Narxi|byudjet/);
      }
      expect(answer.followUp).toBeNull();
      expect((await ask('salom', [], false)).message).toBe(
        'Qanday mahsulot qidiryapsiz? Turini yoki kimga moʻljallanganini yozing.',
      );
    });

    it('works for other product types the catalogue has (no tea-only logic)', async () => {
      const answer = await ask('qahva kerak');
      expect(slugs(answer)).toEqual(['arabica']);
    });

    it('asks a short question when the request says nothing it can use', async () => {
      const answer = await ask('salom');
      expect(answer.recommendations).toEqual([]);
      expect(answer.followUp).toBe('Qaysi biri qiziqtiradi: Choy, Qahva?');
    });

    it('carries earlier answers forward and refuses health claims', async () => {
      const answer = await ask('100 mingdan arzon boʻlsin', [
        { role: 'user', text: 'yashil choy' },
      ]);
      expect(answer.criteria).toMatchObject({ maxPrice: 100_000, category: { slug: 'green-tea' } });
      expect(slugs(answer).sort()).toEqual(['green-mild', 'green-whole']);
      const health = await ask('ozish uchun foydali choy');
      expect(health.notes).toContain(
        'Sogʻliq yoki davolash bilan bogʻliq hech qanday daʼvo bildira olmayman.',
      );
    });

    it('validates requests and reports its mode', async () => {
      await request(ctx.app.getHttpServer())
        .post(`${API}/assistant/recommend`)
        .send({ locale: 'uz', message: 'x'.repeat(501) })
        .expect(400);
      expect(
        (await request(ctx.app.getHttpServer()).get(`${API}/assistant/status`).expect(200)).body,
      ).toEqual({
        mode: 'basic',
      });
    });
  });

  describe('with an AI provider (mocked)', () => {
    let ctx: TestApp;
    const bodies: Record<string, unknown>[] = [];
    let script: ((body: Record<string, unknown>) => { status: number; body: unknown })[] = [];
    const provider: Server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
        bodies.push({ ...body, apiKey: req.headers['x-api-key'] });
        const step = script.shift() ?? (() => ({ status: 500, body: {} }));
        const reply = step(body);
        res.writeHead(reply.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(reply.body));
      });
    });

    beforeAll(async () => {
      await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
      const { port } = provider.address() as AddressInfo;
      Object.assign(process.env, {
        ANTHROPIC_API_KEY: 'test-provider-key-0123456789',
        ASSISTANT_API_BASE: `http://127.0.0.1:${port}`,
      });
      ctx = await freshApp();
      await resetDatabase(ctx.prisma);
      await seedCatalogue(ctx.prisma);
    });

    afterAll(async () => {
      await ctx.close();
      await new Promise<void>((resolve) => provider.close(() => resolve()));
      for (const key of ENV_KEYS) delete process.env[key];
    });

    it('lets the model search with real filters and keeps only products the search returned', async () => {
      bodies.length = 0;
      script = [
        () => ({
          status: 200,
          body: {
            stop_reason: 'tool_use',
            content: [
              {
                type: 'tool_use',
                id: 'call-1',
                name: 'search_catalog',
                input: { category: 'green-tea', maxPrice: 100000 },
              },
            ],
          },
        }),
        (body) => {
          // The second request carries the tool's results: real products with real prices.
          const messages = body.messages as { role: string; content: unknown }[];
          const last = messages.at(-1)!.content as { content: string }[];
          const results = JSON.parse(last[0]!.content) as {
            products: { productId: string; priceFromUzs: number }[];
          };
          const real = results.products[0]!;
          return {
            status: 200,
            body: {
              stop_reason: 'tool_use',
              content: [
                {
                  type: 'tool_use',
                  id: 'call-2',
                  name: 'recommend',
                  input: {
                    message: 'Byudjetingizga mos yashil choy:',
                    picks: [
                      {
                        productId: real.productId,
                        reasons: ['Byudjetga mos', 'Ozish uchun foydali'],
                      },
                      {
                        productId: '00000000-0000-7000-8000-000000000000',
                        reasons: ['Oʻylab topilgan'],
                      },
                    ],
                    notes: [],
                    followUp: null,
                  },
                },
              ],
            },
          };
        },
      ];
      const answer = (
        await request(ctx.app.getHttpServer())
          .post(`${API}/assistant/recommend`)
          .send({ locale: 'uz', message: 'Yashil choy, 100 ming. Telefonim +998 90 123 45 67' })
          .expect(200)
      ).body as AssistantResponse;
      expect(answer.mode).toBe('ai');
      expect(answer.recommendations).toHaveLength(1);
      const [pick] = answer.recommendations;
      expect(Number(pick!.product.priceFrom)).toBeLessThanOrEqual(100_000);
      expect(pick!.reasons).toContain('Byudjetga mos');
      expect(pick!.reasons.join(' ')).not.toContain('Ozish');
      expect(answer.criteria).toMatchObject({ maxPrice: 100_000, category: { slug: 'green-tea' } });

      // What the provider received: the tools, no phone number, the key only in its header.
      const first = bodies[0]!;
      expect((first.tools as { name: string }[]).map((tool) => tool.name)).toEqual([
        'search_catalog',
        'recommend',
      ]);
      expect(JSON.stringify(first.messages)).toContain('[phone]');
      expect(JSON.stringify(first.messages)).not.toContain('123 45 67');
      expect(first.apiKey).toBe('test-provider-key-0123456789');
    });

    it('falls back to rule-based matching when the provider fails', async () => {
      script = [() => ({ status: 500, body: { error: 'overloaded' } })];
      const answer = (
        await request(ctx.app.getHttpServer())
          .post(`${API}/assistant/recommend`)
          .send({ locale: 'uz', message: 'qora choy' })
          .expect(200)
      ).body as AssistantResponse;
      expect(answer.mode).toBe('basic');
      expect(answer.recommendations.map((entry) => entry.product.slug)).toEqual(['black-classic']);
    });
  });
});
