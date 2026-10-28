import { IMAGE_ACCEPT, MAX_UPLOAD_BYTES, MIN_IMAGE_SIDE } from './uploads';

/*
 * Files made ready in the browser before the admin area sends them (ADR-058, ADR-061): a picture
 * of any size or weight is redrawn as large as the site keeps it and light enough for the API, a
 * film's size and length are read by the browser itself, and its cover is a frame taken from it.
 */

/** The longest side a picture is sent with: the site's largest rendition (page pictures, 5120 px). */
export const MAX_IMAGE_SIDE = 5120;
/** The gallery's renditions go up to 3840 px (ADR-056): its photographs and films' covers. */
export const GALLERY_MAX_SIDE = 4096;
/** iOS Safari draws no canvas of more pixels than this (4096 × 4096). */
const MAX_CANVAS_PIXELS = 16_777_216;
const ACCEPTED = new Set(IMAGE_ACCEPT.split(','));

export type ImageProblem = 'unsupported_format' | 'too_small' | 'unreadable';

export interface PreparedImage {
  /** What is uploaded: the chosen file itself, or a lighter copy drawn from it. */
  file: File;
  width: number;
  height: number;
  /** The chosen picture, when the copy is smaller or lighter: its own size and weight. */
  original: { width: number; height: number; bytes: number } | null;
}

/** Whether the picture has transparent parts (a cut-out), judged from a small copy of it. */
function hasTransparency(bitmap: ImageBitmap): boolean {
  const scale = Math.min(1, 128 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 3; index < data.length; index += 4) if (data[index]! < 250) return true;
  return false;
}

let webpEncoding: boolean | null = null;
/** Whether this browser writes WebP (Safari writes PNG instead). */
function encodesWebp(): boolean {
  webpEncoding ??= document
    .createElement('canvas')
    .toDataURL('image/webp')
    .startsWith('data:image/webp');
  return webpEncoding;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * A picture as the API takes it, whatever its size (ADR-061). One the API reads as it is (JPEG,
 * PNG, WebP or AVIF, at most 5 MB and `maxSide` px) is sent unchanged; any other the browser can
 * read (a camera's 30 MB photograph, a phone's HEIC in Safari, a 9000 px banner) is redrawn at
 * most `maxSide` px long — the largest the site keeps, so nothing visible is lost — as a JPEG, or
 * a WebP or PNG when it has transparent parts, smaller step by step until it is light enough.
 */
export async function prepareImageFile(
  file: File,
  maxSide = MAX_IMAGE_SIDE,
): Promise<PreparedImage | ImageProblem> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // HEIC that this browser cannot read (Chrome), or a file that is not a picture at all.
    return /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
      ? 'unsupported_format'
      : 'unreadable';
  }
  try {
    const { width, height } = bitmap;
    if (Math.min(width, height) < MIN_IMAGE_SIDE) return 'too_small';
    const longest = Math.max(width, height);
    if (ACCEPTED.has(file.type) && file.size <= MAX_UPLOAD_BYTES && longest <= maxSide) {
      return { file, width, height, original: null };
    }
    const transparent = hasTransparency(bitmap);
    const type = transparent ? (encodesWebp() ? 'image/webp' : 'image/png') : 'image/jpeg';
    const qualities = type === 'image/png' ? [undefined] : [0.92, 0.84, 0.76];
    let scale = Math.min(1, maxSide / longest, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)));
    const canvas = document.createElement('canvas');
    while (Math.min(width, height) * scale >= MIN_IMAGE_SIDE) {
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const context = canvas.getContext('2d');
      if (!context) return 'unreadable';
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (!transparent) {
        // JPEG has no transparency: a white ground rather than black.
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of qualities) {
        const blob = await toBlob(canvas, type, quality);
        if (blob && blob.size <= MAX_UPLOAD_BYTES) {
          const extension = type === 'image/jpeg' ? 'jpg' : type.slice('image/'.length);
          const name = `${file.name.replace(/\.[^.]+$/, '') || 'picture'}.${extension}`;
          return {
            file: new File([blob], name, { type }),
            width: canvas.width,
            height: canvas.height,
            original: { width, height, bytes: file.size },
          };
        }
      }
      scale *= 0.8;
    }
    return 'unreadable';
  } finally {
    bitmap.close();
  }
}

export interface VideoFacts {
  width: number;
  height: number;
  /** Seconds; 0 when the file does not say (some recorders' WebM). */
  duration: number;
}

/** A film's size and length as the browser reads them; null when it cannot play the file. */
export function readVideo(url: string): Promise<VideoFacts | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const finish = (facts: VideoFacts | null) => {
      video.removeAttribute('src');
      video.load();
      resolve(facts);
    };
    video.addEventListener('loadedmetadata', () => {
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        finish(null);
        return;
      }
      finish({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
      });
    });
    video.addEventListener('error', () => finish(null));
    video.src = url;
  });
}

/** Moves a film to a moment and waits until that frame can be drawn. */
export function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve) => {
    const target = Math.max(0, Math.min(seconds, video.duration || seconds));
    if (Math.abs(video.currentTime - target) < 0.01 && video.readyState >= 2) {
      resolve();
      return;
    }
    video.addEventListener('seeked', () => resolve(), { once: true });
    video.currentTime = target;
  });
}

/**
 * The frame a film shows now, drawn into a canvas of the given width (the film's own width by
 * default, at most 4096 px on its longer side).
 */
export function drawFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, width?: number) {
  const full = Math.min(1, GALLERY_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
  const scale = width ? width / video.videoWidth : full;
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingQuality = 'high';
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

/** The cover kept with a film: its frame at a moment, as a JPEG at the film's own size. */
export async function captureCover(video: HTMLVideoElement, seconds: number): Promise<File | null> {
  await seekTo(video, seconds);
  const canvas = document.createElement('canvas');
  drawFrame(video, canvas);
  for (const quality of [0.9, 0.8]) {
    const blob = await toBlob(canvas, 'image/jpeg', quality);
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      return new File([blob], 'cover.jpg', { type: 'image/jpeg' });
    }
  }
  return null;
}
