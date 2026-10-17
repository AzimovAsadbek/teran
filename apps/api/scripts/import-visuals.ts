/**
 * Loads licensed pictures (docs/design/reference-assets.md) into the database configured by
 * DATABASE_URL, from a folder that is never committed (the GitHub repository is public):
 *
 *   pnpm --filter @teran/api visuals:import [--dir storage/reference-assets] [--force]
 *   pnpm --filter @teran/api visuals:import --dir storage/reference-mockup --remove
 *
 * The folder holds the files and a manifest.json listing, for each file, the place it is for:
 * - a page-picture place (`about.hero`, `banner:catalog`, …; see FIXED_VISUAL_SLOTS), with an
 *   optional `mobile` variant for screens under 750 px;
 * - `banner:category:<slug>` or `banner:collection:<slug>`, stored under the item's id;
 * - `article:<slug>`, the cover of a journal article;
 * - `cover:category:<slug>` or `cover:collection:<slug>`, the cover of a category or collection;
 * - `product:<slug>`, product photographs (variants `1`, `2`, …), shown before the product's own.
 *
 * Non-destructive: a place that already has a picture (or an article, category or collection that
 * already has a cover) is left alone, unless it is the same source again or --force is passed; a
 * product keeps its own photographs. Pictures go where the API keeps them (the uploads folder, or
 * Vercel Blob with BLOB_READ_WRITE_TOKEN). A manifest marked `localOnly` (presentation material)
 * is refused unless the database and the files stay on this machine.
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
import { z } from 'zod';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client.js';
import {
  articleImagePrefix,
  contentHash,
  deleteStoredImage,
  type ImageStore,
  productImagePrefix,
  storeImage,
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
      /** `mobile`: the crop for phones; `1`, `2`, …: the order of a product's photographs. */
      variant: z
        .string()
        .regex(/^(?:default|desktop|mobile|[1-9])$/)
        .default('default'),
      file: z.string().regex(/^[A-Za-z0-9._-]+$/),
      source: z.url(),
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

/** As the admin area stores them: renditions up to 2560 px and at the picture's own width. */
const WIDE_PICTURE = { widths: WIDE_IMAGE_WIDTHS, fullWidth: true } as const;

interface Run {
  prisma: PrismaClient;
  store: ImageStore;
  force: boolean;
  read: (entry: Entry) => Promise<Buffer>;
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
  const main = entries.find((entry) => entry.variant !== 'mobile');
  if (!main) {
    console.warn(`  ${name}: no main picture in the manifest, skipped`);
    return 0;
  }
  if (place.kind === 'cover') return setCover(run, name, place.owner, place.slug, main);
  return setVisual(run, name, main, entries.find((entry) => entry.variant === 'mobile') ?? null);
}

async function removePlace(run: Run, name: string, entries: Entry[]): Promise<number> {
  const place = parsePlace(name);
  if (place.kind === 'product') return removeProductPhotos(run, name, place.slug, entries);
  if (place.kind === 'cover') return removeCover(run, name, place.owner, place.slug);
  const main = entries.find((entry) => entry.variant !== 'mobile');
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
  const fresh = files.filter(
    (file) => !product.images.some((image) => image.contentHash === contentHash(file)),
  );
  if (fresh.length === 0) {
    console.log(`  ${name}: already has these photographs`);
    return 0;
  }
  if (product.images.length + fresh.length > MAX_PRODUCT_IMAGES) {
    console.warn(`  ${name}: would exceed ${MAX_PRODUCT_IMAGES} photographs, skipped`);
    return 0;
  }
  const first = Math.min(0, ...product.images.map((image) => image.position)) - fresh.length;
  for (const [index, file] of fresh.entries()) {
    const stored = await storeImage(file, run.store, productImagePrefix(product.id));
    try {
      await run.prisma.productImage.create({
        data: {
          productId: product.id,
          ...stored,
          contentHash: contentHash(file),
          position: first + index,
        },
      });
    } catch (error) {
      await deleteStoredImage(run.store, stored.storageKey);
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
    select: { id: true, storageKey: true },
  });
  if (images.length === 0) return 0;
  await run.prisma.productImage.deleteMany({
    where: { id: { in: images.map((image) => image.id) } },
  });
  run.obsolete.push(...images.map((image) => image.storageKey));
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
  const stored = await storeImage(await run.read(main), run.store, cover.prefix);
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

async function setVisual(
  run: Run,
  name: string,
  main: Entry,
  mobile: Entry | null,
): Promise<number> {
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
  run.visuals[slot] = {
    image: picture(image),
    mobile: phone ? picture(phone) : null,
    source: main.source,
  };
  run.visualsChanged = true;
  if (current)
    run.obsolete.push(current.image.key, ...(current.mobile ? [current.mobile.key] : []));
  console.log(
    `  ${name}: set (${image.width}×${image.height}${phone ? `, phone ${phone.width}×${phone.height}` : ''})`,
  );
  return 1;
}

/** Takes a place's picture out when it is still the one from this folder's source. */
async function removeVisual(run: Run, name: string, main: Entry): Promise<number> {
  const slot = await visualSlot(run.prisma, name);
  const current = slot ? run.visuals[slot] : undefined;
  if (!slot || !current || current.source !== main.source) return 0;
  delete run.visuals[slot];
  run.visualsChanged = true;
  run.obsolete.push(current.image.key, ...(current.mobile ? [current.mobile.key] : []));
  console.log(`  ${name}: removed`);
  return 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
