import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  GALLERY_IMAGE_WIDTHS,
  imageStore,
  renderRenditions,
  renditionWidths,
  WIDE_IMAGE_WIDTHS,
} from './image-processing.js';

describe('renditionWidths', () => {
  it('makes an 800 px file between 640 and 960 (ADR-065)', () => {
    expect(renditionWidths(2000)).toEqual([320, 480, 640, 800, 960, 1280, 1600]);
    expect(renditionWidths(3000, { widths: GALLERY_IMAGE_WIDTHS, fullWidth: true })).toEqual([
      320, 480, 640, 800, 960, 1080, 1280, 1600, 1920, 2560, 3000,
    ]);
  });

  it('makes 1080 px files for page pictures and the gallery only (ADR-067)', () => {
    expect(renditionWidths(2000)).not.toContain(1080);
    expect(renditionWidths(1600, { widths: WIDE_IMAGE_WIDTHS, fullWidth: true })).toEqual([
      320, 480, 640, 800, 960, 1080, 1280, 1600,
    ]);
    // A picture between 960 and 1080 px keeps its own width instead.
    expect(renditionWidths(1000, { widths: GALLERY_IMAGE_WIDTHS, fullWidth: true })).toEqual([
      320, 480, 640, 800, 960, 1000,
    ]);
  });

  it("keeps a page picture's own width when it falls between two", () => {
    expect(renditionWidths(2400, { widths: WIDE_IMAGE_WIDTHS, fullWidth: true })).toEqual([
      320, 480, 640, 800, 960, 1080, 1280, 1600, 1920, 2400,
    ]);
    expect(renditionWidths(1080, { widths: WIDE_IMAGE_WIDTHS, fullWidth: true })).toEqual([
      320, 480, 640, 800, 960, 1080,
    ]);
  });

  it('never enlarges: a small picture keeps its own width', () => {
    expect(renditionWidths(292)).toEqual([292]);
    expect(renditionWidths(750)).toEqual([320, 480, 640]);
    expect(renditionWidths(800)).toEqual([320, 480, 640, 800]);
  });
});

describe('renderRenditions', () => {
  it('scales a WebP upload from its decoded pixels, not with libwebp’s softer scaler', async () => {
    const pixels = await sharp({
      create: {
        width: 1200,
        height: 300,
        channels: 3,
        background: '#000000',
        noise: { type: 'gaussian', mean: 128, sigma: 50 },
      },
    })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const upload = await sharp(pixels.data, { raw: pixels.info })
      .webp({ lossless: true })
      .toBuffer();

    const [rendition] = await renderRenditions(upload, [800]);

    const expected = await sharp(pixels.data, { raw: pixels.info })
      .resize({ width: 800 })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    expect(rendition!.data.equals(expected)).toBe(true);
  });

  it("gives a file made from one of a picture's renditions the picture's proportions", async () => {
    const rendition = await sharp({
      create: { width: 960, height: 495, channels: 3, background: '#4a7f3a' },
    })
      .webp()
      .toBuffer();
    // A 1600 × 825 picture: its 800 px file is 413 px tall (412 from the 960 × 495 file alone).
    const [made] = await renderRenditions(rendition, [800], { width: 1600, height: 825 });
    expect(await sharp(made!.data).metadata()).toMatchObject({ width: 800, height: 413 });
  });
});

describe('the uploads folder', () => {
  const key = 'visuals/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b/AbCdEfGhIjKl';
  let uploads: string;

  beforeEach(() => {
    uploads = mkdtempSync(join(tmpdir(), 'image-store-'));
  });
  afterEach(() => {
    rmSync(uploads, { recursive: true, force: true });
  });

  it('adds a file only where none is, and never replaces one', async () => {
    const store = imageStore({ uploadsDir: uploads });
    expect(await store.exists(key, '800.webp')).toBe(false);

    expect(await store.saveNew(key, '800.webp', Buffer.from('first'), 'image/webp')).toBe(true);
    expect(await store.saveNew(key, '800.webp', Buffer.from('second'), 'image/webp')).toBe(false);

    expect(await store.exists(key, '800.webp')).toBe(true);
    expect(readFileSync(join(uploads, key, '800.webp'), 'utf8')).toBe('first');
    // Nothing is left beside it from the writes.
    expect(readdirSync(join(uploads, key))).toEqual(['800.webp']);
  });

  it('refuses names outside the stored files', async () => {
    const store = imageStore({ uploadsDir: uploads });
    await expect(
      store.saveNew('../outside', '800.webp', Buffer.from('x'), 'image/webp'),
    ).rejects.toThrow(/unsafe/);
    await expect(store.saveNew(key, '../800.webp', Buffer.from('x'), 'image/webp')).rejects.toThrow(
      /unsafe/,
    );
    expect(await store.exists(key, '../../etc/passwd')).toBe(false);
  });
});
