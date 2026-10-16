import { HttpStatus } from '@nestjs/common';
import { missingRequired, readiness, type Readiness, type ReadinessItem } from '@teran/contracts';
import { ApiException } from '../common/errors/api-exception.js';

/**
 * Publication readiness per content type. The same rules decide what the admin checklist shows
 * and whether the API lets an item go public: a required item that is not met blocks publishing
 * (PUBLICATION_BLOCKED, 422); a draft may stay incomplete. Recommendations never block.
 */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Translations<T> = readonly (T & { locale: string })[];

function uzOf<R extends { locale: string }>(rows: readonly R[]): R | undefined {
  return rows.find((row) => row.locale === 'uz');
}

function allLanguages(rows: readonly { locale: string }[]): boolean {
  return ['uz', 'ru', 'en'].every((locale) => rows.some((row) => row.locale === locale));
}

const filled = (value: string | null | undefined): boolean => Boolean(value?.trim());

export interface ProductReadinessInput {
  slug: string;
  hasCategory: boolean;
  translations: Translations<{
    name: string;
    shortDescription: string | null;
    seoDescription: string | null;
  }>;
  variants: readonly { isActive: boolean; price: { toString(): string } }[];
  /** In display order; the first is the main image. */
  images: readonly { altLocales: readonly string[] }[];
  /** Labels (Uzbek) of required attributes of the product type that have no value. */
  missingAttributes: readonly string[];
}

export function productReadiness(product: ProductReadinessInput): Readiness {
  const uz = uzOf(product.translations);
  const active = product.variants.filter((variant) => variant.isActive);
  const items: ReadinessItem[] = [
    { code: 'name', required: true, ok: filled(uz?.name), field: 'name' },
    { code: 'category', required: true, ok: product.hasCategory, field: 'category' },
    { code: 'activeVariant', required: true, ok: active.length > 0, field: 'variants' },
    {
      code: 'price',
      required: true,
      ok: active.length > 0 && active.every((variant) => Number(variant.price.toString()) > 0),
      field: 'variants',
    },
    { code: 'mainImage', required: true, ok: product.images.length > 0, field: 'images' },
    {
      code: 'requiredAttributes',
      required: true,
      ok: product.missingAttributes.length === 0,
      field: 'attributes',
      ...(product.missingAttributes.length > 0 ? { detail: [...product.missingAttributes] } : {}),
    },
    { code: 'slug', required: true, ok: SLUG.test(product.slug), field: 'slug' },
    {
      code: 'shortDescription',
      required: false,
      ok: filled(uz?.shortDescription),
      field: 'shortDescription',
    },
    {
      code: 'imageAlt',
      required: false,
      ok: product.images[0]?.altLocales.includes('uz') ?? false,
      field: 'images',
    },
    { code: 'seoDescription', required: false, ok: filled(uz?.seoDescription), field: 'seo' },
    {
      code: 'translations',
      required: false,
      ok: allLanguages(product.translations),
      field: 'translations',
    },
  ];
  return readiness(items);
}

export interface ArticleReadinessInput {
  slug: string;
  hasCover: boolean;
  translations: Translations<{
    title: string;
    excerpt: string | null;
    body: string;
    coverAlt: string | null;
    seoDescription: string | null;
  }>;
}

export function articleReadiness(article: ArticleReadinessInput): Readiness {
  const uz = uzOf(article.translations);
  return readiness([
    { code: 'title', required: true, ok: filled(uz?.title), field: 'title' },
    { code: 'body', required: true, ok: (uz?.body.trim().length ?? 0) >= 20, field: 'body' },
    { code: 'cover', required: true, ok: article.hasCover, field: 'cover' },
    { code: 'slug', required: true, ok: SLUG.test(article.slug), field: 'slug' },
    { code: 'excerpt', required: false, ok: filled(uz?.excerpt), field: 'excerpt' },
    { code: 'coverAlt', required: false, ok: filled(uz?.coverAlt), field: 'cover' },
    { code: 'seoDescription', required: false, ok: filled(uz?.seoDescription), field: 'seo' },
    {
      code: 'translations',
      required: false,
      ok: allLanguages(article.translations),
      field: 'translations',
    },
  ]);
}

export interface MediaReadinessInput {
  kind: 'PHOTO' | 'VIDEO';
  hasImage: boolean;
  hasVideo: boolean;
  hasCaptions: boolean;
  durationSeconds: number | null;
  translations: Translations<{ title: string; caption: string | null; altText: string | null }>;
}

export function mediaReadiness(item: MediaReadinessInput): Readiness {
  const uz = uzOf(item.translations);
  const title: ReadinessItem = {
    code: 'title',
    required: true,
    ok: filled(uz?.title),
    field: 'title',
  };
  if (item.kind === 'PHOTO') {
    return readiness([
      { code: 'image', required: true, ok: item.hasImage, field: 'image' },
      title,
      { code: 'altText', required: false, ok: filled(uz?.altText), field: 'altText' },
      { code: 'caption', required: false, ok: filled(uz?.caption), field: 'caption' },
    ]);
  }
  return readiness([
    { code: 'video', required: true, ok: item.hasVideo, field: 'video' },
    { code: 'poster', required: true, ok: item.hasImage, field: 'image' },
    title,
    { code: 'duration', required: false, ok: item.durationSeconds !== null, field: 'duration' },
    { code: 'captions', required: false, ok: item.hasCaptions, field: 'captions' },
    { code: 'altText', required: false, ok: filled(uz?.altText), field: 'altText' },
  ]);
}

export interface TaxonomyReadinessInput {
  kind: 'category' | 'collection';
  slug: string;
  /** Categories: the parent is valid (exists, top level) or there is none. */
  parentValid: boolean;
  hasImage: boolean;
  translations: Translations<{ name: string; description: string | null; imageAlt: string | null }>;
}

export function taxonomyReadiness(item: TaxonomyReadinessInput): Readiness {
  const uz = uzOf(item.translations);
  const items: ReadinessItem[] = [
    { code: 'name', required: true, ok: filled(uz?.name), field: 'name' },
    { code: 'slug', required: true, ok: SLUG.test(item.slug), field: 'slug' },
  ];
  if (item.kind === 'category') {
    items.push({ code: 'parent', required: true, ok: item.parentValid, field: 'parent' });
  }
  items.push(
    { code: 'image', required: false, ok: item.hasImage, field: 'image' },
    {
      code: 'imageAlt',
      required: false,
      ok: !item.hasImage || filled(uz?.imageAlt),
      field: 'image',
    },
    { code: 'description', required: false, ok: filled(uz?.description), field: 'description' },
    {
      code: 'translations',
      required: false,
      ok: allLanguages(item.translations),
      field: 'translations',
    },
  );
  return readiness(items);
}

/** Refuses to make an item public while a required readiness item is not met. */
export function assertPublishable(result: Readiness, what: string): void {
  if (result.ready) return;
  const missing = missingRequired(result);
  const detail = result.items.find(
    (item) => item.code === 'requiredAttributes' && !item.ok,
  )?.detail;
  throw new ApiException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'PUBLICATION_BLOCKED',
    `This ${what} is not ready to publish: ${missing.join(', ')}`,
    { details: { missing, ...(detail ? { attributes: detail } : {}) } },
  );
}
