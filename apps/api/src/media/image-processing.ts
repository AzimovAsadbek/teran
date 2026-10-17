import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { BlobNotFoundError, del, head, list, put } from '@vercel/blob';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import sharp, { type Metadata } from 'sharp';

/**
 * Widths generated for every stored image; the storefront picks the smallest sufficient one. 480
 * serves product cards on phones (about 240 CSS px at 2× density) without falling back to 640.
 */
export const IMAGE_WIDTHS = [320, 480, 640, 960, 1280, 1600] as const;

/**
 * Widths for page pictures that span the whole page (the About hero, listing banners): up to 2560,
 * so a 1312 px banner stays sharp on 2× screens.
 */
export const WIDE_IMAGE_WIDTHS = [...IMAGE_WIDTHS, 1920, 2560] as const;

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MIN_DIMENSION = 200;
/** Rejects decompression bombs (e.g. a tiny PNG that expands to gigapixels). */
const MAX_INPUT_PIXELS = 40_000_000;
const STORAGE_KEY_PATTERN = /^[a-z]+\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{12}$/;

export type ImageRejectionReason = 'unreadable' | 'unsupported_format' | 'too_small';

export class ImageRejectedError extends Error {
  constructor(readonly reason: ImageRejectionReason) {
    super(`Image rejected: ${reason}`);
  }
}

/** JPEG, PNG, WebP and AVIF. sharp reports AVIF as "heif" with AV1 compression (HEIC is refused). */
function isAcceptedFormat(metadata: Metadata): boolean {
  if (metadata.format === 'heif') return metadata.compression === 'av1';
  return metadata.format !== undefined && ACCEPTED_FORMATS.has(metadata.format);
}

export interface StoredImage {
  storageKey: string;
  widths: number[];
  width: number;
  height: number;
  /** A cut-out with a transparent background (see isCutout). */
  transparent: boolean;
}

/**
 * Where renditions are kept: `<key>/<width>.webp` in the uploads directory (served by the API under
 * /uploads), or in Vercel Blob when a token is configured (a serverless deployment has no lasting
 * disk; the storefront then proxies /uploads to the Blob store). The keys are the same either way.
 */
export interface DirectUploadOptions {
  contentType: string;
  maxBytes: number;
  /** How long the permission lasts. */
  validForMs: number;
}

export interface ImageStore {
  save(storageKey: string, width: number, data: Buffer): Promise<void>;
  /** Stores a file as it is (a video) under the key, e.g. `<key>/video.mp4`. */
  saveFile(storageKey: string, fileName: string, data: Buffer, contentType: string): Promise<void>;
  /** Reads a stored file back (e.g. a rendition to attach to a Telegram post); null if missing. */
  read(storageKey: string, fileName: string): Promise<Buffer | null>;
  /** A stored file's size in bytes; null if missing. */
  size(storageKey: string, fileName: string): Promise<number | null>;
  /** Bytes `start` to `end` (inclusive) of a stored file, without reading the rest; null if missing. */
  readRange(
    storageKey: string,
    fileName: string,
    start: number,
    end: number,
  ): Promise<Buffer | null>;
  /** Removes every rendition under the key. Unknown or malformed keys are ignored. */
  remove(storageKey: string): Promise<void>;
  /**
   * Object storage only: a short-lived token that lets the browser upload exactly one file, of
   * one type and size, to `<storageKey>/<fileName>` itself (large films never pass through the
   * API, whose request bodies a serverless host caps at 4.5 MB).
   */
  directUploadToken?(
    storageKey: string,
    fileName: string,
    options: DirectUploadOptions,
  ): Promise<string>;
}

export function imageStore(options: { uploadsDir: string; blobToken?: string }): ImageStore {
  return options.blobToken ? blobStore(options.blobToken) : directoryStore(options.uploadsDir);
}

function directoryStore(uploadsDir: string): ImageStore {
  return {
    async save(storageKey, width, data) {
      const directory = storageDirectory(uploadsDir, storageKey);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, `${width}.webp`), data);
    },
    async saveFile(storageKey, fileName, data) {
      const directory = storageDirectory(uploadsDir, storageKey);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, fileName), data);
    },
    async read(storageKey, fileName) {
      if (!STORAGE_KEY_PATTERN.test(storageKey) || !SAFE_FILE_NAME.test(fileName)) return null;
      try {
        return await readFile(join(storageDirectory(uploadsDir, storageKey), fileName));
      } catch {
        return null;
      }
    },
    async size(storageKey, fileName) {
      if (!STORAGE_KEY_PATTERN.test(storageKey) || !SAFE_FILE_NAME.test(fileName)) return null;
      try {
        return (await stat(join(storageDirectory(uploadsDir, storageKey), fileName))).size;
      } catch {
        return null;
      }
    },
    async readRange(storageKey, fileName, start, end) {
      if (!STORAGE_KEY_PATTERN.test(storageKey) || !SAFE_FILE_NAME.test(fileName)) return null;
      if (start < 0 || end < start) return Buffer.alloc(0);
      let file;
      try {
        file = await open(join(storageDirectory(uploadsDir, storageKey), fileName), 'r');
        const buffer = Buffer.alloc(end - start + 1);
        const { bytesRead } = await file.read(buffer, 0, buffer.length, start);
        return buffer.subarray(0, bytesRead);
      } catch {
        return null;
      } finally {
        await file?.close();
      }
    },
    async remove(storageKey) {
      if (!STORAGE_KEY_PATTERN.test(storageKey)) return;
      await rm(storageDirectory(uploadsDir, storageKey), { recursive: true, force: true });
    },
  };
}

const SAFE_FILE_NAME = /^[a-z0-9]+\.[a-z0-9]+$/;

function blobStore(token: string): ImageStore {
  return {
    async save(storageKey, width, data) {
      await put(`${storageKey}/${width}.webp`, data, {
        access: 'public',
        token,
        contentType: 'image/webp',
        addRandomSuffix: false,
        allowOverwrite: false,
        // Keys are random and never reused, so the files can be cached for a year.
        cacheControlMaxAge: 31_536_000,
      });
    },
    async saveFile(storageKey, fileName, data, contentType) {
      await put(`${storageKey}/${fileName}`, data, {
        access: 'public',
        token,
        contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
        cacheControlMaxAge: 31_536_000,
      });
    },
    async read(storageKey, fileName) {
      if (!STORAGE_KEY_PATTERN.test(storageKey) || !SAFE_FILE_NAME.test(fileName)) return null;
      const { blobs } = await list({ prefix: `${storageKey}/${fileName}`, token, limit: 1 });
      const blob = blobs[0];
      if (!blob) return null;
      const response = await fetch(blob.url, { signal: AbortSignal.timeout(10_000) });
      return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
    },
    async size(storageKey, fileName) {
      if (!STORAGE_KEY_PATTERN.test(storageKey) || !SAFE_FILE_NAME.test(fileName)) return null;
      return (await blobHead(`${storageKey}/${fileName}`, token))?.size ?? null;
    },
    async readRange(storageKey, fileName, start, end) {
      if (!STORAGE_KEY_PATTERN.test(storageKey) || !SAFE_FILE_NAME.test(fileName)) return null;
      if (start < 0 || end < start) return Buffer.alloc(0);
      const blob = await blobHead(`${storageKey}/${fileName}`, token);
      if (!blob) return null;
      const response = await fetch(blob.url, {
        headers: { Range: `bytes=${start}-${end}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) return null;
      const data = Buffer.from(await response.arrayBuffer());
      // A server that ignores Range answers 200 with the whole file: keep the part asked for.
      return response.status === 206 ? data : data.subarray(start, end + 1);
    },
    directUploadToken(storageKey, fileName, options) {
      return generateClientTokenFromReadWriteToken({
        token,
        pathname: `${storageKey}/${fileName}`,
        allowedContentTypes: [options.contentType],
        maximumSizeInBytes: options.maxBytes,
        validUntil: Date.now() + options.validForMs,
        addRandomSuffix: false,
        allowOverwrite: false,
        cacheControlMaxAge: 31_536_000,
      });
    },
    async remove(storageKey) {
      if (!STORAGE_KEY_PATTERN.test(storageKey)) return;
      const { blobs } = await list({ prefix: `${storageKey}/`, token });
      if (blobs.length > 0)
        await del(
          blobs.map((blob) => blob.url),
          { token },
        );
    },
  };
}

/** A blob's size and address, or null when there is none at the path. */
async function blobHead(
  pathname: string,
  token: string,
): Promise<{ size: number; url: string } | null> {
  try {
    const blob = await head(pathname, { token });
    return { size: blob.size, url: blob.url };
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

/**
 * Validates and re-encodes an uploaded image.
 *
 * - The bytes are decoded by sharp, so the client-supplied MIME type and file name are irrelevant.
 * - EXIF orientation is applied, then all metadata (EXIF, GPS, ICC comments) is dropped.
 * - Output is WebP at fixed widths under a random key, so stored files never contain user-chosen
 *   names and can be cached immutably.
 */
export async function storeImage(
  input: Buffer,
  store: ImageStore,
  prefix: string,
  options: {
    /** Rendition widths to make (those wider than the picture are skipped). */
    widths?: readonly number[];
    /**
     * Also keep the picture at its own width when it falls between two rendition widths, so a
     * full-width page picture is never shown from a much narrower file (1272 px → up to 1272).
     */
    fullWidth?: boolean;
  } = {},
): Promise<StoredImage> {
  const targetWidths = options.widths ?? IMAGE_WIDTHS;
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw new ImageRejectedError('unreadable');
  }
  if (!isAcceptedFormat(metadata)) {
    throw new ImageRejectedError('unsupported_format');
  }
  const rotated = (metadata.orientation ?? 1) >= 5;
  const width = (rotated ? metadata.height : metadata.width) ?? 0;
  const height = (rotated ? metadata.width : metadata.height) ?? 0;
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    throw new ImageRejectedError('too_small');
  }

  const candidateWidths = targetWidths.filter((candidate) => candidate <= width);
  const widths = candidateWidths.length > 0 ? [...candidateWidths] : [width];
  if (
    options.fullWidth &&
    width > widths.at(-1)! &&
    targetWidths.some((target) => target > width)
  ) {
    widths.push(width);
  }
  const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();

  // Everything is decoded and encoded before anything is stored: a file whose header reads but
  // whose pixels do not decode is refused like any unreadable file, and nothing is left behind.
  let renditions: { width: number; data: Buffer }[];
  let transparent: boolean;
  try {
    renditions = [];
    for (const target of widths) {
      const data = await pipeline
        .clone()
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toBuffer();
      renditions.push({ width: target, data });
    }
    transparent = await isCutout(input, metadata);
  } catch {
    throw new ImageRejectedError('unreadable');
  }

  const storageKey = `${prefix}/${randomBytes(9).toString('base64url')}`;
  try {
    for (const rendition of renditions)
      await store.save(storageKey, rendition.width, rendition.data);
  } catch (error) {
    await store.remove(storageKey);
    throw error;
  }
  return { storageKey, widths, width, height, transparent };
}

/** SHA-256 of an uploaded file, to recognise the same file uploaded twice. */
export function contentHash(input: Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Whether an image is a cut-out: it has an alpha channel and all four corners are transparent.
 * Packs and boxes cut out of their background qualify even when the object fills the frame (their
 * corners are rounded off); a photograph saved with an alpha channel keeps opaque corners. Read
 * from a reduced copy without smoothing, so the corner pixels keep their own alpha.
 */
async function isCutout(input: Buffer, metadata: Metadata): Promise<boolean> {
  if (!metadata.hasAlpha) return false;
  const { data, info } = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true, kernel: 'nearest' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alphaAt = (x: number, y: number) =>
    data[(y * info.width + x) * info.channels + info.channels - 1] ?? 255;
  const right = info.width - 1;
  const bottom = info.height - 1;
  return [alphaAt(0, 0), alphaAt(right, 0), alphaAt(0, bottom), alphaAt(right, bottom)].every(
    (alpha) => alpha < 16,
  );
}

/** Deletes every rendition of a stored image. Unknown or malformed keys are ignored. */
export async function deleteStoredImage(store: ImageStore, storageKey: string): Promise<void> {
  await store.remove(storageKey);
}

export function productImagePrefix(productId: string): string {
  return `products/${productId}`;
}

/** Storage prefix of a category's or collection's cover picture. */
export function taxonomyImagePrefix(kind: 'category' | 'collection', id: string): string {
  return `${kind === 'category' ? 'categories' : 'collections'}/${id}`;
}

/** Storage prefix of a page picture (Admin → Settings): a fresh folder for each upload. */
export function visualImagePrefix(): string {
  return `visuals/${randomUUID()}`;
}

/** Storage prefix of an article's cover picture. */
export function articleImagePrefix(articleId: string): string {
  return `articles/${articleId}`;
}

/** Storage prefix of a media item's poster or photograph and its video. */
export function mediaPrefix(mediaItemId: string): string {
  return `media/${mediaItemId}`;
}

export type VideoType = 'video/mp4' | 'video/webm';

export class VideoRejectedError extends Error {
  constructor() {
    super('Video rejected: not an MP4 or WebM file');
  }
}

export interface StoredVideo {
  storageKey: string;
  type: VideoType;
  bytes: number;
}

/** The file name a stored video has under its key. */
export function videoFileName(type: string): string {
  return type === 'video/webm' ? 'video.webm' : 'video.mp4';
}

/**
 * Keeps an uploaded video as it is, under a random key. Only MP4 (ISO base media, not QuickTime)
 * and WebM files are accepted, recognised by their first bytes rather than the declared type.
 * Videos are not re-encoded: the editor uploads a web-ready file.
 */
export async function storeVideo(
  input: Buffer,
  store: ImageStore,
  prefix: string,
): Promise<StoredVideo> {
  const type = videoType(input);
  if (!type) throw new VideoRejectedError();
  const storageKey = `${prefix}/${randomBytes(9).toString('base64url')}`;
  await store.saveFile(storageKey, videoFileName(type), input, type);
  return { storageKey, type, bytes: input.length };
}

function videoType(input: Buffer): VideoType | null {
  if (input.length < 16) return null;
  // ISO base media: a "ftyp" box first; QuickTime's "qt  " brand is left out (browsers vary).
  if (input.toString('latin1', 4, 8) === 'ftyp' && input.toString('latin1', 8, 12) !== 'qt  ') {
    return 'video/mp4';
  }
  // WebM: the EBML magic number and the "webm" document type in the header that follows it (other
  // Matroska files are left out: browsers do not all play them).
  if (input.readUInt32BE(0) === 0x1a45dfa3 && input.toString('latin1', 4, 64).includes('webm')) {
    return 'video/webm';
  }
  return null;
}

/**
 * A video's running time in whole seconds, read from the file itself: the movie header (`mvhd`)
 * of an MP4, or the Segment Info duration of a WebM. Null when the file does not record it (some
 * recorders write WebM files without a duration).
 */
export function videoDurationSeconds(input: Buffer, type: VideoType): number | null {
  return wholeSeconds(type === 'video/mp4' ? mp4Duration(input) : webmDuration(input));
}

function wholeSeconds(seconds: number | null): number | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.max(1, Math.round(seconds));
}

/** The first bytes of a video, enough for its type and a WebM's header. */
const VIDEO_HEAD_BYTES = 64 * 1024;
/** An MP4's movie box is read whole up to this size (it holds the running time near its start). */
const MAX_MOOV_BYTES = 4 * 1024 * 1024;

export interface InspectedVideo {
  type: VideoType;
  bytes: number;
  durationSeconds: number | null;
}

/**
 * Checks a video that was uploaded straight to the store, without reading all of it: its type
 * from its first bytes (as for an upload through the API), and its running time — a WebM's from
 * its header, an MP4's from the movie box, found by walking the top-level boxes with ranged reads
 * (the box can follow the media data at the end of the file). Null when the file is not there.
 */
export async function inspectStoredVideo(
  store: ImageStore,
  storageKey: string,
  fileName: string,
): Promise<InspectedVideo | null> {
  const bytes = await store.size(storageKey, fileName);
  if (bytes === null) return null;
  const read = (start: number, end: number) =>
    store.readRange(storageKey, fileName, start, Math.min(end, bytes - 1));
  const head = await read(0, VIDEO_HEAD_BYTES - 1);
  if (!head) return null;
  const type = videoType(head);
  if (!type) throw new VideoRejectedError();
  const seconds =
    type === 'video/webm' ? webmDuration(head) : await mp4DurationByRanges(read, bytes);
  return { type, bytes, durationSeconds: wholeSeconds(seconds) };
}

async function mp4DurationByRanges(
  read: (start: number, end: number) => Promise<Buffer | null>,
  size: number,
): Promise<number | null> {
  let offset = 0;
  // A playable file has a handful of top-level boxes; the bound only stops a malformed one.
  for (let boxes = 0; boxes < 64 && offset + 8 <= size; boxes += 1) {
    const header = await read(offset, offset + 15);
    if (!header || header.length < 8) return null;
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
      const moov = await read(offset, offset + Math.min(boxSize, MAX_MOOV_BYTES) - 1);
      return moov ? mp4Duration(moov) : null;
    }
    offset += boxSize;
  }
  return null;
}

function mp4Duration(input: Buffer): number | null {
  const moov = findBox(input, 0, input.length, 'moov');
  if (!moov) return null;
  const mvhd = findBox(input, moov.start, moov.end, 'mvhd');
  if (!mvhd || mvhd.end - mvhd.start < 32) return null;
  const version = input.readUInt8(mvhd.start);
  if (version === 1) {
    const timescale = input.readUInt32BE(mvhd.start + 20);
    const duration = Number(input.readBigUInt64BE(mvhd.start + 24));
    return timescale > 0 ? duration / timescale : null;
  }
  const timescale = input.readUInt32BE(mvhd.start + 12);
  const duration = input.readUInt32BE(mvhd.start + 16);
  return timescale > 0 ? duration / timescale : null;
}

/** The first box of a type among the boxes between two offsets: its content's start and end. */
function findBox(
  input: Buffer,
  from: number,
  to: number,
  type: string,
): { start: number; end: number } | null {
  let offset = from;
  while (offset + 8 <= to) {
    let size = input.readUInt32BE(offset);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > to) return null;
      size = Number(input.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = to - offset;
    }
    if (size < header) return null;
    if (input.toString('latin1', offset + 4, offset + 8) === type) {
      return { start: offset + header, end: Math.min(offset + size, to) };
    }
    offset += size;
  }
  return null;
}

const EBML_SEGMENT = 0x18538067;
const EBML_INFO = 0x1549a966;
const EBML_TIMECODE_SCALE = 0x2ad7b1;
const EBML_DURATION = 0x4489;

function webmDuration(input: Buffer): number | null {
  const segment = findEbml(input, 0, input.length, EBML_SEGMENT);
  if (!segment) return null;
  const info = findEbml(input, segment.start, segment.end, EBML_INFO);
  if (!info) return null;
  const scale = findEbml(input, info.start, info.end, EBML_TIMECODE_SCALE);
  const duration = findEbml(input, info.start, info.end, EBML_DURATION);
  if (!duration) return null;
  const length = duration.end - duration.start;
  const value =
    length === 8
      ? input.readDoubleBE(duration.start)
      : length === 4
        ? input.readFloatBE(duration.start)
        : null;
  if (value === null) return null;
  let nanosPerTick = 1_000_000;
  if (scale && scale.end - scale.start >= 1 && scale.end - scale.start <= 6) {
    nanosPerTick = input.readUIntBE(scale.start, scale.end - scale.start);
  }
  return (value * nanosPerTick) / 1e9;
}

/** The first EBML element with an id between two offsets (a Segment of unknown size runs to the end). */
function findEbml(
  input: Buffer,
  from: number,
  to: number,
  id: number,
): { start: number; end: number } | null {
  let offset = from;
  while (offset < to) {
    const elementId = readVint(input, offset, true);
    if (!elementId) return null;
    const size = readVint(input, offset + elementId.length, false);
    if (!size) return null;
    const start = offset + elementId.length + size.length;
    const end = size.unknown ? to : Math.min(start + size.value, to);
    if (elementId.value === id) return { start, end };
    if (size.unknown) return null;
    offset = end;
  }
  return null;
}

function readVint(
  input: Buffer,
  offset: number,
  keepMarker: boolean,
): { value: number; length: number; unknown: boolean } | null {
  if (offset >= input.length) return null;
  const first = input[offset]!;
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length += 1;
  if (length > 8 || offset + length > input.length) return null;
  let value = keepMarker ? first : first & (0xff >> length);
  let allOnes = (first & (0xff >> length)) === 0xff >> length;
  for (let index = 1; index < length; index += 1) {
    const byte = input[offset + index]!;
    value = value * 256 + byte;
    if (byte !== 0xff) allOnes = false;
  }
  return { value, length, unknown: !keepMarker && allOnes };
}

export class CaptionsRejectedError extends Error {
  constructor() {
    super('Captions rejected: not a WebVTT file');
  }
}

/** Most a subtitles file may weigh. */
export const MAX_CAPTIONS_BYTES = 512 * 1024;

/**
 * Keeps an uploaded subtitles file (WebVTT) under a random key, as `<key>/captions.vtt`. The text
 * must be UTF-8 and start with the WEBVTT signature; it is stored as received, never rendered as
 * HTML by the storefront (browsers show cues as plain text).
 */
export async function storeCaptions(
  input: Buffer,
  store: ImageStore,
  prefix: string,
): Promise<{ storageKey: string }> {
  if (input.length === 0 || input.length > MAX_CAPTIONS_BYTES) throw new CaptionsRejectedError();
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(input);
  } catch {
    throw new CaptionsRejectedError();
  }
  if (!/^\uFEFF?WEBVTT(?:[ \t][^\n]*)?\r?\n/.test(text)) throw new CaptionsRejectedError();
  const storageKey = `${prefix}/${randomBytes(9).toString('base64url')}`;
  await store.saveFile(storageKey, 'captions.vtt', input, 'text/vtt; charset=utf-8');
  return { storageKey };
}

/** Resolves a storage key inside the uploads directory, refusing anything that escapes it. */
function storageDirectory(uploadsDir: string, storageKey: string): string {
  const root = resolve(uploadsDir);
  const directory = resolve(root, storageKey);
  if (!directory.startsWith(root + sep)) {
    throw new Error('Storage key escapes the uploads directory');
  }
  return directory;
}
