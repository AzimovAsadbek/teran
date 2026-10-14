import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
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
 * Validates and re-encodes an uploaded image.
 *
 * - The bytes are decoded by sharp, so the client-supplied MIME type and file name are irrelevant.
 * - EXIF orientation is applied, then all metadata (EXIF, GPS, ICC comments) is dropped.
 * - Output is WebP at fixed widths under a random key, so stored files never contain user-chosen
 *   names and can be cached immutably.
 */
export async function storeImage(
  input: Buffer,
  uploadsDir: string,
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
  const directory = storageDirectory(uploadsDir, storageKey);
  await mkdir(directory, { recursive: true });

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
      await writeFile(join(directory, `${target}.webp`), output);
    }
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }

  return { storageKey, widths, width, height };
}

/** Deletes every rendition of a stored image. Unknown or malformed keys are ignored. */
export async function deleteStoredImage(uploadsDir: string, storageKey: string): Promise<void> {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) return;
  await rm(storageDirectory(uploadsDir, storageKey), { recursive: true, force: true });
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
