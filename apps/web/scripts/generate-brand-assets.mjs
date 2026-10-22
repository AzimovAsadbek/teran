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

/**
 * The site icons (the owner's choice of 2026-10-22): TERAN's emblem itself, and on a white disc
 * where it needs one. The earlier deep green disc lost the emblem at tab size, and the emblem
 * alone loses its dark green T on a dark tab strip, so:
 * - icon.svg (Chrome, Edge, Firefox): the emblem alone in a light colour scheme and on a white
 *   disc in a dark one (`prefers-color-scheme` inside the SVG), from one small copy of the emblem
 *   embedded once, so the file stays light;
 * - favicon.ico (16, 32 and 48 px: Safari and older browsers) and icon.png (512 px, the web
 *   manifest): the emblem on a white disc, clear on light and dark alike, transparent around it;
 * - apple-icon.png (180 px): the emblem on an opaque white square, which the phone rounds itself.
 */

/** How much of the icon's height the emblem takes: alone, on the disc, on the square. */
const ALONE = 0.94;
const ON_DISC = 0.72;
const ON_SQUARE = 0.7;

/** The emblem `scale` × the icon's side high, centred in a `size` px square, as SVG markup. */
function placed(href, aspect, size, scale) {
  const height = size * scale;
  const width = height * aspect;
  return `<image href="${href}" x="${(size - width) / 2}" y="${(size - height) / 2}" width="${width}" height="${height}"/>`;
}

/** The emblem on a white disc (or square), transparent around the disc, as SVG markup. */
function onWhite(emblem, aspect, size, square = false) {
  const href = `data:image/png;base64,${emblem.toString('base64')}`;
  const ground = square
    ? `<rect width="${size}" height="${size}" fill="#ffffff"/>`
    : `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ffffff"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${ground}${placed(href, aspect, size, square ? ON_SQUARE : ON_DISC)}</svg>`;
}

/**
 * A PNG of the emblem on white. Tab sizes (48 px and under) are drawn at 256 px and brought down,
 * so their few pixels come from a sharp source.
 */
async function iconPng(emblem, aspect, size, square = false) {
  const drawn = size <= 48 ? 256 : size;
  let png = await sharp(Buffer.from(onWhite(emblem, aspect, drawn, square)))
    .png()
    .toBuffer();
  if (drawn !== size) png = await sharp(png).resize(size, size).png().toBuffer();
  // The home-screen icon is opaque (a phone shows transparency as black).
  return square
    ? sharp(png).flatten({ background: '#ffffff' }).png({ compressionLevel: 9 }).toBuffer()
    : sharp(png).png({ palette: true, quality: 92, effort: 10, compressionLevel: 9 }).toBuffer();
}

/** The embedded emblem (128 px high) drawn `scale` × the icon's side high, centred. */
function emblemAt(href, aspect, size, scale) {
  const factor = (size * scale) / 128;
  const width = 128 * aspect * factor;
  return `<use href="${href}" transform="translate(${((size - width) / 2).toFixed(2)} ${((size - size * scale) / 2).toFixed(2)}) scale(${factor.toFixed(4)})"/>`;
}

/** The tab icon for modern browsers: the emblem alone, or on a white disc in a dark scheme. */
async function iconSvg(emblem, aspect) {
  const copy = await sharp(emblem)
    .resize({ height: 128 })
    .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
    .toBuffer();
  const size = 64;
  const href = '#emblem';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <style>
    .disc { display: none; }
    @media (prefers-color-scheme: dark) {
      .alone { display: none; }
      .disc { display: inline; }
    }
  </style>
  <defs><image id="emblem" width="${Math.round(128 * aspect)}" height="128" href="data:image/png;base64,${copy.toString('base64')}"/></defs>
  <g class="alone">${emblemAt(href, aspect, size, ALONE)}</g>
  <g class="disc"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ffffff"/>${emblemAt(href, aspect, size, ON_DISC)}</g>
</svg>
`;
}

const emblem = readFileSync(resolve(publicBrand, 'teran-emblem.png'));
const { width: emblemWidth, height: emblemHeight } = await sharp(emblem).metadata();
const aspect = emblemWidth / emblemHeight;
writeFileSync(resolve(appDir, 'icon.svg'), await iconSvg(emblem, aspect));
writeFileSync(resolve(appDir, 'icon.png'), await iconPng(emblem, aspect, 512));
writeFileSync(resolve(appDir, 'apple-icon.png'), await iconPng(emblem, aspect, 180, true));
writeFileSync(
  resolve(appDir, 'favicon.ico'),
  pngsToIco(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, data: await iconPng(emblem, aspect, size) })),
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
console.log('icon.svg, icon.png, apple-icon.png, favicon.ico and og-default.png written');
