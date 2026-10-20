/**
 * Adds a film to the gallery ("Lavhalar") from local files, published, at the front of the films:
 * for films larger than the admin area takes (MAX_VIDEO_UPLOAD_BYTES, 64 MB). Files go to the
 * store the environment names (R2 or UPLOADS_DIR), as the admin area stores them.
 *
 *   pnpm --filter @teran/api exec tsx scripts/add-gallery-film.ts --film f.mp4 --poster p.jpg \
 *     --title-uz "…" --title-ru "…" --title-en "…" [--caption-uz "…" --caption-ru "…" --caption-en "…"]
 *
 * With `--replace <id>` it gives an existing gallery film a new file and poster instead, as the
 * admin area's "replace" does: the item keeps its place, titles and captions (titles or captions
 * given are saved too), and its old files are removed once the new ones are in.
 */
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  deleteStoredImage,
  imageStore,
  mediaPrefix,
  r2ConfigFrom,
  storeImage,
  storeVideo,
  videoDurationSeconds,
  type ImageStore,
} from '../src/media/image-processing.js';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

/** The titles and captions given, one row per language with a title. */
function translationRows() {
  return (['uz', 'ru', 'en'] as const).flatMap((locale) => {
    const title = option(`title-${locale}`);
    return title ? [{ locale, title, caption: option(`caption-${locale}`) ?? null }] : [];
  });
}

async function addFilm(prisma: PrismaClient, store: ImageStore, film: Buffer, poster: Buffer) {
  const rows = translationRows();
  if (!rows.some((row) => row.locale === 'uz')) throw new Error('A new film needs --title-uz');
  // The row first (a draft), so its files live under its own key; published once they are in.
  const item = await prisma.mediaItem.create({
    data: { kind: 'VIDEO', status: 'DRAFT', position: 0, translations: { create: rows } },
    select: { id: true },
  });
  const keys: string[] = [];
  try {
    const image = await storeImage(poster, store, mediaPrefix(item.id));
    keys.push(image.storageKey);
    const video = await storeVideo(film, store, mediaPrefix(item.id));
    keys.push(video.storageKey);
    await prisma.$transaction(async (tx) => {
      // In front of the other films.
      await tx.mediaItem.updateMany({
        where: { kind: 'VIDEO', id: { not: item.id } },
        data: { position: { increment: 1 } },
      });
      await tx.mediaItem.update({
        where: { id: item.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          imageKey: image.storageKey,
          imageWidths: image.widths,
          imageWidth: image.width,
          imageHeight: image.height,
          videoKey: video.storageKey,
          videoType: video.type,
          videoBytes: video.bytes,
          videoDurationSeconds: videoDurationSeconds(film, video.type),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: null,
          action: 'media.create',
          entityType: 'MediaItem',
          entityId: item.id,
          metadata: { kind: 'VIDEO', status: 'PUBLISHED', via: 'scripts/add-gallery-film.ts' },
        },
      });
    });
    console.log(`Gallery film ${item.id} published (${(film.length / 1e6).toFixed(1)} MB).`);
  } catch (error) {
    for (const key of keys) await deleteStoredImage(store, key);
    await prisma.mediaItem.delete({ where: { id: item.id } });
    throw error;
  }
}

async function replaceFilm(
  prisma: PrismaClient,
  store: ImageStore,
  id: string,
  film: Buffer,
  poster: Buffer,
) {
  const existing = await prisma.mediaItem.findUnique({ where: { id } });
  if (!existing || existing.kind !== 'VIDEO') throw new Error(`No gallery film ${id}`);
  const keys: string[] = [];
  try {
    const image = await storeImage(poster, store, mediaPrefix(id));
    keys.push(image.storageKey);
    const video = await storeVideo(film, store, mediaPrefix(id));
    keys.push(video.storageKey);
    const duration = videoDurationSeconds(film, video.type);
    await prisma.$transaction(async (tx) => {
      await tx.mediaItem.update({
        where: { id },
        data: {
          imageKey: image.storageKey,
          imageWidths: image.widths,
          imageWidth: image.width,
          imageHeight: image.height,
          videoKey: video.storageKey,
          videoType: video.type,
          videoBytes: video.bytes,
          ...(duration !== null ? { videoDurationSeconds: duration } : {}),
        },
      });
      for (const row of translationRows()) {
        await tx.mediaItemTranslation.upsert({
          where: { mediaItemId_locale: { mediaItemId: id, locale: row.locale } },
          create: { ...row, mediaItemId: id },
          update: row,
        });
      }
      const via = 'scripts/add-gallery-film.ts --replace';
      await tx.auditLog.create({
        data: { action: 'media.image', entityType: 'MediaItem', entityId: id, metadata: { via } },
      });
      await tx.auditLog.create({
        data: {
          action: 'media.video',
          entityType: 'MediaItem',
          entityId: id,
          metadata: { bytes: video.bytes, via },
        },
      });
    });
  } catch (error) {
    for (const key of keys) await deleteStoredImage(store, key);
    throw error;
  }
  // The old files go only after the row points at the new ones.
  for (const key of [existing.imageKey, existing.videoKey]) {
    if (key) await deleteStoredImage(store, key);
  }
  console.log(`Gallery film ${id} replaced (${(film.length / 1e6).toFixed(1)} MB).`);
}

async function main() {
  const filmPath = option('film');
  const posterPath = option('poster');
  const replace = option('replace');
  if (!filmPath || !posterPath) {
    throw new Error(
      'Usage: --film f.mp4 --poster p.jpg [--replace <id>] [--title-uz … --title-ru … --title-en …]',
    );
  }
  const store = imageStore({
    uploadsDir: process.env.UPLOADS_DIR ?? './storage/uploads',
    r2: r2ConfigFrom(process.env),
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const film = await readFile(filmPath);
  const poster = await readFile(posterPath);
  try {
    if (replace) await replaceFilm(prisma, store, replace, film, poster);
    else await addFilm(prisma, store, film, poster);
  } finally {
    await prisma.$disconnect();
  }
}

await main();
