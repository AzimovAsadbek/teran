import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { filmCopyFileName, type ImageStore } from './image-processing.js';

const encode = promisify(execFile);
// At 9 seconds these target about 60 KB and 280 KB respectively. Keep the full original for fast links.
const profiles = [
  { width: 320, fps: 15, rate: '48k', peak: '56k', buffer: '64k' },
  { width: 640, fps: 24, rate: '220k', peak: '260k', buffer: '300k' },
];

export function missingFilmWidths(width: number | null, copies: readonly number[]): number[] {
  return profiles
    .filter((p) => width && p.width < width && !copies.includes(p.width))
    .slice(0, Math.max(0, 8 - copies.length))
    .map((p) => p.width);
}

/** Short, silent, decorative page films only. Publish a width after its complete MP4 exists. */
export async function addFilmWidths(
  store: ImageStore,
  key: string,
  widths: number[],
  readSource: () => Promise<Buffer>,
) {
  const dir = await mkdtemp(join(tmpdir(), 'teran-film-'));
  try {
    let input: string | undefined;
    for (const profile of profiles.filter((p) => widths.includes(p.width))) {
      const name = filmCopyFileName(profile.width);
      if (await store.exists(key, name)) continue;
      if (!input) {
        input = join(dir, 'source');
        await writeFile(input, await readSource());
      }
      const output = join(dir, name);
      await encode(
        process.env.FFMPEG_PATH || 'ffmpeg',
        [
          '-nostdin',
          '-hide_banner',
          '-loglevel',
          'error',
          '-protocol_whitelist',
          'file',
          '-i',
          input,
          '-map',
          '0:v:0',
          '-an',
          '-sn',
          '-dn',
          '-vf',
          `fps=${profile.fps},scale=${profile.width}:-2:flags=lanczos`,
          '-c:v',
          'libx264',
          '-threads',
          '2',
          '-preset',
          'medium',
          '-pix_fmt',
          'yuv420p',
          '-b:v',
          profile.rate,
          '-maxrate',
          profile.peak,
          '-bufsize',
          profile.buffer,
          '-g',
          String(profile.fps),
          '-movflags',
          '+faststart',
          output,
        ],
        { timeout: 120_000 },
      );
      await store.saveNew(key, name, await readFile(output), 'video/mp4');
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A real first frame small enough to travel inside the initial HTML on a slow connection. */
export async function heroPreview(
  store: ImageStore,
  picture: { key: string; widths: number[] },
): Promise<string> {
  const smallest = Math.min(...picture.widths);
  const data = await store.read(picture.key, smallest + '.webp');
  if (!data) throw new Error('Missing hero poster at ' + picture.key);
  const preview = await sharp(data)
    .resize({ width: 64, height: 64, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 42 })
    .toBuffer();
  return 'data:image/webp;base64,' + preview.toString('base64');
}
