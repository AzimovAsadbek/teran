/**
 * Adds photographs and films to the gallery from a manifest, published, in front of what is there
 * (ADR-056): for a set prepared outside the admin area (4K sources re-encoded with
 * scripts/web-film.swift). Files go to the store the environment names (R2 or UPLOADS_DIR), as the
 * admin area stores them; posters and photographs get renditions up to 3840 px.
 *
 *   pnpm --filter @teran/api exec tsx scripts/import-gallery.ts --manifest gallery.json [--dry-run]
 *
 * The manifest is a JSON array, in the order the items are shown within their kind:
 *   { "kind": "PHOTO" | "VIDEO", "file": "a.jpg" | "a.mp4", "poster": "a.jpg" (videos),
 *     "featured": true, "title": { "uz": "…", "ru": "…", "en": "…" },
 *     "alt": { … } (optional), "caption": { … } (optional) }
 * Paths are relative to the manifest. An item whose file is already in the gallery (the same
 * photograph or film, by its SHA-256 in the audit log) is skipped, so a run can be repeated.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  deleteStoredImage,
  GALLERY_IMAGE_WIDTHS,
  imageStore,
  mediaPrefix,
  r2ConfigFrom,
  storeImage,
  storeVideo,
  videoDurationSeconds,
  type ImageStore,
} from '../src/media/image-processing.js';

type Localized = { uz: string; ru: string; en: string };
interface Entry {
  kind: 'PHOTO' | 'VIDEO';
  file: string;
  poster?: string;
  featured?: boolean;
  title: Localized;
  alt?: Partial<Localized>;
  caption?: Partial<Localized>;
}

const LOCALES = ['uz', 'ru', 'en'] as const;
const IMAGE_OPTIONS = { widths: GALLERY_IMAGE_WIDTHS, fullWidth: true };
const VIA = 'scripts/import-gallery.ts';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

function check(entries: Entry[]) {
  entries.forEach((entry, index) => {
    const where = `entry ${index + 1} (${entry.file})`;
    if (entry.kind !== 'PHOTO' && entry.kind !== 'VIDEO') throw new Error(`${where}: kind`);
    if (entry.kind === 'VIDEO' && !entry.poster) throw new Error(`${where}: a film needs a poster`);
    for (const locale of LOCALES) {
      const title = entry.title?.[locale]?.trim();
      if (!title || title.length > 150) throw new Error(`${where}: title.${locale}`);
    }
  });
}

/** The gallery item made from this file by an earlier run, if any. */
async function importedAs(prisma: PrismaClient, sha256: string): Promise<string | null> {
  const seen = await prisma.auditLog.findFirst({
    where: { action: 'media.create', metadata: { path: ['sha256'], equals: sha256 } },
    select: { entityId: true },
  });
  return seen?.entityId ?? null;
}

async function importOne(
  prisma: PrismaClient,
  store: ImageStore,
  entry: Entry,
  file: Buffer,
  sha256: string,
  base: string,
  position: number,
) {
  const poster = entry.kind === 'VIDEO' ? await readFile(resolve(base, entry.poster!)) : file;
  const item = await prisma.mediaItem.create({
    data: {
      kind: entry.kind,
      status: 'DRAFT',
      isFeatured: entry.featured ?? false,
      position,
      translations: {
        create: LOCALES.map((locale) => ({
          locale,
          title: entry.title[locale].trim(),
          altText: entry.alt?.[locale]?.trim() || null,
          caption: entry.caption?.[locale]?.trim() || null,
        })),
      },
    },
    select: { id: true },
  });
  const keys: string[] = [];
  try {
    const image = await storeImage(poster, store, mediaPrefix(item.id), IMAGE_OPTIONS);
    keys.push(image.storageKey);
    const video =
      entry.kind === 'VIDEO' ? await storeVideo(file, store, mediaPrefix(item.id)) : null;
    if (video) keys.push(video.storageKey);
    await prisma.$transaction(async (tx) => {
      await tx.mediaItem.update({
        where: { id: item.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          imageKey: image.storageKey,
          imageWidths: image.widths,
          imageWidth: image.width,
          imageHeight: image.height,
          ...(video
            ? {
                videoKey: video.storageKey,
                videoType: video.type,
                videoBytes: video.bytes,
                videoHasAudio: video.hasAudio,
                videoDurationSeconds: videoDurationSeconds(file, video.type),
              }
            : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: null,
          action: 'media.create',
          entityType: 'MediaItem',
          entityId: item.id,
          metadata: { kind: entry.kind, status: 'PUBLISHED', sha256, via: VIA },
        },
      });
    });
    console.log(
      `${entry.kind === 'VIDEO' ? 'film ' : 'photo'} ${item.id} ${entry.file} (${(file.length / 1e6).toFixed(1)} MB)`,
    );
  } catch (error) {
    for (const key of keys) await deleteStoredImage(store, key);
    await prisma.mediaItem.delete({ where: { id: item.id } });
    throw error;
  }
}

async function main() {
  const manifestPath = option('manifest');
  if (!manifestPath) throw new Error('Usage: --manifest gallery.json [--dry-run]');
  const entries = JSON.parse(await readFile(manifestPath, 'utf8')) as Entry[];
  check(entries);
  if (process.argv.includes('--dry-run')) {
    console.log(`${entries.length} entries look complete; nothing imported (--dry-run).`);
    return;
  }
  const store = imageStore({
    uploadsDir: process.env.UPLOADS_DIR ?? './storage/uploads',
    r2: r2ConfigFrom(process.env),
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const base = dirname(resolve(manifestPath));
  try {
    for (const kind of ['PHOTO', 'VIDEO'] as const) {
      const fresh: { entry: Entry; file: Buffer; sha256: string }[] = [];
      for (const entry of entries.filter((candidate) => candidate.kind === kind)) {
        const file = await readFile(resolve(base, entry.file));
        const sha256 = createHash('sha256').update(file).digest('hex');
        const earlier = await importedAs(prisma, sha256);
        if (earlier) console.log(`skipped ${entry.file}: already in the gallery (${earlier})`);
        else fresh.push({ entry, file, sha256 });
      }
      if (fresh.length === 0) continue;
      // The new items go in front, in the manifest's order; the ones there keep theirs after them.
      await prisma.mediaItem.updateMany({
        where: { kind },
        data: { position: { increment: fresh.length } },
      });
      for (const [index, { entry, file, sha256 }] of fresh.entries()) {
        await importOne(prisma, store, entry, file, sha256, base, index);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
