/**
 * Turns the owner's photographs of the TERAN zip pouches into product and brand assets.
 *
 *   node scripts/packaging/build-pouch-assets.mjs <photo dir>     (run from apps/web, macOS 14+)
 *
 * The photo directory holds one picture per pack, named by its code: xc2025.jpg, g8810.jpg,
 * 8800.jpg, 8830.jpg, 8009.jpg (supplied 2026-10-17). Nothing is redrawn. The pouch is lifted off
 * its background with Apple's Vision framework (lift-subject.swift) for the places where a pack
 * stands free: the home page stage and the brand pages.
 *
 * Outputs:
 *   ../api/prisma/seed/assets/packaging/<code>-pack.webp          the photograph, for the seed
 *   ../api/prisma/seed/assets/packaging/<code>-pack-cutout.webp   the pouch cut out, for the seed
 *   public/brand/packs/<code>.webp                                the pouch cut out, for the site
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/packaging/build-pouch-assets.mjs <photo dir>');

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const seedDir = resolve(root, '../api/prisma/seed/assets/packaging');
const packsDir = resolve(root, 'public/brand/packs');
for (const dir of [seedDir, packsDir]) mkdirSync(dir, { recursive: true });

const CODES = ['xc2025', 'g8810', '8800', '8830', '8009'];
const work = mkdtempSync(join(tmpdir(), 'teran-pouches-'));

try {
  for (const code of CODES) {
    const photo = resolve(source, `${code}.jpg`);
    await sharp(photo)
      .webp({ quality: 86 })
      .toFile(resolve(seedDir, `${code}-pack.webp`));

    const lifted = join(work, `${code}.png`);
    execFileSync('swift', [resolve(here, 'lift-subject.swift'), photo, lifted], {
      stdio: 'ignore',
    });
    // Trim to the pouch, with a little air for its shadowless edges.
    const cutout = await sharp(lifted)
      .trim({ threshold: 1 })
      .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 88, alphaQuality: 100 })
      .toBuffer();
    await sharp(cutout).toFile(resolve(seedDir, `${code}-pack-cutout.webp`));
    await sharp(cutout).toFile(resolve(packsDir, `${code}.webp`));
    const { width, height } = await sharp(cutout).metadata();
    console.log(`${code}: photo + cut-out ${width}×${height}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
