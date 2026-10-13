/**
 * Derives web-ready brand assets from the original TERAN logo supplied by the owner
 * (assets/brand/teran-logo-original.webp, stacked lockup on a white background).
 *
 * Nothing is redrawn or re-typeset: every output is made from the original pixels.
 * White is removed with an exact "colour to alpha" un-multiply, which keeps anti-aliased edges
 * and the soft gold glow intact on any background.
 *
 * Usage: node scripts/generate-brand-assets.mjs   (run from apps/web)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'assets/brand/teran-logo-original.webp');
const publicBrand = resolve(root, 'public/brand');
const appDir = resolve(root, 'src/app');
mkdirSync(publicBrand, { recursive: true });

const IVORY = { r: 252, g: 250, b: 244 };

/** Converts an RGB buffer on white into straight-alpha RGBA ("colour to alpha"). */
function whiteToAlpha(rgb, width, height) {
  const out = Buffer.alloc(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const r = rgb[p * 3];
    const g = rgb[p * 3 + 1];
    const b = rgb[p * 3 + 2];
    const alpha = Math.max(255 - r, 255 - g, 255 - b) / 255;
    if (alpha < 0.02) continue; // pure background
    const unmultiply = (c) => Math.round(Math.min(255, Math.max(0, 255 - (255 - c) / alpha)));
    out[p * 4] = unmultiply(r);
    out[p * 4 + 1] = unmultiply(g);
    out[p * 4 + 2] = unmultiply(b);
    out[p * 4 + 3] = Math.round(alpha * 255);
  }
  return out;
}

async function rgbaRegion(region) {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .extract(region)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data: whiteToAlpha(data, info.width, info.height),
    width: info.width,
    height: info.height,
  };
}

function clearRect(image, rect) {
  for (let y = rect.top; y < rect.top + rect.height; y++) {
    for (let x = rect.left; x < rect.left + rect.width; x++) {
      image.data.fill(0, (y * image.width + x) * 4, (y * image.width + x) * 4 + 4);
    }
  }
}

async function save(image, name, { maxWidth } = {}) {
  let pipeline = sharp(image.data, {
    raw: { width: image.width, height: image.height, channels: 4 },
  }).trim({ threshold: 1 });
  const trimmed = await pipeline.png().toBuffer({ resolveWithObject: true });
  pipeline = sharp(trimmed.data);
  if (maxWidth && trimmed.info.width > maxWidth) pipeline = pipeline.resize({ width: maxWidth });
  const png = await pipeline.png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  writeFileSync(resolve(publicBrand, `${name}.png`), png.data);
  const webp = await sharp(png.data).webp({ quality: 92, alphaQuality: 100 }).toBuffer();
  writeFileSync(resolve(publicBrand, `${name}.webp`), webp);
  console.log(
    `${name}: ${png.info.width}x${png.info.height} (png ${png.data.length} B, webp ${webp.length} B)`,
  );
  return { buffer: png.data, width: png.info.width, height: png.info.height };
}

/** Wraps PNG images into a .ico container (PNG-compressed entries are valid ICO payloads). */
function pngsToIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

async function squareIcon(emblem, size, background) {
  const padding = Math.round(size * 0.14);
  const inner = await sharp(emblem.buffer)
    .resize({
      width: size - padding * 2,
      height: size - padding * 2,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: inner, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// Geometry measured on the 1774×887 original (see docs/design/design-system.md).
const full = await rgbaRegion({ left: 230, top: 10, width: 1314, height: 866 });
const emblem = await rgbaRegion({ left: 560, top: 10, width: 660, height: 572 });
const wordmark = await rgbaRegion({ left: 230, top: 550, width: 1314, height: 326 });
// The emblem's lowest gold tip dips into the wordmark band above the letters E–A; remove it.
clearRect(wordmark, { left: 700 - 230, top: 0, width: 340, height: 42 });

await save(full, 'teran-logo', { maxWidth: 1200 });
const emblemAsset = await save(emblem, 'teran-emblem', { maxWidth: 640 });
await save(wordmark, 'teran-wordmark', { maxWidth: 1200 });

// App icons: emblem on the brand ivory, so it reads on light and dark browser chrome.
const ivory = { ...IVORY, alpha: 1 };
writeFileSync(resolve(appDir, 'icon.png'), await squareIcon(emblemAsset, 512, ivory));
writeFileSync(resolve(appDir, 'apple-icon.png'), await squareIcon(emblemAsset, 180, ivory));
writeFileSync(
  resolve(appDir, 'favicon.ico'),
  pngsToIco([
    { size: 16, data: await squareIcon(emblemAsset, 16, ivory) },
    { size: 32, data: await squareIcon(emblemAsset, 32, ivory) },
    { size: 48, data: await squareIcon(emblemAsset, 48, ivory) },
  ]),
);

// Default social sharing image (1200×630): full logo on ivory with a thin gold frame.
const logoForOg = await sharp(resolve(publicBrand, 'teran-logo.png'))
  .resize({ width: 640 })
  .toBuffer();
const frame = Buffer.from(
  `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
     <rect x="28" y="28" width="1144" height="574" fill="none" stroke="#C5963A" stroke-width="2" rx="6"/>
     <rect x="38" y="38" width="1124" height="554" fill="none" stroke="#C5963A" stroke-opacity="0.35" stroke-width="1" rx="4"/>
   </svg>`,
);
await sharp({ create: { width: 1200, height: 630, channels: 4, background: ivory } })
  .composite([{ input: frame }, { input: logoForOg, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(resolve(publicBrand, 'og-default.png'));
console.log('icons and og-default.png written');
