import { z } from 'zod';
import { localeSchema } from './common.js';
import type { ProductSummaryDto } from './catalog.js';
import type { ProductFormat } from './constants.js';

/**
 * The product advisor: a visitor describes what they want ("a mild green tea under 100 000 so'm")
 * and gets products from the live catalogue, each with the recorded facts that make it match.
 * It recommends; ordering stays in the normal store.
 */
export const assistantTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(1000),
});
export type AssistantTurn = z.infer<typeof assistantTurnSchema>;

export const assistantRequestSchema = z.object({
  locale: localeSchema.default('uz'),
  message: z.string().trim().min(2).max(500),
  /** Earlier turns of this conversation, oldest first (kept only by the visitor's browser). */
  history: z.array(assistantTurnSchema).max(8).default([]),
  /**
   * Whether the storefront shows prices. When it does not, answers name no price or budget and
   * any budget in the request is left out.
   */
  prices: z.boolean().default(true),
});
export type AssistantRequest = z.input<typeof assistantRequestSchema>;

/** What the advisor understood from the request, shown back to the visitor. */
export interface AssistantCriteria {
  /** Whole so'm. */
  maxPrice: number | null;
  minPrice: number | null;
  category: { slug: string; name: string; path: string } | null;
  formats: ProductFormat[];
  /** Recorded attributes the request maps to (e.g. leaf style). */
  attributes: { key: string; label: string; values: { key: string; label: string }[] }[];
  /** A place of origin asked for, as products record it ("Yunnan"); absent from older answers. */
  origin?: string | null;
  /** Words looked up in names and descriptions. */
  query: string | null;
  /** The visitor is choosing a gift. */
  gift: boolean;
  inStockOnly: boolean;
}

export interface AssistantRecommendation {
  product: ProductSummaryDto;
  /** Why it matches, built from recorded facts only (price, category, attributes, brewing). */
  reasons: string[];
}

/**
 * ai: an AI model read the request and searched the catalogue through the advisor's tools;
 * basic: rule-based matching, used when no AI provider is configured or it is unavailable.
 */
export const ASSISTANT_MODES = ['ai', 'basic'] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

export interface AssistantResponse {
  mode: AssistantMode;
  message: string;
  criteria: AssistantCriteria;
  recommendations: AssistantRecommendation[];
  /** Limits worth knowing, e.g. a property the catalogue does not record. */
  notes: string[];
  /** A short question when the request is ambiguous or nothing matched exactly. */
  followUp: string | null;
  /** Some criteria were dropped to find anything at all (the message says which). */
  relaxed: boolean;
}
