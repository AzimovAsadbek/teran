import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { del, list, put } from '@vercel/blob';
import sharp, { type Metadata } from 'sharp';

/**
 * Widths generated for every stored image; the storefront picks the smallest sufficient one. 480
 * serves product cards on phones (about 240 CSS px at 2× density) without falling back to 640.
 */
export const IMAGE_WIDTHS = [320, 480, 640, 960, 1280, 1600] as const;

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
}

/**
 * Where renditions are kept: `<key>/<width>.webp` in the uploads directory (served by the API under
 * /uploads), or in Vercel Blob when a token is configured (a serverless deployment has no lasting
 * disk; the storefront then proxies /uploads to the Blob store). The keys are the same either way.
 */
export interface ImageStore {
  save(storageKey: string, width: number, data: Buffer): Promise<void>;
  /** Removes every rendition under the key. Unknown or malformed keys are ignored. */
  remove(storageKey: string): Promise<void>;
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
    async remove(storageKey) {
      if (!STORAGE_KEY_PATTERN.test(storageKey)) return;
      await rm(storageDirectory(uploadsDir, storageKey), { recursive: true, force: true });
    },
  };
}

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
): Promise<StoredImage> {
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

  const storageKey = `${prefix}/${randomBytes(9).toString('base64url')}`;
  const candidateWidths = IMAGE_WIDTHS.filter((candidate) => candidate <= width);
  const widths = candidateWidths.length > 0 ? [...candidateWidths] : [width];
  const pipeline = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();

  try {
    for (const target of widths) {
      const output = await pipeline
        .clone()
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toBuffer();
      await store.save(storageKey, target, output);
    }
  } catch (error) {
    await store.remove(storageKey);
    throw error;
  }

  return { storageKey, widths, width, height };
}

/** Deletes every rendition of a stored image. Unknown or malformed keys are ignored. */
export async function deleteStoredImage(store: ImageStore, storageKey: string): Promise<void> {
  await store.remove(storageKey);
}

export function productImagePrefix(productId: string): string {
  return `products/${productId}`;
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
