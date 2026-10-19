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
 * The site icon (the owner's choice of 2026-10-19): TERAN's emblem glowing on a deep green disc
 * in a thin gold ring, nothing around the circle (transparent). Its dark greens are lifted so the
 * T and the leaves read on the green; tab sizes (48 px and under) get a larger emblem, a thicker
 * ring and no glow, which would only blur their few pixels. `square` fills the whole square
 * instead, for the home-screen icon that the phone rounds itself.
 */
function iconSvg(emblem, aspect, { size, square = false, small = false }) {
  const s = size;
  const radius = s / 2 - Math.max(0.5, s * 0.01);
  const ring = square ? 0 : small ? s * 0.06 : s * 0.034;
  const height = s * (square ? 0.66 : small ? 0.7 : 0.6);
  const width = height * aspect;
  const x = (s - width) / 2;
  const y = (s - height) / 2 + s * 0.01;
  const blur = s * 0.012;
  const table = '0.1 0.42 0.66 0.86 1';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <defs>
      <radialGradient id="disc" gradientUnits="userSpaceOnUse" cx="${s / 2}" cy="${s / 2}"
        r="${square ? s * 0.75 : radius}" fx="${s / 2}" fy="${s * 0.44}">
        <stop offset="0" stop-color="#2f8f37"/><stop offset="0.5" stop-color="#17602a"/>
        <stop offset="1" stop-color="#093216"/>
      </radialGradient>
      <radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="${s / 2}" cy="${s * 0.53}" r="${s * 0.36}">
        <stop offset="0" stop-color="#ffd77a" stop-opacity="0.42"/>
        <stop offset="1" stop-color="#ffd77a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f6dd8c"/><stop offset="0.5" stop-color="#c9973a"/>
        <stop offset="1" stop-color="#f0cf72"/>
      </linearGradient>
      <filter id="lift" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feComponentTransfer in="SourceGraphic" result="lifted">
          <feFuncR type="table" tableValues="${table}"/><feFuncG type="table" tableValues="${table}"/>
          <feFuncB type="table" tableValues="${table}"/>
        </feComponentTransfer>
        <feColorMatrix in="lifted" type="saturate" values="1.3" result="vivid"/>
        ${
          small
            ? ''
            : `<feGaussianBlur in="SourceAlpha" stdDeviation="${blur}" result="blur"/>
        <feFlood flood-color="#ffcf5a" flood-opacity="0.6"/>
        <feComposite in2="blur" operator="in" result="halo"/>`
        }
        <feMerge>${small ? '' : '<feMergeNode in="halo"/>'}<feMergeNode in="vivid"/></feMerge>
      </filter>
      <clipPath id="disc-clip"><circle cx="${s / 2}" cy="${s / 2}" r="${radius}"/></clipPath>
    </defs>
    <g clip-path="${square ? 'none' : 'url(#disc-clip)'}">
      ${square ? `<rect width="${s}" height="${s}" fill="url(#disc)"/>` : `<circle cx="${s / 2}" cy="${s / 2}" r="${radius}" fill="url(#disc)"/>`}
      <circle cx="${s / 2}" cy="${s * 0.53}" r="${s * 0.36}" fill="url(#glow)"/>
      <image href="data:image/png;base64,${emblem.toString('base64')}" x="${x}" y="${y}"
        width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" filter="url(#lift)"/>
    </g>
    ${square ? '' : `<circle cx="${s / 2}" cy="${s / 2}" r="${radius - ring / 2}" fill="none" stroke="url(#gold)" stroke-width="${ring}"/>`}
  </svg>`;
}

/** The icon at `size`: tab sizes are drawn at 256 px in their own design and brought down. */
async function icon(emblem, aspect, size, square = false) {
  const small = !square && size <= 48;
  const svg = iconSvg(emblem, aspect, { size: small ? 256 : size, square, small });
  let png = await sharp(Buffer.from(svg)).png().toBuffer();
  if (small) png = await sharp(png).resize(size, size).png().toBuffer();
  // The home-screen icon is opaque (a phone shows transparency as black).
  return square
    ? sharp(png).flatten({ background: '#093216' }).png({ compressionLevel: 9 }).toBuffer()
    : sharp(png).png({ palette: true, quality: 92, effort: 10, compressionLevel: 9 }).toBuffer();
}

const emblem = readFileSync(resolve(publicBrand, 'teran-emblem.png'));
const { width: emblemWidth, height: emblemHeight } = await sharp(emblem).metadata();
const aspect = emblemWidth / emblemHeight;
writeFileSync(resolve(appDir, 'icon.png'), await icon(emblem, aspect, 512));
writeFileSync(resolve(appDir, 'apple-icon.png'), await icon(emblem, aspect, 180, true));
writeFileSync(
  resolve(appDir, 'favicon.ico'),
  pngsToIco(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, data: await icon(emblem, aspect, size) })),
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
