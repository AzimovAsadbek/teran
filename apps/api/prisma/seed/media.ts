/**
 * Demonstration "Lavhalar": TERAN's own packaging artwork, presented as what it is (the paintings
 * and pack faces printed on the packs), so the media section and page have something real to show
 * before TERAN supplies photographs and films. No video is invented: video slots stay empty until
 * a real film is uploaded in the admin area.
 *
 * Items have fixed ids, so seeding twice adds nothing and the demo reset removes exactly these.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES, type Locale } from '@teran/contracts';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { deleteStoredImage, mediaPrefix, storeImage } from '../../src/media/image-processing.js';
import { seedImageStore } from './catalogue.js';

const seedDir = dirname(fileURLToPath(import.meta.url));
/** The packaging artwork the storefront already uses (apps/web/scripts/packaging). */
const brandArt = resolve(seedDir, '../../../web/public/brand/art');
const packaging = resolve(seedDir, 'assets/packaging');

type Localized = Record<Locale, string>;

interface DemoMedia {
  id: string;
  file: string;
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
    file: resolve(packaging, '8009-front.webp'),
    featured: true,
    title: { uz: 'TERAN 8009 qadogʻi', ru: 'Упаковка TERAN 8009', en: 'The TERAN 8009 pack' },
    caption: {
      uz: 'Qadoqning old tomoni: TERAN emblemasi, 绿茶 va qadoq oynasi.',
      ru: 'Лицевая сторона упаковки: эмблема TERAN, 绿茶 и окошко упаковки.',
      en: 'The front of the pack: the TERAN emblem, 绿茶 and the window.',
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
    file: resolve(packaging, 'g8810-front.webp'),
    featured: false,
    title: { uz: 'TERAN G8810 qadogʻi', ru: 'Упаковка TERAN G8810', en: 'The TERAN G8810 pack' },
    caption: {
      uz: 'Qadoqning old tomoni.',
      ru: 'Лицевая сторона упаковки.',
      en: 'The front of the pack.',
    },
  },
];

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

/**
 * Adds the demonstration items that are missing (published, in the order listed) and brings
 * unedited text from an earlier version up to date. Returns the number of items added or updated.
 */
export async function seedMedia(
  prisma: PrismaClient,
  options: { uploadsDir: string; now?: Date },
): Promise<number> {
  const now = options.now ?? new Date();
  let created = 0;
  for (const [position, item] of DEMO_MEDIA.entries()) {
    if (await prisma.mediaItem.findUnique({ where: { id: item.id }, select: { id: true } })) {
      if (await updateEarlierCopy(prisma, item)) created += 1;
      continue;
    }
    const stored = await storeImage(
      await readFile(item.file),
      seedImageStore(options.uploadsDir),
      mediaPrefix(item.id),
    );
    await prisma.mediaItem.create({
      data: {
        id: item.id,
        kind: 'PHOTO',
        status: 'PUBLISHED',
        isFeatured: item.featured,
        position,
        imageKey: stored.storageKey,
        imageWidths: stored.widths,
        imageWidth: stored.width,
        imageHeight: stored.height,
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
