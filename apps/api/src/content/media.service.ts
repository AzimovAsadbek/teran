import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  isFilmKind,
  type ImageDto,
  type Locale,
  type MediaItemDto,
  type MediaListQuery,
  type Paginated,
} from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import { PUBLIC_UPLOADS_PATH } from '../catalog/catalog.mapper.js';
import { videoFileName } from '../media/image-processing.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * What visitors may see: published, with its photograph or poster, and (videos) with the file.
 * An item that is half-made in the admin area never reaches the storefront.
 */
export const VISIBLE_MEDIA_WHERE = {
  status: 'PUBLISHED',
  imageKey: { not: null },
  OR: [{ kind: 'PHOTO' }, { kind: { in: ['VIDEO', 'SHORT'] }, videoKey: { not: null } }],
} satisfies Prisma.MediaItemWhereInput;

type MediaRow = Prisma.MediaItemGetPayload<{ include: { translations: true } }>;

/** The photograph or poster as an image: same renditions and URL scheme as product images. */
export function mediaImage(row: MediaRow, alt: string): ImageDto | null {
  if (!row.imageKey || !row.imageWidth || !row.imageHeight) return null;
  return {
    src: `${PUBLIC_UPLOADS_PATH}/${row.imageKey}`,
    widths: row.imageWidths,
    width: row.imageWidth,
    height: row.imageHeight,
    alt,
    transparent: false,
  };
}

export function mediaVideoSrc(row: { videoKey: string | null; videoType: string | null }) {
  return row.videoKey && row.videoType
    ? `${PUBLIC_UPLOADS_PATH}/${row.videoKey}/${videoFileName(row.videoType)}`
    : null;
}

/** A video's subtitles file (WebVTT), when one was uploaded. */
export function mediaCaptionsSrc(row: { captionsKey: string | null }): string | null {
  return row.captionsKey ? `${PUBLIC_UPLOADS_PATH}/${row.captionsKey}/captions.vtt` : null;
}

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: MediaListQuery): Promise<Paginated<MediaItemDto>> {
    const where: Prisma.MediaItemWhereInput = {
      AND: [
        VISIBLE_MEDIA_WHERE,
        query.kind ? { kind: query.kind } : {},
        query.featured ? { isFeatured: true } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.mediaItem.count({ where }),
      this.prisma.mediaItem.findMany({
        where,
        include: { translations: { where: { locale: { in: localeChain(query.locale) } } } },
        orderBy: [{ position: 'asc' }, { publishedAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const items = rows.flatMap((row) => {
      const item = toMediaItem(row, query.locale);
      return item ? [item] : [];
    });
    return buildPaginated(items, total, query.page, query.pageSize);
  }
}

/** A gallery item as the storefront shows it; null without its picture. */
export function toMediaItem(row: MediaRow, locale: Locale): MediaItemDto | null {
  const translation = pickTranslation(row.translations, locale);
  const title = translation?.title ?? '';
  const image = mediaImage(row, translation?.altText ?? title);
  if (!image) return null;
  const src = mediaVideoSrc(row);
  const captions = mediaCaptionsSrc(row);
  return {
    id: row.id,
    kind: row.kind,
    title,
    caption: translation?.caption ?? null,
    image,
    video:
      isFilmKind(row.kind) &&
      src &&
      (row.videoType === 'video/mp4' || row.videoType === 'video/webm')
        ? {
            src,
            type: row.videoType,
            durationSeconds: row.videoDurationSeconds,
            captions: captions ? { src: captions, srclang: 'uz' as const } : null,
            hasAudio: row.videoHasAudio,
          }
        : null,
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
  };
}
