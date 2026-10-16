import { z } from 'zod';
import { localeSchema } from './common.js';
import { illustrationKeySchema, imageSchema } from './catalog.js';

const localizedText = (max: number) =>
  z.object({
    uz: z.string().trim().max(max),
    ru: z.string().trim().max(max),
    en: z.string().trim().max(max),
  });

/**
 * Site settings editable from the admin area. Every value is optional: contact channels and
 * company details are only shown publicly once TERAN fills them in with verified information.
 */
export const announcementSettingSchema = z.object({
  enabled: z.boolean(),
  text: localizedText(160),
  /** Optional internal link path, e.g. "/catalog". External links are not allowed. */
  href: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/[a-z0-9\-/?=&]*$/i, { error: 'internal_path_only' })
    .nullable(),
});
export type AnnouncementSetting = z.infer<typeof announcementSettingSchema>;

export const contactSettingSchema = z.object({
  phone: z.string().trim().max(30).nullable(),
  email: z.email().max(254).nullable(),
  telegram: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9_]{5,32}$/, { error: 'invalid_telegram' })
    .nullable(),
  instagram: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9_.]{1,30}$/, { error: 'invalid_instagram' })
    .nullable(),
  address: localizedText(300).nullable(),
  workingHours: localizedText(160).nullable(),
});
export type ContactSetting = z.infer<typeof contactSettingSchema>;

export const SETTING_KEYS = ['announcement', 'contact'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export const publicSettingsSchema = z.object({
  announcement: z.object({ text: z.string(), href: z.string().nullable() }).nullable(),
  contact: z.object({
    phone: z.string().nullable(),
    email: z.string().nullable(),
    telegram: z.string().nullable(),
    instagram: z.string().nullable(),
    address: z.string().nullable(),
    workingHours: z.string().nullable(),
  }),
});
export type PublicSettingsDto = z.infer<typeof publicSettingsSchema>;

// ─── Journal articles ───────────────────────────────────────────────────────

export const articleSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  excerpt: z.string().nullable(),
  illustrationKey: illustrationKeySchema.nullable(),
  /** The cover picture (required to publish since 2026-10; older articles may have none). */
  cover: imageSchema.nullable().default(null),
  /** Chosen for the home page's journal section. */
  isFeatured: z.boolean().default(false),
  publishedAt: z.string(),
});
export type ArticleSummaryDto = z.infer<typeof articleSummarySchema>;

export const articleListQuerySchema = z.object({
  locale: localeSchema.default('uz'),
  /** Featured articles first (the home page). */
  featuredFirst: z.stringbool().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(9),
});

// ─── Media ("Lavhalar": photographs and short films) ───────────────────────

export const MEDIA_KINDS = ['PHOTO', 'VIDEO'] as const;
export const mediaKindSchema = z.enum(MEDIA_KINDS);
export type MediaKind = z.infer<typeof mediaKindSchema>;

/** Video files the storefront plays (MP4 with H.264/AAC, or WebM). */
export const MEDIA_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;

export const mediaItemSchema = z.object({
  id: z.uuid(),
  kind: mediaKindSchema,
  title: z.string(),
  caption: z.string().nullable(),
  /** The photograph, or the video's poster frame (renditions like product images). */
  image: imageSchema,
  /** Videos only: the file, played when the visitor starts it (never automatically with sound). */
  video: z
    .object({
      src: z.string(),
      type: z.enum(MEDIA_VIDEO_TYPES),
      durationSeconds: z.number().int().nullable(),
      /** Optional subtitles (WebVTT), offered as a track the visitor can switch on. */
      captions: z.object({ src: z.string(), srclang: localeSchema }).nullable().default(null),
    })
    .nullable(),
  publishedAt: z.string(),
});
export type MediaItemDto = z.infer<typeof mediaItemSchema>;

/** An article page: its text, and the gallery items chosen to go with it (published ones only). */
export const articleDetailSchema = articleSummarySchema.extend({
  body: z.string(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  updatedAt: z.string(),
  media: z.array(mediaItemSchema).default([]),
});
export type ArticleDetailDto = z.infer<typeof articleDetailSchema>;

export const mediaListQuerySchema = z.object({
  locale: localeSchema.default('uz'),
  kind: mediaKindSchema.optional(),
  /** Only the items chosen for the home page. */
  featured: z.stringbool().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(24),
});
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;
