import { visualsSettingSchema } from '@teran/contracts';
import sharp from 'sharp';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import {
  GALLERY_IMAGE_WIDTHS,
  IMAGE_WIDTHS,
  renderRenditions,
  renditionWidths,
  WIDE_IMAGE_WIDTHS,
  type ImageStore,
} from './image-processing.js';

/**
 * Renditions that stored pictures lack against the widths a new upload gets (ADR-065 added 800
 * px, ADR-067 1080 px for page pictures, covers and the gallery): each is made from a wider
 * rendition of the same picture, stored beside the others where no file is yet, then recorded on
 * the picture, so the storefront offers it (scripts/add-renditions.ts).
 */

/** A picture as stored: its key, the widths of its renditions and its own size. */
export interface StoredPicture {
  key: string;
  widths: number[];
  width: number;
  height: number;
}

/** A stored picture with what it is (for the report), where it is recorded and how it was made. */
export interface PictureEntry {
  label: string;
  owner:
    | {
        table: 'productImage' | 'category' | 'collection' | 'article' | 'mediaItem';
        id: string;
      }
    | { table: 'visuals'; slot: string; part: 'image' | 'mobile' };
  picture: StoredPicture;
  /** The widths a new upload of it gets (storeImage's options where it is uploaded). */
  options: { widths: readonly number[]; fullWidth?: boolean };
  /**
   * The owner row's last change, kept as it is when the widths are recorded: a file added beside
   * the others changes nothing a visitor reads, so the sitemap's `lastmod` must not move (ADR-067).
   * Absent for product photos, whose table has no such column.
   */
  updatedAt?: Date;
}

/** A width a picture lacks, and the stored rendition it is made from (null: none is wider). */
export interface MissingRendition {
  width: number;
  from: number | null;
}

/** As the admin area and the scripts store each kind of picture. */
const IMAGE = { widths: IMAGE_WIDTHS };
const WIDE = { widths: WIDE_IMAGE_WIDTHS, fullWidth: true };
const GALLERY = { widths: GALLERY_IMAGE_WIDTHS, fullWidth: true };

/**
 * The stored rendition a missing width is made from: the narrowest at least twice as wide, whose
 * compression marks shrink out of sight on the way down (as faithful as a file made from the
 * original, ADR-065), else the widest one; null when none is wider.
 */
export function sourceWidth(stored: readonly number[], width: number): number | null {
  const wider = stored.filter((candidate) => candidate > width).sort((a, b) => a - b);
  return wider.find((candidate) => candidate >= 2 * width) ?? wider.at(-1) ?? null;
}

/** The widths a picture lacks against those a new upload of it gets, narrowest first. */
export function missingRenditions(
  entry: Pick<PictureEntry, 'picture' | 'options'>,
): MissingRendition[] {
  const stored = new Set(entry.picture.widths);
  return renditionWidths(entry.picture.width, entry.options)
    .filter((width) => !stored.has(width))
    .map((width) => ({ width, from: sourceWidth(entry.picture.widths, width) }));
}

/** Every stored picture the database names: products, covers, gallery and page pictures. */
export async function storedPictures(prisma: PrismaClient): Promise<PictureEntry[]> {
  const entries: PictureEntry[] = [];
  const size = (width: number | null, height: number | null) => ({
    width: width ?? 0,
    height: height ?? 0,
  });

  // A product's photographs are numbered in their order (imported ones sit before its own).
  let previous = { productId: '', number: 0 };
  for (const image of await prisma.productImage.findMany({
    include: { product: { select: { slug: true } } },
    orderBy: [{ productId: 'asc' }, { position: 'asc' }],
  })) {
    previous = {
      productId: image.productId,
      number: image.productId === previous.productId ? previous.number + 1 : 1,
    };
    entries.push({
      label: `product ${image.product.slug} #${previous.number}`,
      owner: { table: 'productImage', id: image.id },
      picture: {
        key: image.storageKey,
        widths: image.widths,
        width: image.width,
        height: image.height,
      },
      options: IMAGE,
    });
  }
  for (const [table, rows] of [
    [
      'category',
      await prisma.category.findMany({
        where: { imageKey: { not: null } },
        orderBy: { slug: 'asc' },
      }),
    ],
    [
      'collection',
      await prisma.collection.findMany({
        where: { imageKey: { not: null } },
        orderBy: { slug: 'asc' },
      }),
    ],
  ] as const) {
    for (const row of rows) {
      entries.push({
        label: `${table} ${row.slug}`,
        owner: { table, id: row.id },
        picture: {
          key: row.imageKey!,
          widths: row.imageWidths,
          ...size(row.imageWidth, row.imageHeight),
        },
        options: IMAGE,
        updatedAt: row.updatedAt,
      });
    }
  }
  for (const article of await prisma.article.findMany({
    where: { coverKey: { not: null } },
    orderBy: { slug: 'asc' },
  })) {
    entries.push({
      label: `article ${article.slug}`,
      owner: { table: 'article', id: article.id },
      picture: {
        key: article.coverKey!,
        widths: article.coverWidths,
        ...size(article.coverWidth, article.coverHeight),
      },
      options: WIDE,
      updatedAt: article.updatedAt,
    });
  }
  for (const item of await prisma.mediaItem.findMany({
    where: { imageKey: { not: null } },
    orderBy: [{ kind: 'asc' }, { position: 'asc' }],
  })) {
    entries.push({
      label: `gallery ${item.kind.toLowerCase()} ${item.id}`,
      owner: { table: 'mediaItem', id: item.id },
      picture: {
        key: item.imageKey!,
        widths: item.imageWidths,
        ...size(item.imageWidth, item.imageHeight),
      },
      options: GALLERY,
      updatedAt: item.updatedAt,
    });
  }
  const setting = await prisma.siteSetting.findUnique({ where: { key: 'visuals' } });
  const visuals = setting ? visualsSettingSchema.safeParse(setting.value) : null;
  if (visuals && !visuals.success) {
    throw new Error(
      'The visuals setting does not read as page pictures; nothing was done with it.',
    );
  }
  const places = Object.entries(visuals?.data ?? {}).sort(([a], [b]) => a.localeCompare(b));
  for (const [slot, visual] of places) {
    for (const part of ['image', 'mobile'] as const) {
      const picture = visual[part];
      if (!picture) continue;
      entries.push({
        label: `page picture ${slot}${part === 'mobile' ? ' (phone crop)' : ''}`,
        owner: { table: 'visuals', slot, part },
        picture: {
          key: picture.key,
          widths: picture.widths,
          width: picture.width,
          height: picture.height,
        },
        options: WIDE,
      });
    }
  }
  return entries;
}

/**
 * Makes one missing rendition from the picture's wider one and stores it beside the others, never
 * over a file: 'added', or 'present' when a WebP of that width is already there (an earlier run
 * stopped before recording it). Anything else under that name is left alone and reported.
 */
export async function addRendition(
  store: ImageStore,
  picture: StoredPicture,
  missing: { width: number; from: number },
): Promise<{ result: 'added' | 'present'; bytes: number }> {
  const name = `${missing.width}.webp`;
  if (!(await store.exists(picture.key, name))) {
    const source = await store.read(picture.key, `${missing.from}.webp`);
    if (!source) throw new Error(`${picture.key}/${missing.from}.webp is not in the store`);
    const [rendition] = await renderRenditions(source, [missing.width], picture);
    if (await store.saveNew(picture.key, name, rendition!.data, 'image/webp')) {
      return { result: 'added', bytes: rendition!.data.length };
    }
  }
  const stored = await store.read(picture.key, name);
  const metadata = stored
    ? await sharp(stored)
        .metadata()
        .catch(() => null)
    : null;
  if (metadata?.format !== 'webp' || metadata.width !== missing.width) {
    throw new Error(
      `${picture.key}/${name} is there but is not a WebP picture ${missing.width} px wide; left as it is`,
    );
  }
  return { result: 'present', bytes: 0 };
}

/**
 * Records a picture's widths, unless it changed since it was read (another picture uploaded in
 * its place, or another run): false then, and the next run looks again.
 */
export async function recordWidths(
  prisma: PrismaClient,
  entry: PictureEntry,
  widths: number[],
): Promise<boolean> {
  const { owner, picture } = entry;
  const before = { equals: picture.widths };
  switch (owner.table) {
    case 'productImage':
      return changed(
        await prisma.productImage.updateMany({
          where: { id: owner.id, storageKey: picture.key, widths: before },
          data: { widths },
        }),
      );
    case 'category':
      return changed(
        await prisma.category.updateMany({
          where: { id: owner.id, imageKey: picture.key, imageWidths: before },
          data: { imageWidths: widths, updatedAt: entry.updatedAt },
        }),
      );
    case 'collection':
      return changed(
        await prisma.collection.updateMany({
          where: { id: owner.id, imageKey: picture.key, imageWidths: before },
          data: { imageWidths: widths, updatedAt: entry.updatedAt },
        }),
      );
    case 'article':
      return changed(
        await prisma.article.updateMany({
          where: { id: owner.id, coverKey: picture.key, coverWidths: before },
          data: { coverWidths: widths, updatedAt: entry.updatedAt },
        }),
      );
    case 'mediaItem':
      return changed(
        await prisma.mediaItem.updateMany({
          where: { id: owner.id, imageKey: picture.key, imageWidths: before },
          data: { imageWidths: widths, updatedAt: entry.updatedAt },
        }),
      );
    case 'visuals':
      // The setting is one document: read and written under a row lock, and only this picture's
      // widths change in it (its last change is kept, as above).
      return prisma.$transaction(async (tx) => {
        const [row] = await tx.$queryRaw<{ value: Prisma.JsonObject | null; updatedAt: Date }[]>`
          SELECT value, "updatedAt" FROM "SiteSetting" WHERE key = 'visuals' FOR UPDATE`;
        const visual = row?.value?.[owner.slot] as Prisma.JsonObject | null | undefined;
        const stored = visual?.[owner.part] as Prisma.JsonObject | null | undefined;
        if (!row?.value || !stored || stored.key !== picture.key) return false;
        if (JSON.stringify(stored.widths) !== JSON.stringify(picture.widths)) return false;
        stored.widths = widths;
        await tx.siteSetting.update({
          where: { key: 'visuals' },
          data: { value: row.value, updatedAt: row.updatedAt },
        });
        return true;
      });
  }
}

const changed = ({ count }: { count: number }) => count === 1;
