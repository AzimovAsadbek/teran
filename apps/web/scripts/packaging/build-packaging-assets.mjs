/**
 * Turns the renders made by extract-packaging.py into the storefront's brand and product assets.
 *
 *   node scripts/packaging/build-packaging-assets.mjs <extract dir>     (run from apps/web)
 *
 * Nothing is redrawn: logos, landscapes, leaves and packs are the owner's packaging artwork. Two
 * things are added, both by code:
 *   - The front of each pack has a window printed as "This part will have a transparent coating".
 *     For the pack shots it is filled with an illustration of dry rolled green tea behind clear
 *     film (the real pack shows its tea there).
 *   - Pack shots are placed on the storefront's seamless ivory background with a soft shadow, as
 *     the art direction asks of product photography (docs/design/design-system.md).
 *
 * Outputs:
 *   public/brand/teran-{logo,emblem,wordmark,lockup}.{png,webp}   logo set (transparent)
 *   public/brand/art/{lake,terraces,sprig-1,sprig-2}.webp        artwork from the packaging
 *   public/brand/packs/<code>.webp                               pack fronts, cut out
 *   public/brand/ornaments/*.svg                                 the pack's four icons, 绿茶, seal
 *   ../api/prisma/seed/assets/packaging/<code>-{front,back}.webp  square pack shots for the seed
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
const packsDir = resolve(brandDir, 'packs');
const ornamentsDir = resolve(brandDir, 'ornaments');
const seedDir = resolve(root, '../api/prisma/seed/assets/packaging');
for (const dir of [brandDir, artDir, packsDir, ornamentsDir, seedDir]) {
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
await writeWebp(sharp(input('lake.png')), resolve(artDir, 'lake.webp'), { quality: 84 });
await writeWebp(
  sharp(input('terraces.png')).resize({ width: 2400 }),
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

/** Small deterministic PRNG (mulberry32), so the illustration is identical on every run. */
function createRandom(seedText) {
  let seed = 0;
  for (const char of seedText) seed = (Math.imul(31, seed) + char.charCodeAt(0)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LEAF_COLOURS = ['#33401d', '#3d4b22', '#475828', '#52632d', '#5d6e33', '#68783a', '#3a4520'];
const LEAF_LIGHTS = ['#8f9b5c', '#a0aa6c', '#7f8b4f'];

/**
 * Dry, tightly rolled green tea seen through clear film: thousands of short twisted strips with a
 * dark edge and the occasional pale highlight, then a film reflection. Drawn in the window's own
 * pixel space and clipped to its outline.
 */
function windowSvg(width, height, outline, offsetX, offsetY, seed) {
  const random = createRandom(seed);
  const pick = (items) => items[Math.floor(random() * items.length)];
  const strips = [];
  const count = Math.round((width * height) / 240);
  for (let index = 0; index < count; index++) {
    const x = (random() * (width + 80) - 40).toFixed(1);
    const y = (random() * (height + 80) - 40).toFixed(1);
    const length = 24 + random() * 44;
    const thickness = 5 + random() * 7;
    const bend = ((random() - 0.5) * length * 0.6).toFixed(1);
    const half = (length / 2).toFixed(1);
    const rotation = Math.round(random() * 360);
    const curve = `M${-half} 0 Q0 ${bend} ${half} 0`;
    const light =
      random() < 0.3
        ? `<path d="${curve}" stroke="${pick(LEAF_LIGHTS)}" stroke-opacity="0.55" stroke-width="${(thickness * 0.28).toFixed(1)}" stroke-linecap="round" fill="none" transform="translate(0 ${(-thickness * 0.22).toFixed(1)})"/>`
        : '';
    strips.push(
      `<g transform="translate(${x} ${y}) rotate(${rotation})">` +
        `<path d="${curve}" stroke="#1d2510" stroke-width="${(thickness + 2.4).toFixed(1)}" stroke-linecap="round" fill="none"/>` +
        `<path d="${curve}" stroke="${pick(LEAF_COLOURS)}" stroke-width="${thickness.toFixed(1)}" stroke-linecap="round" fill="none"/>` +
        light +
        `</g>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <clipPath id="window"><path d="${outline}" transform="translate(${-offsetX} ${-offsetY})"/></clipPath>
      <linearGradient id="film" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
        <stop offset="0.32" stop-color="#ffffff" stop-opacity="0.06"/>
        <stop offset="0.44" stop-color="#ffffff" stop-opacity="0.2"/>
        <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.03"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0d1206" stop-opacity="0.55"/>
        <stop offset="0.16" stop-color="#0d1206" stop-opacity="0"/>
        <stop offset="0.86" stop-color="#0d1206" stop-opacity="0"/>
        <stop offset="1" stop-color="#0d1206" stop-opacity="0.35"/>
      </linearGradient>
    </defs>
    <g clip-path="url(#window)">
      <rect width="${width}" height="${height}" fill="#262f16"/>
      ${strips.join('')}
      <rect width="${width}" height="${height}" fill="url(#depth)"/>
      <rect width="${width}" height="${height}" fill="url(#film)"/>
    </g>
  </svg>`;
}

/** The front render with its window filled. */
async function frontWithWindow(code) {
  const window = JSON.parse(readFileSync(input(`${code}-window.json`), 'utf8'));
  const [x0, y0, x1, y1] = window.rect.map((value) => Math.round(value));
  const width = x1 - x0;
  const height = y1 - y0;
  const layer = await sharp(Buffer.from(windowSvg(width, height, window.d, x0, y0, code)))
    .png()
    .toBuffer();
  return sharp(input(`${code}-front.png`))
    .composite([{ input: layer, left: x0, top: y0 }])
    .png()
    .toBuffer();
}

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

for (const code of PACKS) {
  const front = await pouch(await frontWithWindow(code));
  const back = await pouch(
    await sharp(input(`${code}-back.png`))
      .png()
      .toBuffer(),
  );
  await writeWebp(
    sharp(front).resize({ height: 1000 }),
    resolve(packsDir, `${code.toLowerCase()}.webp`),
  );
  await writeWebp(await packShot(front), resolve(seedDir, `${code.toLowerCase()}-front.webp`), {
    quality: 88,
  });
  await writeWebp(await packShot(back), resolve(seedDir, `${code.toLowerCase()}-back.webp`), {
    quality: 90,
  });
}
