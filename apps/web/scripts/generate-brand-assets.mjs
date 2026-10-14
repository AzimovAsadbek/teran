/**
 * App icons and the default social image, made from the logo set that
 * scripts/packaging/build-packaging-assets.mjs cuts out of the TERAN packaging (run that first
 * when the packaging changes).
 *
 * Usage: node scripts/generate-brand-assets.mjs   (run from apps/web)
 *
 * The earlier logo raster supplied by the owner (assets/brand/teran-logo-original.webp, bevelled
 * version) is kept for reference only; the storefront uses the flat logo printed on the packs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicBrand = resolve(root, 'public/brand');
const appDir = resolve(root, 'src/app');

const IVORY = { r: 252, g: 250, b: 244, alpha: 1 };
const GOLD = '#d0a20a';

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

/** The emblem centred on ivory, so it reads on light and dark browser chrome. */
async function squareIcon(emblem, size) {
  const padding = Math.round(size * (size <= 48 ? 0.08 : 0.14));
  const inner = await sharp(emblem)
    .resize({
      width: size - padding * 2,
      height: size - padding * 2,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: IVORY } })
    .composite([{ input: inner, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const emblem = readFileSync(resolve(publicBrand, 'teran-emblem.png'));
writeFileSync(resolve(appDir, 'icon.png'), await squareIcon(emblem, 512));
writeFileSync(resolve(appDir, 'apple-icon.png'), await squareIcon(emblem, 180));
writeFileSync(
  resolve(appDir, 'favicon.ico'),
  pngsToIco(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, data: await squareIcon(emblem, size) })),
    ),
  ),
);

// Default social sharing image (1200×630): the pack's lockup on ivory under the seigaiha waves,
// in a double gold frame like the pack's weight box.
const width = 1200;
const height = 630;
const lockup = await sharp(resolve(publicBrand, 'teran-lockup.png'))
  .resize({ height: 500 })
  .toBuffer();
const waves = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
     <defs>
       <pattern id="w" width="48" height="24" patternUnits="userSpaceOnUse">
         <g fill="#fcfaf4" stroke="${GOLD}" stroke-width="1">
           ${[
             [0, 0],
             [48, 0],
             [24, 12],
             [0, 24],
             [48, 24],
           ]
             .map(([x, y]) =>
               [23.5, 19, 14.5, 10, 5.5]
                 .map((r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
                 .join(''),
             )
             .join('')}
         </g>
       </pattern>
       <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#fff" stop-opacity="0.4"/>
         <stop offset="1" stop-color="#fff" stop-opacity="0"/>
       </linearGradient>
       <mask id="m"><rect width="${width}" height="220" fill="url(#fade)"/></mask>
     </defs>
     <rect width="${width}" height="220" fill="url(#w)" mask="url(#m)"/>
     <rect x="28" y="28" width="${width - 56}" height="${height - 56}" fill="none" stroke="${GOLD}" stroke-width="2" rx="6"/>
     <rect x="38" y="38" width="${width - 76}" height="${height - 76}" fill="none" stroke="${GOLD}" stroke-opacity="0.45" stroke-width="1" rx="4"/>
   </svg>`,
);
await sharp({ create: { width, height, channels: 4, background: IVORY } })
  .composite([{ input: waves }, { input: lockup, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile(resolve(publicBrand, 'og-default.png'));
console.log('icons and og-default.png written');
