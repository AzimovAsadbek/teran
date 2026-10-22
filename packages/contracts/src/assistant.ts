import { z } from 'zod';
import type { CategoryRefDto, ProductSummaryDto } from './catalog.js';
import { localeSchema } from './common.js';

/**
 * TERAN's AI assistant in the chat window (ADR-055): a visitor asks about TERAN, its products,
 * ordering or delivery, and Gemini answers from what the site knows — the live catalogue, the
 * contacts, stores and delivery methods, and what TERAN wrote for it in Admin → Settings. The
 * products and categories it names come back as cards and links. It answers; ordering stays with
 * the store's own forms.
 */
export const assistantTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(2000),
});
export type AssistantTurn = z.infer<typeof assistantTurnSchema>;

export const assistantChatSchema = z.object({
  locale: localeSchema.default('uz'),
  message: z.string().trim().min(2).max(500),
  /** Earlier turns of this conversation, oldest first (kept only by the visitor's browser). */
  history: z.array(assistantTurnSchema).max(10).default([]),
  /**
   * Whether the storefront shows prices. When it does not, answers name no price and point to
   * ordering by the order form or a message instead.
   */
  prices: z.boolean().default(false),
});
export type AssistantChatInput = z.input<typeof assistantChatSchema>;

/** Pages of the site an answer can point to (the storefront knows their addresses). */
export const ASSISTANT_LINKS = [
  'catalog',
  'delivery',
  'contact',
  'wholesale',
  'about',
  'faq',
  'stores',
  'tea101',
  'returns',
  'journal',
] as const;
export const assistantLinkSchema = z.enum(ASSISTANT_LINKS);
export type AssistantLink = z.infer<typeof assistantLinkSchema>;

export interface AssistantReplyDto {
  /** The answer in plain text, in the visitor's language; paragraphs are separated by newlines. */
  reply: string;
  /** The products the answer names, best first (at most four, all visible in the store). */
  products: ProductSummaryDto[];
  /** Categories the answer points to (at most two). */
  categories: CategoryRefDto[];
  links: AssistantLink[];
}
