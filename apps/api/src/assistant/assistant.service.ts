import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  assistantLinkSchema,
  type assistantChatSchema,
  type AssistantLink,
  type AssistantReplyDto,
  type CategoryDto,
  type Locale,
} from '@teran/contracts';
import { z } from 'zod';
import { CatalogService } from '../catalog/catalog.service.js';
import {
  detailInclude,
  summaryInclude,
  toProductDetail,
  toProductSummary,
} from '../catalog/catalog.mapper.js';
import { visibleProductWhere } from '../catalog/product-visibility.js';
import { ApiException } from '../common/errors/api-exception.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import type { Env } from '../config/env.js';
import { SettingsService } from '../content/settings.service.js';
import { DeliveryService } from '../delivery/delivery.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiClient, GeminiError, type GeminiContent } from './gemini.js';
import { mentions } from './mentions.js';
import { ANSWER_SCHEMA, systemInstruction, type KnowledgeProduct } from './knowledge.js';

export type AssistantInput = z.output<typeof assistantChatSchema>;

/**
 * How long a visitor waits for an answer at most: Gemini usually answers within seconds, but at
 * busy times it has taken over twenty (measured 2026-10-23).
 */
const TIMEOUT_MS = 45_000;
/** The pause before the one more try a busy Gemini gets. */
const RETRY_DELAY_MS = 1_000;
/** How long what the assistant knows is reused before it is read again from the database. */
const CONTEXT_TTL_MS = 3 * 60_000;
/** The longest answer kept (the model is asked for far less). */
const REPLY_MAX = 1_500;

/** The model's answer, as the schema asks; anything else in a field is dropped, not fatal. */
const answerSchema = z.object({
  reply: z.string(),
  productSlugs: z.array(z.string()).catch([]),
  categorySlugs: z.array(z.string()).catch([]),
  links: z.array(z.unknown()).catch([]),
});

/** What the assistant says when Google's filters hold an answer back. */
const HELD_BACK: Record<Locale, string> = {
  uz: 'Bu savolga javob bera olmayman. TERAN choylari, buyurtma yoki yetkazib berish haqida soʻrang — yoki TERANga yozing.',
  ru: 'На этот вопрос я ответить не могу. Спросите о чае TERAN, заказе или доставке — или напишите TERAN.',
  en: 'I can’t answer that. Ask me about TERAN teas, ordering or delivery — or write to TERAN.',
};

interface Context {
  at: number;
  /** Which settings it was built from (TERAN's text changes it at once). */
  version: string;
  system: string;
  /** Every visible product's names, in every language, by slug. */
  products: Map<string, string[]>;
  categories: Map<string, CategoryDto>;
}

/** Removes phone numbers and e-mail addresses before a question leaves the server. */
export function redactPersonalData(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\+?\d[\d\s()-]{7,}\d/g, (match) =>
      /\d{9,}/.test(match.replace(/\D/g, '')) ? '[phone]' : match,
    );
}

/** Plain text from the model: no Markdown emphasis or headings, "•" lists, bounded length. */
export function cleanReply(text: string): string {
  const plain = text
    .replace(/\r\n?/g, '\n')
    .replace(/\*\*|__/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[ \t]*[*-][ \t]+/gm, '• ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return plain.length > REPLY_MAX ? `${plain.slice(0, REPLY_MAX - 1).trimEnd()}…` : plain;
}

/**
 * The conversation as Gemini takes it: the visitor's turns as "user", the assistant's as "model",
 * starting with the visitor and never two turns of one side in a row.
 */
export function toContents(input: Pick<AssistantInput, 'history' | 'message'>): GeminiContent[] {
  const turns = [...input.history, { role: 'user' as const, text: input.message }];
  const contents: GeminiContent[] = [];
  for (const turn of turns) {
    const role = turn.role === 'user' ? 'user' : 'model';
    const text = role === 'user' ? redactPersonalData(turn.text) : turn.text;
    const last = contents.at(-1);
    if (!last && role === 'model') continue;
    if (last?.role === role) last.parts.push({ text });
    else contents.push({ role, parts: [{ text }] });
  }
  return contents;
}

function unavailable(code: 'FEATURE_DISABLED' | 'SERVICE_UNAVAILABLE', message: string) {
  return new ApiException(HttpStatus.SERVICE_UNAVAILABLE, code, message);
}

/**
 * The chat's AI assistant (ADR-055). Each question goes to Gemini with standing rules and what
 * the site knows in the visitor's language: TERAN's own text (Admin → Settings), the contacts,
 * stores and delivery methods, the categories, collections and every visible product with its
 * facts. The answer names products and categories by slug; only ones that are visible become
 * cards and links. Phone numbers and e-mail addresses are removed from questions before they
 * leave, nothing of the conversation is stored or logged, and a daily ceiling bounds the cost.
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly gemini: GeminiClient | null;
  private readonly dailyLimit: number;
  private readonly contexts = new Map<string, Promise<Context>>();
  private today = '';
  private answeredToday = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly settings: SettingsService,
    private readonly delivery: DeliveryService,
    config: ConfigService<Env, true>,
  ) {
    const apiKey = config.get('GEMINI_API_KEY', { infer: true });
    this.gemini = apiKey
      ? new GeminiClient({
          apiKey,
          apiBase: config.get('GEMINI_API_BASE', { infer: true }),
          model: config.get('GEMINI_MODEL', { infer: true }),
        })
      : null;
    this.dailyLimit = config.get('ASSISTANT_DAILY_LIMIT', { infer: true });
  }

  async chat(input: AssistantInput): Promise<AssistantReplyDto> {
    const { assistant } = await this.settings.getAll();
    const gemini = this.gemini;
    if (!gemini || !assistant.enabled) {
      throw unavailable('FEATURE_DISABLED', 'The assistant is switched off');
    }
    if (!this.countAnswer()) {
      throw unavailable('SERVICE_UNAVAILABLE', 'The assistant has answered enough for today');
    }
    const owner = assistant.knowledge[input.locale].trim() || assistant.knowledge.uz.trim();
    const context = await this.context(input.locale, input.prices, owner);

    let text: string;
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    const request = {
      system: context.system,
      contents: toContents(input),
      schema: ANSWER_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 2048,
      signal,
    };
    try {
      const result = await gemini.generate(request).catch(async (error: unknown) => {
        // Google's "high demand" and server errors come back fast: one more try, in the same time.
        if (!(error instanceof GeminiError) || !error.retryable) throw error;
        await sleep(RETRY_DELAY_MS, undefined, { signal });
        return gemini.generate(request);
      });
      if (result.kind === 'blocked') {
        return { reply: HELD_BACK[input.locale], products: [], categories: [], links: ['contact'] };
      }
      text = result.text;
    } catch (error) {
      this.logger.warn(
        { reason: error instanceof GeminiError ? error.message : 'unknown' },
        'Assistant unavailable',
      );
      throw unavailable('SERVICE_UNAVAILABLE', 'The assistant cannot answer right now');
    }

    const answer = answerSchema.safeParse(parseJson(text));
    const reply = answer.success ? cleanReply(answer.data.reply) : '';
    if (!answer.success || !reply) {
      this.logger.warn({ reason: 'answer not understood' }, 'Assistant unavailable');
      throw unavailable('SERVICE_UNAVAILABLE', 'The assistant cannot answer right now');
    }
    // A card only for a product the reply talks about, never one added beside it (the owner's
    // word of 2026-10-23: no products under every answer).
    const named = [...new Set(answer.data.productSlugs)].filter((slug) =>
      context.products.get(slug)?.some((name) => mentions(reply, name)),
    );
    const links = [
      ...new Set(
        answer.data.links.flatMap((link) => {
          const parsed = assistantLinkSchema.safeParse(link);
          // Beside product cards "all products" adds nothing: their category's link leads on.
          return parsed.success && !(parsed.data === 'catalog' && named.length > 0)
            ? [parsed.data]
            : [];
        }),
      ),
    ].slice(0, 2) satisfies AssistantLink[];
    const products = await this.products(named, input.locale);
    // A category's link goes with its products' cards, or with a reply that names it.
    const shown = new Set(products.flatMap((product) => product.category.path.split('/')));
    const categories = [...new Set(answer.data.categorySlugs)]
      .flatMap((slug) => {
        const category = context.categories.get(slug);
        return category && (shown.has(slug) || mentions(reply, category.name))
          ? [{ slug: category.slug, name: category.name, path: category.path }]
          : [];
      })
      .slice(0, 1);
    return { reply, products, categories, links };
  }

  /** One more answer today, if the day's ceiling allows it. */
  private countAnswer(): boolean {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.today) {
      this.today = today;
      this.answeredToday = 0;
    }
    if (this.answeredToday >= this.dailyLimit) return false;
    this.answeredToday += 1;
    return true;
  }

  /** The products an answer names, as cards: visible ones only, in the answer's order. */
  private async products(slugs: string[], locale: Locale) {
    const wanted = [...new Set(slugs)].slice(0, 4);
    if (wanted.length === 0) return [];
    const now = new Date();
    const rows = await this.prisma.product.findMany({
      where: { ...visibleProductWhere(now), slug: { in: wanted } },
      include: summaryInclude(locale),
    });
    return wanted.flatMap((slug) => {
      const row = rows.find((product) => product.slug === slug);
      return row ? [toProductSummary(row, locale, now)] : [];
    });
  }

  /** What the assistant knows in one language, read again every few minutes. */
  private context(locale: Locale, prices: boolean, owner: string): Promise<Context> {
    const key = `${locale}|${prices}`;
    const version = createHash('sha256').update(owner).digest('base64url');
    const cached = this.contexts.get(key);
    if (cached) {
      return cached.then((context) =>
        context.version === version && Date.now() - context.at < CONTEXT_TTL_MS
          ? context
          : this.rebuild(key, locale, prices, owner, version),
      );
    }
    return this.rebuild(key, locale, prices, owner, version);
  }

  private rebuild(
    key: string,
    locale: Locale,
    prices: boolean,
    owner: string,
    version: string,
  ): Promise<Context> {
    const built = this.build(locale, prices, owner, version);
    this.contexts.set(key, built);
    // A failed read is not kept: the next question tries again.
    built.catch(() => this.contexts.delete(key));
    return built;
  }

  private async build(
    locale: Locale,
    prices: boolean,
    owner: string,
    version: string,
  ): Promise<Context> {
    const now = new Date();
    const chain = { where: { locale: { in: localeChain(locale) } } };
    const [settings, delivery, categories, collections, rows, names] = await Promise.all([
      this.settings.getPublic(locale),
      this.delivery.listActive(locale),
      this.catalog.listCategories(locale),
      this.catalog.listCollections(locale),
      this.prisma.product.findMany({
        where: visibleProductWhere(now),
        orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }],
        include: {
          ...detailInclude(locale),
          collections: {
            where: { collection: { isActive: true } },
            include: { collection: { include: { translations: chain } } },
          },
        },
      }),
      // The names in every language: a reply may name a product in the visitor's own.
      this.prisma.product.findMany({
        where: visibleProductWhere(now),
        select: { slug: true, translations: { select: { name: true } } },
      }),
    ]);
    const products: KnowledgeProduct[] = rows.map((row) => ({
      ...toProductDetail(row, locale, now),
      collections: row.collections.map(
        ({ collection }) =>
          pickTranslation(collection.translations, locale)?.name ?? collection.slug,
      ),
    }));
    return {
      at: Date.now(),
      version,
      system: systemInstruction({
        locale,
        prices,
        owner,
        contact: settings.contact,
        stores: settings.stores,
        delivery,
        categories,
        collections,
        products,
      }),
      products: new Map(
        names.map((product) => [
          product.slug,
          product.translations.map((translation) => translation.name),
        ]),
      ),
      categories: new Map(categories.map((category) => [category.slug, category])),
    };
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // A model that wrapped its JSON in a code fence.
    const inner = /\{[\s\S]*\}/.exec(text)?.[0];
    if (!inner) return null;
    try {
      return JSON.parse(inner);
    } catch {
      return null;
    }
  }
}
