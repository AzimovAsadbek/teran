import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { r2Store, type S3Config } from './r2-store.js';

/**
 * Widths generated for every stored image; the storefront picks the smallest sufficient one. 480
 * serves product cards on phones (about 240 CSS px at 2× density) without falling back to 640.
 */
export const IMAGE_WIDTHS = [320, 480, 640, 960, 1280, 1600] as const;

/**
 * Widths for page pictures that span the whole page (the first view, banners, listing banners):
 * up to 5120, so a full-width picture stays sharp on the largest screens (a 2560 px wide window
 * at 2× density, a 5K display) when its source is that large; narrower screens still get files
 * their size. Journal covers have them too: a tall card shows a slice of a wide cover, so it
 * needs a file several times its own width.
 */
export const WIDE_IMAGE_WIDTHS = [...IMAGE_WIDTHS, 1920, 2560, 3200, 3840, 5120] as const;

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
 * /uploads), or in Cloudflare R2 when it is configured (ADR-043; the storefront then reads the
 * bucket's public address). The keys are the same either way.
 */
export interface ImageStore {
  save(storageKey: string, width: number, data: Buffer): Promise<void>;
  /** Stores a file as it is (a video) under the key, e.g. `<key>/video.mp4`. */
  saveFile(storageKey: string, fileName: string, data: Buffer, contentType: string): Promise<void>;
  /** Reads a stored file back (e.g. a rendition to attach to a Telegram post); null if missing. */
  read(storageKey: string, fileName: string): Promise<Buffer | null>;
  /** Removes every rendition under the key. Unknown or malformed keys are ignored. */
  remove(storageKey: string): Promise<void>;
}

export function imageStore(options: {
  uploadsDir: string;
  /** Cloudflare R2 (S3 API), used instead of the directory when configured (ADR-043). */
  r2?: S3Config | null;
}): ImageStore {
  return options.r2 ? r2Store(options.r2) : directoryStore(options.uploadsDir);
}

/** The R2 settings from the environment, or null unless all four are set. */
export function r2ConfigFrom(env: {
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
}): S3Config | null {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = env;
  return R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET
    ? {
        endpoint: R2_ENDPOINT,
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
        bucket: R2_BUCKET,
      }
    : null;
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
    async remove(storageKey) {
      if (!STORAGE_KEY_PATTERN.test(storageKey)) return;
      await rm(storageDirectory(uploadsDir, storageKey), { recursive: true, force: true });
    },
  };
}

const SAFE_FILE_NAME = /^[a-z0-9]+\.[a-z0-9]+$/;

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
  // Everything is decoded and encoded before anything is stored: a file whose header reads but
  // whose pixels do not decode is refused like any unreadable file, and nothing is left behind.
  let renditions: { width: number; data: Buffer }[];
  let transparent: boolean;
  try {
    renditions = await renderRenditions(input, widths);
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

/**
 * A picture's WebP renditions at the given widths (never enlarged), its EXIF orientation applied
 * and its metadata dropped: what storeImage stores, and what a store rebuilt from the original
 * files holds again (scripts/restore-media.ts).
 */
export async function renderRenditions(
  input: Buffer,
  widths: readonly number[],
): Promise<{ width: number; data: Buffer }[]> {
  const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();
  const renditions: { width: number; data: Buffer }[] = [];
  for (const target of widths) {
    const data = await pipeline
      .clone()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    renditions.push({ width: target, data });
  }
  return renditions;
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
 * A page film's copy at another width, under the film's key (`w3840.mp4`): the same picture,
 * so the storefront can play the smallest copy that fills the screen's pixels.
 */
export function filmCopyFileName(width: number): string {
  return `w${width}.mp4`;
}

/** A product picture's film: its smaller copy for product cards, under the film's key. */
export const PRODUCT_FILM_CARD_FILE = 'card.mp4';
/** A product picture's film: where it moves (a PNG whose alpha is the film's), under its key. */
export const PRODUCT_FILM_MASK_FILE = 'mask.png';

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
