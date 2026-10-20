/**
 * Builds the photographs of the generic demonstration range (demo-catalog.ts, `testOnly`) from the
 * licensed pictures already used on the site (docs/design/reference-assets.md, sections 4 and 9),
 * so the range shows real tea photography instead of code-drawn art:
 *
 *   pnpm --filter @teran/api exec tsx scripts/build-demo-photos.ts --out <folder> [--from storage]
 *   DEMO_PHOTOS_DIR=<folder> SEED_TEST_CATALOGUE=true pnpm --filter @teran/api db:seed
 *
 * Each photograph is a square crop of one licensed source (Unsplash or Pexels licence, read from
 * the source folder's manifest.json) and is written with a `credits.json` naming the source,
 * photographer and licence. Neither the sources nor the crops are committed (the repository is
 * public); without DEMO_PHOTOS_DIR, or for a file it does not hold, the seed keeps drawing the
 * product (the end-to-end tests and CI need no pictures).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

interface Crop {
  /** File name in the output folder (without .jpg), as demo-catalog.ts names it in `photo`. */
  name: string;
  /** Source picture, relative to --from. */
  source: string;
  left: number;
  top: number;
  size: number;
  /** A cut-out on a transparent background: laid on white. */
  flatten?: boolean;
  /** What the photograph shows, for the credits. */
  shows: string;
  /** For a source its folder's manifest no longer lists (docs/design/reference-assets.md). */
  credit?: { url: string | null; photographer: string; licence: string };
}

/** The crops, chosen and checked by eye at card and product-page sizes (2026-10-20). */
const CROPS: Crop[] = [
  {
    name: 'black-leaves',
    source: 'tea-photos-2/wholesale-flavour.jpg',
    left: 110,
    top: 0,
    size: 1113,
    shows: 'black tea leaves in a glass bowl',
  },
  {
    name: 'oolong-leaves',
    source: 'tea-photos-2/wholesale-flavour.jpg',
    left: 1447,
    top: 0,
    size: 1113,
    shows: 'large twisted leaves in a glass bowl',
  },
  {
    name: 'lemon-cups',
    source: 'hd-pictures/wholesale-hero.jpg',
    left: 1900,
    top: 0,
    size: 1829,
    shows: 'two cups of black tea, one with lemon',
  },
  {
    name: 'red-pour',
    source: 'tea-photos-2/contact-picture.jpg',
    left: 0,
    top: 640,
    size: 1610,
    shows: 'tea poured into glass mugs, loose leaves on a board',
  },
  {
    name: 'green-cup-leaves',
    source: 'tea-photos-2/cover-tea.png',
    left: 61,
    top: 0,
    size: 1077,
    flatten: true,
    shows: 'a cup of green tea in a ring of dry leaves',
  },
  {
    name: 'green-glass',
    source: 'tea-photos-2/home-hero-1.jpg',
    left: 1240,
    top: 0,
    size: 827,
    shows: 'green tea in a tall glass beside a bowl of leaves',
    // Its manifest entry went when the first view got a film; reference-assets.md section 4.
    credit: { url: null, photographer: 'Tang Don', licence: 'Unsplash License' },
  },
  {
    name: 'green-tray',
    source: 'tea-photos-2/menu-shop.jpg',
    left: 0,
    top: 0,
    size: 1400,
    shows: 'flat green tea leaves, an iron teapot and two cups',
  },
  {
    name: 'gaiwan-green',
    source: 'tea-photos-2/help-tea.jpg',
    left: 560,
    top: 0,
    size: 600,
    shows: 'green leaves steeping in a white gaiwan',
  },
  {
    name: 'tea-shoots',
    source: 'hd-pictures/about-idea-3.jpg',
    left: 500,
    top: 0,
    size: 1600,
    shows: 'young tea shoots in sunlight',
  },
  {
    name: 'dark-plates-2',
    source: 'tea-photos-2/wholesale-community.jpg',
    left: 418,
    top: 0,
    size: 1122,
    shows: 'dark leaves and a lidded bowl at a tea table',
  },
  {
    name: 'basket-leaves',
    source: 'tea-photos-2/wholesale-card-1.jpg',
    left: 300,
    top: 300,
    size: 700,
    shows: 'rolled leaves in a basket',
  },
  {
    name: 'white-teapot',
    source: 'tea-photos-2/home-banner-1.jpg',
    left: 1760,
    top: 40,
    size: 800,
    shows: 'a white porcelain side-handle teapot',
  },
  {
    name: 'cane-teapot',
    source: 'tea-photos-2/wholesale-card-2.jpg',
    left: 0,
    top: 0,
    size: 1000,
    shows: 'a white teapot with a cane handle and a clay cup',
  },
  {
    name: 'glass-teapot',
    source: 'tea-photos-2/help-ordering.jpg',
    left: 380,
    top: 0,
    size: 600,
    shows: 'a glass teapot of green tea in a garden',
  },
  // The wider demonstration range (demo-range.ts) and two gift boxes for the earlier gift sets:
  // photographs the owner approved on 2026-10-20, in `storage/range-photos/` with their manifest
  // (docs/design/reference-assets.md, section 11). The sparkling black tea has none yet.
  {
    name: 'matcha-bowl',
    source: 'range-photos/matcha-bowl-pexels-29574692.jpg',
    left: 0,
    top: 819,
    size: 2105,
    shows: 'whisked matcha in a terracotta bowl, from above',
  },
  {
    name: 'matcha-powder',
    source: 'range-photos/matcha-powder-pexels-8474058.jpg',
    left: 0,
    top: 600,
    size: 2400,
    shows: 'matcha powder, a wooden scoop and a bamboo whisk',
  },
  {
    name: 'chamomile',
    source: 'range-photos/chamomile-unsplash-k94FbpisWto.jpg',
    left: 432,
    top: 0,
    size: 1535,
    shows: 'a glass teapot of chamomile, dried flowers before it',
  },
  {
    name: 'hibiscus',
    source: 'range-photos/hibiscus-pexels-8431379.jpg',
    left: 0,
    top: 1300,
    size: 1700,
    shows: 'hibiscus tea in a glass cup, dried petals around it',
  },
  {
    name: 'mint-tea',
    source: 'range-photos/mint-tea-pexels-36228288.jpg',
    left: 0,
    top: 400,
    size: 2400,
    shows: 'mint tea in glass cups before a glass teapot',
  },
  {
    name: 'rosehip',
    source: 'range-photos/rosehip-pexels-39963126.jpg',
    left: 0,
    top: 350,
    size: 2400,
    shows: 'a glass of rosehip tea beside a bowl of fresh rosehips',
  },
  {
    name: 'iced-jasmine',
    source: 'range-photos/iced-jasmine-pexels-33526974.jpg',
    left: 0,
    top: 1000,
    size: 2400,
    shows: 'a chilled glass of iced green tea',
  },
  {
    name: 'iced-peach',
    source: 'range-photos/iced-peach-pexels-9230288.jpg',
    left: 0,
    top: 300,
    size: 2400,
    shows: 'iced peach tea beside half a peach',
  },
  {
    name: 'still-water',
    source: 'range-photos/still-water-pexels-6612380.jpg',
    left: 0,
    top: 250,
    size: 2400,
    shows: 'a clear glass bottle of water with a blank label',
  },
  {
    name: 'sparkling-water',
    source: 'range-photos/sparkling-water-pexels-12987478.jpg',
    left: 399,
    top: 0,
    size: 1602,
    shows: 'sparkling water over ice in a tall glass',
  },
  {
    name: 'pomegranate-juice',
    source: 'range-photos/pomegranate-juice-pexels-18142601.jpg',
    left: 400,
    top: 0,
    size: 1600,
    shows: 'a tall glass of pomegranate juice',
  },
  {
    name: 'apple-juice',
    source: 'range-photos/apple-juice-pexels-29632177.jpg',
    left: 0,
    top: 932,
    size: 2400,
    shows: 'an amber apple drink in a cut-glass cup with apples',
  },
  {
    name: 'apricot-juice',
    source: 'range-photos/apricot-juice-pexels-10508297.jpg',
    left: 400,
    top: 0,
    size: 1600,
    shows: 'a pale apricot drink with apricots on a white block',
  },
  {
    name: 'piyola-set',
    source: 'range-photos/piyola-set-pexels-4589178.jpg',
    left: 350,
    top: 1050,
    size: 1650,
    shows: 'two piyolas of tea, a paxta teapot, spices and non',
  },
  {
    name: 'matcha-whisk',
    source: 'range-photos/matcha-whisk-pexels-8474062.jpg',
    left: 0,
    top: 600,
    size: 2400,
    shows: 'a bamboo matcha whisk',
  },
  {
    name: 'tea-caddy',
    source: 'range-photos/tea-caddy-unsplash-cMGCAY4hZxM.jpg',
    left: 400,
    top: 0,
    size: 1600,
    shows: 'two bamboo tea caddies, one open',
  },
  {
    name: 'iced-green-tea',
    source: 'range-photos/iced-green-tea-pexels-8540993.jpg',
    left: 400,
    top: 0,
    size: 1600,
    shows: 'swing-top bottles of a pale green drink in a crate',
  },
  {
    name: 'spiced-tea',
    source: 'range-photos/spiced-tea-pexels-38958417.jpg',
    left: 0,
    top: 400,
    size: 2400,
    shows: 'black tea in a glass cup with cinnamon and star anise',
  },
  {
    name: 'discovery-box',
    source: 'range-photos/discovery-box-pexels-29133249.jpg',
    left: 400,
    top: 0,
    size: 1600,
    shows: 'a wooden box of tea flowers and spices in compartments',
  },
  {
    name: 'gift-box-white',
    source: 'range-photos/gift-box-white-pexels-5872188.jpg',
    left: 400,
    top: 0,
    size: 1600,
    shows: 'a white gift box with a black ribbon',
  },
  {
    name: 'gift-boxes-black',
    source: 'range-photos/gift-boxes-black-pexels-5872362.jpg',
    left: 400,
    top: 0,
    size: 1600,
    shows: 'two black gift boxes with white ribbons',
  },
];

/** The `assets` of a source folder's manifest.json (import-visuals.ts reads the same file). */
function manifestAssets(value: unknown): Array<Record<string, unknown>> {
  return (value as { assets?: Array<Record<string, unknown>> }).assets ?? [];
}

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index > 0 ? process.argv[index + 1] : undefined;
}

async function credit(from: string, crop: Crop): Promise<Record<string, unknown>> {
  if (crop.credit) return crop.credit;
  const [folder, file] = crop.source.split('/') as [string, string];
  const manifest: unknown = JSON.parse(await readFile(join(from, folder, 'manifest.json'), 'utf8'));
  const entry = manifestAssets(manifest).find((asset) => asset.file === file);
  if (!entry) throw new Error(`${crop.source} is not listed in ${folder}/manifest.json`);
  const { source: url, photographer, licence } = entry;
  return { url, photographer: photographer ?? null, licence: licence ?? null };
}

async function main(): Promise<void> {
  const out = option('out');
  if (!out) throw new Error('Pass --out <folder> (kept outside the repository).');
  const from = resolve(option('from') ?? 'storage');
  await mkdir(out, { recursive: true });
  const credits: Record<string, unknown>[] = [];
  for (const crop of CROPS) {
    const input = join(from, crop.source);
    let image = sharp(input);
    if (crop.flatten) image = image.flatten({ background: '#ffffff' });
    const meta = await sharp(input).metadata();
    const size = Math.min(crop.size, (meta.width ?? 0) - crop.left, (meta.height ?? 0) - crop.top);
    await image
      .extract({ left: crop.left, top: crop.top, width: size, height: size })
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(join(out, `${crop.name}.jpg`));
    credits.push({
      file: `${crop.name}.jpg`,
      shows: crop.shows,
      crop: { source: crop.source, left: crop.left, top: crop.top, size },
      ...(await credit(from, crop)),
    });
  }
  await writeFile(join(out, 'credits.json'), `${JSON.stringify(credits, null, 2)}\n`);
  console.log(`${credits.length} photograph(s) written to ${resolve(out)}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
