import { randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  statfs,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MEDIA_UPLOAD_CHUNK_BYTES, type MediaUploadSession } from '@teran/contracts';
import { ApiException } from '../common/errors/api-exception.js';
import type { Env } from '../config/env.js';

/** A piece may be the client's size and a little more, never much more (one request's worth). */
const MAX_PIECE_BYTES = MEDIA_UPLOAD_CHUNK_BYTES + 1024 * 1024;
/** An upload nobody has added to for a day is cleared away. */
const STALE_MS = 24 * 60 * 60 * 1000;
/** Room left free on the disk beside a film being uploaded (the database, logs, other files). */
const DISK_MARGIN_BYTES = 512 * 1024 * 1024;
export const UPLOAD_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

interface SessionRecord {
  mediaId: string;
  size: number;
}

class PieceTooLargeError extends Error {}

/**
 * Films of any size, uploaded in pieces (ADR-061). Each upload is a file growing on the uploads
 * volume (`.incoming/<id>.part`, never served: dot folders are refused) and a small record of the
 * item and the expected size. A piece is accepted only where the file ends, so a piece sent twice
 * or out of turn changes nothing and the answer says where to go on; a piece cut short is taken
 * back, so the upload continues from the last whole piece. The finished file is handed over to be
 * made ready for the site (ADR-062), which ends the upload.
 */
@Injectable()
export class MediaUploadsService {
  private readonly directory: string;
  /** Pieces of one upload are written one after another. */
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(config: ConfigService<Env, true>) {
    this.directory = resolve(config.get('UPLOADS_DIR', { infer: true }), '.incoming');
  }

  async start(mediaId: string, size: number): Promise<MediaUploadSession> {
    await mkdir(this.directory, { recursive: true });
    await this.sweep();
    const free = await this.freeBytes();
    if (free !== null && size + DISK_MARGIN_BYTES > free) {
      throw new ApiException(
        HttpStatus.INSUFFICIENT_STORAGE,
        'PAYLOAD_TOO_LARGE',
        'Not enough free disk space on the server for this file',
        { details: { reason: 'disk_full', freeBytes: Math.max(0, free - DISK_MARGIN_BYTES) } },
      );
    }
    const id = randomBytes(16).toString('base64url');
    const record: SessionRecord = { mediaId, size };
    await writeFile(this.recordPath(id), JSON.stringify(record));
    await writeFile(this.dataPath(id), '');
    return this.session(id, record, 0);
  }

  async status(mediaId: string, id: string): Promise<MediaUploadSession> {
    const record = await this.load(mediaId, id);
    return this.session(id, record, await this.received(id));
  }

  /** Adds the piece that starts at `offset` (where the file ends) and says how far the file goes. */
  append(
    mediaId: string,
    id: string,
    offset: number,
    piece: Readable,
  ): Promise<MediaUploadSession> {
    return this.serialized(id, async () => {
      const record = await this.load(mediaId, id);
      const received = await this.received(id);
      if (offset !== received) {
        // Sent twice, or after a lost answer: the client goes on from what is here.
        piece.resume();
        throw ApiException.conflict('CONFLICT', 'The upload continues at another offset', {
          reason: 'upload_offset',
          received,
        });
      }
      let written = 0;
      const limit = new Transform({
        transform(chunk: Buffer, _encoding, done) {
          written += chunk.length;
          if (written > MAX_PIECE_BYTES || received + written > record.size) {
            done(new PieceTooLargeError());
            return;
          }
          done(null, chunk);
        },
      });
      try {
        await pipeline(piece, limit, createWriteStream(this.dataPath(id), { flags: 'a' }));
      } catch (error) {
        // A piece cut short (the connection dropped) or too large is taken back whole.
        await truncate(this.dataPath(id), received);
        if (error instanceof PieceTooLargeError) {
          throw ApiException.badRequest('BAD_REQUEST', 'The piece is larger than allowed', {
            reason: 'upload_piece_too_large',
            maxBytes: MAX_PIECE_BYTES,
          });
        }
        throw error;
      }
      return this.session(id, record, received + written);
    });
  }

  /**
   * Moves the finished file to `to` (on the same volume: instant) and ends the upload, for the film
   * to be made ready (ADR-062); an incomplete upload is refused with how much there is.
   */
  handOver(mediaId: string, id: string, to: string): Promise<{ size: number }> {
    return this.serialized(id, async () => {
      const record = await this.load(mediaId, id);
      const received = await this.received(id);
      if (received !== record.size) {
        throw ApiException.conflict('CONFLICT', 'The upload is not complete yet', {
          reason: 'upload_incomplete',
          received,
        });
      }
      await mkdir(dirname(to), { recursive: true });
      await rename(this.dataPath(id), to);
      await rm(this.recordPath(id), { force: true });
      return { size: record.size };
    });
  }

  /** Removes an upload (finished, abandoned or cancelled); unknown ones are ignored. */
  async discard(id: string): Promise<void> {
    if (!UPLOAD_ID_PATTERN.test(id)) return;
    await rm(this.dataPath(id), { force: true });
    await rm(this.recordPath(id), { force: true });
  }

  private session(id: string, record: SessionRecord, received: number): MediaUploadSession {
    return { id, size: record.size, received, chunkBytes: MEDIA_UPLOAD_CHUNK_BYTES };
  }

  private async load(mediaId: string, id: string): Promise<SessionRecord> {
    if (!UPLOAD_ID_PATTERN.test(id)) throw ApiException.notFound('Upload not found');
    let record: SessionRecord;
    try {
      record = JSON.parse(await readFile(this.recordPath(id), 'utf8')) as SessionRecord;
    } catch {
      throw ApiException.notFound('Upload not found');
    }
    if (record.mediaId !== mediaId) throw ApiException.notFound('Upload not found');
    return record;
  }

  private async received(id: string): Promise<number> {
    try {
      return (await stat(this.dataPath(id))).size;
    } catch {
      throw ApiException.notFound('Upload not found');
    }
  }

  private async serialized<T>(id: string, work: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(id) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(work);
    this.queues.set(id, next);
    try {
      return await next;
    } finally {
      if (this.queues.get(id) === next) this.queues.delete(id);
    }
  }

  /** Free bytes on the uploads volume, or null where the system does not say. */
  private async freeBytes(): Promise<number | null> {
    try {
      const disk = await statfs(this.directory);
      return Number(disk.bavail) * Number(disk.bsize);
    } catch {
      return null;
    }
  }

  /** Clears uploads not added to for a day (a closed tab, a lost connection). */
  private async sweep(): Promise<void> {
    const now = Date.now();
    for (const name of await readdir(this.directory)) {
      const id = name.replace(/\.(part|json)$/, '');
      if (!UPLOAD_ID_PATTERN.test(id) || !name.endsWith('.json')) continue;
      try {
        const changed = (await stat(this.dataPath(id))).mtimeMs;
        if (now - changed > STALE_MS) await this.discard(id);
      } catch {
        await this.discard(id);
      }
    }
  }

  private dataPath(id: string): string {
    return join(this.directory, `${id}.part`);
  }

  private recordPath(id: string): string {
    return join(this.directory, `${id}.json`);
  }
}
