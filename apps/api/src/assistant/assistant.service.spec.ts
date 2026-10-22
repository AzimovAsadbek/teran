import type { ConfigService } from '@nestjs/config';
import { assistantChatSchema } from '@teran/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogService } from '../catalog/catalog.service.js';
import { ApiException } from '../common/errors/api-exception.js';
import type { Env } from '../config/env.js';
import type { SettingsService } from '../content/settings.service.js';
import type { DeliveryService } from '../delivery/delivery.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  AssistantService,
  cleanReply,
  redactPersonalData,
  toContents,
} from './assistant.service.js';

describe('redactPersonalData', () => {
  it('removes phone numbers and e-mail addresses, and leaves other numbers', () => {
    expect(redactPersonalData('Menga +998 90 123-45-67 ga yoki ali@mail.uz ga yozing')).toBe(
      'Menga [phone] ga yoki [email] ga yozing',
    );
    expect(redactPersonalData('400 g, 80–85 °C, 2025-yil')).toBe('400 g, 80–85 °C, 2025-yil');
  });
});

describe('cleanReply', () => {
  it('turns Markdown into plain text with "•" lists', () => {
    expect(cleanReply('## Choylar\n**XC2025** — yashil.\n\n\n* Birinchi\n- Ikkinchi  \n')).toBe(
      'Choylar\nXC2025 — yashil.\n\n• Birinchi\n• Ikkinchi',
    );
  });

  it('bounds a long answer', () => {
    const reply = cleanReply('a'.repeat(5_000));
    expect(reply).toHaveLength(1_500);
    expect(reply.endsWith('…')).toBe(true);
  });
});

describe('toContents', () => {
  it('starts with the visitor, joins turns of one side and redacts the visitor’s turns only', () => {
    expect(
      toContents({
        history: [
          { role: 'assistant', text: 'Assalomu alaykum!' },
          { role: 'user', text: 'Raqamim +998901234567' },
          { role: 'user', text: 'Yashil choy bormi?' },
          { role: 'assistant', text: 'Ha, TERAN XC2025.' },
        ],
        message: 'Narxi qancha?',
      }),
    ).toEqual([
      { role: 'user', parts: [{ text: 'Raqamim [phone]' }, { text: 'Yashil choy bormi?' }] },
      { role: 'model', parts: [{ text: 'Ha, TERAN XC2025.' }] },
      { role: 'user', parts: [{ text: 'Narxi qancha?' }] },
    ]);
  });
});

const KEY = 'test-gemini-key-0123456789';

function setup({
  key = KEY,
  enabled = true,
  dailyLimit = 100,
}: { key?: string | null; enabled?: boolean; dailyLimit?: number } = {}) {
  const values: Record<string, unknown> = {
    GEMINI_API_KEY: key ?? undefined,
    GEMINI_MODEL: 'gemini-3.5-flash-lite',
    GEMINI_API_BASE: 'https://gemini.test',
    ASSISTANT_DAILY_LIMIT: dailyLimit,
  };
  const config = { get: (name: string) => values[name] } as unknown as ConfigService<Env, true>;
  const settings = {
    getAll: vi.fn().mockResolvedValue({
      assistant: { enabled, knowledge: { uz: 'TERAN — Namangan.', ru: '', en: '' } },
    }),
    getPublic: vi.fn().mockResolvedValue({
      contact: {
        phone: null,
        phone2: null,
        email: null,
        email2: null,
        telegram: null,
        instagram: null,
        whatsapp: null,
        youtube: null,
        address: null,
        workingHours: null,
      },
      stores: [],
    }),
  } as unknown as SettingsService;
  const catalog = {
    listCategories: vi.fn().mockResolvedValue([
      {
        slug: 'green-tea',
        name: 'Yashil choy',
        path: 'tea/green-tea',
        parentSlug: 'tea',
        productCount: 5,
      },
    ]),
    listCollections: vi.fn().mockResolvedValue([]),
  } as unknown as CatalogService;
  const delivery = { listActive: vi.fn().mockResolvedValue([]) } as unknown as DeliveryService;
  // The visible products' names in every language; no catalogue rows and no cards otherwise.
  const findMany = vi.fn((args: { select?: unknown }) =>
    Promise.resolve(
      args.select
        ? [
            { slug: 'teran-xc2025', translations: [{ name: 'TERAN XC2025' }] },
            {
              slug: 'classic-green-tea',
              translations: [{ name: 'Klassik yashil choy' }, { name: 'Классический зелёный чай' }],
            },
          ]
        : [],
    ),
  );
  const prisma = { product: { findMany } } as unknown as PrismaService;
  const service = new AssistantService(prisma, catalog, settings, delivery, config);
  return { service, findMany, settings };
}

function geminiAnswer(answer: unknown) {
  return new Response(
    JSON.stringify({
      candidates: [
        { content: { parts: [{ text: JSON.stringify(answer) }] }, finishReason: 'STOP' },
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

const question = assistantChatSchema.parse({ message: 'Yashil choy tavsiya qiling' });

describe('AssistantService', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('keeps to the products, categories and pages that exist', async () => {
    const { service, findMany } = setup();
    fetchMock.mockResolvedValue(
      geminiAnswer({
        reply: '**TERAN XC2025** — yumshoq yashil choy.',
        productSlugs: ['teran-xc2025', 'made-up', 'teran-xc2025'],
        categorySlugs: ['green-tea', 'nowhere'],
        links: ['delivery', 'checkout', 'delivery'],
      }),
    );
    const reply = await service.chat(question);
    expect(reply).toEqual({
      reply: 'TERAN XC2025 — yumshoq yashil choy.',
      products: [],
      categories: [{ slug: 'green-tea', name: 'Yashil choy', path: 'tea/green-tea' }],
      links: ['delivery'],
    });
    // The products named are looked up among the visible ones, each once.
    const lookup = findMany.mock.calls.at(-1)![0] as { where: { slug: { in: string[] } } };
    expect(lookup.where.slug.in).toEqual(['teran-xc2025']);
  });

  it('shows no card, category or more than two pages beside an answer that names none', async () => {
    const { service, findMany } = setup();
    fetchMock.mockResolvedValue(
      geminiAnswer({
        reply: 'Yetkazib berish narxini buyurtma berishda kelishib olamiz.',
        productSlugs: ['teran-xc2025', 'classic-green-tea'],
        categorySlugs: ['green-tea'],
        links: ['delivery', 'contact', 'catalog'],
      }),
    );
    const reply = await service.chat(question);
    expect(reply.products).toEqual([]);
    expect(reply.categories).toEqual([]);
    expect(reply.links).toEqual(['delivery', 'contact']);
    // No card was looked up at all.
    expect(
      findMany.mock.calls.some((call) => (call[0] as { where?: { slug?: unknown } }).where?.slug),
    ).toBe(false);
  });

  it('knows a product named in another language of the site', async () => {
    const { service, findMany } = setup();
    fetchMock.mockResolvedValue(
      geminiAnswer({
        reply: 'Попробуйте классический зелёный чай — мягкий и свежий.',
        productSlugs: ['classic-green-tea'],
        categorySlugs: [],
        links: ['catalog', 'tea101'],
      }),
    );
    // Beside a named product "all products" is left out.
    expect((await service.chat(question)).links).toEqual(['tea101']);
    const lookup = findMany.mock.calls.at(-1)![0] as { where: { slug: { in: string[] } } };
    expect(lookup.where.slug.in).toEqual(['classic-green-tea']);
  });

  it('sends the rules and TERAN’s text as the system instruction', async () => {
    const { service } = setup();
    fetchMock.mockResolvedValue(
      geminiAnswer({ reply: 'Salom!', productSlugs: [], categorySlugs: [], links: [] }),
    );
    await service.chat(question);
    const body = JSON.parse(fetchMock.mock.calls[0]![1]?.body as string) as {
      systemInstruction: { parts: { text: string }[] };
    };
    const system = body.systemInstruction.parts[0]!.text;
    expect(system).toContain('Rules:');
    expect(system).toContain('TERAN — Namangan.');
    expect(system).toContain('- green-tea: Yashil choy (inside tea), 5');
  });

  it('is switched off without a key or while TERAN has it off', async () => {
    for (const options of [{ key: null }, { enabled: false }]) {
      const error = await setup(options)
        .service.chat(question)
        .catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(ApiException);
      expect((error as ApiException).code).toBe('FEATURE_DISABLED');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tries once more when Gemini is busy, but not when it refuses', async () => {
    const { service } = setup();
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE' } }), {
          status: 503,
        }),
      )
      .mockResolvedValueOnce(
        geminiAnswer({ reply: 'Ha.', productSlugs: [], categorySlugs: [], links: [] }),
      );
    await expect(service.chat(question)).resolves.toMatchObject({ reply: 'Ha.' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT' } }), {
        status: 400,
      }),
    );
    const error = await service.chat(question).catch((caught: unknown) => caught);
    expect((error as ApiException).code).toBe('SERVICE_UNAVAILABLE');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('answers no more than the daily ceiling', async () => {
    const { service } = setup({ dailyLimit: 1 });
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        geminiAnswer({ reply: 'Ha.', productSlugs: [], categorySlugs: [], links: [] }),
      ),
    );
    await service.chat(question);
    const error = await service.chat(question).catch((caught: unknown) => caught);
    expect((error as ApiException).code).toBe('SERVICE_UNAVAILABLE');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('answers politely when Google holds an answer back, and fails plainly when Gemini does', async () => {
    const { service } = setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } }), { status: 200 }),
    );
    const held = await service.chat(question);
    expect(held.links).toEqual(['contact']);
    expect(held.reply).toContain('TERAN');

    // A server error, and the one more try that fails as well.
    fetchMock
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(new Response('{}', { status: 500 }));
    const error = await service.chat(question).catch((caught: unknown) => caught);
    expect((error as ApiException).code).toBe('SERVICE_UNAVAILABLE');

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }),
        { status: 200 },
      ),
    );
    const garbled = await service.chat(question).catch((caught: unknown) => caught);
    expect((garbled as ApiException).code).toBe('SERVICE_UNAVAILABLE');
  });
});
