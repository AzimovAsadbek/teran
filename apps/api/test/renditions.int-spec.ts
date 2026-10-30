import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { imageStore, storeImage, type StoredImage } from '../src/media/image-processing.js';
import { recordWidths, storedPictures } from '../src/media/renditions.js';
import { createTestApp, type TestApp } from './helpers/app.js';
import { createCategory, createProduct, resetDatabase } from './helpers/fixtures.js';
import { TEST_DATABASE_URL, TEST_ENV } from './test-env.js';

const API = '/api/v1';
/** The widths pictures got before 800 px was added (ADR-065). */
const BEFORE = [320, 480, 640, 960, 1280, 1600];
const WIDE_BEFORE = { widths: [...BEFORE, 1920, 2560, 3200, 3840, 5120], fullWidth: true };
const GALLERY_BEFORE = { widths: [...BEFORE, 1920, 2560, 3840], fullWidth: true };

describe('adding missing renditions to stored pictures (scripts/add-renditions.ts)', () => {
  let ctx: TestApp;
  const server = () => ctx.app.getHttpServer();
  const uploads = join(TEST_ENV.UPLOADS_DIR!, `renditions-${Date.now().toString(36)}`);
  const store = imageStore({ uploadsDir: uploads });
  const pictures: Record<string, StoredImage> = {};

  /** The script as an operator runs it: its own process, never the developer's apps/api/.env. */
  function run(...args: string[]): { status: number; output: string } {
    try {
      const output = execFileSync('node_modules/.bin/tsx', ['scripts/add-renditions.ts', ...args], {
        encoding: 'utf8',
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          DOTENV_CONFIG_PATH: '/dev/null',
          DATABASE_URL: TEST_DATABASE_URL,
          UPLOADS_DIR: uploads,
        },
      });
      return { status: 0, output };
    } catch (error) {
      const failed = error as { status: number; stdout: string };
      return { status: failed.status, output: failed.stdout };
    }
  }

  /** A photograph-like picture (noise: its files have detail), stored as before ADR-065. */
  async function picture(
    width: number,
    height: number,
    prefix: string,
    options: { widths: number[]; fullWidth?: boolean } = { widths: BEFORE },
  ) {
    const input = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: '#000000',
        noise: { type: 'gaussian', mean: 120, sigma: 40 },
      },
    })
      .png()
      .toBuffer();
    return storeImage(input, store, prefix, options);
  }
  const file = (image: StoredImage, width: number) =>
    join(uploads, image.storageKey, `${width}.webp`);
  const columns = (image: StoredImage) => ({
    imageKey: image.storageKey,
    imageWidths: image.widths,
    imageWidth: image.width,
    imageHeight: image.height,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
    const { prisma } = ctx;
    const category = await createCategory(prisma);
    const product = await createProduct(prisma, { categoryId: category.id, slug: 'sencha' });

    pictures.product = await picture(1700, 1700, `products/${product.id}`);
    await prisma.productImage.create({
      data: {
        productId: product.id,
        storageKey: pictures.product.storageKey,
        widths: pictures.product.widths,
        width: 1700,
        height: 1700,
      },
    });
    pictures.category = await picture(1200, 900, `categories/${category.id}`);
    await prisma.category.update({ where: { id: category.id }, data: columns(pictures.category) });
    // Narrower than 800 px: it has every width it can have.
    const collection = await prisma.collection.create({ data: { slug: 'gifts' } });
    pictures.collection = await picture(700, 700, `collections/${collection.id}`);
    await prisma.collection.update({
      where: { id: collection.id },
      data: columns(pictures.collection),
    });
    const article = await prisma.article.create({ data: { slug: 'brewing' } });
    pictures.article = await picture(2400, 1600, `articles/${article.id}`, WIDE_BEFORE);
    await prisma.article.update({
      where: { id: article.id },
      data: {
        coverKey: pictures.article.storageKey,
        coverWidths: pictures.article.widths,
        coverWidth: 2400,
        coverHeight: 1600,
      },
    });
    const item = await prisma.mediaItem.create({ data: { kind: 'PHOTO' } });
    pictures.gallery = await picture(2000, 1500, `media/${item.id}`, GALLERY_BEFORE);
    await prisma.mediaItem.update({ where: { id: item.id }, data: columns(pictures.gallery) });
    // The catalogue banner: a wide picture and the phone crop, as the first view's (1080 px).
    pictures.banner = await picture(
      3000,
      600,
      'visuals/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a50',
      WIDE_BEFORE,
    );
    pictures.phone = await picture(
      1080,
      1440,
      'visuals/0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a51',
      WIDE_BEFORE,
    );
    const picked = (image: StoredImage) => ({
      key: image.storageKey,
      widths: image.widths,
      width: image.width,
      height: image.height,
    });
    await prisma.siteSetting.create({
      data: {
        key: 'visuals',
        value: {
          'banner:catalog': {
            image: picked(pictures.banner),
            mobile: picked(pictures.phone),
            video: null,
            mobileVideo: null,
            source: 'https://example.com/banner.jpg',
          },
        },
      },
    });

    // An earlier run stopped after storing the article's file, before recording it.
    writeFileSync(
      file(pictures.article, 800),
      await sharp({ create: { width: 800, height: 533, channels: 3, background: '#2f5d2a' } })
        .webp()
        .toBuffer(),
    );
  }, 60_000);

  afterAll(async () => {
    await ctx.close();
    rmSync(uploads, { recursive: true, force: true });
  });

  it('lists what it would add without writing anything', async () => {
    const before = await ctx.prisma.productImage.findFirstOrThrow();

    const { status, output } = run();

    expect(status).toBe(0);
    expect(output).toContain('Dry run: nothing is written');
    expect(output).toMatch(/product sencha #1 \(1700×1700, products\/[^)]+\): \+ 800 from 1600/);
    // The narrowest file at least twice as wide, else the widest one; 1080 px for page
    // pictures, covers and the gallery only (ADR-067).
    expect(output).toMatch(/category [^:]+: \+ 800 from 960\n/);
    expect(output).toMatch(/gallery photo [^:]+: \+ 800 from 1600; \+ 1080 from 2000\n/);
    expect(output).toMatch(
      /page picture banner:catalog \(3000×600[^)]+\): \+ 800 from 1600; \+ 1080 from 2560\n/,
    );
    expect(output).toMatch(
      /page picture banner:catalog \(phone crop\) \(1080×1440[^)]+\): \+ 800 from 1080\n/,
    );
    expect(output).toMatch(
      /article brewing [^:]+: 800 already stored \(would only be recorded\); \+ 1080 from 2400\n/,
    );
    expect(output).not.toContain('collection gifts');
    expect(output).toContain('7 pictures: 1 have every width; 9 rendition(s) to make.');

    for (const name of ['product', 'category', 'gallery', 'banner', 'phone']) {
      expect(existsSync(file(pictures[name]!, 800))).toBe(false);
    }
    expect(await ctx.prisma.productImage.findFirstOrThrow()).toEqual(before);
  });

  it('adds the files, records them, and the API then offers 800 px files', async () => {
    const { prisma } = ctx;
    const kept = readFileSync(file(pictures.article!, 800));
    const lastChanges = async () => ({
      category: (await prisma.category.findFirstOrThrow({ where: { imageKey: { not: null } } }))
        .updatedAt,
      article: (await prisma.article.findFirstOrThrow()).updatedAt,
      gallery: (await prisma.mediaItem.findFirstOrThrow()).updatedAt,
      visuals: (await prisma.siteSetting.findUniqueOrThrow({ where: { key: 'visuals' } }))
        .updatedAt,
    });
    const changedBefore = await lastChanges();

    const { status, output } = run('--apply');

    expect(status).toBe(0);
    expect(output).toContain('8 file(s) added');
    expect(output).toContain('1 already stored; 6 picture(s) recorded.');
    const made = [
      ['product', 800],
      ['category', 800],
      ['gallery', 800],
      ['gallery', 1080],
      ['banner', 800],
      ['banner', 1080],
      ['phone', 800],
      ['article', 1080],
    ] as const;
    for (const [name, width] of made) {
      const image = pictures[name]!;
      expect(await sharp(file(image, width)).metadata()).toMatchObject({
        format: 'webp',
        width,
        height: Math.round((image.height * width) / image.width),
      });
    }
    // The file found there is kept as it was, and recorded.
    expect(readFileSync(file(pictures.article!, 800)).equals(kept)).toBe(true);
    // A file added beside the others is no change to the page: each row keeps its last change,
    // so the sitemap's lastmod stays as it was (ADR-067).
    expect(await lastChanges()).toEqual(changedBefore);

    expect((await prisma.productImage.findFirstOrThrow()).widths).toEqual([
      320, 480, 640, 800, 960, 1280, 1600,
    ]);
    expect(
      (await prisma.category.findFirstOrThrow({ where: { imageKey: { not: null } } })).imageWidths,
    ).toEqual([320, 480, 640, 800, 960]);
    expect((await prisma.collection.findFirstOrThrow()).imageWidths).toEqual([320, 480, 640]);
    expect((await prisma.article.findFirstOrThrow()).coverWidths).toEqual([
      320, 480, 640, 800, 960, 1080, 1280, 1600, 1920, 2400,
    ]);
    expect((await prisma.mediaItem.findFirstOrThrow()).imageWidths).toEqual([
      320, 480, 640, 800, 960, 1080, 1280, 1600, 1920, 2000,
    ]);
    // Only the widths changed in the page pictures' setting.
    const setting = await prisma.siteSetting.findUniqueOrThrow({ where: { key: 'visuals' } });
    expect(setting.value).toEqual({
      'banner:catalog': {
        image: {
          key: pictures.banner!.storageKey,
          widths: [320, 480, 640, 800, 960, 1080, 1280, 1600, 1920, 2560, 3000],
          width: 3000,
          height: 600,
        },
        mobile: {
          key: pictures.phone!.storageKey,
          widths: [320, 480, 640, 800, 960, 1080],
          width: 1080,
          height: 1440,
        },
        video: null,
        mobileVideo: null,
        source: 'https://example.com/banner.jpg',
      },
    });
    expect(await prisma.auditLog.count({ where: { action: 'media.renditions' } })).toBe(1);

    // What the storefront builds its srcset from.
    const settings = await request(server()).get(`${API}/content/settings?locale=uz`).expect(200);
    expect(settings.body.visuals['banner:catalog'].mobile.widths).toEqual([
      320, 480, 640, 800, 960, 1080,
    ]);
  });

  it('finds nothing more to do when run again, and touches no file', () => {
    const made = file(pictures.product!, 800);
    const { mtimeMs } = statSync(made);

    const { status, output } = run('--apply');

    expect(status).toBe(0);
    expect(output).toContain('7 pictures: 7 have every width; 0 rendition(s) to make.');
    expect(output).toContain('0 file(s) added');
    expect(statSync(made).mtimeMs).toBe(mtimeMs);
  });

  it('leaves a picture changed meanwhile to the next run', async () => {
    const [entry] = (await storedPictures(ctx.prisma)).filter(
      (candidate) => candidate.owner.table === 'productImage',
    );
    // An editor's change between reading and recording (here: its widths).
    await ctx.prisma.productImage.updateMany({ data: { widths: [320, 480] } });

    expect(await recordWidths(ctx.prisma, entry!, [...entry!.picture.widths, 2000])).toBe(false);
    expect((await ctx.prisma.productImage.findFirstOrThrow()).widths).toEqual([320, 480]);
  });

  it('says so, and fails, when a file to make one from is missing', async () => {
    const { prisma } = ctx;
    const product = await prisma.product.findFirstOrThrow();
    const lost = await picture(1700, 1700, `products/${product.id}`);
    await prisma.productImage.create({
      data: {
        productId: product.id,
        storageKey: lost.storageKey,
        widths: lost.widths,
        width: 1700,
        height: 1700,
        position: 1,
      },
    });
    rmSync(file(lost, 1600));

    const { status, output } = run();

    expect(status).toBe(1);
    expect(output).toContain(`product sencha #2: ${lost.storageKey}/1600.webp is not in the store`);
    expect(existsSync(file(lost, 800))).toBe(false);
  });
});
