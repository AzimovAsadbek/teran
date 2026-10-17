/**
 * Demonstration "Lavhalar": TERAN's own packaging artwork, presented as what it is (the paintings
 * and pack faces printed on the packs), so the media section and page have something real to show
 * before TERAN supplies photographs and films. The films are that same artwork set in slow motion
 * (apps/web/scripts/films/generate-films.mjs) and say so; nothing is filmed or invented.
 *
 * Items have fixed ids, so seeding twice adds nothing and the demo reset removes exactly these.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, type Locale } from '@teran/contracts';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import {
  deleteStoredImage,
  mediaPrefix,
  storeImage,
  storeVideo,
  videoDurationSeconds,
} from '../../src/media/image-processing.js';
import { seedImageStore } from './catalogue.js';

const seedDir = dirname(fileURLToPath(import.meta.url));
/** The packaging artwork the storefront already uses (apps/web/scripts/packaging). */
const brandArt = resolve(seedDir, '../../../web/public/brand/art');
const packaging = resolve(seedDir, 'assets/packaging');
const films = resolve(seedDir, 'assets/films');

type Localized = Record<Locale, string>;

interface DemoMedia {
  id: string;
  /** The photograph, or a film's poster. */
  file: string;
  /** Films only: the WebM file. */
  video?: string;
  featured: boolean;
  title: Localized;
  caption: Localized;
}

export const DEMO_MEDIA: DemoMedia[] = [
  {
    id: '019a3c00-7e5a-7000-8000-00000000a001',
    file: resolve(brandArt, 'lake.webp'),
    featured: true,
    title: {
      uz: 'Qadoq rasmi: tong, koʻl va ayvon',
      ru: 'Рисунок с упаковки: рассвет, озеро и беседка',
      en: 'Pack artwork: dawn, the lake and the pavilion',
    },
    caption: {
      uz: 'TERAN qadogʻining old tomonidagi rasm: tumanli togʻlar, koʻl va ayvon.',
      ru: 'Рисунок с лицевой стороны упаковки TERAN: туманные горы, озеро и беседка.',
      en: 'The artwork on the front of the TERAN pack: misty mountains, a lake and a pavilion.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a002',
    file: resolve(brandArt, 'terraces.webp'),
    featured: true,
    title: {
      uz: 'Qadoq rasmi: choy plantatsiyalari',
      ru: 'Рисунок с упаковки: чайные террасы',
      en: 'Pack artwork: tea terraces',
    },
    caption: {
      uz: 'Qadoqning orqa tomonidagi rasm: togʻ yonbagʻridagi choy plantatsiyalari.',
      ru: 'Рисунок с обратной стороны упаковки: чайные террасы на склоне горы.',
      en: 'The painting on the back of the pack: tea terraces on a mountainside.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a003',
    file: resolve(packaging, '8009-pack.webp'),
    featured: true,
    title: { uz: 'TERAN 8009 qadogʻi', ru: 'Упаковка TERAN 8009', en: 'The TERAN 8009 pack' },
    caption: {
      uz: 'TERAN 8009 zip-paketi: Xitoy yashil choyi, 400 g.',
      ru: 'Зип-пакет TERAN 8009: китайский зелёный чай, 400 г.',
      en: 'The TERAN 8009 zip pouch: Chinese green tea, 400 g.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a004',
    file: resolve(brandArt, 'sprig-1.webp'),
    featured: true,
    title: {
      uz: 'Qadoq bezagi: choy novdasi',
      ru: 'Узор с упаковки: чайная веточка',
      en: 'Pack ornament: a tea sprig',
    },
    caption: {
      uz: 'Qadoq bezagidagi choy novdasi.',
      ru: 'Чайная веточка из оформления упаковки.',
      en: 'The tea sprig from the pack’s decoration.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a005',
    file: resolve(packaging, '8830-back.webp'),
    featured: true,
    title: {
      uz: 'Qadoq orqasi: damlash',
      ru: 'Обратная сторона: заваривание',
      en: 'The back of the pack: brewing',
    },
    caption: {
      uz: 'TERAN 8830 qadogʻining orqa tomoni: damlash tavsiyasi va saqlash shartlari.',
      ru: 'Обратная сторона упаковки TERAN 8830: рекомендации по завариванию и хранению.',
      en: 'The back of the TERAN 8830 pack: brewing and storage directions.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a006',
    file: resolve(packaging, 'g8810-pack.webp'),
    featured: true,
    title: { uz: 'TERAN G8810 qadogʻi', ru: 'Упаковка TERAN G8810', en: 'The TERAN G8810 pack' },
    caption: {
      uz: 'TERAN G8810 zip-paketi: Xitoy yashil choyi, 400 g.',
      ru: 'Зип-пакет TERAN G8810: китайский зелёный чай, 400 г.',
      en: 'The TERAN G8810 zip pouch: Chinese green tea, 400 g.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a011',
    file: resolve(films, 'lake-poster.webp'),
    video: resolve(films, 'lake.webm'),
    featured: true,
    title: {
      uz: 'Qadoq rasmi harakatda: koʻl va ayvon',
      ru: 'Рисунок с упаковки в движении: озеро и беседка',
      en: 'The pack artwork in motion: the lake and the pavilion',
    },
    caption: {
      uz: 'TERAN qadogʻidagi rasm asosida tayyorlangan qisqa video: tumanli togʻlar, koʻl va ayvon.',
      ru: 'Короткое видео по рисунку с упаковки TERAN: туманные горы, озеро и беседка.',
      en: 'A short film made from the artwork on the TERAN pack: misty mountains, a lake and a pavilion.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a012',
    file: resolve(films, 'terraces-poster.webp'),
    video: resolve(films, 'terraces.webm'),
    featured: true,
    title: {
      uz: 'Qadoq rasmi harakatda: choy plantatsiyalari',
      ru: 'Рисунок с упаковки в движении: чайные террасы',
      en: 'The pack artwork in motion: tea terraces',
    },
    caption: {
      uz: 'Qadoqning orqa tomonidagi rasm asosida: togʻ yonbagʻridagi choy plantatsiyalari va ayvon.',
      ru: 'По рисунку с обратной стороны упаковки: чайные террасы на склоне горы и беседка.',
      en: 'Made from the painting on the back of the pack: tea terraces on a mountainside and a pavilion.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a013',
    file: resolve(films, 'packs-poster.webp'),
    video: resolve(films, 'packs.webm'),
    featured: true,
    title: { uz: 'TERAN qadoqlari', ru: 'Упаковки TERAN', en: 'The TERAN packs' },
    caption: {
      uz: 'TERAN XC2025, G8810, 8800, 8830 va 8009 zip-paketlari, qadoq rasmlari fonida.',
      ru: 'Зип-пакеты TERAN XC2025, G8810, 8800, 8830 и 8009 на фоне рисунков с упаковки.',
      en: 'The TERAN XC2025, G8810, 8800, 8830 and 8009 zip pouches, on the paintings from the packs.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a007',
    file: resolve(packaging, 'xc2025-pack.webp'),
    featured: true,
    title: { uz: 'TERAN XC2025 qadogʻi', ru: 'Упаковка TERAN XC2025', en: 'The TERAN XC2025 pack' },
    caption: {
      uz: 'TERAN XC2025 zip-paketi: Xitoy yashil choyi, 400 g.',
      ru: 'Зип-пакет TERAN XC2025: китайский зелёный чай, 400 г.',
      en: 'The TERAN XC2025 zip pouch: Chinese green tea, 400 g.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a008',
    file: resolve(packaging, '8800-pack.webp'),
    featured: true,
    title: { uz: 'TERAN 8800 qadogʻi', ru: 'Упаковка TERAN 8800', en: 'The TERAN 8800 pack' },
    caption: {
      uz: 'TERAN 8800 zip-paketi: Xitoy yashil choyi, 400 g.',
      ru: 'Зип-пакет TERAN 8800: китайский зелёный чай, 400 г.',
      en: 'The TERAN 8800 zip pouch: Chinese green tea, 400 g.',
    },
  },
  {
    id: '019a3c00-7e5a-7000-8000-00000000a009',
    file: resolve(packaging, '8830-pack.webp'),
    featured: true,
    title: { uz: 'TERAN 8830 qadogʻi', ru: 'Упаковка TERAN 8830', en: 'The TERAN 8830 pack' },
    caption: {
      uz: 'TERAN 8830 zip-paketi: Xitoy yashil choyi, 400 g.',
      ru: 'Зип-пакет TERAN 8830: китайский зелёный чай, 400 г.',
      en: 'The TERAN 8830 zip pouch: Chinese green tea, 400 g.',
    },
  },
];

/**
 * Pictures an earlier version of this seed stored, by their size: the tea terraces were stored
 * faded into white, as printed on the pack. An item still carrying that exact picture is given
 * the current file; a picture replaced in the admin area is left alone.
 */
const EARLIER_IMAGES: Record<string, { width: number; height: number }> = {
  '019a3c00-7e5a-7000-8000-00000000a002': { width: 2400, height: 1200 },
  // The flat renders of the print files, before the owner's photographs of the zip pouches.
  '019a3c00-7e5a-7000-8000-00000000a003': { width: 2000, height: 2000 },
  '019a3c00-7e5a-7000-8000-00000000a006': { width: 2000, height: 2000 },
};

/**
 * Films an earlier version of this seed stored, by their size in bytes: the pack film showed four
 * flat renders before the owner's photographs of the five pouches. Replaced (with its poster)
 * while it is still that exact file.
 */
const EARLIER_FILMS: Record<string, number> = {
  '019a3c00-7e5a-7000-8000-00000000a013': 2155265,
};

/**
 * Titles and captions an earlier version of this seed wrote, which read as if the packaging
 * artwork were photographs of real places. Items that still carry them exactly are brought up to
 * date; anything edited in the admin area is left alone.
 */
const EARLIER_COPY: Record<string, Partial<Record<Locale, { title: string; caption?: string }>>> = {
  '019a3c00-7e5a-7000-8000-00000000a001': {
    uz: {
      title: 'Tong: koʻl va ayvon',
      caption: 'TERAN qadogʻining old tomonidagi manzara — tumanli togʻlar, koʻl va ayvon.',
    },
    ru: {
      title: 'Рассвет: озеро и беседка',
      caption: 'Пейзаж с лицевой стороны упаковки TERAN: туманные горы, озеро и беседка.',
    },
    en: {
      title: 'Dawn: the lake and the pavilion',
      caption:
        'The landscape on the front of the TERAN pack: misty mountains, a lake and a pavilion.',
    },
  },
  '019a3c00-7e5a-7000-8000-00000000a002': {
    uz: { title: 'Choy plantatsiyalari' },
    ru: { title: 'Чайные плантации' },
    en: { title: 'Tea terraces' },
  },
  '019a3c00-7e5a-7000-8000-00000000a004': {
    uz: { title: 'Choy barglari' },
    ru: { title: 'Чайные листья' },
    en: { title: 'Tea leaves' },
  },
  '019a3c00-7e5a-7000-8000-00000000a003': {
    uz: {
      title: 'TERAN 8009 qadogʻi',
      caption: 'Qadoqning old tomoni: TERAN emblemasi, 绿茶 va qadoq oynasi.',
    },
    ru: {
      title: 'Упаковка TERAN 8009',
      caption: 'Лицевая сторона упаковки: эмблема TERAN, 绿茶 и окошко упаковки.',
    },
    en: {
      title: 'The TERAN 8009 pack',
      caption: 'The front of the pack: the TERAN emblem, 绿茶 and the window.',
    },
  },
  '019a3c00-7e5a-7000-8000-00000000a006': {
    uz: { title: 'TERAN G8810 qadogʻi', caption: 'Qadoqning old tomoni.' },
    ru: { title: 'Упаковка TERAN G8810', caption: 'Лицевая сторона упаковки.' },
    en: { title: 'The TERAN G8810 pack', caption: 'The front of the pack.' },
  },
  '019a3c00-7e5a-7000-8000-00000000a013': {
    uz: {
      title: 'TERAN qadoqlari',
      caption: 'TERAN XC2025, 8009, 8830 va G8810 qadoqlari, qadoq rasmlari fonida.',
    },
    ru: {
      title: 'Упаковки TERAN',
      caption: 'Упаковки TERAN XC2025, 8009, 8830 и G8810 на фоне рисунков с упаковки.',
    },
    en: {
      title: 'The TERAN packs',
      caption: 'The TERAN XC2025, 8009, 8830 and G8810 packs, on the paintings from the packs.',
    },
  },
};

async function updateEarlierCopy(prisma: PrismaClient, item: DemoMedia): Promise<boolean> {
  const earlier = EARLIER_COPY[item.id];
  if (!earlier) return false;
  let changed = false;
  for (const locale of LOCALES) {
    const old = earlier[locale];
    if (!old) continue;
    const updated = await prisma.mediaItemTranslation.updateMany({
      where: {
        mediaItemId: item.id,
        locale,
        title: old.title,
        ...(old.caption ? { caption: old.caption } : {}),
      },
      data: { title: item.title[locale], caption: item.caption[locale] },
    });
    changed ||= updated.count > 0;
  }
  return changed;
}

async function updateEarlierImage(
  prisma: PrismaClient,
  item: DemoMedia,
  uploadsDir: string,
): Promise<boolean> {
  const earlier = EARLIER_IMAGES[item.id];
  if (!earlier) return false;
  const row = await prisma.mediaItem.findUnique({
    where: { id: item.id },
    select: { imageKey: true, imageWidth: true, imageHeight: true },
  });
  if (!row || row.imageWidth !== earlier.width || row.imageHeight !== earlier.height) return false;
  const store = seedImageStore(uploadsDir);
  const stored = await storeImage(await readFile(item.file), store, mediaPrefix(item.id));
  await prisma.mediaItem.update({
    where: { id: item.id },
    data: {
      imageKey: stored.storageKey,
      imageWidths: stored.widths,
      imageWidth: stored.width,
      imageHeight: stored.height,
    },
  });
  if (row.imageKey) await deleteStoredImage(store, row.imageKey);
  return true;
}

async function updateEarlierFilm(
  prisma: PrismaClient,
  item: DemoMedia,
  uploadsDir: string,
): Promise<boolean> {
  const bytes = EARLIER_FILMS[item.id];
  if (!bytes || !item.video) return false;
  const row = await prisma.mediaItem.findUnique({
    where: { id: item.id },
    select: { imageKey: true, videoKey: true, videoBytes: true },
  });
  if (!row || row.videoBytes !== bytes) return false;
  const store = seedImageStore(uploadsDir);
  const poster = await storeImage(await readFile(item.file), store, mediaPrefix(item.id));
  const video = await storeDemoVideo(item, uploadsDir);
  if (!video) return false;
  await prisma.mediaItem.update({
    where: { id: item.id },
    data: {
      imageKey: poster.storageKey,
      imageWidths: poster.widths,
      imageWidth: poster.width,
      imageHeight: poster.height,
      videoKey: video.storageKey,
      videoType: video.type,
      videoBytes: video.bytes,
      videoDurationSeconds: video.durationSeconds,
    },
  });
  for (const key of [row.imageKey, row.videoKey]) {
    if (key) await deleteStoredImage(store, key);
  }
  return true;
}

/** A film's file, kept as it is, with the running time it records. */
async function storeDemoVideo(item: DemoMedia, uploadsDir: string) {
  if (!item.video) return null;
  const file = await readFile(item.video);
  const stored = await storeVideo(file, seedImageStore(uploadsDir), mediaPrefix(item.id));
  return { ...stored, durationSeconds: videoDurationSeconds(file, stored.type) };
}

/**
 * Adds the demonstration items that are missing (published, in the order listed) and brings
 * unedited text and pictures from an earlier version up to date. Returns the number of items
 * added or updated.
 */
export async function seedMedia(
  prisma: PrismaClient,
  options: { uploadsDir: string; now?: Date },
): Promise<number> {
  const now = options.now ?? new Date();
  let created = 0;
  for (const [position, item] of DEMO_MEDIA.entries()) {
    if (await prisma.mediaItem.findUnique({ where: { id: item.id }, select: { id: true } })) {
      const copy = await updateEarlierCopy(prisma, item);
      const image = await updateEarlierImage(prisma, item, options.uploadsDir);
      const film = await updateEarlierFilm(prisma, item, options.uploadsDir);
      if (copy || image || film) created += 1;
      continue;
    }
    const stored = await storeImage(
      await readFile(item.file),
      seedImageStore(options.uploadsDir),
      mediaPrefix(item.id),
    );
    const video = await storeDemoVideo(item, options.uploadsDir);
    await prisma.mediaItem.create({
      data: {
        id: item.id,
        kind: video ? 'VIDEO' : 'PHOTO',
        status: 'PUBLISHED',
        isFeatured: item.featured,
        position,
        imageKey: stored.storageKey,
        imageWidths: stored.widths,
        imageWidth: stored.width,
        imageHeight: stored.height,
        ...(video
          ? {
              videoKey: video.storageKey,
              videoType: video.type,
              videoBytes: video.bytes,
              videoDurationSeconds: video.durationSeconds,
            }
          : {}),
        publishedAt: now,
        translations: {
          create: LOCALES.map((locale) => ({
            locale,
            title: item.title[locale],
            caption: item.caption[locale],
          })),
        },
      },
    });
    created += 1;
  }
  return created;
}

/** Removes the demonstration items and their files (demo reset only). */
export async function removeDemoMedia(prisma: PrismaClient, uploadsDir: string): Promise<number> {
  const rows = await prisma.mediaItem.findMany({
    where: { id: { in: DEMO_MEDIA.map((item) => item.id) } },
    select: { id: true, imageKey: true, videoKey: true },
  });
  await prisma.mediaItem.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
  for (const key of rows.flatMap((row) => [row.imageKey, row.videoKey])) {
    if (key) await deleteStoredImage(seedImageStore(uploadsDir), key);
  }
  return rows.length;
}
