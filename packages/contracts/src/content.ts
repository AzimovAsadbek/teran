import { z } from 'zod';
import { localeSchema } from './common.js';
import { illustrationKeySchema } from './catalog.js';

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
  publishedAt: z.string(),
});
export type ArticleSummaryDto = z.infer<typeof articleSummarySchema>;

export const articleDetailSchema = articleSummarySchema.extend({
  body: z.string(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  updatedAt: z.string(),
});
export type ArticleDetailDto = z.infer<typeof articleDetailSchema>;

export const articleListQuerySchema = z.object({
  locale: localeSchema.default('uz'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(9),
});
