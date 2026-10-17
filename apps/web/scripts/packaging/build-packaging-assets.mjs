/**
 * Turns the renders made by extract-packaging.py into the storefront's brand and product assets.
 *
 *   node scripts/packaging/build-packaging-assets.mjs <extract dir>     (run from apps/web)
 *
 * Nothing is redrawn: logos, landscapes, leaves and the backs of the packs are the owner's
 * packaging artwork. The backs are placed on the storefront's seamless ivory background with a
 * soft shadow, as the art direction asks of product photography (docs/design/design-system.md).
 * The fronts come from the owner's photographs of the zip pouches (build-pouch-assets.mjs).
 *
 * Outputs:
 *   public/brand/teran-{logo,emblem,wordmark,lockup}.{png,webp}   logo set (transparent)
 *   public/brand/art/{lake,terraces,sprig-1}.webp                artwork from the packaging (the
 *                                                                terraces cropped to the part that
 *                                                                is fully painted)
 *   public/brand/ornaments/*.svg                                 the pack's four icons, 绿茶, seal
 *   ../api/prisma/seed/assets/packaging/<code>-back.webp          square shots of the backs
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = process.argv[2];
if (!source)
  throw new Error('Usage: node scripts/packaging/build-packaging-assets.mjs <extract dir>');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const brandDir = resolve(root, 'public/brand');
const artDir = resolve(brandDir, 'art');
const ornamentsDir = resolve(brandDir, 'ornaments');
const seedDir = resolve(root, '../api/prisma/seed/assets/packaging');
for (const dir of [brandDir, artDir, ornamentsDir, seedDir]) {
  mkdirSync(dir, { recursive: true });
}

const input = (name) => resolve(source, name);
const PACKS = ['XC2025', '8009', 'G8810', '8830'];

function report(path, info, bytes) {
  console.log(`${path.replace(`${root}/`, '')}: ${info.width}x${info.height}, ${bytes} B`);
}

async function writeWebp(pipeline, path, options = {}) {
  const { data, info } = await pipeline
    .webp({ quality: 86, alphaQuality: 100, effort: 6, ...options })
    .toBuffer({ resolveWithObject: true });
  writeFileSync(path, data);
  report(path, info, data.length);
}

// ── Logo ──────────────────────────────────────────────────────────────────────────────────────
// logo.png: the lockup at 1200 dpi on the page's white. Geometry below is in its pixels.
const LOGO = {
  pennant: { x1: 400, y1: 2700 }, // corner of the "PREMIUM CHINESE TEA" ribbon to clear
  emblemBottom: 3080, // the saucer ends at y≈3072; the letters start at y≈3204
  swoosh: { x1: 1450, y0: 2800 }, // the T's swash rises left of the cup
  registered: { x0: 4300 }, // ® right of the cup
  wordmarkTop: 2840,
  wordmarkBottom: 4152,
  taglineBottom: 4472,
  ruleBottom: 4660,
};

/**
 * White to transparency. Pixels at least 60 % away from white are opaque (the artwork is flat
 * colour); lighter pixels — anti-aliased edges and the fading gold rule — are un-multiplied from
 * white so they keep their colour on any background.
 */
function whiteToAlpha(rgb, width, height) {
  const out = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const r = rgb[p * 3];
    const g = rgb[p * 3 + 1];
    const b = rgb[p * 3 + 2];
    const distance = Math.max(255 - r, 255 - g, 255 - b) / 255;
    if (distance < 0.01) continue;
    const alpha = Math.min(1, distance / 0.6);
    const unmultiply = (c) => Math.round(Math.min(255, Math.max(0, 255 - (255 - c) / alpha)));
    out[p * 4] = unmultiply(r);
    out[p * 4 + 1] = unmultiply(g);
    out[p * 4 + 2] = unmultiply(b);
    out[p * 4 + 3] = Math.round(alpha * 255);
  }
  return out;
}

const logoRaw = await sharp(input('logo.png'))
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const LW = logoRaw.info.width;
const LH = logoRaw.info.height;
const logoRgba = whiteToAlpha(logoRaw.data, LW, LH);

/** A copy of the logo keeping only the pixels for which keep(x, y) is true. */
function logoPart(keep) {
  const out = Buffer.alloc(logoRgba.length);
  for (let y = 0; y < LH; y++) {
    for (let x = 0; x < LW; x++) {
      if (x < LOGO.pennant.x1 && y < LOGO.pennant.y1) continue;
      if (!keep(x, y)) continue;
      const i = (y * LW + x) * 4;
      logoRgba.copy(out, i, i, i + 4);
    }
  }
  return out;
}

const isSwoosh = (x, y) => x < LOGO.swoosh.x1 && y > LOGO.swoosh.y0;
const isEmblem = (x, y) => y < LOGO.emblemBottom && !isSwoosh(x, y) && x < LOGO.registered.x0;
const isWordmark = (x, y) => y >= LOGO.wordmarkTop && y < LOGO.wordmarkBottom && !isEmblem(x, y);

async function saveLogo(buffer, name, width) {
  const trimmed = await sharp(buffer, { raw: { width: LW, height: LH, channels: 4 } })
    .trim({ threshold: 1 })
    .png()
    .toBuffer();
  const resized = await sharp(trimmed)
    .resize({ width, kernel: 'lanczos3' })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true });
  const pngPath = resolve(brandDir, `${name}.png`);
  writeFileSync(pngPath, resized.data);
  report(pngPath, resized.info, resized.data.length);
  await writeWebp(sharp(resized.data), resolve(brandDir, `${name}.webp`), { quality: 92 });
}

await saveLogo(
  logoPart((x, y) => y < LOGO.wordmarkBottom),
  'teran-logo',
  1200,
);
await saveLogo(logoPart(isEmblem), 'teran-emblem', 640);
await saveLogo(logoPart(isWordmark), 'teran-wordmark', 1200);
await saveLogo(
  logoPart((x, y) => y < LOGO.ruleBottom),
  'teran-lockup',
  1400,
);

// ── Artwork ───────────────────────────────────────────────────────────────────────────────────

/**
 * The largest rectangle reaching the image's right and bottom edges in which every pixel is
 * painted (not the paper's pure white), with a margin clear of the painting's soft edge.
 */
async function paintedPart(path, margin = 20) {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const blank = (x, y) => {
    const i = (y * width + x) * 3;
    return data[i] >= 253 && data[i + 1] >= 253 && data[i + 2] >= 253;
  };
  // Where the painting starts in each row and column: the first run of 40 painted pixels.
  const RUN = 40;
  const left = new Int32Array(height).fill(width);
  for (let y = 0; y < height; y++) {
    for (let x = 0, run = 0; x < width; x++) {
      run = blank(x, y) ? 0 : run + 1;
      if (run >= RUN) {
        left[y] = x - RUN + 1;
        break;
      }
    }
  }
  const top = new Int32Array(width).fill(height);
  for (let x = 0; x < width; x++) {
    for (let y = 0, run = 0; y < height; y++) {
      run = blank(x, y) ? 0 : run + 1;
      if (run >= RUN) {
        top[x] = y - RUN + 1;
        break;
      }
    }
  }
  let best = null;
  for (let x0 = 0; x0 < width; x0 += 2) {
    let y0 = 0;
    for (let x = x0; x < width; x++) y0 = Math.max(y0, top[x]);
    if (y0 >= height || left.subarray(y0).some((start) => start > x0)) continue;
    const area = (width - x0) * (height - y0);
    if (!best || area > best.area) best = { x0, y0, area };
  }
  if (!best) throw new Error(`${path}: no fully painted area found`);
  const leftEdge = Math.min(width - 1, best.x0 + margin);
  const topEdge = Math.min(height - 1, best.y0 + margin);
  return { left: leftEdge, top: topEdge, width: width - leftEdge, height: height - topEdge };
}

await writeWebp(sharp(input('lake.png')), resolve(artDir, 'lake.webp'), { quality: 84 });
// The terraces are painted only on the right of the pack's back; the rest is the pack's white
// (the print fades the painting into it). The website shows the painting whole: the largest part
// that is painted edge to edge, never a fade.
const terraces = await paintedPart(input('terraces.png'));
await writeWebp(
  sharp(input('terraces.png')).extract(terraces).resize({ width: 2400 }),
  resolve(artDir, 'terraces.webp'),
  { quality: 82 },
);
// The pack has two leaf cut-outs; the storefront uses the first (hero corners).
await writeWebp(sharp(input('sprig-1.png')), resolve(artDir, 'sprig-1.webp'), { quality: 88 });

// ── Ornaments (vector) ────────────────────────────────────────────────────────────────────────

/** The <path> elements of an SVG written by extract-packaging.py, in document order. */
function svgPaths(name) {
  const svg = readFileSync(input(name), 'utf8');
  return [...svg.matchAll(/<path d="([^"]+)" fill="([^"]+)"([^>]*)\/>/g)].map((match) => ({
    d: match[1],
    fill: match[2],
    evenOdd: match[3].includes('evenodd'),
  }));
}

/** Moves absolute path data by (dx, dy), rounding to 0.01 of a point. */
function translatePath(d, dx, dy) {
  let index = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (value) => {
    const shifted = Number(value) + (index++ % 2 === 0 ? dx : dy);
    return String(Math.round(shifted * 100) / 100);
  });
}

function writeSvg(name, viewBox, paths) {
  const body = paths
    .map(
      ({ d, fill, evenOdd }) =>
        `<path d="${d}" fill="${fill}"${evenOdd ? ' fill-rule="evenodd"' : ''}/>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
  const path = resolve(ornamentsDir, `${name}.svg`);
  writeFileSync(path, svg);
  console.log(`${path.replace(`${root}/`, '')}: ${svg.length} B`);
}

// icons.svg holds, in order: four rings, four labels (outlined text, not used — the storefront
// sets the labels as text), then the glyphs (leaf, sun, cup, diamond). Pack colour → TERAN green.
const ICON_GREEN = '#1a5317';
const iconPaths = svgPaths('icons.svg');
const ICONS = [
  { name: 'icon-natural', ring: 0, glyph: 8 },
  { name: 'icon-taste', ring: 1, glyph: 10 },
  { name: 'icon-vigour', ring: 2, glyph: 9 },
  { name: 'icon-quality', ring: 3, glyph: 11 },
];
// The rings are 54.7 pt circles starting at these x positions (y from 9.05).
const RING_LEFT = [16.74, 119.0, 221.2, 323.4];
for (const [index, icon] of ICONS.entries()) {
  const dx = -RING_LEFT[index];
  const dy = -9.05;
  writeSvg(
    icon.name,
    '0 0 54.72 54.72',
    [iconPaths[icon.ring], iconPaths[icon.glyph]].map((path) => ({
      ...path,
      d: translatePath(path.d, dx, dy),
      fill: ICON_GREEN,
    })),
  );
}

// calligraphy.svg: 绿茶 (ink), the seal (red) and the seal's characters 茶叶 (white).
const [characters, seal, sealCharacters] = svgPaths('calligraphy.svg');
writeSvg('green-tea-calligraphy', '15 10 55 164', [characters, seal, sealCharacters]);
writeSvg('tea-seal', '23.5 123.8 34 49.6', [seal, sealCharacters]);

// ── Packs ─────────────────────────────────────────────────────────────────────────────────────

/**
 * A flat pack as a pouch: slightly rounded corners and a soft sheen across the film, so it reads
 * as an object rather than a printed sheet.
 */
async function pouch(buffer) {
  const { width, height } = await sharp(buffer).metadata();
  const radius = Math.round(width * 0.018);
  const shape = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`,
  );
  const sheen = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="s" x1="0" x2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.14"/>
          <stop offset="0.06" stop-color="#000" stop-opacity="0.03"/>
          <stop offset="0.2" stop-color="#fff" stop-opacity="0.1"/>
          <stop offset="0.32" stop-color="#fff" stop-opacity="0"/>
          <stop offset="0.9" stop-color="#000" stop-opacity="0.02"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.16"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#s)"/></svg>`,
  );
  return sharp(buffer)
    .ensureAlpha()
    .composite([
      { input: sheen, blend: 'over' },
      { input: shape, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();
}

const SHOT = 2000;

/** A square pack shot: the pack centred on seamless ivory with a soft contact shadow. */
async function packShot(pack) {
  const { width, height } = await sharp(pack).metadata();
  const targetHeight = Math.round(SHOT * 0.86);
  const targetWidth = Math.round((width / height) * targetHeight);
  const resized = await sharp(pack).resize({ height: targetHeight }).png().toBuffer();
  const left = Math.round((SHOT - targetWidth) / 2);
  const top = Math.round(SHOT * 0.055);
  const backdrop = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SHOT}" height="${SHOT}">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="75%">
          <stop offset="0" stop-color="#fdfbf6"/>
          <stop offset="0.65" stop-color="#f6f0e3"/>
          <stop offset="1" stop-color="#ebe1cc"/>
        </radialGradient>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
        <filter id="halo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
      </defs>
      <rect width="${SHOT}" height="${SHOT}" fill="url(#bg)"/>
      <rect x="${left + 18}" y="${top + 30}" width="${targetWidth - 36}" height="${targetHeight - 20}" rx="24" fill="#3b2a12" opacity="0.16" filter="url(#halo)"/>
      <ellipse cx="${SHOT / 2}" cy="${top + targetHeight + 6}" rx="${targetWidth * 0.52}" ry="34" fill="#3b2a12" opacity="0.26" filter="url(#blur)"/>
    </svg>`,
  );
  return sharp(backdrop).composite([{ input: resized, left, top }]);
}

// The backs of the packs (brewing, storage, producer): the fronts are the owner's photographs of
// the zip pouches since 2026-10-17 (build-pouch-assets.mjs).
for (const code of PACKS) {
  const back = await pouch(
    await sharp(input(`${code}-back.png`))
      .png()
      .toBuffer(),
  );
  await writeWebp(await packShot(back), resolve(seedDir, `${code.toLowerCase()}-back.webp`), {
    quality: 90,
  });
}
