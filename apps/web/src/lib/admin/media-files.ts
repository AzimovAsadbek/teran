import { IMAGE_ACCEPT, MAX_UPLOAD_BYTES, MIN_IMAGE_SIDE } from './uploads';

/*
 * Files made ready in the browser before the composer posts them (ADR-058): photographs the API
 * would refuse for their weight or format are scaled down to a JPEG, a film's size and length are
 * read by the browser itself, and its cover is a frame taken from it.
 */

/** The longest side sent: the gallery's renditions go up to 3840 px (ADR-056). */
const MAX_SIDE = 4096;
const ACCEPTED = new Set(IMAGE_ACCEPT.split(','));

export type PhotoProblem = 'too_small' | 'unreadable';

export interface PreparedPhoto {
  /** What is uploaded: the file itself, or a JPEG made from it. */
  file: File;
  width: number;
  height: number;
  /** Scaled down or converted (a phone's large or HEIC photograph) in the browser. */
  converted: boolean;
}

/**
 * A photograph as the API takes it: one that is too heavy (over 5 MB), larger than the site keeps
 * or in a format it does not accept (HEIC, where the browser can read it) becomes a JPEG at most
 * 4096 px on its longer side. Unreadable files and pictures under 200 px are refused here.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto | PhotoProblem> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return 'unreadable';
  }
  try {
    const { width, height } = bitmap;
    if (Math.min(width, height) < MIN_IMAGE_SIDE) return 'too_small';
    const longest = Math.max(width, height);
    if (ACCEPTED.has(file.type) && file.size <= MAX_UPLOAD_BYTES && longest <= MAX_SIDE) {
      return { file, width, height, converted: false };
    }
    const scale = Math.min(1, MAX_SIDE / longest);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d');
    if (!context) return 'unreadable';
    // A transparent picture gets a white ground rather than JPEG's black.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.9, 0.82, 0.74]) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        const name = `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;
        return {
          file: new File([blob], name, { type: 'image/jpeg' }),
          width: canvas.width,
          height: canvas.height,
          converted: true,
        };
      }
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
  const full = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
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
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= MAX_UPLOAD_BYTES) {
      return new File([blob], 'cover.jpg', { type: 'image/jpeg' });
    }
  }
  return null;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}
