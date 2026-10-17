import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PRODUCT_FORMATS,
  productListQuerySchema,
  type AssistantCriteria,
  type AssistantMode,
  type AssistantRecommendation,
  type AssistantResponse,
  type assistantRequestSchema,
  type Locale,
  type ProductDetailDto,
  type ProductFormat,
  type ProductSummaryDto,
} from '@teran/contracts';
import { z } from 'zod';
import { CatalogService } from '../catalog/catalog.service.js';
import { visibleProductWhere } from '../catalog/product-visibility.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AnthropicClient,
  type ChatMessage,
  type ContentBlock,
  type ToolDefinition,
} from './anthropic.js';
import {
  normalize,
  parseRequest,
  redactPersonalData,
  type CatalogVocabulary,
  type ParsedRequest,
} from './request-parser.js';
import { formatSum, TEXTS, type DroppedCriterion } from './texts.js';

type AssistantInput = z.output<typeof assistantRequestSchema>;

const MAX_PICKS = 4;
const VOCABULARY_TTL_MS = 5 * 60_000;
const AI_TIMEOUT_MS = 25_000;
const AI_TURNS = 4;

/** Structured filters over the catalogue: the only way the advisor finds products. */
interface SearchFilters {
  category: string | null;
  type: string | null;
  formats: ProductFormat[];
  minPrice: number | null;
  maxPrice: number | null;
  attributes: Record<string, string[]>;
  /** A place of origin (a Vocabulary `places` key). */
  origin: string | null;
  text: string | null;
  inStockOnly: boolean;
  sort: 'featured' | 'price_asc';
}

interface Vocabulary extends CatalogVocabulary {
  /** Display names per language, for showing what was understood. */
  categoryLabels: Map<string, { path: string; names: Partial<Record<Locale, string>> }>;
  attributeLabels: Map<
    string,
    {
      names: Partial<Record<Locale, string>>;
      options: Map<string, Partial<Record<Locale, string>>>;
    }
  >;
  /** Top-level categories with visible products, for clarifying questions. */
  topLevel: { slug: string; names: Partial<Record<Locale, string>> }[];
  /** The `origins` places with their names per language and the visible products from there. */
  places: Map<string, { names: Partial<Record<Locale, string>>; productIds: Set<string> }>;
}

/** Words that must never reach a shopper as a product claim (health and medical promises). */
const CLAIM_WORDS =
  /davola|shifo|sog'liq|sogʻliq|foydali|лечит|лечеб|полезн|здоров|cure|heal|health|medic/i;

/** An amount of money ("159 000 soʻm", "от 95 000 сум", "120,000 UZS"). */
const MONEY = /\d[\d\s\u00a0.,]*\s*(?:so['ʻ‘’]?m|сум|uzs)/i;

/**
 * The product advisor (docs/architecture/product-advisor.md). It reads a shopper's request,
 * searches the live catalogue with structured filters, and returns real products with the
 * recorded facts that make them match. With an AI provider configured, a model reads the request
 * and calls the same search tool; its picks are kept only when they came back from that tool, so
 * it can never invent a product, price or link. Without a provider (or when it fails), rule-based
 * reading of the request does the same job ("basic" mode). While the storefront shows no prices
 * (the request's `prices: false`), neither mode names a price or a budget.
 */
@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly ai: AnthropicClient | null;
  private vocabularyCache: { value: Vocabulary; expires: number } | null = null;

  constructor(
    private readonly catalog: CatalogService,
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    const apiKey = config.get('ANTHROPIC_API_KEY', { infer: true });
    this.ai = apiKey
      ? new AnthropicClient({
          apiBase: config.get('ASSISTANT_API_BASE', { infer: true }),
          apiKey,
          model: config.get('ASSISTANT_MODEL', { infer: true }),
        })
      : null;
  }

  get mode(): AssistantMode {
    return this.ai ? 'ai' : 'basic';
  }

  async recommend(input: AssistantInput): Promise<AssistantResponse> {
    const vocabulary = await this.vocabulary();
    const request = {
      ...input,
      message: redactPersonalData(input.message),
      history: input.history.map((turn) => ({ ...turn, text: redactPersonalData(turn.text) })),
    };
    if (this.ai) {
      try {
        const answer = await this.withAi(this.ai, request, vocabulary);
        if (answer) return answer;
      } catch (error) {
        // The shopper still gets an answer: rule-based matching over the same catalogue.
        this.logger.warn(
          { reason: error instanceof Error ? error.message : 'unknown' },
          'AI advisor unavailable',
        );
      }
    }
    return this.basic(request, vocabulary);
  }

  // ─── Rule-based answers ────────────────────────────────────────────────────

  private async basic(request: AssistantInput, vocabulary: Vocabulary): Promise<AssistantResponse> {
    const { locale, prices } = request;
    const texts = TEXTS[locale];
    const earlier = request.history
      .filter((turn) => turn.role === 'user')
      .map((turn) => parseRequest(turn.text, vocabulary));
    const merged = mergeRequests([...earlier, parseRequest(request.message, vocabulary)]);
    // Without prices on the storefront a budget cannot be honoured, so it is left out.
    const parsed = prices ? merged : { ...merged, maxPrice: null, minPrice: null };
    const filters = filtersFrom(parsed);
    const notes = parsed.unrecorded.map((quality) =>
      !prices && quality === 'quality' ? texts.noPrices.quality : texts.notes[quality],
    );

    const nothingAsked =
      !filters.category &&
      !filters.type &&
      filters.maxPrice === null &&
      filters.minPrice === null &&
      filters.formats.length === 0 &&
      Object.keys(filters.attributes).length === 0 &&
      !filters.origin &&
      !filters.text &&
      !parsed.gift;
    if (nothingAsked) {
      return {
        mode: 'basic',
        message: prices ? texts.ask : texts.noPrices.ask,
        criteria: this.criteria(filters, parsed.gift, locale, vocabulary),
        recommendations: [],
        notes,
        followUp: this.askCategory(locale, vocabulary, prices),
        relaxed: false,
      };
    }

    // Exact first; then fewer criteria, the least important first, until something matches.
    const attempts: {
      filters: SearchFilters;
      dropped: DroppedCriterion[];
      overBudget?: boolean;
    }[] = [];
    let current = filters;
    const dropped: DroppedCriterion[] = [];
    attempts.push({ filters: current, dropped: [] });
    if (current.text) {
      current = { ...current, text: null };
      dropped.push('text');
      attempts.push({ filters: current, dropped: [...dropped] });
    }
    if (Object.keys(current.attributes).length > 0) {
      current = { ...current, attributes: {} };
      dropped.push('attributes');
      attempts.push({ filters: current, dropped: [...dropped] });
    }
    if (current.formats.length > 0) {
      current = { ...current, formats: [] };
      dropped.push('formats');
      attempts.push({ filters: current, dropped: [...dropped] });
    }
    if (current.origin) {
      current = { ...current, origin: null };
      dropped.push('origin');
      attempts.push({ filters: current, dropped: [...dropped] });
    }
    if (current.maxPrice !== null && (current.category || current.type)) {
      attempts.push({
        filters: { ...current, maxPrice: null, minPrice: null, sort: 'price_asc' },
        dropped: [...dropped, 'budget'],
        overBudget: true,
      });
    }
    if (
      (current.category || current.type) &&
      (current.maxPrice !== null || current.minPrice !== null)
    ) {
      attempts.push({
        filters: { ...current, category: null, type: null },
        dropped: [...dropped, 'category'],
      });
    }

    for (const attempt of attempts) {
      const products = await this.search(attempt.filters, locale, MAX_PICKS, vocabulary);
      if (products.length === 0) continue;
      const details = await this.details(products, locale);
      const recommendations = products.map((product) => ({
        product,
        reasons: this.reasons(
          product,
          details.get(product.id) ?? null,
          attempt.filters,
          locale,
          prices,
        ),
      }));
      const relaxed = attempt.dropped.length > 0;
      let message = texts.found(products.length);
      if (attempt.overBudget && filters.maxPrice !== null) {
        message = texts.overBudget(formatSum(filters.maxPrice, locale));
      } else if (relaxed) {
        message = texts.relaxed(attempt.dropped.map((item) => texts.dropped[item]).join(', '));
      }
      if (filters.text && attempt.dropped.includes('text'))
        notes.push(texts.textRelaxed(filters.text));
      return {
        mode: 'basic',
        message,
        criteria: this.criteria(filters, parsed.gift, locale, vocabulary),
        recommendations,
        notes,
        followUp: attempt.overBudget
          ? texts.askAlternative
          : !filters.category && !filters.type
            ? this.askCategory(locale, vocabulary, prices)
            : prices && filters.maxPrice === null && filters.minPrice === null
              ? texts.askBudget
              : null,
        relaxed,
      };
    }
    return {
      mode: 'basic',
      message: texts.none,
      criteria: this.criteria(filters, parsed.gift, locale, vocabulary),
      recommendations: [],
      notes,
      followUp: prices ? texts.askAlternative : texts.noPrices.askAlternative,
      relaxed: true,
    };
  }

  /** Why a product matches, from recorded facts only (its price only when the store shows prices). */
  private reasons(
    product: ProductSummaryDto,
    detail: ProductDetailDto | null,
    filters: SearchFilters,
    locale: Locale,
    prices: boolean,
  ): string[] {
    const texts = TEXTS[locale];
    const reasons: string[] = [];
    if (prices) {
      const price = formatSum(Number(product.priceFrom), locale);
      if (filters.maxPrice !== null) {
        reasons.push(texts.withinBudget(price, formatSum(filters.maxPrice, locale)));
      } else if (filters.minPrice !== null) {
        reasons.push(texts.aboveFloor(price, formatSum(filters.minPrice, locale)));
      } else {
        reasons.push(texts.price(price, product.variantCount <= 1));
      }
    }
    reasons.push(texts.inCategory(product.category.name));
    if (product.format !== 'OTHER') reasons.push(texts.format[product.format]);
    for (const [key, values] of Object.entries(filters.attributes)) {
      const attribute = detail?.attributes.find((entry) => entry.key === key);
      if (!attribute) continue;
      const value =
        attribute.boolean !== null
          ? attribute.boolean
            ? texts.yes
            : texts.no
          : attribute.options.map((option) => option.label).join(', ');
      if (value && values.length > 0) reasons.push(texts.attribute(attribute.label, value));
    }
    if (detail?.brewing) {
      const parts: string[] = [];
      if (detail.brewing.temperatureCelsius)
        parts.push(
          texts.temperature(
            detail.brewing.temperatureCelsius,
            detail.brewing.temperatureMaxCelsius,
          ),
        );
      if (detail.brewing.timeMinSeconds) {
        parts.push(
          texts.minutes(
            Math.round(detail.brewing.timeMinSeconds / 60),
            detail.brewing.timeMaxSeconds ? Math.round(detail.brewing.timeMaxSeconds / 60) : null,
          ),
        );
      }
      if (detail.brewing.amountGrams)
        parts.push(
          texts.amount(
            Number(detail.brewing.amountGrams).toString(),
            detail.brewing.amountMaxGrams ? Number(detail.brewing.amountMaxGrams).toString() : null,
          ),
        );
      if (parts.length > 0) reasons.push(texts.brewing(parts));
    }
    if (detail?.origin) reasons.push(texts.origin(detail.origin));
    if (filters.text) reasons.push(texts.textMatch(filters.text));
    if (product.stockLevel === 'in_stock') reasons.push(texts.inStock);
    if (product.stockLevel === 'low_stock') reasons.push(texts.lowStock);
    return reasons.slice(0, 6);
  }

  private askCategory(locale: Locale, vocabulary: Vocabulary, prices: boolean): string | null {
    const names = vocabulary.topLevel
      .map((category) => category.names[locale] ?? category.names.uz)
      .filter((name): name is string => Boolean(name))
      .slice(0, 5);
    if (names.length > 0) return TEXTS[locale].askCategory(names.join(', '));
    return prices ? TEXTS[locale].askBudget : null;
  }

  private criteria(
    filters: SearchFilters,
    gift: boolean,
    locale: Locale,
    vocabulary: Vocabulary,
  ): AssistantCriteria {
    const category = filters.category ? vocabulary.categoryLabels.get(filters.category) : undefined;
    const place = filters.origin ? vocabulary.places.get(filters.origin) : undefined;
    return {
      maxPrice: filters.maxPrice,
      minPrice: filters.minPrice,
      category:
        filters.category && category
          ? {
              slug: filters.category,
              name: category.names[locale] ?? category.names.uz ?? filters.category,
              path: category.path,
            }
          : null,
      formats: filters.formats,
      attributes: Object.entries(filters.attributes).flatMap(([key, values]) => {
        const labels = vocabulary.attributeLabels.get(key);
        if (!labels) return [];
        return [
          {
            key,
            label: labels.names[locale] ?? labels.names.uz ?? key,
            values: values.map((value) => {
              const option = labels.options.get(value);
              const label =
                option?.[locale] ??
                option?.uz ??
                (value === 'true'
                  ? TEXTS[locale].yes
                  : value === 'false'
                    ? TEXTS[locale].no
                    : value);
              return { key: value, label };
            }),
          },
        ];
      }),
      origin: place ? (place.names[locale] ?? place.names.uz ?? filters.origin) : null,
      query: filters.text,
      gift,
      inStockOnly: filters.inStockOnly,
    };
  }

  // ─── Catalogue access (shared by both modes) ───────────────────────────────

  private async search(
    filters: SearchFilters,
    locale: Locale,
    limit: number,
    vocabulary: Vocabulary,
  ): Promise<ProductSummaryDto[]> {
    const place = filters.origin ? vocabulary.places.get(filters.origin) : undefined;
    const query = productListQuerySchema.parse({
      locale,
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.formats.length > 0 ? { format: filters.formats } : {}),
      ...(filters.minPrice !== null ? { minPrice: filters.minPrice } : {}),
      ...(filters.maxPrice !== null ? { maxPrice: filters.maxPrice } : {}),
      ...(filters.inStockOnly ? { inStock: 'true' } : {}),
      ...(Object.keys(filters.attributes).length > 0 ? { attributes: filters.attributes } : {}),
      ...(filters.text ? { q: filters.text } : {}),
      sort: filters.sort,
      // The catalogue has no origin filter: a place's products are picked from a full page.
      pageSize: place ? 48 : limit,
    });
    const items = (await this.catalog.listProducts(query)).items;
    return place ? items.filter((item) => place.productIds.has(item.id)).slice(0, limit) : items;
  }

  private async details(
    products: ProductSummaryDto[],
    locale: Locale,
  ): Promise<Map<string, ProductDetailDto>> {
    const entries = await Promise.all(
      products.map(async (product) => {
        try {
          return [product.id, await this.catalog.getProduct(product.slug, locale)] as const;
        } catch {
          return null;
        }
      }),
    );
    return new Map(entries.filter((entry) => entry !== null));
  }

  /** Categories, product types and filterable attributes, as the request parser needs them. */
  private async vocabulary(): Promise<Vocabulary> {
    const now = Date.now();
    if (this.vocabularyCache && this.vocabularyCache.expires > now)
      return this.vocabularyCache.value;
    const [categories, uzCategories, types, attributes, origins, productCount] = await Promise.all([
      this.prisma.category.findMany({
        where: { isActive: true, OR: [{ parentId: null }, { parent: { isActive: true } }] },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: {
          slug: true,
          parent: { select: { slug: true } },
          translations: { select: { locale: true, name: true } },
        },
      }),
      this.catalog.listCategories('uz'),
      this.prisma.productType.findMany({
        where: { isActive: true },
        select: { key: true, translations: { select: { name: true } } },
      }),
      this.prisma.attributeDefinition.findMany({
        where: {
          isFilterable: true,
          kind: { in: ['SELECT', 'MULTI_SELECT', 'BOOLEAN'] },
          productType: { isActive: true },
        },
        select: {
          key: true,
          kind: true,
          translations: { select: { locale: true, label: true } },
          options: {
            select: { key: true, translations: { select: { locale: true, label: true } } },
          },
        },
      }),
      this.prisma.productTranslation.findMany({
        where: { origin: { not: null }, product: visibleProductWhere() },
        select: { productId: true, locale: true, origin: true },
      }),
      this.prisma.product.count({ where: visibleProductWhere() }),
    ]);
    const places = originPlaces(origins, productCount);
    const withProducts = new Set(
      uzCategories.filter((category) => category.productCount > 0).map((category) => category.slug),
    );
    const names = (rows: readonly { locale: string; name?: string; label?: string }[]) =>
      Object.fromEntries(rows.map((row) => [row.locale, row.name ?? row.label ?? ''])) as Partial<
        Record<Locale, string>
      >;
    const value: Vocabulary = {
      categories: categories
        .filter((category) => withProducts.has(category.slug))
        .map((category) => ({
          slug: category.slug,
          path: category.parent ? `${category.parent.slug}/${category.slug}` : category.slug,
          parentSlug: category.parent?.slug ?? null,
          names: category.translations.map((translation) => translation.name),
        })),
      productTypes: types.map((type) => ({
        key: type.key,
        names: type.translations.map((translation) => translation.name),
      })),
      attributes: attributes.map((attribute) => ({
        key: attribute.key,
        kind: attribute.kind as 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN',
        labels: attribute.translations.map((translation) => translation.label),
        options: attribute.options.map((option) => ({
          key: option.key,
          labels: option.translations.map((translation) => translation.label),
        })),
      })),
      categoryLabels: new Map(
        categories.map((category) => [
          category.slug,
          {
            path: category.parent ? `${category.parent.slug}/${category.slug}` : category.slug,
            names: names(category.translations),
          },
        ]),
      ),
      attributeLabels: new Map(
        attributes.map((attribute) => [
          attribute.key,
          {
            names: names(attribute.translations),
            options: new Map(
              attribute.options.map((option) => [option.key, names(option.translations)]),
            ),
          },
        ]),
      ),
      topLevel: categories
        .filter((category) => !category.parent && withProducts.has(category.slug))
        .map((category) => ({ slug: category.slug, names: names(category.translations) })),
      origins: [...places].map(([key, place]) => ({
        key,
        names: Object.values(place.names).filter((name): name is string => Boolean(name)),
      })),
      places,
    };
    this.vocabularyCache = { value, expires: now + VOCABULARY_TTL_MS };
    return value;
  }

  // ─── AI answers ────────────────────────────────────────────────────────────

  private async withAi(
    client: AnthropicClient,
    request: AssistantInput,
    vocabulary: Vocabulary,
  ): Promise<AssistantResponse | null> {
    const { locale, prices } = request;
    const signal = AbortSignal.timeout(AI_TIMEOUT_MS);
    const tools = this.tools(vocabulary, locale, prices);
    const messages: ChatMessage[] = [
      ...request.history.map((turn) => ({ role: turn.role, content: turn.text })),
      { role: 'user', content: request.message },
    ];
    const seen = new Map<string, ProductSummaryDto>();
    let lastFilters: SearchFilters | null = null;

    for (let turn = 0; turn < AI_TURNS; turn += 1) {
      const reply = await client.create({
        system: systemPrompt(locale, prices),
        messages,
        tools,
        maxTokens: 1200,
        signal,
      });
      const uses = reply.content.filter(
        (block): block is Extract<ContentBlock, { type: 'tool_use' }> => block.type === 'tool_use',
      );
      const final = uses.find((use) => use.name === 'recommend');
      if (final) {
        return this.fromAiAnswer(final.input, seen, lastFilters, locale, vocabulary, prices);
      }
      if (uses.length === 0) {
        const text = reply.content
          .filter(
            (block): block is Extract<ContentBlock, { type: 'text' }> => block.type === 'text',
          )
          .map((block) => block.text)
          .join('\n')
          .trim();
        // An answer naming a price the store does not show gives way to the rule-based one.
        if (!text || (!prices && MONEY.test(text))) return null;
        return {
          mode: 'ai',
          message: clean(text, 700),
          criteria: this.criteria(lastFilters ?? emptyFilters(), false, locale, vocabulary),
          recommendations: [],
          notes: [],
          followUp: null,
          relaxed: false,
        };
      }
      messages.push({ role: 'assistant', content: reply.content });
      const results: ContentBlock[] = [];
      for (const use of uses) {
        const filters =
          use.name === 'search_catalog' ? toolFilters(use.input, vocabulary, prices) : null;
        if (!filters) {
          results.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content:
              'Invalid request: use search_catalog with the documented filters, then recommend.',
            is_error: true,
          });
          continue;
        }
        lastFilters = filters;
        const products = await this.search(filters, locale, 8, vocabulary);
        const details = await this.details(products, locale);
        for (const product of products) seen.set(product.id, product);
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: JSON.stringify({
            count: products.length,
            products: products.map((product) =>
              compactProduct(product, details.get(product.id), prices),
            ),
          }),
        });
      }
      messages.push({ role: 'user', content: results });
    }
    return null;
  }

  /** The model's final answer, kept only as far as it refers to products the tool returned. */
  private fromAiAnswer(
    input: unknown,
    seen: Map<string, ProductSummaryDto>,
    filters: SearchFilters | null,
    locale: Locale,
    vocabulary: Vocabulary,
    prices: boolean,
  ): AssistantResponse | null {
    const parsed = aiAnswerSchema.safeParse(input);
    if (!parsed.success) return null;
    const { message, notes, followUp } = parsed.data;
    // An answer naming a price the store does not show gives way to the rule-based one.
    if (!prices && [message, followUp ?? '', ...notes].some((text) => MONEY.test(text))) {
      return null;
    }
    const recommendations: AssistantRecommendation[] = [];
    for (const pick of parsed.data.picks) {
      const product = seen.get(pick.productId);
      if (!product || recommendations.some((entry) => entry.product.id === product.id)) continue;
      const factual = this.reasons(product, null, filters ?? emptyFilters(), locale, prices).slice(
        0,
        2,
      );
      const explained = pick.reasons
        .map((reason) => clean(reason, 200))
        .filter((reason) => reason && !CLAIM_WORDS.test(reason) && (prices || !MONEY.test(reason)))
        .slice(0, 3);
      recommendations.push({ product, reasons: [...factual, ...explained] });
      if (recommendations.length >= MAX_PICKS) break;
    }
    return {
      mode: 'ai',
      message: clean(message, 700),
      criteria: this.criteria(filters ?? emptyFilters(), false, locale, vocabulary),
      recommendations,
      notes: notes.map((note) => clean(note, 300)).filter(Boolean),
      followUp: followUp ? clean(followUp, 300) : null,
      relaxed: false,
    };
  }

  private tools(vocabulary: Vocabulary, locale: Locale, prices: boolean): ToolDefinition[] {
    const label = (names: Partial<Record<Locale, string>>, fallback: string) =>
      names[locale] ?? names.uz ?? fallback;
    const categoryList = vocabulary.categories
      .map((category) => {
        const labels = vocabulary.categoryLabels.get(category.slug);
        return `${category.slug} (${labels ? label(labels.names, category.slug) : category.slug}${category.parentSlug ? `, in ${category.parentSlug}` : ''})`;
      })
      .join('; ');
    const attributeList = vocabulary.attributes
      .map((attribute) => {
        const labels = vocabulary.attributeLabels.get(attribute.key);
        const options =
          attribute.kind === 'BOOLEAN'
            ? 'true|false'
            : attribute.options
                .map(
                  (option) =>
                    `${option.key}=${labels ? label(labels.options.get(option.key) ?? {}, option.key) : option.key}`,
                )
                .join(', ');
        return `${attribute.key} (${labels ? label(labels.names, attribute.key) : attribute.key}): ${options}`;
      })
      .join('; ');
    return [
      {
        name: 'search_catalog',
        description:
          'Search the TERAN store’s current catalogue. Returns only published, purchasable products ' +
          (prices
            ? 'with real prices in UZS and their recorded facts. '
            : 'and their recorded facts. ') +
          `Categories: ${categoryList || 'none'}. ` +
          `Product types: ${vocabulary.productTypes.map((type) => type.key).join(', ') || 'none'}. ` +
          `Filterable attributes (key: option keys): ${attributeList || 'none'}.`,
        input_schema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: vocabulary.categories.map((category) => category.slug),
            },
            productType: { type: 'string', enum: vocabulary.productTypes.map((type) => type.key) },
            ...(prices
              ? {
                  maxPrice: { type: 'integer', minimum: 0, description: 'Budget ceiling in UZS' },
                  minPrice: { type: 'integer', minimum: 0 },
                }
              : {}),
            formats: { type: 'array', items: { type: 'string', enum: [...PRODUCT_FORMATS] } },
            attributes: {
              type: 'object',
              description: 'Attribute key → option keys (or "true"/"false" for yes/no attributes)',
              additionalProperties: { type: 'array', items: { type: 'string' } },
            },
            text: {
              type: 'string',
              description: 'One word to look for in names, descriptions and tasting notes',
            },
            inStockOnly: { type: 'boolean' },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'recommend',
        description:
          'Give the final answer: up to 4 products from search results (by productId), each with ' +
          'short reasons drawn only from the facts the search returned; notes about anything the ' +
          'catalogue does not record; an optional short follow-up question.',
        input_schema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'One or two sentences to the shopper' },
            picks: {
              type: 'array',
              maxItems: MAX_PICKS,
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  reasons: { type: 'array', maxItems: 3, items: { type: 'string' } },
                },
                required: ['productId', 'reasons'],
              },
            },
            notes: { type: 'array', maxItems: 4, items: { type: 'string' } },
            followUp: { type: ['string', 'null'] },
          },
          required: ['message', 'picks', 'notes', 'followUp'],
        },
      },
    ];
  }
}

const aiAnswerSchema = z.object({
  message: z.string().min(1).max(2000),
  picks: z
    .array(z.object({ productId: z.string(), reasons: z.array(z.string()).max(6).default([]) }))
    .max(10)
    .default([]),
  notes: z.array(z.string()).max(6).default([]),
  followUp: z.string().nullable().default(null),
});

const toolInputSchema = z
  .object({
    category: z.string().optional(),
    productType: z.string().optional(),
    maxPrice: z.number().int().min(0).max(1_000_000_000).optional(),
    minPrice: z.number().int().min(0).max(1_000_000_000).optional(),
    formats: z.array(z.enum(PRODUCT_FORMATS)).max(6).optional(),
    attributes: z.record(z.string(), z.array(z.string()).max(10)).optional(),
    text: z.string().trim().min(2).max(40).optional(),
    inStockOnly: z.boolean().optional(),
  })
  .strict();

/**
 * The model's search request, accepted only with filters the catalogue really has (and without a
 * budget while the store shows no prices).
 */
function toolFilters(
  input: unknown,
  vocabulary: Vocabulary,
  prices: boolean,
): SearchFilters | null {
  const parsed = toolInputSchema.safeParse(input);
  if (!parsed.success) return null;
  const value = parsed.data;
  if (
    value.category &&
    !vocabulary.categories.some((category) => category.slug === value.category)
  ) {
    return null;
  }
  if (
    value.productType &&
    !vocabulary.productTypes.some((type) => type.key === value.productType)
  ) {
    return null;
  }
  const attributes: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(value.attributes ?? {})) {
    const attribute = vocabulary.attributes.find((entry) => entry.key === key);
    if (!attribute) return null;
    const allowed =
      attribute.kind === 'BOOLEAN'
        ? ['true', 'false']
        : attribute.options.map((option) => option.key);
    if (!values.every((entry) => allowed.includes(entry))) return null;
    attributes[key] = values;
  }
  return {
    category: value.category ?? null,
    type: value.productType ?? null,
    formats: value.formats ?? [],
    minPrice: prices ? (value.minPrice ?? null) : null,
    maxPrice: prices ? (value.maxPrice ?? null) : null,
    attributes,
    origin: null,
    text: value.text ? normalize(value.text) : null,
    inStockOnly: value.inStockOnly ?? true,
    sort: 'featured',
  };
}

function emptyFilters(): SearchFilters {
  return {
    category: null,
    type: null,
    formats: [],
    minPrice: null,
    maxPrice: null,
    attributes: {},
    origin: null,
    text: null,
    inStockOnly: true,
    sort: 'featured',
  };
}

function filtersFrom(parsed: ParsedRequest): SearchFilters {
  const formats = [...parsed.formats];
  if (parsed.gift && !parsed.categorySlug && !formats.includes('GIFT_SET'))
    formats.push('GIFT_SET');
  return {
    category: parsed.categorySlug,
    type: parsed.categorySlug ? null : parsed.productTypeKey,
    formats,
    minPrice: parsed.minPrice,
    maxPrice: parsed.maxPrice,
    attributes: parsed.attributes,
    origin: parsed.origin,
    text: parsed.textQuery,
    inStockOnly: true,
    sort: 'featured',
  };
}

/** Later requests refine earlier ones: a value given again replaces the earlier one. */
function mergeRequests(requests: ParsedRequest[]): ParsedRequest {
  const merged: ParsedRequest = {
    maxPrice: null,
    minPrice: null,
    categorySlug: null,
    productTypeKey: null,
    formats: [],
    gift: false,
    attributes: {},
    origin: null,
    textQuery: null,
    unrecorded: [],
  };
  for (const request of requests) {
    if (request.maxPrice !== null || request.minPrice !== null) {
      merged.maxPrice = request.maxPrice;
      merged.minPrice = request.minPrice;
    }
    if (request.categorySlug) {
      merged.categorySlug = request.categorySlug;
      merged.productTypeKey = null;
    } else if (request.productTypeKey) {
      merged.productTypeKey = request.productTypeKey;
    }
    if (request.formats.length > 0) merged.formats = request.formats;
    merged.gift = merged.gift || request.gift;
    merged.attributes = { ...merged.attributes, ...request.attributes };
    if (request.origin) merged.origin = request.origin;
    if (request.textQuery) merged.textQuery = request.textQuery;
    merged.unrecorded = [...new Set([...merged.unrecorded, ...request.unrecorded])];
  }
  return merged;
}

/**
 * Places products come from, from their recorded origin ("Xitoy, Yunnan" / "Китай, Юньнань"):
 * each comma-separated part is a place, named in each language by the part at the same position.
 * A place every visible product shares (the country, in a one-country catalogue) cannot narrow a
 * choice and is left out.
 */
function originPlaces(
  rows: readonly { productId: string; locale: string; origin: string | null }[],
  productCount: number,
): Vocabulary['places'] {
  const parts = new Map<string, Map<string, string[]>>();
  for (const row of rows) {
    if (!row.origin) continue;
    const byLocale = parts.get(row.productId) ?? new Map<string, string[]>();
    byLocale.set(
      row.locale,
      row.origin
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    );
    parts.set(row.productId, byLocale);
  }
  const places: Vocabulary['places'] = new Map();
  for (const [productId, byLocale] of parts) {
    const reference = byLocale.get('uz') ?? [...byLocale.values()][0] ?? [];
    reference.forEach((part, index) => {
      const key = normalize(part);
      const place = places.get(key) ?? { names: {}, productIds: new Set<string>() };
      for (const [locale, names] of byLocale) {
        const name = names[index];
        if (name) place.names[locale as Locale] ??= name;
      }
      place.productIds.add(productId);
      places.set(key, place);
    });
  }
  for (const [key, place] of places) if (place.productIds.size >= productCount) places.delete(key);
  return places;
}

/** What the model sees of a product: facts only, compact (no price while the store shows none). */
function compactProduct(
  product: ProductSummaryDto,
  detail: ProductDetailDto | undefined,
  prices: boolean,
) {
  return {
    productId: product.id,
    name: product.name,
    category: product.category.name,
    format: product.format,
    ...(prices ? { priceFromUzs: Math.round(Number(product.priceFrom)) } : {}),
    packCount: product.variantCount,
    stock: product.stockLevel,
    shortDescription: product.shortDescription?.slice(0, 240) ?? null,
    attributes:
      detail?.attributes.map((attribute) => ({
        name: attribute.label,
        value:
          attribute.options.map((option) => option.label).join(', ') ||
          attribute.text ||
          (attribute.boolean === null ? attribute.number : String(attribute.boolean)),
      })) ?? [],
    brewing: detail?.brewing ?? null,
    origin: detail?.origin ?? null,
    tastingNotes: detail?.tastingNotes?.slice(0, 200) ?? null,
  };
}

/** Plain text from the model: no markup, bounded length. */
function clean(text: string, max: number): string {
  const plain = text
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
}

function systemPrompt(locale: Locale, prices: boolean): string {
  const language =
    locale === 'ru' ? 'Russian' : locale === 'en' ? 'English' : 'Uzbek (Latin script)';
  const facts = `${prices ? 'price, ' : ''}category, format, attributes, brewing guide, origin, tasting notes`;
  return [
    "You are the product advisor of TERAN's online store (Premium Chinese Tea, Uzbekistan).",
    "Help the shopper choose from the store's current catalogue. Rules:",
    '1. Always find products with search_catalog. Never mention a product, price, pack size or stock level the tool did not return.',
    '2. Finish with the recommend tool: at most 4 picks, only by productId from search results.',
    `3. Explain picks only with facts from the results (${facts}). Never claim a quality grade, certification, health or medical benefit, or any property the results do not state.`,
    '4. If the shopper asks for something the catalogue does not record (e.g. how mild a tea is, a quality grade), say so briefly in notes and use the facts that exist.',
    prices
      ? "5. Prices are in Uzbek so'm (UZS). A budget is a maxPrice."
      : '5. The store shows no prices at the moment: never mention a price, budget or cost. If the shopper asks about one, say TERAN tells it when they order by phone or message.',
    '6. If the request is unclear or nothing matches, ask one short follow-up question.',
    '7. You only recommend; you never take orders or ask for personal data.',
    `8. Write to the shopper in ${language}, briefly and warmly.`,
  ].join('\n');
}
