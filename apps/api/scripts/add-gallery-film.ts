/**
 * Adds a film to the gallery ("Lavhalar") from local files, published, at the front of the films:
 * for films larger than the admin area can take on a serverless host (its uploads stop at 4.5 MB
 * without object storage's direct uploads). Files go to the store the environment names (R2, Vercel
 * Blob or UPLOADS_DIR), as the admin area stores them.
 *
 *   pnpm --filter @teran/api exec tsx scripts/add-gallery-film.ts --film f.mp4 --poster p.jpg \
 *     --title-uz "…" --title-ru "…" --title-en "…" [--caption-uz "…" --caption-ru "…" --caption-en "…"]
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
} from '../src/media/image-processing.js';

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const filmPath = option('film');
  const posterPath = option('poster');
  const titles = { uz: option('title-uz'), ru: option('title-ru'), en: option('title-en') };
  if (!filmPath || !posterPath || !titles.uz) {
    throw new Error('Usage: --film f.mp4 --poster p.jpg --title-uz … [--title-ru … --title-en …]');
  }
  const store = imageStore({
    uploadsDir: process.env.UPLOADS_DIR ?? './storage/uploads',
    blobToken: process.env.BLOB_READ_WRITE_TOKEN,
    r2: r2ConfigFrom(process.env),
  });
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const film = await readFile(filmPath);
  const poster = await readFile(posterPath);
  try {
    const rows = (['uz', 'ru', 'en'] as const).flatMap((locale) =>
      titles[locale]
        ? [{ locale, title: titles[locale], caption: option(`caption-${locale}`) ?? null }]
        : [],
    );
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
  } finally {
    await prisma.$disconnect();
  }
}

await main();
