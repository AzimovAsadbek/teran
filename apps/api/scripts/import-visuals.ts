/**
 * Loads licensed pictures (docs/design/reference-assets.md) into the database configured by
 * DATABASE_URL, from a folder that is never committed (the GitHub repository is public):
 *
 *   pnpm --filter @teran/api visuals:import [--dir storage/reference-assets] [--force]
 *   pnpm --filter @teran/api visuals:import --dir storage/reference-mockup --remove
 *
 * The folder holds the files and a manifest.json listing, for each file, the place it is for:
 * - a page-picture place (`about.hero`, `banner:catalog`, …; see FIXED_VISUAL_SLOTS), with an
 *   optional `mobile` variant for screens under 750 px, an optional `video` (an MP4 or WebM film
 *   that loops there, the picture being its poster; the home page's first view and its large
 *   banners) and `video-mobile` (a film for phones), each with an optional `focus` [x, y] percent
 *   (the point kept in view). Films play in a plain loop: their end must flow into their start;
 * - `banner:category:<slug>` or `banner:collection:<slug>`, stored under the item's id;
 * - `article:<slug>`, the cover of a journal article;
 * - `cover:category:<slug>` or `cover:collection:<slug>`, the cover of a category or collection;
 * - `product:<slug>`, product photographs (variants `1`, `2`, …), shown before the product's own.
 *
 * Non-destructive: a place that already has a picture (or an article, category or collection that
 * already has a cover) is left alone, unless it is the same source again or --force is passed; a
 * product keeps its own photographs. Pictures go where the API keeps them (Cloudflare R2 when R2_*
 * is set, Vercel Blob with BLOB_READ_WRITE_TOKEN, else the uploads folder). A manifest marked
 * `localOnly` (presentation material) is refused unless the database and the files stay on this
 * machine.
 *
 * --remove takes out what the folder put in: its page pictures (recognised by their source), its
 * product photographs (by their content) and the covers recorded in <dir>/applied.json, unless an
 * editor has replaced them since. The places it filled are empty again; a picture it replaced with
 * --force does not come back.
 */
import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  MAX_PRODUCT_IMAGES,
  visualSlotSchema,
  visualsSettingSchema,
  type VisualsSetting,
} from '@teran/contracts';
import sharp from 'sharp';
import { z } from 'zod';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client.js';
import {
  articleImagePrefix,
  contentHash,
  deleteStoredImage,
  filmCopyFileName,
  type ImageStore,
  productImagePrefix,
  PRODUCT_FILM_CARD_FILE,
  PRODUCT_FILM_MASK_FILE,
  storeImage,
  storeVideo,
  type StoredImage,
  taxonomyImagePrefix,
  visualImagePrefix,
  WIDE_IMAGE_WIDTHS,
} from '../src/media/image-processing.js';
import { seedImageStore, uploadsDirectory } from '../prisma/seed/catalogue.js';
import { assertLocalOnly, databaseTarget, describeTarget } from '../prisma/seed/guard.js';
import { refreshStorefrontCache } from '../prisma/seed/storefront.js';

const manifestSchema = z.object({
  /** Presentation material: loaded only into a database on this machine, never into Blob. */
  localOnly: z.boolean().default(false),
  assets: z.array(
    z.object({
      slot: z.string().min(1),
      /**
       * `mobile`: the crop for phones; `video` and `video-mobile`: films playing in the place;
       * `1`, `2`, …: the order of a product's photographs.
       */
      variant: z
        .string()
        .regex(/^(?:default|desktop|mobile|video|video-mobile|[1-9])$/)
        .default('default'),
      /** Films: the point kept in view where the frame crops them (percent). */
      focus: z.tuple([z.number().min(0).max(100), z.number().min(0).max(100)]).optional(),
      /**
       * Product photographs: a film looping over the photograph (its first frame), its smaller
       * copy for product cards and where it moves (a PNG whose alpha is the film's): file names
       * in the folder.
       */
      film: z
        .string()
        .regex(/^[A-Za-z0-9._-]+$/)
        .optional(),
      cardFilm: z
        .string()
        .regex(/^[A-Za-z0-9._-]+$/)
        .optional(),
      filmMask: z
        .string()
        .regex(/^[A-Za-z0-9._-]+$/)
        .optional(),
      /**
       * Page films: copies of the film at other widths (the same picture, MP4), so large screens
       * get a sharp copy and small ones a light one: file names in the folder.
       */
      copies: z
        .array(
          z.object({
            width: z.number().int().positive(),
            file: z.string().regex(/^[A-Za-z0-9._-]+$/),
          }),
        )
        .max(8)
        .optional(),
      file: z.string().regex(/^[A-Za-z0-9._-]+$/),
      /** The address it was taken from, or who supplied it (e.g. a file the owner provided). */
      source: z.string().min(1).max(500),
    }),
  ),
});

/** Covers set by a run (they carry no content hash), so --remove can tell them apart. */
const appliedSchema = z.object({
  covers: z
    .array(
      z.object({
        owner: z.enum(['article', 'category', 'collection']),
        id: z.string(),
        key: z.string(),
      }),
    )
    .default([]),
});

type Entry = z.infer<typeof manifestSchema>['assets'][number];
type Applied = z.infer<typeof appliedSchema>;
type CoverOwner = Applied['covers'][number]['owner'];

/**
 * As the admin area stores page pictures and journal covers: renditions up to 5120 px, as far as
 * the picture's own width (and at that width).
 */
const WIDE_PICTURE = { widths: WIDE_IMAGE_WIDTHS, fullWidth: true } as const;

interface Run {
  prisma: PrismaClient;
  store: ImageStore;
  force: boolean;
  read: (entry: Entry) => Promise<Buffer>;
  /** Another file of the folder, by name (a product film and its companions). */
  readFile: (name: string) => Promise<Buffer>;
  visuals: VisualsSetting;
  visualsChanged: boolean;
  applied: Applied;
  /** Files nothing points at any more, deleted once the database is up to date. */
  obsolete: string[];
}

const picture = (stored: StoredImage) => ({
  key: stored.storageKey,
  widths: stored.widths,
  width: stored.width,
  height: stored.height,
});

async function main(): Promise<void> {
  const dirArg = process.argv.indexOf('--dir');
  const dir = resolve(dirArg > 0 ? process.argv[dirArg + 1]! : 'storage/reference-assets');
  const force = process.argv.includes('--force');
  const removing = process.argv.includes('--remove');
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')),
  );
  // Taking material out is allowed anywhere; local-only material only ever goes in here.
  const target =
    manifest.localOnly && !removing
      ? assertLocalOnly(process.env)
      : databaseTarget(process.env.DATABASE_URL);
  console.log(
    removing
      ? `Removing the pictures of ${dir} from ${describeTarget(target)}…`
      : `Pictures from ${dir} into ${describeTarget(target)}…`,
  );

  const appliedPath = join(dir, 'applied.json');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: 'visuals' } });
    const run: Run = {
      prisma,
      store: seedImageStore(uploadsDirectory()),
      force,
      read: (entry) => readFile(join(dir, entry.file)),
      readFile: (name) => readFile(join(dir, name)),
      visuals: row ? visualsSettingSchema.parse(row.value) : {},
      visualsChanged: false,
      applied: await readApplied(appliedPath),
      obsolete: [],
    };

    let changed = 0;
    for (const [name, entries] of groupBySlot(manifest.assets)) {
      changed += removing
        ? await removePlace(run, name, entries)
        : await fillPlace(run, name, entries);
    }

    if (run.visualsChanged) {
      const value = visualsSettingSchema.parse(run.visuals) as unknown as Prisma.InputJsonValue;
      await prisma.siteSetting.upsert({
        where: { key: 'visuals' },
        create: { key: 'visuals', value },
        update: { value },
      });
    }
    for (const key of run.obsolete) await deleteStoredImage(run.store, key);
    await writeFile(appliedPath, `${JSON.stringify(run.applied, null, 1)}\n`);
    if (changed > 0) {
      await prisma.auditLog.create({
        data: {
          action: removing ? 'visuals.remove' : 'visuals.import',
          entityType: 'System',
          metadata: { changed, dir },
        },
      });
      console.log(await refreshStorefrontCache(process.env));
    }
    console.log(
      changed > 0 ? `${changed} picture(s) ${removing ? 'removed' : 'set'}.` : 'Nothing to change.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

function groupBySlot(entries: Entry[]): Map<string, Entry[]> {
  const bySlot = new Map<string, Entry[]>();
  for (const entry of entries) bySlot.set(entry.slot, [...(bySlot.get(entry.slot) ?? []), entry]);
  return bySlot;
}

async function readApplied(path: string): Promise<Applied> {
  try {
    return appliedSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { covers: [] };
    throw error;
  }
}

/** `product:<slug>`, a cover (`article:`, `cover:category:`, `cover:collection:`) or a place. */
function parsePlace(
  name: string,
):
  | { kind: 'product'; slug: string }
  | { kind: 'cover'; owner: CoverOwner; slug: string }
  | { kind: 'visual' } {
  const product = /^product:([a-z0-9-]+)$/.exec(name);
  if (product) return { kind: 'product', slug: product[1]! };
  const article = /^article:([a-z0-9-]+)$/.exec(name);
  if (article) return { kind: 'cover', owner: 'article', slug: article[1]! };
  const cover = /^cover:(category|collection):([a-z0-9-]+)$/.exec(name);
  if (cover) return { kind: 'cover', owner: cover[1] as CoverOwner, slug: cover[2]! };
  return { kind: 'visual' };
}

async function fillPlace(run: Run, name: string, entries: Entry[]): Promise<number> {
  const place = parsePlace(name);
  if (place.kind === 'product') return addProductPhotos(run, name, place.slug, entries);
  const main = entries.find((entry) => isPicture(entry) && entry.variant !== 'mobile');
  if (!main) {
    console.warn(`  ${name}: no main picture in the manifest, skipped`);
    return 0;
  }
  if (place.kind === 'cover') return setCover(run, name, place.owner, place.slug, main);
  return setVisual(run, name, main, {
    mobile: entries.find((entry) => entry.variant === 'mobile') ?? null,
    video: entries.find((entry) => entry.variant === 'video') ?? null,
    mobileVideo: entries.find((entry) => entry.variant === 'video-mobile') ?? null,
  });
}

async function removePlace(run: Run, name: string, entries: Entry[]): Promise<number> {
  const place = parsePlace(name);
  if (place.kind === 'product') return removeProductPhotos(run, name, place.slug, entries);
  if (place.kind === 'cover') return removeCover(run, name, place.owner, place.slug);
  const main = entries.find((entry) => isPicture(entry) && entry.variant !== 'mobile');
  return main ? removeVisual(run, name, main) : 0;
}

// ─── Product photographs ────────────────────────────────────────────────────

/** Variants `1`, `2`, … in order, before every photograph the product already has. */
async function addProductPhotos(
  run: Run,
  name: string,
  slug: string,
  entries: Entry[],
): Promise<number> {
  const product = await run.prisma.product.findUnique({
    where: { slug },
    select: { id: true, images: { select: { position: true, contentHash: true } } },
  });
  if (!product) {
    console.warn(`  ${name}: no such product, skipped`);
    return 0;
  }
  const ordered = [...entries].sort((a, b) => photoOrder(a) - photoOrder(b));
  const files = await Promise.all(ordered.map(run.read));
  const fresh = ordered
    .map((entry, index) => ({ entry, file: files[index]! }))
    .filter(({ file }) => !product.images.some((image) => image.contentHash === contentHash(file)));
  if (fresh.length === 0) {
    console.log(`  ${name}: already has these photographs`);
    return 0;
  }
  if (product.images.length + fresh.length > MAX_PRODUCT_IMAGES) {
    console.warn(`  ${name}: would exceed ${MAX_PRODUCT_IMAGES} photographs, skipped`);
    return 0;
  }
  const first = Math.min(0, ...product.images.map((image) => image.position)) - fresh.length;
  for (const [index, { entry, file }] of fresh.entries()) {
    const stored = await storeImage(file, run.store, productImagePrefix(product.id));
    let film: Awaited<ReturnType<typeof storeProductFilm>> | null = null;
    try {
      film = entry.film ? await storeProductFilm(run, product.id, entry) : null;
      await run.prisma.productImage.create({
        data: {
          productId: product.id,
          ...stored,
          contentHash: contentHash(file),
          position: first + index,
          ...(film ?? {}),
        },
      });
    } catch (error) {
      await deleteStoredImage(run.store, stored.storageKey);
      if (film) await deleteStoredImage(run.store, film.videoKey);
      throw error;
    }
  }
  console.log(`  ${name}: ${fresh.length} photograph(s) placed first`);
  return fresh.length;
}

function photoOrder(entry: Entry): number {
  return /^[1-9]$/.test(entry.variant) ? Number(entry.variant) : 0;
}

/** The photographs whose content matches the folder's files; the product's own stay. */
async function removeProductPhotos(
  run: Run,
  name: string,
  slug: string,
  entries: Entry[],
): Promise<number> {
  const product = await run.prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (!product) return 0;
  const hashes = (await Promise.all(entries.map(run.read))).map(contentHash);
  const images = await run.prisma.productImage.findMany({
    where: { productId: product.id, contentHash: { in: hashes } },
    select: { id: true, storageKey: true, videoKey: true },
  });
  if (images.length === 0) return 0;
  await run.prisma.productImage.deleteMany({
    where: { id: { in: images.map((image) => image.id) } },
  });
  run.obsolete.push(
    ...images.flatMap((image) => [image.storageKey, ...(image.videoKey ? [image.videoKey] : [])]),
  );
  console.log(`  ${name}: ${images.length} photograph(s) removed`);
  return images.length;
}

// ─── Covers of articles, categories and collections ─────────────────────────

interface Cover {
  id: string;
  key: string | null;
  published: boolean;
  prefix: string;
  set: (stored: StoredImage | null) => Promise<void>;
}

async function coverOf(
  prisma: PrismaClient,
  owner: CoverOwner,
  slug: string,
): Promise<Cover | null> {
  if (owner === 'article') {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true, coverKey: true, status: true },
    });
    if (!article) return null;
    return {
      id: article.id,
      key: article.coverKey,
      published: article.status === 'PUBLISHED',
      prefix: articleImagePrefix(article.id),
      set: async (stored) => {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            coverKey: stored?.storageKey ?? null,
            coverWidths: stored?.widths ?? [],
            coverWidth: stored?.width ?? null,
            coverHeight: stored?.height ?? null,
          },
        });
      },
    };
  }
  const where = { slug };
  const select = { id: true, imageKey: true } as const;
  const item =
    owner === 'category'
      ? await prisma.category.findUnique({ where, select })
      : await prisma.collection.findUnique({ where, select });
  if (!item) return null;
  return {
    id: item.id,
    key: item.imageKey,
    published: false,
    prefix: taxonomyImagePrefix(owner, item.id),
    set: async (stored) => {
      const data = {
        imageKey: stored?.storageKey ?? null,
        imageWidths: stored?.widths ?? [],
        imageWidth: stored?.width ?? null,
        imageHeight: stored?.height ?? null,
        imageTransparent: stored?.transparent ?? false,
      };
      if (owner === 'category') await prisma.category.update({ where: { id: item.id }, data });
      else await prisma.collection.update({ where: { id: item.id }, data });
    },
  };
}

async function setCover(
  run: Run,
  name: string,
  owner: CoverOwner,
  slug: string,
  main: Entry,
): Promise<number> {
  const cover = await coverOf(run.prisma, owner, slug);
  if (!cover) {
    console.warn(`  ${name}: no such ${owner}, skipped`);
    return 0;
  }
  const ours = run.applied.covers.find((entry) => entry.owner === owner && entry.id === cover.id);
  if (cover.key && !run.force) {
    console.log(
      ours?.key === cover.key
        ? `  ${name}: already set from this folder`
        : `  ${name}: already has a cover, left alone`,
    );
    return 0;
  }
  const stored = await storeImage(
    await run.read(main),
    run.store,
    cover.prefix,
    owner === 'article' ? WIDE_PICTURE : undefined,
  );
  try {
    await cover.set(stored);
  } catch (error) {
    await deleteStoredImage(run.store, stored.storageKey);
    throw error;
  }
  if (cover.key) run.obsolete.push(cover.key);
  run.applied.covers = [
    ...run.applied.covers.filter((entry) => entry !== ours),
    { owner, id: cover.id, key: stored.storageKey },
  ];
  console.log(`  ${name}: cover set (${stored.width}×${stored.height})`);
  return 1;
}

/** Empties a cover this folder set, unless it was replaced since (or the article needs one). */
async function removeCover(
  run: Run,
  name: string,
  owner: CoverOwner,
  slug: string,
): Promise<number> {
  const cover = await coverOf(run.prisma, owner, slug);
  const ours =
    cover && run.applied.covers.find((entry) => entry.owner === owner && entry.id === cover.id);
  if (!cover || !ours) return 0;
  if (cover.key !== ours.key) {
    run.applied.covers = run.applied.covers.filter((entry) => entry !== ours);
    console.log(`  ${name}: replaced since, left as it is`);
    return 0;
  }
  if (cover.published) {
    console.warn(`  ${name}: published articles need a cover; replace it in the admin area first`);
    return 0;
  }
  await cover.set(null);
  run.applied.covers = run.applied.covers.filter((entry) => entry !== ours);
  run.obsolete.push(ours.key);
  console.log(`  ${name}: cover removed`);
  return 1;
}

// ─── Page pictures ──────────────────────────────────────────────────────────

/** The stored place of a manifest name: listing banners are kept under the item's id. */
async function visualSlot(prisma: PrismaClient, name: string): Promise<string | null> {
  let slot = name;
  const listing = /^banner:(category|collection):([a-z0-9-]+)$/.exec(name);
  if (listing) {
    const where = { slug: listing[2]! };
    const item =
      listing[1] === 'category'
        ? await prisma.category.findUnique({ where, select: { id: true } })
        : await prisma.collection.findUnique({ where, select: { id: true } });
    if (!item) {
      console.warn(`  ${name}: no such ${listing[1]}, skipped`);
      return null;
    }
    slot = `banner:${listing[1]}:${item.id}`;
  }
  if (!visualSlotSchema.safeParse(slot).success) {
    console.warn(`  ${name}: not a page-picture place, skipped`);
    return null;
  }
  return slot;
}

/** A picture entry (not a film). */
function isPicture(entry: Entry): boolean {
  return entry.variant !== 'video' && entry.variant !== 'video-mobile';
}

async function setVisual(
  run: Run,
  name: string,
  main: Entry,
  extra: { mobile: Entry | null; video: Entry | null; mobileVideo: Entry | null },
): Promise<number> {
  const { mobile, video, mobileVideo } = extra;
  const slot = await visualSlot(run.prisma, name);
  if (!slot) return 0;
  const current = run.visuals[slot];
  if (current && !run.force) {
    console.log(
      current.source === main.source
        ? `  ${name}: already set from this source`
        : `  ${name}: already has another picture, left alone`,
    );
    return 0;
  }
  const image = await storeImage(
    await run.read(main),
    run.store,
    visualImagePrefix(),
    WIDE_PICTURE,
  );
  const phone = mobile
    ? await storeImage(await run.read(mobile), run.store, visualImagePrefix(), WIDE_PICTURE)
    : null;
  const film = video ? await storeFilm(run, video) : null;
  const phoneFilm = mobileVideo ? await storeFilm(run, mobileVideo) : null;
  run.visuals[slot] = {
    image: picture(image),
    mobile: phone ? picture(phone) : null,
    video: film,
    mobileVideo: phoneFilm,
    source: main.source,
  };
  run.visualsChanged = true;
  if (current) run.obsolete.push(...visualKeys(current));
  console.log(
    `  ${name}: set (${image.width}×${image.height}${phone ? `, phone ${phone.width}×${phone.height}` : ''}${film ? `, film ${film.width ?? '?'}×${film.height ?? '?'}` : ''}${phoneFilm ? `, phone film ${phoneFilm.width ?? '?'}×${phoneFilm.height ?? '?'}` : ''})`,
  );
  return 1;
}

/** Every stored file of a place: its picture, phone crop and film. */
function visualKeys(visual: VisualsSetting[string]): string[] {
  return [
    visual.image.key,
    ...(visual.mobile ? [visual.mobile.key] : []),
    ...(visual.video ? [visual.video.key] : []),
    ...(visual.mobileVideo ? [visual.mobileVideo.key] : []),
  ];
}

/**
 * Keeps a film as it is (MP4 or WebM, checked by its first bytes) with its frame size and the
 * point kept in view.
 */
async function storeFilm(run: Run, entry: Entry) {
  const file = await run.read(entry);
  const stored = await storeVideo(file, run.store, visualImagePrefix());
  const size = stored.type === 'video/mp4' ? mp4FrameSize(file) : null;
  // Where it moves, when given: the page then shows the film only there, over its sharp poster.
  if (entry.filmMask) {
    const mask = await sharp(await run.readFile(entry.filmMask))
      .ensureAlpha()
      .png()
      .toBuffer();
    await run.store.saveFile(stored.storageKey, PRODUCT_FILM_MASK_FILE, mask, 'image/png');
  }
  // Its copies at other widths, each checked to be an MP4 of the width it claims.
  const widths: number[] = [];
  for (const copy of entry.copies ?? []) {
    const data = await run.readFile(copy.file);
    const copySize = mp4FrameSize(data);
    if (data.toString('latin1', 4, 8) !== 'ftyp' || copySize?.width !== copy.width) {
      throw new Error(`${copy.file}: not an MP4 ${copy.width} px wide`);
    }
    await run.store.saveFile(stored.storageKey, filmCopyFileName(copy.width), data, 'video/mp4');
    widths.push(copy.width);
  }
  return {
    key: stored.storageKey,
    type: stored.type,
    width: size?.width ?? null,
    height: size?.height ?? null,
    mask: Boolean(entry.filmMask),
    widths: widths.sort((a, b) => a - b),
    focusX: entry.focus?.[0] ?? 50,
    focusY: entry.focus?.[1] ?? 50,
  };
}

/**
 * A product photograph's film: the film itself (MP4 or WebM, checked by its first bytes) under a
 * key of the product's, with its smaller copy for cards and where it moves beside it.
 */
async function storeProductFilm(run: Run, productId: string, entry: Entry) {
  const file = await run.readFile(entry.film!);
  const stored = await storeVideo(file, run.store, productImagePrefix(productId));
  const files: string[] = [];
  try {
    if (entry.cardFilm) {
      const card = await run.readFile(entry.cardFilm);
      if (card.toString('latin1', 4, 8) !== 'ftyp')
        throw new Error(`${entry.cardFilm}: not an MP4`);
      await run.store.saveFile(stored.storageKey, PRODUCT_FILM_CARD_FILE, card, 'video/mp4');
      files.push('card');
    }
    if (entry.filmMask) {
      const mask = await sharp(await run.readFile(entry.filmMask))
        .ensureAlpha()
        .png()
        .toBuffer();
      await run.store.saveFile(stored.storageKey, PRODUCT_FILM_MASK_FILE, mask, 'image/png');
      files.push('mask');
    }
  } catch (error) {
    await deleteStoredImage(run.store, stored.storageKey);
    throw error;
  }
  const size = stored.type === 'video/mp4' ? mp4FrameSize(file) : null;
  return {
    videoKey: stored.storageKey,
    videoType: stored.type,
    videoWidth: size?.width ?? null,
    videoHeight: size?.height ?? null,
    videoFiles: files,
  };
}

/** The frame size of an MP4's first video track, from its track header (`tkhd`); null if absent. */
function mp4FrameSize(file: Buffer): { width: number; height: number } | null {
  const walk = (start: number, end: number): { width: number; height: number } | null => {
    let at = start;
    while (at + 8 <= end) {
      let size = file.readUInt32BE(at);
      const type = file.toString('latin1', at + 4, at + 8);
      let header = 8;
      if (size === 1) {
        size = Number(file.readBigUInt64BE(at + 8));
        header = 16;
      } else if (size === 0) {
        size = end - at;
      }
      if (size < header || at + size > end) return null;
      const body = at + header;
      if (type === 'tkhd') {
        const offset = file[body] === 1 ? body + 88 : body + 76;
        const width = Math.round(file.readUInt32BE(offset) / 65536);
        const height = Math.round(file.readUInt32BE(offset + 4) / 65536);
        if (width > 0 && height > 0) return { width, height };
      } else if (type === 'moov' || type === 'trak') {
        const found = walk(body, at + size);
        if (found) return found;
      }
      at += size;
    }
    return null;
  };
  try {
    return walk(0, file.length);
  } catch {
    return null;
  }
}

/** Takes a place's picture out when it is still the one from this folder's source. */
async function removeVisual(run: Run, name: string, main: Entry): Promise<number> {
  const slot = await visualSlot(run.prisma, name);
  const current = slot ? run.visuals[slot] : undefined;
  if (!slot || !current || current.source !== main.source) return 0;
  delete run.visuals[slot];
  run.visualsChanged = true;
  run.obsolete.push(...visualKeys(current));
  console.log(`  ${name}: removed`);
  return 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
