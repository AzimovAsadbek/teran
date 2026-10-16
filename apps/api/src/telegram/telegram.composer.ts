import type { ImageDto, Locale, ProductDetailDto } from '@teran/contracts';
import sharp from 'sharp';
import {
  detailInclude,
  PUBLIC_UPLOADS_PATH,
  toImageDto,
  toProductDetail,
} from '../catalog/catalog.mapper.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import type { ImageStore } from '../media/image-processing.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/** A photo caption holds 1024 characters; a text message 4096 (Telegram's limits). */
export const CAPTION_LIMIT = 1024;
export const MESSAGE_LIMIT = 4096;

/** What would be posted for an item: the text (Telegram HTML) split as it will be sent. */
export interface ComposedPost {
  title: string;
  /** Published and still public: only then may the post be sent. */
  published: boolean;
  announce: boolean;
  /** One photo post (caption), or a photo plus a reply message, or one text message. */
  caption: string | null;
  message: string | null;
  image: (ImageDto & { storageKey: string }) | null;
  /** The whole text as one block, for previews and the delivery record. */
  text: string;
}

const LABELS = {
  uz: {
    price: 'Narxi',
    from: (amount: string) => `${amount} soʻmdan`,
    exact: (amount: string) => `${amount} soʻm`,
    packs: 'Qadoqlar',
    grams: 'g',
    pieces: 'dona',
    yes: 'ha',
    no: 'yoʻq',
    more: 'Batafsil — TERAN saytida',
    read: 'Maqolani oʻqish',
  },
  ru: {
    price: 'Цена',
    from: (amount: string) => `от ${amount} сум`,
    exact: (amount: string) => `${amount} сум`,
    packs: 'Упаковки',
    grams: 'г',
    pieces: 'шт.',
    yes: 'да',
    no: 'нет',
    more: 'Подробнее на сайте TERAN',
    read: 'Читать статью',
  },
  en: {
    price: 'Price',
    from: (amount: string) => `from ${amount} UZS`,
    exact: (amount: string) => `${amount} UZS`,
    packs: 'Packs',
    grams: 'g',
    pieces: 'pcs',
    yes: 'yes',
    no: 'no',
    more: 'More on the TERAN website',
    read: 'Read the article',
  },
} as const;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Characters Telegram counts: the text without tags, entities decoded. */
export function visibleLength(html: string): number {
  return html.replace(/<[^>]+>/g, '').replace(/&(?:amp|lt|gt|quot);/g, '_').length;
}

/** Whole so'm with spaces between thousands ("159 000"). */
function amount(money: string): string {
  return String(Math.round(Number(money))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Address of a public page: Uzbek (the default language) has no prefix. */
export function publicUrl(origin: string, locale: Locale, path: string): string {
  return `${origin.replace(/\/$/, '')}${locale === 'uz' ? '' : `/${locale}`}${path}`;
}

/**
 * The first complete sentences of a text that fit in `max` characters (never a cut word); the
 * whole text continues on the linked page, which every post points to.
 */
export function summarize(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const sentences = clean.match(/[^.!?…]+[.!?…]+["»”]?\s*/g) ?? [];
  let result = '';
  for (const sentence of sentences) {
    if ((result + sentence).trim().length > max - 1) break;
    result += sentence;
  }
  if (result.trim()) return result.trim();
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1))}…`;
}

function firstParagraph(text: string | null | undefined): string | null {
  if (!text) return null;
  const paragraph = text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#+\s*/, '').trim())
    .find(Boolean);
  return paragraph ?? null;
}

/** Joins non-empty blocks with blank lines. */
function blocks(...parts: (string | null | undefined | false)[]): string {
  return parts.filter((part): part is string => Boolean(part && part.trim())).join('\n\n');
}

export function productFacts(product: ProductDetailDto, locale: Locale): string[] {
  const labels = LABELS[locale];
  const facts: string[] = [];
  const prices = product.variants
    .map((variant) => Number(variant.price))
    .filter((price) => price > 0);
  if (prices.length > 0) {
    const min = Math.min(...prices);
    const allSame = prices.every((price) => price === min);
    const value = allSame ? labels.exact(amount(String(min))) : labels.from(amount(String(min)));
    facts.push(`${labels.price}: <b>${escapeHtml(value)}</b>`);
  }
  const packs = [
    ...new Set(
      product.variants.flatMap((variant) => [
        ...(variant.weightGrams ? [`${variant.weightGrams} ${labels.grams}`] : []),
        ...(variant.unitCount ? [`${variant.unitCount} ${labels.pieces}`] : []),
      ]),
    ),
  ];
  if (packs.length > 0) facts.push(`${labels.packs}: ${escapeHtml(packs.join(', '))}`);
  for (const attribute of product.attributes.slice(0, 3)) {
    const value =
      attribute.options.length > 0
        ? attribute.options.map((option) => option.label).join(', ')
        : attribute.boolean !== null
          ? attribute.boolean
            ? labels.yes
            : labels.no
          : attribute.number !== null
            ? `${Number(attribute.number)}${attribute.unit ? ` ${attribute.unit}` : ''}`
            : attribute.text;
    if (value) facts.push(`${escapeHtml(attribute.label)}: ${escapeHtml(value)}`);
  }
  return facts;
}

/** Fits the parts into one photo caption, or a short caption plus a reply message. */
function arrange(
  image: ComposedPost['image'],
  head: string,
  body: string,
  facts: string[],
  link: string,
): Pick<ComposedPost, 'caption' | 'message' | 'text'> {
  const full = blocks(head, body, facts.join('\n'), link);
  if (!image) {
    const room = MESSAGE_LIMIT - visibleLength(blocks(head, facts.join('\n'), link)) - 8;
    const text = blocks(
      head,
      body ? escapeHtml(summarize(unescape(body), room)) : null,
      facts.join('\n'),
      link,
    );
    return { caption: null, message: text, text };
  }
  if (visibleLength(full) <= CAPTION_LIMIT) return { caption: full, message: null, text: full };
  // Too long for a caption: the photo carries the essentials, a reply message the rest.
  const caption = blocks(head, facts[0] ?? null, link);
  const room = MESSAGE_LIMIT - visibleLength(blocks(facts.join('\n'), link)) - 8;
  const message = blocks(
    body ? escapeHtml(summarize(unescape(body), room)) : null,
    facts.join('\n'),
    link,
  );
  return { caption, message, text: blocks(caption, message) };
}

function unescape(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

export async function composeProductPost(
  prisma: PrismaService,
  productId: string,
  locale: Locale,
  origin: string,
  now = new Date(),
): Promise<ComposedPost | null> {
  const row = await prisma.product.findUnique({
    where: { id: productId },
    include: detailInclude(locale),
  });
  if (!row) return null;
  const category = await prisma.category.findUnique({
    where: { id: row.categoryId },
    select: { isActive: true, parent: { select: { isActive: true } } },
  });
  const product = toProductDetail(row, locale, now);
  const labels = LABELS[locale];
  const mainImage = row.images[0];
  const image = mainImage
    ? { ...toImageDto(mainImage, product.name), storageKey: mainImage.storageKey }
    : null;
  const head = blocks(`<b>${escapeHtml(product.name)}</b>\n${escapeHtml(product.category.name)}`);
  const body = product.shortDescription ?? firstParagraph(product.description);
  const link = `<a href="${escapeHtml(publicUrl(origin, locale, `/products/${product.slug}`))}">${escapeHtml(labels.more)}</a>`;
  const arranged = arrange(
    image,
    head,
    body ? escapeHtml(body) : '',
    productFacts(product, locale),
    link,
  );
  const categoryPublic = Boolean(category?.isActive && (category.parent?.isActive ?? true));
  return {
    title: product.name,
    published:
      row.status === 'ACTIVE' &&
      row.publishedAt !== null &&
      row.publishedAt <= now &&
      row.variants.length > 0 &&
      categoryPublic,
    announce: row.announceOnTelegram,
    image,
    ...arranged,
  };
}

export async function composeArticlePost(
  prisma: PrismaService,
  articleId: string,
  locale: Locale,
  origin: string,
  now = new Date(),
): Promise<ComposedPost | null> {
  const row = await prisma.article.findUnique({
    where: { id: articleId },
    include: { translations: { where: { locale: { in: localeChain(locale) } } } },
  });
  if (!row) return null;
  const translation = pickTranslation(row.translations, locale);
  if (!translation) return null;
  const labels = LABELS[locale];
  const image =
    row.coverKey && row.coverWidth && row.coverHeight
      ? {
          src: `${PUBLIC_UPLOADS_PATH}/${row.coverKey}`,
          widths: row.coverWidths,
          width: row.coverWidth,
          height: row.coverHeight,
          alt: translation.coverAlt ?? translation.title,
          transparent: false,
          storageKey: row.coverKey,
        }
      : null;
  const head = `<b>${escapeHtml(translation.title)}</b>`;
  const body = translation.excerpt ?? firstParagraph(translation.body);
  const link = `<a href="${escapeHtml(publicUrl(origin, locale, `/journal/${row.slug}`))}">${escapeHtml(labels.read)}</a>`;
  const arranged = arrange(image, head, body ? escapeHtml(body) : '', [], link);
  return {
    title: translation.title,
    published: row.status === 'PUBLISHED' && row.publishedAt !== null && row.publishedAt <= now,
    announce: row.announceOnTelegram,
    image,
    ...arranged,
  };
}

/**
 * The picture as Telegram receives it: a JPEG at most 1280 px wide read from the stored
 * renditions. A cut-out is placed on TERAN's ivory background (Telegram has no transparency).
 */
export async function telegramPhoto(
  store: ImageStore,
  image: { storageKey: string; widths: number[]; transparent: boolean },
): Promise<Buffer | null> {
  const widths = [...image.widths].sort((a, b) => a - b);
  const width = widths.filter((candidate) => candidate <= 1280).at(-1) ?? widths[0];
  if (width === undefined) return null;
  const source = await store.read(image.storageKey, `${width}.webp`);
  if (!source) return null;
  if (!image.transparent) return sharp(source).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const product = await sharp(source)
    .resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  return sharp({
    create: { width: 1200, height: 1200, channels: 3, background: '#fbf8f1' },
  })
    .composite([{ input: product, gravity: 'center' }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}
