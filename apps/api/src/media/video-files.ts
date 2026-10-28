import { randomBytes } from 'node:crypto';
import { open, type FileHandle } from 'node:fs/promises';
import {
  videoDurationSeconds,
  videoFileName,
  videoHasAudio,
  videoType,
  type ImageStore,
  type StoredVideo,
  type VideoType,
} from './image-processing.js';

/*
 * Films of any size (ADR-061): what the API needs to know of a film is read from the file on disk,
 * a few kilobytes at a time, and the file goes to storage without passing through memory.
 */

/** A WebM's Info and Tracks come before its pictures. */
const WEBM_HEAD_BYTES = 8 * 1024 * 1024;
/** An MP4's index (`moov`) is kilobytes to a few megabytes; a larger one is not read. */
const MAX_MOOV_BYTES = 128 * 1024 * 1024;

export interface VideoFileFacts {
  type: VideoType;
  bytes: number;
  /** The file has a sound track. */
  hasAudio: boolean;
  /** Whole seconds, or null when the file does not record its running time. */
  durationSeconds: number | null;
}

async function readAt(file: FileHandle, offset: number, length: number): Promise<Buffer> {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await file.read(buffer, 0, length, offset);
  return buffer.subarray(0, bytesRead);
}

/**
 * An MP4's `moov` box, found by stepping over the top-level boxes (a film's pictures, `mdat`, can
 * be gigabytes and come before or after it). Null when there is none, or it is unreasonably large.
 */
async function readMoov(file: FileHandle, size: number): Promise<Buffer | null> {
  let offset = 0;
  while (offset + 8 <= size) {
    const header = await readAt(file, offset, 16);
    if (header.length < 8) return null;
    let boxSize = header.readUInt32BE(0);
    let headerSize = 8;
    if (boxSize === 1) {
      if (header.length < 16) return null;
      boxSize = Number(header.readBigUInt64BE(8));
      headerSize = 16;
    } else if (boxSize === 0) {
      boxSize = size - offset;
    }
    if (boxSize < headerSize) return null;
    if (header.toString('latin1', 4, 8) === 'moov') {
      return boxSize <= MAX_MOOV_BYTES
        ? readAt(file, offset, Math.min(boxSize, size - offset))
        : null;
    }
    offset += boxSize;
  }
  return null;
}

/**
 * The type, size, sound and running time of a film on disk, or null when it is not an MP4 or
 * WebM (recognised by its first bytes, as for films uploaded whole).
 */
export async function inspectVideoFile(path: string): Promise<VideoFileFacts | null> {
  const file = await open(path, 'r');
  try {
    const { size } = await file.stat();
    const type = videoType(await readAt(file, 0, Math.min(size, 64)));
    if (!type) return null;
    const index =
      type === 'video/mp4'
        ? await readMoov(file, size)
        : await readAt(file, 0, Math.min(size, WEBM_HEAD_BYTES));
    return {
      type,
      bytes: size,
      hasAudio: index ? videoHasAudio(index, type) : false,
      durationSeconds: index ? videoDurationSeconds(index, type) : null,
    };
  } finally {
    await file.close();
  }
}

/** Keeps a film from disk as it is, under a random key (the file may be moved by the store). */
export async function storeVideoFile(
  path: string,
  facts: VideoFileFacts,
  store: ImageStore,
  prefix: string,
): Promise<StoredVideo> {
  const storageKey = `${prefix}/${randomBytes(9).toString('base64url')}`;
  await store.saveFileFrom(storageKey, videoFileName(facts.type), path, facts.type);
  return { storageKey, type: facts.type, bytes: facts.bytes, hasAudio: facts.hasAudio };
}
