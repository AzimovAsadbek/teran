import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { IMAGE_WIDTHS, imageStore, storeImage, WIDE_IMAGE_WIDTHS } from './image-processing.js';
import { addRendition, missingRenditions, sourceWidth } from './renditions.js';

/** The widths pictures got before 800 px was added (ADR-065). */
const BEFORE = [320, 480, 640, 960, 1280, 1600];
const KEY = 'visuals/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/AbCdEfGhIjKl';

describe('sourceWidth', () => {
  it('takes the narrowest stored file at least twice as wide', () => {
    expect(sourceWidth([320, 480, 640, 960, 1280, 1600, 1920], 800)).toBe(1600);
  });

  it('else the widest one wider than the width', () => {
    expect(sourceWidth([320, 480, 640, 960, 1080], 800)).toBe(1080);
  });

  it('none when no stored file is wider', () => {
    expect(sourceWidth([320, 480, 640, 800], 800)).toBeNull();
  });
});

describe('missingRenditions', () => {
  const product = (width: number, widths: number[]) => ({
    picture: { key: KEY, width, height: width, widths },
    options: { widths: IMAGE_WIDTHS },
  });
  const page = (width: number, height: number, widths: number[]) => ({
    picture: { key: KEY, width, height, widths },
    options: { widths: WIDE_IMAGE_WIDTHS, fullWidth: true },
  });

  it('finds the 800 px file a picture stored before it lacks', () => {
    expect(missingRenditions(product(2000, BEFORE))).toEqual([{ width: 800, from: 1600 }]);
  });

  it('finds the 1080 px file a page picture lacks too, made from one twice as wide', () => {
    expect(missingRenditions(page(3840, 1600, [...BEFORE, 1920, 2560, 3200, 3840]))).toEqual([
      { width: 800, from: 1600 },
      { width: 1080, from: 2560 },
    ]);
    expect(missingRenditions(page(1600, 900, [320, 480, 640, 800, 960, 1280, 1600]))).toEqual([
      { width: 1080, from: 1600 },
    ]);
  });

  it("makes the first view's phone crop from its own full-width file", () => {
    expect(missingRenditions(page(1080, 1440, [320, 480, 640, 960, 1080]))).toEqual([
      { width: 800, from: 1080 },
    ]);
  });

  it('finds nothing missing in a picture narrower than 800 px or one with every width', () => {
    expect(missingRenditions(product(700, [320, 480, 640]))).toEqual([]);
    expect(missingRenditions(product(2000, [320, 480, 640, 800, 960, 1280, 1600]))).toEqual([]);
    expect(missingRenditions(page(1600, 900, [320, 480, 640, 800, 960, 1080, 1280, 1600]))).toEqual(
      [],
    );
    // A page picture exactly 800 px wide already kept its own width.
    expect(missingRenditions(page(800, 600, [320, 480, 640, 800]))).toEqual([]);
  });

  it('marks a width no stored file is wider than: only a new upload can give it', () => {
    expect(missingRenditions(product(900, [320, 480, 640]))).toEqual([{ width: 800, from: null }]);
  });
});

// Each test encodes a noisy picture into six files: seconds when other suites run beside it.
describe('addRendition', { timeout: 30_000 }, () => {
  let uploads: string;

  beforeEach(() => {
    uploads = mkdtempSync(join(tmpdir(), 'renditions-'));
  });
  afterEach(() => {
    rmSync(uploads, { recursive: true, force: true });
  });

  /** A photograph-like picture (noise, so the files have detail) stored as before ADR-065. */
  async function storedBefore() {
    const store = imageStore({ uploadsDir: uploads });
    const input = await sharp({
      create: {
        width: 1700,
        height: 340,
        channels: 3,
        background: '#000000',
        noise: { type: 'gaussian', mean: 120, sigma: 40 },
      },
    })
      .png()
      .toBuffer();
    const stored = await storeImage(input, store, 'visuals/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b', {
      widths: BEFORE,
    });
    const picture = {
      key: stored.storageKey,
      widths: stored.widths,
      width: stored.width,
      height: stored.height,
    };
    return { store, picture, path: join(uploads, picture.key, '800.webp') };
  }

  it("adds the file beside the others, made from a wider one at the picture's proportions", async () => {
    const { store, picture, path } = await storedBefore();
    expect(picture.widths).toEqual(BEFORE);

    const added = await addRendition(store, picture, { width: 800, from: 1600 });

    expect(added.result).toBe('added');
    const file = readFileSync(path);
    expect(added.bytes).toBe(file.length);
    expect(await sharp(file).metadata()).toMatchObject({
      format: 'webp',
      width: 800,
      height: Math.round((340 * 800) / 1700),
    });
  });

  it('never replaces a file: one already there is kept as it is', async () => {
    const { store, picture, path } = await storedBefore();
    await addRendition(store, picture, { width: 800, from: 1600 });
    const before = readFileSync(path);
    const { mtimeMs } = statSync(path);

    const again = await addRendition(store, picture, { width: 800, from: 1600 });

    expect(again).toEqual({ result: 'present', bytes: 0 });
    expect(readFileSync(path).equals(before)).toBe(true);
    expect(statSync(path).mtimeMs).toBe(mtimeMs);
  });

  it('leaves anything else under the name alone and says so', async () => {
    const { store, picture, path } = await storedBefore();
    writeFileSync(path, 'not a picture');

    await expect(addRendition(store, picture, { width: 800, from: 1600 })).rejects.toThrow(
      /800\.webp is there but is not a WebP picture 800 px wide/,
    );
    expect(readFileSync(path, 'utf8')).toBe('not a picture');
  });

  it('says when the file to make it from is gone', async () => {
    const { store, picture, path } = await storedBefore();
    rmSync(join(uploads, picture.key, '1600.webp'));

    await expect(addRendition(store, picture, { width: 800, from: 1600 })).rejects.toThrow(
      /1600\.webp is not in the store/,
    );
    expect(() => statSync(path)).toThrow();
  });
});
