import { mkdir, open, readdir, readFile, rm, stat, statfs } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service.js';
import type { Env } from '../config/env.js';
import type { MediaVideoJob } from '../generated/prisma/client.js';
import { configuredImageStore } from '../media/configured-store.js';
import {
  deleteStoredImage,
  GALLERY_IMAGE_WIDTHS,
  mediaPrefix,
  storeImage,
  videoType,
  type ImageStore,
  type StoredImage,
  type VideoType,
} from '../media/image-processing.js';
import { inspectVideoFile, storeVideoFile } from '../media/video-files.js';
import {
  demuxerFor,
  ffmpegArguments,
  planFilm,
  posterArguments,
  posterSeconds,
  type Container,
  type Demuxer,
} from '../media/video-plan.js';
import {
  findVideoTools,
  probeFilm,
  runFfmpeg,
  VideoToolError,
  type VideoTools,
} from '../media/video-tools.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';

/** Why a film is refused, as the admin area explains it. */
export type FilmRefusal =
  'unsupported_video' | 'video_conversion_failed' | 'video_conversion_unavailable' | 'disk_full';

class FilmRefused extends Error {
  constructor(readonly reason: FilmRefusal) {
    super(`Film refused: ${reason}`);
  }
}

/** Looks for work this often too (a job a stopped process left). */
const LOOK_AGAIN_MS = 60_000;
/** A job being worked on is touched this often. */
const TOUCH_MS = 20_000;
/** A WORKING job untouched this long belongs to a process that stopped: it waits again. */
const STALE_MS = 2 * 60_000;
/** A file in the work folder this recent may be a hand-over under way; older strays go. */
const STRAY_MS = 10 * 60_000;
/** Progress is written at most this often. */
const PROGRESS_MS = 1500;
/** Room left free on the disk beside a conversion (the database, logs, other uploads). */
const DISK_MARGIN_BYTES = 512 * 1024 * 1024;
/** Most a converted film can weigh per second: 8 Mbit/s of pictures and the sound, rounded up. */
const CONVERTED_BYTES_PER_SECOND = 1_250_000;

const STOPPING = 'stopping';
const LET_GO = 'let go';

interface ReadyFilm {
  made: 'keep' | 'remux' | 'convert';
  path: string;
  type: VideoType;
  bytes: number;
  hasAudio: boolean;
  /** Whole seconds, or null when the file does not say. */
  durationSeconds: number | null;
  /** A frame of the film as a PNG, when the item is to get its cover from it. */
  poster: Buffer | null;
}

async function readHead(path: string): Promise<Buffer> {
  const file = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(64);
    const { bytesRead } = await file.read(buffer, 0, 64, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await file.close();
  }
}

/**
 * Films made ready for the site after their upload (ADR-062), one at a time, in the background:
 * the upload's `complete` only hands the file over, so no request waits for a conversion (the
 * server's gateway stops waiting after a minute). Each job is a row, so a restart goes on with it.
 * ffprobe reads the film; it is kept as it is, copied into an MP4 or converted with ffmpeg (see
 * video-plan.ts) at the lowest CPU priority, in a work folder on the uploads volume (`.processing`,
 * never the container's /tmp, which is memory). Then it is stored like any film, the item gets it
 * (and its cover, when asked for and missing) and the storefront is refreshed. A refused film keeps
 * its reason on the item; one published while it was being made ready goes back to a draft.
 */
@Injectable()
export class MediaFilmsService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MediaFilmsService.name);
  private readonly files: ImageStore;
  private readonly directory: string;
  private tools: Promise<VideoTools | null> | null = null;
  private running: Promise<void> | null = null;
  private again = false;
  /** The job this process works on: stopped when its item is deleted or a newer upload comes. */
  private current: { job: MediaVideoJob; stop: AbortController } | null = null;
  private timer: NodeJS.Timeout | undefined;
  private closing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
    private readonly config: ConfigService<Env, true>,
  ) {
    this.files = configuredImageStore(config);
    this.directory = resolve(config.get('UPLOADS_DIR', { infer: true }), '.processing');
  }

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => this.kick(), LOOK_AGAIN_MS).unref();
    this.kick();
  }

  async onModuleDestroy(): Promise<void> {
    this.closing = true;
    clearInterval(this.timer);
    const current = this.current;
    if (!current) return;
    // The next start goes on with it at once: its file stays.
    current.stop.abort(STOPPING);
    await this.prisma.mediaVideoJob
      .updateMany({
        where: { uploadId: current.job.uploadId, state: 'WORKING' },
        data: { state: 'WAITING', percent: null },
      })
      .catch(() => undefined);
  }

  /** How films are made ready here, for the start-up line. */
  async mode(): Promise<string> {
    const tools = await this.videoTools();
    if (!tools) return 'mp4-webm-as-uploaded';
    return `ffmpeg ${tools.version}${tools.toneMapping ? '' : ' (no tone mapping)'}`;
  }

  /** Where an upload's file waits to be made ready. */
  sourcePath(uploadId: string): string {
    return join(this.directory, `${uploadId}.source`);
  }

  /** Looks for work now (after a hand-over, at start-up, and every minute). */
  kick(): void {
    if (this.closing) return;
    if (this.running) {
      this.again = true;
      return;
    }
    this.again = false;
    this.running = this.drain()
      .catch((error: unknown) => this.logger.error({ err: error }, 'Films could not be made ready'))
      .finally(() => {
        this.running = null;
        if (this.again) this.kick();
      });
  }

  /** An upload that will not be made ready (its item deleted, a newer upload): stopped, removed. */
  async letGo(uploadId: string): Promise<void> {
    if (this.current?.job.uploadId === uploadId) {
      this.current.stop.abort(LET_GO);
      return;
    }
    await rm(this.sourcePath(uploadId), { force: true });
  }

  private videoTools(): Promise<VideoTools | null> {
    this.tools ??= findVideoTools(
      this.config.get('FFMPEG_PATH', { infer: true }),
      this.config.get('FFPROBE_PATH', { infer: true }),
    );
    return this.tools;
  }

  private async drain(): Promise<void> {
    await this.recover();
    for (let job = await this.claim(); job; job = this.closing ? null : await this.claim()) {
      await this.prepare(job);
    }
  }

  /** Work a stopped process left waits again (its file is still here); stray files go. */
  private async recover(): Promise<void> {
    await this.prisma.mediaVideoJob.updateMany({
      where: { state: 'WORKING', updatedAt: { lt: new Date(Date.now() - STALE_MS) } },
      data: { state: 'WAITING', percent: null },
    });
    await mkdir(this.directory, { recursive: true });
    const names = await readdir(this.directory);
    if (names.length === 0) return;
    const jobs = await this.prisma.mediaVideoJob.findMany({
      where: { state: { in: ['WAITING', 'WORKING'] } },
      select: { uploadId: true },
    });
    const known = new Set(jobs.map((job) => job.uploadId));
    for (const name of names) {
      const path = join(this.directory, name);
      if (known.has(name.split('.')[0]!)) continue;
      const changed = await stat(path).then(
        (found) => found.ctimeMs,
        () => Date.now(),
      );
      if (Date.now() - changed > STRAY_MS) await rm(path, { force: true, recursive: true });
    }
  }

  /** The oldest waiting job, now this process's (several processes never take the same one). */
  private async claim(): Promise<MediaVideoJob | null> {
    for (;;) {
      const next = await this.prisma.mediaVideoJob.findFirst({
        where: { state: 'WAITING' },
        orderBy: { createdAt: 'asc' },
      });
      if (!next) return null;
      const { count } = await this.prisma.mediaVideoJob.updateMany({
        where: { mediaItemId: next.mediaItemId, uploadId: next.uploadId, state: 'WAITING' },
        data: { state: 'WORKING', percent: null },
      });
      if (count === 1) return { ...next, state: 'WORKING', percent: null };
    }
  }

  /** Writes to a job that is still this process's; false when it was replaced or deleted. */
  private async update(job: MediaVideoJob, data: { percent?: number | null }): Promise<boolean> {
    const { count } = await this.prisma.mediaVideoJob.updateMany({
      where: { mediaItemId: job.mediaItemId, uploadId: job.uploadId, state: 'WORKING' },
      data: { ...data, updatedAt: new Date() },
    });
    return count === 1;
  }

  private async prepare(job: MediaVideoJob): Promise<void> {
    const stop = new AbortController();
    this.current = { job, stop };
    const touch = setInterval(() => {
      void this.update(job, {}).then(
        (mine) => {
          if (!mine) stop.abort(LET_GO);
        },
        () => undefined,
      );
    }, TOUCH_MS);
    const output = join(this.directory, `${job.uploadId}.mp4`);
    const poster = join(this.directory, `${job.uploadId}.png`);
    const started = Date.now();
    let keepSource = false;
    try {
      const ready = await this.makeReady(job, output, poster, stop.signal);
      if (stop.signal.aborted) throw new Error('Stopped');
      await this.keep(job, ready);
      this.logger.log(
        {
          mediaItemId: job.mediaItemId,
          made: ready.made,
          uploaded: Number(job.bytes),
          bytes: ready.bytes,
          ms: Date.now() - started,
        },
        'Film ready',
      );
    } catch (error) {
      if (stop.signal.aborted) {
        keepSource = stop.signal.reason === STOPPING;
      } else {
        await this.refuse(job, error);
      }
    } finally {
      clearInterval(touch);
      this.current = null;
      await rm(output, { force: true });
      await rm(poster, { force: true });
      if (!keepSource) await rm(this.sourcePath(job.uploadId), { force: true });
    }
  }

  private async makeReady(
    job: MediaVideoJob,
    output: string,
    posterPath: string,
    signal: AbortSignal,
  ): Promise<ReadyFilm> {
    const source = this.sourcePath(job.uploadId);
    let head: Buffer;
    try {
      head = await readHead(source);
    } catch {
      // Its file is gone (a disk restored without it): it has to be uploaded again.
      throw new FilmRefused('video_conversion_failed');
    }
    const tools = await this.videoTools();
    const demuxer = demuxerFor(head);
    if (!tools) {
      // Kept as uploaded, as before ADR-062: only MP4 and WebM; a QuickTime film needs ffmpeg.
      const facts = await inspectVideoFile(source);
      if (!facts) {
        throw new FilmRefused(demuxer ? 'video_conversion_unavailable' : 'unsupported_video');
      }
      return { made: 'keep', path: source, poster: null, ...facts };
    }
    if (!demuxer) throw new FilmRefused('unsupported_video');
    const sniffed = videoType(head);
    const container: Container =
      sniffed === 'video/mp4' ? 'mp4' : sniffed === 'video/webm' ? 'webm' : 'other';
    const probe = await probeFilm(tools, source, demuxer, signal);
    const plan = probe ? planFilm(probe, container) : null;
    if (!plan || plan.action === 'refuse') throw new FilmRefused('unsupported_video');
    let path = source;
    let reader: Demuxer = demuxer;
    if (plan.action !== 'keep') {
      // A copy weighs what the upload does; a conversion at most its bit rate's ceiling.
      const bytes = Number(job.bytes);
      const duration = plan.facts.duration;
      await this.makeRoom(
        plan.action === 'remux'
          ? bytes
          : duration
            ? duration * CONVERTED_BYTES_PER_SECOND
            : bytes * 2,
      );
      let written = 0;
      const args = ffmpegArguments(plan, source, output, {
        toneMapping: tools.toneMapping,
        demuxer,
      });
      await runFfmpeg(tools, args, {
        duration: plan.facts.duration,
        signal,
        onProgress: (percent) => {
          if (Date.now() - written < PROGRESS_MS) return;
          written = Date.now();
          void this.update(job, { percent }).catch(() => undefined);
        },
      });
      path = output;
      reader = 'mov';
    }
    const duration = plan.facts.duration;
    return {
      made: plan.action,
      path,
      type: plan.action === 'keep' ? plan.type : 'video/mp4',
      bytes: (await stat(path)).size,
      hasAudio: plan.facts.hasAudio,
      durationSeconds: duration ? Math.max(1, Math.round(duration)) : null,
      poster: job.makePoster
        ? await this.frame(tools, path, reader, duration, posterPath, signal)
        : null,
    };
  }

  /** Refuses work the disk has not the room for: the result, beside the margin. */
  private async makeRoom(needed: number): Promise<void> {
    let free: number;
    try {
      const disk = await statfs(this.directory);
      free = Number(disk.bavail) * Number(disk.bsize);
    } catch {
      return;
    }
    if (needed + DISK_MARGIN_BYTES > free) throw new FilmRefused('disk_full');
  }

  /** A frame of the film for its cover; null if none could be taken (the cover is then missing). */
  private async frame(
    tools: VideoTools,
    film: string,
    demuxer: Demuxer,
    duration: number | null,
    output: string,
    signal: AbortSignal,
  ): Promise<Buffer | null> {
    try {
      const args = posterArguments(film, demuxer, posterSeconds(duration), output);
      await runFfmpeg(tools, args, { signal });
      return await readFile(output);
    } catch (error) {
      if (signal.aborted) throw error;
      this.logger.warn({ err: error }, 'No cover could be taken from the film');
      return null;
    }
  }

  /** Stores the film (and its cover) and gives them to the item, unless the job was let go. */
  private async keep(job: MediaVideoJob, ready: ReadyFilm): Promise<void> {
    const id = job.mediaItemId;
    const stored = await storeVideoFile(
      ready.path,
      {
        type: ready.type,
        bytes: ready.bytes,
        hasAudio: ready.hasAudio,
        durationSeconds: ready.durationSeconds,
      },
      this.files,
      mediaPrefix(id),
    );
    let poster: StoredImage | null = null;
    if (ready.poster) {
      try {
        poster = await storeImage(ready.poster, this.files, mediaPrefix(id), {
          widths: GALLERY_IMAGE_WIDTHS,
          fullWidth: true,
        });
      } catch (error) {
        this.logger.warn({ err: error }, 'The cover taken from the film could not be stored');
      }
    }
    let kept: { previous: string | null; poster: boolean } | null = null;
    try {
      kept = await this.prisma.$transaction(async (tx) => {
        const current = await tx.mediaVideoJob.findUnique({ where: { mediaItemId: id } });
        const item =
          current?.uploadId === job.uploadId
            ? await tx.mediaItem.findUnique({ where: { id } })
            : null;
        if (!item) return null;
        const cover = poster !== null && item.imageKey === null ? poster : null;
        await tx.mediaItem.update({
          where: { id },
          data: {
            videoKey: stored.storageKey,
            videoType: stored.type,
            videoBytes: stored.bytes,
            videoHasAudio: stored.hasAudio,
            // The running time is read from the file itself (when the file records it).
            ...(ready.durationSeconds !== null
              ? { videoDurationSeconds: ready.durationSeconds }
              : {}),
            ...(cover
              ? {
                  imageKey: cover.storageKey,
                  imageWidths: cover.widths,
                  imageWidth: cover.width,
                  imageHeight: cover.height,
                }
              : {}),
          },
        });
        await tx.mediaVideoJob.delete({ where: { mediaItemId: id } });
        await this.audit.record(
          {
            actorUserId: job.actorUserId,
            action: 'media.video',
            entityType: 'MediaItem',
            entityId: id,
            metadata: {
              bytes: stored.bytes,
              uploaded: Number(job.bytes),
              made: ready.made,
              ...(cover ? { cover: 'from-film' } : {}),
            },
            ipAddress: job.ipAddress,
          },
          tx,
        );
        return { previous: item.videoKey, poster: cover !== null };
      });
    } catch (error) {
      await deleteStoredImage(this.files, stored.storageKey);
      if (poster) await deleteStoredImage(this.files, poster.storageKey);
      throw error;
    }
    if (!kept) {
      // Deleted, or replaced by a newer upload, while it was being made ready.
      await deleteStoredImage(this.files, stored.storageKey);
      if (poster) await deleteStoredImage(this.files, poster.storageKey);
      return;
    }
    if (poster && !kept.poster) await deleteStoredImage(this.files, poster.storageKey);
    if (kept.previous) await deleteStoredImage(this.files, kept.previous);
    this.revalidation.notify('content');
  }

  private async refuse(job: MediaVideoJob, error: unknown): Promise<void> {
    const reason = error instanceof FilmRefused ? error.reason : 'video_conversion_failed';
    this.logger.warn(
      {
        mediaItemId: job.mediaItemId,
        reason,
        ...(error instanceof FilmRefused ? {} : { err: error }),
        ...(error instanceof VideoToolError ? { detail: error.detail } : {}),
      },
      'Film refused',
    );
    const changed = await this.prisma
      .$transaction(async (tx) => {
        const { count } = await tx.mediaVideoJob.updateMany({
          where: { mediaItemId: job.mediaItemId, uploadId: job.uploadId, state: 'WORKING' },
          data: { state: 'FAILED', reason, percent: null },
        });
        if (count === 0) return false;
        // Published while it was being made ready, it has nothing to show: back to a draft.
        await tx.mediaItem.updateMany({
          where: { id: job.mediaItemId, status: 'PUBLISHED', videoKey: null },
          data: { status: 'DRAFT' },
        });
        await this.audit.record(
          {
            actorUserId: job.actorUserId,
            action: 'media.video.refused',
            entityType: 'MediaItem',
            entityId: job.mediaItemId,
            metadata: { reason },
            ipAddress: job.ipAddress,
          },
          tx,
        );
        return true;
      })
      .catch((failure: unknown) => {
        this.logger.error({ err: failure }, 'A refused film could not be recorded');
        return false;
      });
    if (changed) this.revalidation.notify('content');
  }
}
