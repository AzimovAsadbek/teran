/**
 * Short demonstration films for the gallery, made only from TERAN's own packaging artwork: slow
 * camera moves over the two paintings printed on the packs (the lake and the tea terraces) and the
 * five zip pouches (the owner's photographs, cut out) shown one after another. Nothing is filmed
 * or invented; the films say so in their titles (apps/api/prisma/seed/media.ts) and are replaced
 * by real films through the admin area.
 *
 *   FFMPEG=<path to ffmpeg> node scripts/films/generate-films.mjs [lake|terraces|packs ...]
 *   (run from apps/web; without names, every film is made)
 *
 * Needs an ffmpeg with the libvpx (VP8) encoder and the MJPEG decoder; Playwright's own build
 * (`npx playwright install ffmpeg`, then ~/Library/Caches/ms-playwright/ffmpeg-<version>/ffmpeg-mac) has
 * both. Frames are drawn with sharp on a canvas twice the film's size, so slow moves glide
 * without stepping, and are piped to ffmpeg as JPEG.
 *
 * Outputs, in apps/api/prisma/seed/assets/films/: <name>.webm (1280×720, 25 fps, no sound) and
 * <name>-poster.webp (the frame shown before the film plays).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const art = (name) => resolve(root, 'public/brand/art', name);
const pack = (name) => resolve(root, 'public/brand/packs', name);
const OUT = resolve(root, '../api/prisma/seed/assets/films');
mkdirSync(OUT, { recursive: true });

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const wanted = new Set(process.argv.slice(2));
const make = (name) => wanted.size === 0 || wanted.has(name);
const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 25;
/** Frames are cut from sources at least this many times the film's size, then reduced. */
const OVERSAMPLE = 2;

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/** A picture as raw RGB at OVERSAMPLE times its size (sub-pixel camera positions). */
async function rawSource(input, scale = OVERSAMPLE) {
  const image = sharp(input).removeAlpha();
  const { width } = await image.metadata();
  const { data, info } = await image
    .resize({ width: Math.round(width * scale), kernel: 'lanczos3' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, scale };
}

/**
 * One frame: the 16:9 window of `source` centred on (cx, cy) and `w` wide (in the original
 * picture's pixels), reduced to the film's size.
 */
async function windowFrame(source, { cx, cy, w }) {
  const width = Math.round(w * source.scale);
  const height = Math.round((width * HEIGHT) / WIDTH);
  const left = Math.min(
    source.width - width,
    Math.max(0, Math.round(cx * source.scale - width / 2)),
  );
  const top = Math.min(
    source.height - height,
    Math.max(0, Math.round(cy * source.scale - height / 2)),
  );
  return sharp(source.data, { raw: { width: source.width, height: source.height, channels: 3 } })
    .extract({ left, top, width, height })
    .resize(WIDTH, HEIGHT, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();
}

/** Writes raw RGB frames to ffmpeg, which encodes the WebM film. */
async function encode(name, frames) {
  const path = resolve(OUT, `${name}.webm`);
  const ffmpeg = spawn(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      String(FPS),
      '-c:v',
      'mjpeg',
      '-i',
      'pipe:0',
      '-c:v',
      'libvpx',
      '-b:v',
      '1400k',
      '-crf',
      '10',
      '-qmin',
      '0',
      '-qmax',
      '42',
      '-deadline',
      'good',
      '-cpu-used',
      '0',
      '-auto-alt-ref',
      '1',
      '-lag-in-frames',
      '25',
      '-g',
      '250',
      '-pix_fmt',
      'yuv420p',
      path,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise((resolveDone, reject) => {
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) =>
      code === 0 ? resolveDone() : reject(new Error(`ffmpeg exited with ${code}`)),
    );
  });
  let poster = null;
  for await (const { index, total, rgb } of frames) {
    const jpeg = await sharp(rgb, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
      .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
      .toBuffer();
    if (!ffmpeg.stdin.write(jpeg)) {
      await new Promise((resolveDrain) => ffmpeg.stdin.once('drain', resolveDrain));
    }
    if (index === Math.round(total * 0.4)) poster = rgb;
  }
  ffmpeg.stdin.end();
  await done;
  const posterPath = resolve(OUT, `${name}-poster.webp`);
  const webp = await sharp(poster, { raw: { width: WIDTH, height: HEIGHT, channels: 3 } })
    .webp({ quality: 84 })
    .toBuffer();
  writeFileSync(posterPath, webp);
  console.log(
    `${name}.webm: ${(statSync(path).size / 1024).toFixed(0)} KB; poster ${webp.length} B`,
  );
}

/** A slow camera move over one picture, from one window to another. */
async function* cameraMove(source, from, to, seconds) {
  const total = Math.round(seconds * FPS);
  for (let index = 0; index < total; index++) {
    const t = smooth(index / (total - 1));
    const window = {
      cx: lerp(from.cx, to.cx, t),
      cy: lerp(from.cy, to.cy, t),
      w: lerp(from.w, to.w, t),
    };
    yield { index, total, rgb: await windowFrame(source, window) };
  }
}

/**
 * A pack standing on a softened painting: the painting blurred and quietened behind it, a soft
 * shadow at its foot. Drawn at OVERSAMPLE times the film's size, with room for a slow push-in.
 */
async function packScene(background, packFile) {
  const W = WIDTH * OVERSAMPLE;
  const H = HEIGHT * OVERSAMPLE;
  const backdrop = await sharp(background)
    .removeAlpha()
    .resize(W, H, { fit: 'cover', position: 'attention' })
    .blur(14)
    .modulate({ brightness: 0.82, saturation: 0.9 })
    .toBuffer();
  const packHeight = Math.round(H * 0.74);
  const front = await sharp(packFile).resize({ height: packHeight }).png().toBuffer();
  const { width: packWidth } = await sharp(front).metadata();
  const left = Math.round((W - packWidth) / 2);
  const top = Math.round(H * 0.11);
  const shadowWidth = Math.round(packWidth * 1.25);
  const shadow = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
      `<defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(H * 0.018)}"/></filter></defs>` +
      `<ellipse cx="${W / 2}" cy="${top + packHeight - H * 0.006}" rx="${shadowWidth / 2}" ry="${H * 0.03}" fill="#0b1a0d" fill-opacity="0.55" filter="url(#s)"/>` +
      `</svg>`,
  );
  const { data, info } = await sharp(backdrop)
    .composite([
      { input: shadow, left: 0, top: 0 },
      { input: front, left, top },
    ])
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, scale: 1 };
}

/** The packs one after another, each with a slow push-in, joined by cross-fades. */
async function* packShow(scenes, seconds, fade) {
  const per = Math.round(seconds * FPS);
  const overlap = Math.round(fade * FPS);
  const total = scenes.length * per - (scenes.length - 1) * overlap;
  const frameOf = (scene, local) => {
    const t = smooth(Math.min(1, Math.max(0, local / (per - 1))));
    const w = lerp(WIDTH * OVERSAMPLE, WIDTH * OVERSAMPLE * 0.93, t);
    return windowFrame(scene, {
      cx: (WIDTH * OVERSAMPLE) / 2,
      cy: lerp(HEIGHT * OVERSAMPLE * 0.5, HEIGHT * OVERSAMPLE * 0.47, t),
      w,
    });
  };
  for (let index = 0; index < total; index++) {
    const sceneIndex = Math.min(scenes.length - 1, Math.floor(index / (per - overlap)));
    const local = index - sceneIndex * (per - overlap);
    const current = await frameOf(scenes[sceneIndex], local);
    const next = scenes[sceneIndex + 1];
    const fadeStart = per - overlap;
    if (next && local >= fadeStart) {
      const amount = smooth((local - fadeStart + 1) / (overlap + 1));
      const incoming = await frameOf(next, local - fadeStart);
      const mixed = Buffer.alloc(current.length);
      for (let i = 0; i < current.length; i++) {
        mixed[i] = Math.round(current[i] * (1 - amount) + incoming[i] * amount);
      }
      yield { index, total, rgb: mixed };
    } else {
      yield { index, total, rgb: current };
    }
  }
}

// 1. The lake on the front of every pack (1536 × 1024): a slow push towards the far shore.
if (make('lake')) {
  const lake = await rawSource(art('lake.webp'));
  await encode(
    'lake',
    cameraMove(lake, { cx: 768, cy: 500, w: 1536 }, { cx: 860, cy: 468, w: 1290 }, 12),
  );
}

// 2. The tea terraces on the back (2400 × 1357): along the terraces to the pavilion.
if (make('terraces')) {
  const terraces = await rawSource(art('terraces.webp'));
  await encode(
    'terraces',
    cameraMove(terraces, { cx: 900, cy: 800, w: 1700 }, { cx: 1440, cy: 600, w: 1900 }, 12),
  );
}

// 3. The five zip pouches, each on one of the paintings.
if (make('packs')) {
  const scenes = [];
  for (const [file, background] of [
    ['xc2025.webp', 'lake.webp'],
    ['g8810.webp', 'terraces.webp'],
    ['8800.webp', 'lake.webp'],
    ['8830.webp', 'terraces.webp'],
    ['8009.webp', 'lake.webp'],
  ]) {
    scenes.push(await packScene(art(background), pack(file)));
  }
  await encode('packs', packShow(scenes, 3.6, 0.8));
}
