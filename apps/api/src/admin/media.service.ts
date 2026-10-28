import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isFilmKind,
  type AdminMediaItem,
  type MediaKind,
  type MediaUploadSession,
  type mediaUpsertSchema,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { ApiException } from '../common/errors/api-exception.js';
import type { Env } from '../config/env.js';
import { mediaCaptionsSrc, mediaImage, mediaVideoSrc } from '../content/media.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  deleteStoredImage,
  GALLERY_IMAGE_WIDTHS,
  mediaPrefix,
  storeCaptions,
  storeImage,
  VideoRejectedError,
  type ImageStore,
} from '../media/image-processing.js';
import { inspectVideoFile, storeVideoFile } from '../media/video-files.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { nullable, toAdminTranslation, translationRows, type Actor } from './admin-support.js';
import { MediaUploadsService } from './media-uploads.service.js';
import { assertPublishable, mediaReadiness } from './readiness.js';
import { uploadError } from './uploads.js';
import { configuredImageStore } from '../media/configured-store.js';

type MediaPayload = z.output<typeof mediaUpsertSchema>;
type MediaRow = Prisma.MediaItemGetPayload<{ include: { translations: true } }>;

const include = { translations: true } satisfies Prisma.MediaItemInclude;

/**
 * "Lavhalar" in the admin area: photographs and short films, managed separately (a photograph never
 * becomes a film or the other way round; each kind has its own order). Titles, captions and
 * alternative text are translated; any item can be chosen for the home page. An item is saved as
 * a draft first; its photograph (or a film's poster and file, and optional subtitles) is uploaded
 * to it, and only then can it be published. Every change refreshes the storefront's cache.
 */
@Injectable()
export class AdminMediaService {
  private readonly files: ImageStore;
  /** Films being stored from their uploads, by item and upload. */
  private readonly storing = new Map<string, Promise<AdminMediaItem>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
    private readonly uploads: MediaUploadsService,
    config: ConfigService<Env, true>,
  ) {
    this.files = configuredImageStore(config);
  }

  async list(kind?: MediaKind): Promise<AdminMediaItem[]> {
    const rows = await this.prisma.mediaItem.findMany({
      where: kind ? { kind } : {},
      include,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.toAdmin(row));
  }

  async get(id: string): Promise<AdminMediaItem> {
    return this.toAdmin(await this.find(id));
  }

  async save(id: string | null, input: MediaPayload, actor: Actor): Promise<AdminMediaItem> {
    const rows = translationRows(input.translations).map((row) => ({
      locale: row.locale,
      title: row.title,
      caption: nullable(row.caption),
      altText: nullable(row.altText),
    }));
    const savedId = await this.prisma.$transaction(async (tx) => {
      let mediaId: string;
      if (id) {
        const existing = await tx.mediaItem.findUnique({ where: { id } });
        if (!existing) throw ApiException.notFound('Media item not found');
        if (existing.kind !== input.kind) {
          throw ApiException.conflict('CONFLICT', 'A photograph cannot become a film or back', {
            reason: 'kind_fixed',
          });
        }
        if (input.status === 'PUBLISHED') {
          assertPublishable(
            mediaReadiness({
              kind: existing.kind,
              hasImage: existing.imageKey !== null,
              hasVideo: existing.videoKey !== null,
              hasCaptions: existing.captionsKey !== null,
              durationSeconds: existing.videoDurationSeconds,
              translations: rows,
            }),
            existing.kind === 'PHOTO' ? 'photograph' : 'film',
          );
        }
        await tx.mediaItem.update({
          where: { id },
          data: {
            status: input.status,
            isFeatured: input.isFeatured,
            // A running time read from the file is kept unless the editor gives another one.
            videoDurationSeconds: input.videoDurationSeconds ?? existing.videoDurationSeconds,
            // The first publication date is kept when an item is unpublished and republished.
            publishedAt:
              input.status === 'PUBLISHED' && !existing.publishedAt
                ? new Date()
                : existing.publishedAt,
          },
        });
        await tx.mediaItemTranslation.deleteMany({
          where: { mediaItemId: id, locale: { notIn: rows.map((row) => row.locale) } },
        });
        for (const row of rows) {
          await tx.mediaItemTranslation.upsert({
            where: { mediaItemId_locale: { mediaItemId: id, locale: row.locale } },
            create: { ...row, mediaItemId: id },
            update: row,
          });
        }
        mediaId = id;
      } else {
        // A new item has no photograph yet: it is saved as a draft, then published.
        if (input.status === 'PUBLISHED') {
          assertPublishable(
            mediaReadiness({
              kind: input.kind,
              hasImage: false,
              hasVideo: false,
              hasCaptions: false,
              durationSeconds: null,
              translations: rows,
            }),
            input.kind === 'PHOTO' ? 'photograph' : 'film',
          );
        }
        const { _max } = await tx.mediaItem.aggregate({
          where: { kind: input.kind },
          _max: { position: true },
        });
        const created = await tx.mediaItem.create({
          data: {
            kind: input.kind,
            status: 'DRAFT',
            isFeatured: input.isFeatured,
            videoDurationSeconds: input.videoDurationSeconds,
            position: (_max.position ?? -1) + 1,
            translations: { create: rows },
          },
          select: { id: true },
        });
        mediaId = created.id;
      }
      await this.record(tx, actor, id ? 'media.update' : 'media.create', mediaId, {
        kind: input.kind,
        status: input.status,
      });
      return mediaId;
    });
    this.revalidation.notify('content');
    return this.get(savedId);
  }

  async remove(id: string, actor: Actor): Promise<void> {
    const row = await this.prisma.$transaction(async (tx) => {
      const found = await tx.mediaItem.findUnique({ where: { id } });
      if (!found) throw ApiException.notFound('Media item not found');
      await tx.mediaItem.delete({ where: { id } });
      await this.record(tx, actor, 'media.delete', id, { kind: found.kind });
      return found;
    });
    // Files go only after the row is gone, so the storefront never references a missing file.
    for (const key of [row.imageKey, row.videoKey, row.captionsKey]) {
      if (key) await deleteStoredImage(this.files, key);
    }
    this.revalidation.notify('content');
  }

  /** Orders one kind's items (photographs and films are listed and shown separately). */
  async reorder(kind: MediaKind, ids: string[], actor: Actor): Promise<AdminMediaItem[]> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.mediaItem.findMany({ where: { kind }, select: { id: true } });
      const known = new Set(existing.map((row) => row.id));
      if (ids.length !== known.size || !ids.every((id) => known.has(id))) {
        throw ApiException.badRequest(
          'BAD_REQUEST',
          'The list must contain every item of this kind once',
        );
      }
      for (const [position, id] of ids.entries()) {
        await tx.mediaItem.update({ where: { id }, data: { position } });
      }
      await this.record(tx, actor, 'media.reorder', null, { kind, count: ids.length });
    });
    this.revalidation.notify('content');
    return this.list(kind);
  }

  /** The photograph, or a video's poster frame; replaces the previous one. */
  async setImage(id: string, file: Buffer, actor: Actor): Promise<AdminMediaItem> {
    const existing = await this.find(id);
    let stored;
    try {
      stored = await storeImage(file, this.files, mediaPrefix(id), {
        widths: GALLERY_IMAGE_WIDTHS,
        fullWidth: true,
      });
    } catch (error) {
      uploadError(error);
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.mediaItem.update({
          where: { id },
          data: {
            imageKey: stored.storageKey,
            imageWidths: stored.widths,
            imageWidth: stored.width,
            imageHeight: stored.height,
          },
        });
        await this.record(tx, actor, 'media.image', id, null);
      });
    } catch (error) {
      await deleteStoredImage(this.files, stored.storageKey);
      throw error;
    }
    if (existing.imageKey) await deleteStoredImage(this.files, existing.imageKey);
    this.revalidation.notify('content');
    return this.get(id);
  }

  /** A video's file (MP4 or WebM, kept as uploaded); replaces the previous one. */
  /** Starts a film's upload in pieces (ADR-061): any size, as long as the server has the room. */
  async startVideoUpload(id: string, size: number): Promise<MediaUploadSession> {
    const existing = await this.find(id);
    if (!isFilmKind(existing.kind)) {
      throw ApiException.badRequest('BAD_REQUEST', 'Only films and shorts have a video file');
    }
    return this.uploads.start(id, size);
  }

  /**
   * Keeps a fully uploaded film as the item's file. Storing a long film in R2 can outlast the
   * gateway's patience (Nginx gives up after a minute) while the work goes on here: the browser
   * asks again, and a second request for the same upload waits for the work under way instead of
   * starting it twice.
   */
  setVideoFromUpload(id: string, uploadId: string, actor: Actor): Promise<AdminMediaItem> {
    const key = `${id}/${uploadId}`;
    let work = this.storing.get(key);
    if (!work) {
      work = this.keepUploadedFilm(id, uploadId, actor).finally(() => this.storing.delete(key));
      this.storing.set(key, work);
    }
    return work;
  }

  /** Removes an upload and what was sent of it; a film already being stored is left to finish. */
  async cancelVideoUpload(id: string, uploadId: string): Promise<void> {
    await this.uploads.status(id, uploadId);
    if (this.storing.has(`${id}/${uploadId}`)) {
      throw ApiException.conflict('CONFLICT', 'The film is being stored', {
        reason: 'upload_storing',
      });
    }
    await this.uploads.discard(uploadId);
  }

  /**
   * The film recognised by its first bytes (MP4 or WebM), its running time and sound read from the
   * file, then stored as it is. The upload is discarded either way; a refused file has to be
   * chosen again.
   */
  private async keepUploadedFilm(
    id: string,
    uploadId: string,
    actor: Actor,
  ): Promise<AdminMediaItem> {
    const existing = await this.find(id);
    if (!isFilmKind(existing.kind)) {
      throw ApiException.badRequest('BAD_REQUEST', 'Only films and shorts have a video file');
    }
    const upload = await this.uploads.finished(id, uploadId);
    let stored;
    let duration: number | null;
    try {
      const facts = await inspectVideoFile(upload.path);
      if (!facts) throw new VideoRejectedError();
      duration = facts.durationSeconds;
      stored = await storeVideoFile(upload.path, facts, this.files, mediaPrefix(id));
    } catch (error) {
      uploadError(error);
    } finally {
      await this.uploads.discard(uploadId);
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.mediaItem.update({
          where: { id },
          data: {
            videoKey: stored.storageKey,
            videoType: stored.type,
            videoBytes: stored.bytes,
            videoHasAudio: stored.hasAudio,
            // The running time is read from the file itself (when the file records it).
            ...(duration !== null ? { videoDurationSeconds: duration } : {}),
          },
        });
        await this.record(tx, actor, 'media.video', id, { bytes: stored.bytes });
      });
    } catch (error) {
      await deleteStoredImage(this.files, stored.storageKey);
      throw error;
    }
    if (existing.videoKey) await deleteStoredImage(this.files, existing.videoKey);
    this.revalidation.notify('content');
    return this.get(id);
  }

  /** Subtitles (WebVTT) for a film; replaces the previous file. */
  async setCaptions(id: string, file: Buffer, actor: Actor): Promise<AdminMediaItem> {
    const existing = await this.find(id);
    if (!isFilmKind(existing.kind)) {
      throw ApiException.badRequest('BAD_REQUEST', 'Only films and shorts have subtitles');
    }
    let stored;
    try {
      stored = await storeCaptions(file, this.files, mediaPrefix(id));
    } catch (error) {
      uploadError(error);
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.mediaItem.update({ where: { id }, data: { captionsKey: stored.storageKey } });
        await this.record(tx, actor, 'media.captions', id, null);
      });
    } catch (error) {
      await deleteStoredImage(this.files, stored.storageKey);
      throw error;
    }
    if (existing.captionsKey) await deleteStoredImage(this.files, existing.captionsKey);
    this.revalidation.notify('content');
    return this.get(id);
  }

  async removeCaptions(id: string, actor: Actor): Promise<AdminMediaItem> {
    const existing = await this.find(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.mediaItem.update({ where: { id }, data: { captionsKey: null } });
      await this.record(tx, actor, 'media.captions.remove', id, null);
    });
    if (existing.captionsKey) await deleteStoredImage(this.files, existing.captionsKey);
    this.revalidation.notify('content');
    return this.get(id);
  }

  private async find(id: string): Promise<MediaRow> {
    const row = await this.prisma.mediaItem.findUnique({ where: { id }, include });
    if (!row) throw ApiException.notFound('Media item not found');
    return row;
  }

  private record(
    tx: Prisma.TransactionClient,
    actor: Actor,
    action: string,
    entityId: string | null,
    metadata: Prisma.InputJsonObject | null,
  ) {
    return this.audit.record(
      {
        actorUserId: actor.userId,
        action,
        entityType: 'MediaItem',
        entityId,
        ...(metadata ? { metadata } : {}),
        ipAddress: actor.ipAddress,
      },
      tx,
    );
  }

  private toAdmin(row: MediaRow): AdminMediaItem {
    const translations = toAdminTranslation(row.translations, (translation) => ({
      title: translation.title,
      caption: translation.caption ?? undefined,
      altText: translation.altText ?? undefined,
    }));
    const src = mediaVideoSrc(row);
    const captions = mediaCaptionsSrc(row);
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      isFeatured: row.isFeatured,
      position: row.position,
      image: mediaImage(row, translations.uz.altText ?? translations.uz.title),
      video:
        src && row.videoType && row.videoBytes !== null
          ? {
              src,
              type: row.videoType,
              bytes: Number(row.videoBytes),
              hasAudio: row.videoHasAudio,
            }
          : null,
      videoDurationSeconds: row.videoDurationSeconds,
      captions: captions ? { src: captions } : null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      translations,
      readiness: mediaReadiness({
        kind: row.kind,
        hasImage: row.imageKey !== null,
        hasVideo: row.videoKey !== null,
        hasCaptions: row.captionsKey !== null,
        durationSeconds: row.videoDurationSeconds,
        translations: row.translations,
      }),
    };
  }
}
