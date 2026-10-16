import type { ImageDto } from './catalog.js';

// ─── Publication readiness ──────────────────────────────────────────────────

/**
 * What an item needs before it can go public, per content type. `required` items block
 * publishing (the API answers PUBLICATION_BLOCKED with the failing codes); the others are
 * recommendations shown in the admin checklist.
 */
export const READINESS_CODES = [
  // Shared
  'name',
  'title',
  'slug',
  'translations',
  'seoDescription',
  // Products
  'category',
  'activeVariant',
  'price',
  'mainImage',
  'imageAlt',
  'requiredAttributes',
  'shortDescription',
  // Articles
  'body',
  'cover',
  'coverAlt',
  'excerpt',
  // Gallery
  'image',
  'altText',
  'caption',
  'video',
  'poster',
  'duration',
  'captions',
  // Categories and collections
  'parent',
  'description',
] as const;
export type ReadinessCode = (typeof READINESS_CODES)[number];

export interface ReadinessItem {
  code: ReadinessCode;
  /** Publishing is blocked while a required item is not met. */
  required: boolean;
  ok: boolean;
  /** The editor field to jump to (an element id), when there is one. */
  field: string | null;
  /** Names of what is missing, when the item covers several things (e.g. attributes). */
  detail?: string[];
}

export interface Readiness {
  /** Every required item is met: the item can be published. */
  ready: boolean;
  items: ReadinessItem[];
}

export function readiness(items: ReadinessItem[]): Readiness {
  return { ready: items.every((item) => !item.required || item.ok), items };
}

/** The codes of the required items that are not met (sent with PUBLICATION_BLOCKED). */
export function missingRequired(result: Readiness): ReadinessCode[] {
  return result.items.filter((item) => item.required && !item.ok).map((item) => item.code);
}

// ─── Telegram channel ───────────────────────────────────────────────────────

/**
 * disabled: nothing is composed or sent. dry-run: posts are composed and recorded as sent, but
 * Telegram is never contacted. live: posts are delivered with the configured bot and channel.
 */
export const TELEGRAM_MODES = ['disabled', 'dry-run', 'live'] as const;
export type TelegramMode = (typeof TELEGRAM_MODES)[number];

export const TELEGRAM_POST_STATUSES = ['PENDING', 'SENDING', 'SENT', 'FAILED'] as const;
export type TelegramPostStatus = (typeof TELEGRAM_POST_STATUSES)[number];

export const TELEGRAM_ENTITIES = ['PRODUCT', 'ARTICLE'] as const;
export type TelegramEntity = (typeof TELEGRAM_ENTITIES)[number];

/** A post's delivery state as shown next to the item in the admin area. */
export interface AdminTelegramStatus {
  id: string;
  status: TelegramPostStatus;
  dryRun: boolean;
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** FAILED posts can be retried; a SENT post is never sent again. */
  canRetry: boolean;
}

export interface AdminTelegramPost extends AdminTelegramStatus {
  entityType: TelegramEntity;
  entityId: string;
  /** The product's name or the article's title (Uzbek), null when the item no longer exists. */
  entityTitle: string | null;
  messageIds: string[];
  /** The text as sent (or as it would have been, in dry-run mode). */
  text: string | null;
}

export interface AdminTelegramPostList {
  mode: TelegramMode;
  /** The configured channel (a public @username or a numeric id), null when not configured. */
  channel: string | null;
  items: AdminTelegramPost[];
  page: number;
  pageSize: number;
  total: number;
}

/** What would be posted for an item, before anything is sent. */
export interface TelegramPreview {
  mode: TelegramMode;
  /** HTML text (Telegram's subset) of the caption or message. */
  text: string;
  image: ImageDto | null;
  /** A photo caption holds 1024 characters; longer posts go as a photo plus a text message. */
  parts: 1 | 2;
  /** The item can be announced now (published, announcement enabled, not announced before). */
  eligible: boolean;
  /** Why it cannot be announced now, as readiness-like codes. */
  blockers: TelegramBlocker[];
}

export const TELEGRAM_BLOCKERS = [
  'disabled',
  'not_published',
  'not_enabled',
  'already_sent',
  'incomplete',
] as const;
export type TelegramBlocker = (typeof TELEGRAM_BLOCKERS)[number];
