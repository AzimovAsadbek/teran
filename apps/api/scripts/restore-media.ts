/**
 * Rebuilds the stored pictures and films from the local source folders (the folders
 * `visuals:import` loads, each with its manifest.json) into the store the environment names (R2),
 * under the keys the database already holds, so nothing in the database changes (ADR-043). Made
 * for leaving Vercel Blob, whose suspended store could list its files but not hand them back.
 *
 *   pnpm --filter @teran/api exec tsx scripts/restore-media.ts --dirs storage,/path/to/more [--dry-run]
 *
 * Each `--dirs` entry is a folder with a manifest.json or a folder of such folders. Sources are
 * matched as the import stored them: a page picture by its place and recorded source, a product
 * photograph by the SHA-256 of its original file, a cover by its owner's slug and the original's
 * size. Renditions are made at the widths the database lists, as storeImage makes them; films and
 * their copies, card films and masks are stored as the import stores them. What has no local
 * source is listed at the end (pictures uploaded in the admin area, say).
 */
import 'dotenv/config';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { visualsSettingSchema, type VisualsSetting } from '@teran/contracts';
import sharp from 'sharp';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  contentHash,
  filmCopyFileName,
  imageStore,
  PRODUCT_FILM_CARD_FILE,
  PRODUCT_FILM_MASK_FILE,
  r2ConfigFrom,
  renderRenditions,
  videoFileName,
  type ImageStore,
} from '../src/media/image-processing.js';

const entrySchema = z.object({
  slot: z.string(),
  variant: z.string().default('default'),
  file: z.string(),
  source: z.string(),
  film: z.string().optional(),
  cardFilm: z.string().optional(),
  filmMask: z.string().optional(),
  copies: z.array(z.object({ width: z.number(), file: z.string() })).optional(),
});
type Entry = z.infer<typeof entrySchema> & { dir: string };

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
/** A product photograph whose exact original is gone may be rebuilt from the local photograph of
 * the same product, place in its order and size (listed as a stand-in). */
const standIns = args.includes('--stand-ins');
const dirs = (args[args.indexOf('--dirs') + 1] ?? 'storage')
  .split(',')
  .map((dir) => resolve(dir.replace(/^~/, process.env.HOME ?? '~')));

async function manifestsIn(dir: string): Promise<Entry[]> {
  const read = async (folder: string): Promise<Entry[]> => {
    try {
      const raw = JSON.parse(await readFile(join(folder, 'manifest.json'), 'utf8')) as {
        assets?: unknown[];
      };
      return (raw.assets ?? []).map((asset) => ({ ...entrySchema.parse(asset), dir: folder }));
    } catch {
      return [];
    }
  };
  const own = await read(dir);
  if (own.length > 0) return own;
  const found: Entry[] = [];
  for (const name of await readdir(dir)) {
    if ((await stat(join(dir, name)).catch(() => null))?.isDirectory()) {
      found.push(...(await read(join(dir, name))));
    }
  }
  return found;
}

const fileCache = new Map<string, Buffer>();
async function fileOf(entry: Entry, name: string = entry.file): Promise<Buffer> {
  const path = join(entry.dir, name);
  let data = fileCache.get(path);
  if (!data) {
    data = await readFile(path);
    fileCache.set(path, data);
  }
  return data;
}

async function sizeOf(data: Buffer): Promise<{ width: number; height: number }> {
  const meta = await sharp(data).metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  return {
    width: (rotated ? meta.height : meta.width) ?? 0,
    height: (rotated ? meta.width : meta.height) ?? 0,
  };
}

const isPicture = (entry: Entry) => !['video', 'video-mobile'].includes(entry.variant);
let files = 0;
let bytes = 0;
const missing: string[] = [];
const done: string[] = [];

async function put(store: ImageStore, key: string, name: string, data: Buffer, type: string) {
  files += 1;
  bytes += data.length;
  if (!dryRun) await store.saveFile(key, name, data, type);
}

/** A picture's renditions under its key, from an original of the stored size. */
async function restorePicture(
  store: ImageStore,
  label: string,
  stored: { key: string; widths: number[]; width: number; height: number },
  candidates: Entry[],
): Promise<boolean> {
  for (const entry of candidates) {
    const original = await fileOf(entry).catch(() => null);
    if (!original) continue;
    const size = await sizeOf(original);
    if (size.width !== stored.width || size.height !== stored.height) continue;
    for (const rendition of await renderRenditions(original, stored.widths)) {
      await put(store, stored.key, `${rendition.width}.webp`, rendition.data, 'image/webp');
    }
    done.push(`${label} ← ${entry.dir.split('/').pop()}/${entry.file}`);
    return true;
  }
  missing.push(`${label} (${stored.width}×${stored.height}, ${stored.key})`);
  return false;
}

async function maskOf(entry: Entry, name: string): Promise<Buffer> {
  return sharp(await fileOf(entry, name))
    .ensureAlpha()
    .png()
    .toBuffer();
}

/** A page film: the file, its copies and its mask, as storeFilm keeps them. */
async function restoreFilm(
  store: ImageStore,
  label: string,
  film: NonNullable<VisualsSetting[string]['video']>,
  entry: Entry | undefined,
) {
  if (!entry) {
    missing.push(`${label} (film ${film.key})`);
    return;
  }
  await put(store, film.key, videoFileName(film.type), await fileOf(entry), film.type);
  for (const width of film.widths) {
    const copy = entry.copies?.find((candidate) => candidate.width === width);
    if (!copy) {
      missing.push(`${label} (film copy ${width} px)`);
      continue;
    }
    await put(
      store,
      film.key,
      filmCopyFileName(width),
      await fileOf(entry, copy.file),
      'video/mp4',
    );
  }
  if (film.mask) {
    if (entry.filmMask) {
      await put(
        store,
        film.key,
        PRODUCT_FILM_MASK_FILE,
        await maskOf(entry, entry.filmMask),
        'image/png',
      );
    } else missing.push(`${label} (film mask)`);
  }
  done.push(`${label} film ← ${entry.dir.split('/').pop()}/${entry.file}`);
}

async function main() {
  const r2 = r2ConfigFrom(process.env);
  if (!r2 && !dryRun) throw new Error('R2_* is not set: nothing to restore into.');
  const store = imageStore({ uploadsDir: '/nonexistent', r2 });
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const entries = (await Promise.all(dirs.map(manifestsIn))).flat();
    console.log(
      `${entries.length} manifest entries in ${dirs.length} place(s)${dryRun ? ' (dry run)' : ''}`,
    );

    // Page pictures and films, by place and recorded source.
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'visuals' } });
    const visuals = visualsSettingSchema.parse(setting?.value ?? {});
    // A listing banner is stored under its category's or collection's id; manifests name the slug.
    const slugs = new Map<string, string>();
    for (const row of await prisma.category.findMany({ select: { id: true, slug: true } }))
      slugs.set(`banner:category:${row.id}`, `banner:category:${row.slug}`);
    for (const row of await prisma.collection.findMany({ select: { id: true, slug: true } }))
      slugs.set(`banner:collection:${row.id}`, `banner:collection:${row.slug}`);
    for (const [stored, visual] of Object.entries(visuals)) {
      const slot = slugs.get(stored) ?? stored;
      const mains = entries.filter(
        (entry) =>
          entry.slot === slot &&
          isPicture(entry) &&
          entry.variant !== 'mobile' &&
          entry.source === visual.source,
      );
      await restorePicture(store, slot, { ...visual.image, key: visual.image.key }, mains);
      const folders = new Set(mains.map((entry) => entry.dir));
      const sibling = (variant: string) =>
        entries.filter(
          (entry) => entry.slot === slot && entry.variant === variant && folders.has(entry.dir),
        );
      if (visual.mobile)
        await restorePicture(store, `${slot} (phone)`, visual.mobile, sibling('mobile'));
      if (visual.video) await restoreFilm(store, slot, visual.video, sibling('video')[0]);
      if (visual.mobileVideo)
        await restoreFilm(store, `${slot} (phone)`, visual.mobileVideo, sibling('video-mobile')[0]);
    }

    // Product photographs, by the SHA-256 of their original file.
    const productEntries = entries.filter((entry) => entry.slot.startsWith('product:'));
    const byHash = new Map<string, Entry>();
    for (const entry of productEntries) {
      const original = await fileOf(entry).catch(() => null);
      if (original) byHash.set(contentHash(original), entry);
    }
    const images = await prisma.productImage.findMany({
      include: { product: { select: { slug: true, status: true } } },
      orderBy: [{ productId: 'asc' }, { position: 'asc' }],
    });
    for (const image of images) {
      let label = `product ${image.product.slug} #${image.position + 1}`;
      let entry = image.contentHash ? byHash.get(image.contentHash) : undefined;
      if (!entry && standIns && image.product.status === 'ACTIVE' && !image.videoKey) {
        entry = productEntries.find(
          (candidate) =>
            candidate.slot === `product:${image.product.slug}` &&
            candidate.variant === String(image.position + 1),
        );
        if (entry) label += ' (stand-in: not the exact file)';
      }
      if (!entry) {
        if (image.product.status === 'ACTIVE') missing.push(`${label} (${image.storageKey})`);
        continue;
      }
      await restorePicture(
        store,
        label,
        {
          key: image.storageKey,
          widths: image.widths,
          width: image.width,
          height: image.height,
        },
        [entry],
      );
      if (image.videoKey && image.videoType) {
        if (!entry.film) {
          missing.push(`${label} (film ${image.videoKey})`);
          continue;
        }
        await put(
          store,
          image.videoKey,
          videoFileName(image.videoType),
          await fileOf(entry, entry.film),
          image.videoType,
        );
        const stored = image.videoFiles ?? [];
        if (stored.includes('card') && entry.cardFilm)
          await put(
            store,
            image.videoKey,
            PRODUCT_FILM_CARD_FILE,
            await fileOf(entry, entry.cardFilm),
            'video/mp4',
          );
        if (stored.includes('mask') && entry.filmMask)
          await put(
            store,
            image.videoKey,
            PRODUCT_FILM_MASK_FILE,
            await maskOf(entry, entry.filmMask),
            'image/png',
          );
        done.push(`${label} film ← ${entry.dir.split('/').pop()}/${entry.film}`);
      }
    }

    // Covers, by their owner's slug and the original's size.
    const covers = (owner: string, slug: string) =>
      entries.filter(
        (entry) => entry.slot === `${owner}:${slug}` || entry.slot === `cover:${owner}:${slug}`,
      );
    for (const category of await prisma.category.findMany({ where: { imageKey: { not: null } } })) {
      await restorePicture(
        store,
        `category ${category.slug}`,
        {
          key: category.imageKey!,
          widths: category.imageWidths,
          width: category.imageWidth ?? 0,
          height: category.imageHeight ?? 0,
        },
        covers('category', category.slug),
      );
    }
    for (const collection of await prisma.collection.findMany({
      where: { imageKey: { not: null } },
    })) {
      await restorePicture(
        store,
        `collection ${collection.slug}`,
        {
          key: collection.imageKey!,
          widths: collection.imageWidths,
          width: collection.imageWidth ?? 0,
          height: collection.imageHeight ?? 0,
        },
        covers('collection', collection.slug),
      );
    }
    for (const article of await prisma.article.findMany({ where: { coverKey: { not: null } } })) {
      await restorePicture(
        store,
        `article ${article.slug}`,
        {
          key: article.coverKey!,
          widths: article.coverWidths,
          width: article.coverWidth ?? 0,
          height: article.coverHeight ?? 0,
        },
        covers('article', article.slug),
      );
    }

    // The gallery: uploaded in the admin area, so never in a source folder.
    for (const item of await prisma.mediaItem.findMany({ where: { imageKey: { not: null } } })) {
      missing.push(`gallery ${item.kind.toLowerCase()} ${item.id} (${item.imageKey})`);
    }

    console.log(`\nRestored (${done.length}):`);
    for (const line of done) console.log(`  ${line}`);
    console.log(
      `\n${files} file(s), ${(bytes / 1e6).toFixed(1)} MB ${dryRun ? 'would be' : ''} stored.`,
    );
    console.log(`\nNo local source (${missing.length}):`);
    for (const line of missing) console.log(`  ${line}`);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
