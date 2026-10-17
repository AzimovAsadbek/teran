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
  /**
   * Optional internal link path, e.g. "/catalog". External links are not allowed, nor "//host",
   * which a browser reads as another site.
   */
  href: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/(?!\/)[a-z0-9\-/?=&]*$/i, { error: 'internal_path_only' })
    .nullable(),
});
export type AnnouncementSetting = z.infer<typeof announcementSettingSchema>;

/** A WhatsApp link (wa.me, as in the WhatsApp Business QR code) or a phone number. */
const whatsappPattern = /^(https:\/\/wa\.me\/[A-Za-z0-9/?=&._-]{1,100}|\+?[0-9 ()-]{9,20})$/;

export const contactSettingSchema = z.object({
  phone: z.string().trim().max(30).nullable(),
  /** A second number, shown after the first. */
  phone2: z.string().trim().max(30).nullable().default(null),
  email: z.email().max(254).nullable(),
  /** A second address, shown after the first. */
  email2: z.email().max(254).nullable().default(null),
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
  whatsapp: z
    .string()
    .trim()
    .max(120)
    .regex(whatsappPattern, { error: 'invalid_whatsapp' })
    .nullable()
    .default(null),
  /** The channel's address, e.g. https://www.youtube.com/@teran. */
  youtube: z
    .string()
    .trim()
    .max(120)
    .regex(/^https:\/\/(www\.)?youtube\.com\/[A-Za-z0-9@/_.-]{1,100}$/, {
      error: 'invalid_youtube',
    })
    .nullable()
    .default(null),
  address: localizedText(300).nullable(),
  workingHours: localizedText(160).nullable(),
});
export type ContactSetting = z.infer<typeof contactSettingSchema>;

// ─── Stores ─────────────────────────────────────────────────────────────────

/** Kinds of TERAN point of sale: the store locator's filter, as the reference's "experiences". */
export const STORE_KINDS = ['SHOP', 'DEALER', 'WHOLESALE'] as const;
export const storeKindSchema = z.enum(STORE_KINDS);
export type StoreKind = z.infer<typeof storeKindSchema>;

/**
 * A point of sale on the store locator (Admin → Settings → Stores), entered by TERAN: nothing is
 * shown until it is. The address is required in Uzbek (Russian and English fall back to it); the
 * place on the map comes from its latitude and longitude.
 */
export const storeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{8,40}$/),
  name: z.string().trim().min(1, { error: 'required' }).max(120),
  address: localizedText(300).refine((value) => value.uz.trim().length > 0, {
    error: 'required',
    path: ['uz'],
  }),
  hours: localizedText(400).nullable(),
  phone: z.string().trim().max(30).nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  kinds: z.array(storeKindSchema).max(STORE_KINDS.length),
  /** Hidden from the storefront while false (kept for later). */
  active: z.boolean(),
});
export type StoreSetting = z.infer<typeof storeSchema>;

export const storesSettingSchema = z.array(storeSchema).max(200);
export type StoresSetting = z.infer<typeof storesSettingSchema>;

export const SETTING_KEYS = ['announcement', 'contact', 'stores'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

// ─── Page pictures ──────────────────────────────────────────────────────────

/**
 * Places on the storefront that take a picture managed in Admin → Settings: the About page's
 * hero, its three idea pictures and its showcase, the wide banner over the catalogue, the home
 * page's slides, banners and tiles, and the desktop menus' pictures. A
 * category's or collection's banner is `banner:category:<id>` / `banner:collection:<id>` (the id,
 * so a renamed slug keeps its banner). A place without a picture keeps TERAN's artwork.
 */
export const FIXED_VISUAL_SLOTS = [
  'about.hero',
  'about.idea.1',
  'about.idea.2',
  'about.idea.3',
  'about.showcase',
  'banner:catalog',
  // The contact page's portrait picture, beside the form.
  'contact.picture',
  // The help centre: its banner and the pictures of its five categories (the FAQ's groups).
  'help.banner',
  'help.ordering',
  'help.payment',
  'help.delivery',
  'help.tea',
  'help.returns',
  // The for-business page, in the reference's order: hero, the three cards, the two pictures
  // beside its "why" texts, the wide flavour band and the dealer network's backdrop.
  'wholesale.hero',
  'wholesale.card.1',
  'wholesale.card.2',
  'wholesale.card.3',
  'wholesale.why',
  'wholesale.community',
  'wholesale.flavour',
  'wholesale.map',
  // Tea 101: the picture beside "how much do I need?".
  'tea101.amount',
  // The home page, in the reference's order: feature slides, the three campaign banners, the
  // bento's four tiles, the feature band, the statement band and the pair's two pictures.
  'home.hero.1',
  'home.hero.2',
  'home.banner.1',
  'home.banner.2',
  'home.banner.3',
  'home.bento.1',
  'home.bento.2',
  'home.bento.3',
  'home.bento.4',
  'home.feature',
  'home.values',
  // The pair's journal card shows its article's own cover now: `home.pair.1` is no longer shown,
  // and stays valid only so settings saved with it still read.
  'home.pair.1',
  'home.pair.2',
  // The pictures on the right of the four desktop menus.
  'menu.shop',
  'menu.collections',
  'menu.learn',
  'menu.about',
] as const;

const VISUAL_SLOT_PATTERN =
  /^(?:about\.(?:hero|idea\.[1-3]|showcase)|contact\.picture|help\.(?:banner|ordering|payment|delivery|tea|returns)|wholesale\.(?:hero|card\.[1-3]|why|community|flavour|map)|tea101\.amount|home\.(?:hero\.[12]|banner\.[1-3]|bento\.[1-4]|feature|values|pair\.[12])|menu\.(?:shop|collections|learn|about)|banner:catalog|store:[a-z0-9-]{8,40}|banner:(?:category|collection):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** The banner place of a category or collection. */
export function listingBannerSlot(kind: 'category' | 'collection', id: string): string {
  return `banner:${kind}:${id}`;
}

/** The picture place of a store on the store locator. */
export function storePictureSlot(id: string): string {
  return `store:${id}`;
}

export const visualSlotSchema = z
  .string()
  .max(120)
  .regex(VISUAL_SLOT_PATTERN, { error: 'invalid_visual_slot' });

/** A stored picture: WebP renditions at `<key>/<width>.webp` (see the API's image processing). */
export const storedPictureSchema = z.object({
  key: z.string().min(1).max(200),
  widths: z.array(z.number().int().positive()).min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const visualSchema = z.object({
  image: storedPictureSchema,
  /** A taller crop for screens under 750 px, as the reference's banners have; optional. */
  mobile: storedPictureSchema.nullable().default(null),
  /** Where the picture comes from (e.g. a licensed source), kept for the asset manifest. */
  source: z.string().max(500).nullable().default(null),
});
export type Visual = z.infer<typeof visualSchema>;

/** The `visuals` site setting: one picture per place. */
export const visualsSettingSchema = z.record(visualSlotSchema, visualSchema);
export type VisualsSetting = z.infer<typeof visualsSettingSchema>;

/** A place's picture as the storefront gets it. */
export const publicVisualSchema = z.object({
  image: imageSchema,
  mobile: imageSchema.nullable(),
});
export type PublicVisualDto = z.infer<typeof publicVisualSchema>;

export const publicSettingsSchema = z.object({
  announcement: z.object({ text: z.string(), href: z.string().nullable() }).nullable(),
  contact: z.object({
    phone: z.string().nullable(),
    phone2: z.string().nullable().default(null),
    email: z.string().nullable(),
    email2: z.string().nullable().default(null),
    telegram: z.string().nullable(),
    instagram: z.string().nullable(),
    /** A full https://wa.me/… link, ready to use. */
    whatsapp: z.string().nullable().default(null),
    youtube: z.string().nullable().default(null),
    address: z.string().nullable(),
    workingHours: z.string().nullable(),
  }),
  /** Page pictures by place; places without one are absent (older answers have none). */
  visuals: z.record(z.string(), publicVisualSchema).default({}),
  /** The active points of sale, in the admin's order, in the reader's language. */
  stores: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        address: z.string(),
        hours: z.string().nullable(),
        phone: z.string().nullable(),
        latitude: z.number(),
        longitude: z.number(),
        kinds: z.array(storeKindSchema),
        image: imageSchema.nullable(),
      }),
    )
    .default([]),
});
export type PublicSettingsDto = z.infer<typeof publicSettingsSchema>;
export type PublicStoreDto = PublicSettingsDto['stores'][number];

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
