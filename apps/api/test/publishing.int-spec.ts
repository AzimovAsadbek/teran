import './helpers/without-video-tools.js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import {
  articleDetailSchema,
  articleSummarySchema,
  categorySchema,
  collectionSchema,
  productDetailSchema,
  type AdminArticle,
  type AdminMediaItem,
  type MediaUploadSession,
  type AdminProductDetail,
  type AdminTaxonomy,
  type ArticleUpsertInput,
  type ProductUpsertInput,
  type TaxonomyUpsertInput,
  type UserRole,
} from '@teran/contracts';
import { createTestApp, type TestApp } from './helpers/app.js';
import { TEST_PASSWORD, createUser, resetDatabase } from './helpers/fixtures.js';
import { testImage, uploadFilm, waitForFilm } from './helpers/publishing.js';

const API = '/api/v1';

function taxonomy(slug: string, overrides: Partial<TaxonomyUpsertInput> = {}): TaxonomyUpsertInput {
  return {
    slug,
    position: 0,
    isActive: true,
    illustrationKey: null,
    parentId: null,
    translations: { uz: { name: `${slug} nomi` }, ru: null, en: null },
    ...overrides,
  };
}

function product(
  categoryId: string,
  overrides: Partial<ProductUpsertInput> = {},
): ProductUpsertInput {
  return {
    slug: 'pictured-tea',
    status: 'DRAFT',
    categoryId,
    format: 'LOOSE_LEAF',
    isFeatured: false,
    caffeineLevel: null,
    brewTempCelsius: null,
    brewTimeMinSeconds: null,
    brewTimeMaxSeconds: null,
    brewAmountGrams: null,
    illustrationKey: null,
    collectionIds: [],
    translations: { uz: { name: 'Rasmli choy' }, ru: { name: 'Чай с фото' }, en: null },
    variants: [
      {
        sku: 'PIC-100',
        weightGrams: 100,
        unitCount: null,
        price: '45000',
        compareAtPrice: null,
        lowStockThreshold: 2,
        barcode: null,
        isActive: true,
        initialStock: 5,
      },
    ],
    ...overrides,
  };
}

function article(overrides: Partial<ArticleUpsertInput> = {}): ArticleUpsertInput {
  return {
    slug: 'harvest-notes',
    status: 'DRAFT',
    illustrationKey: null,
    translations: {
      uz: {
        title: 'Hosil haqida',
        excerpt: 'Qisqa mazmun.',
        body: 'Bu maqolaning matni yigirma belgidan uzunroq.',
      },
      ru: null,
      en: null,
    },
    ...overrides,
  };
}

describe('publishing workflow', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
  });

  const server = () => ctx.app.getHttpServer();
  const anonymous = () => request(server());

  async function signedIn(role: UserRole = 'MANAGER') {
    const user = await createUser(ctx.prisma, role);
    const agent = request.agent(server());
    await agent
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: TEST_PASSWORD })
      .expect(200);
    return agent;
  }

  async function category(agent: request.Agent, slug: string, overrides = {}) {
    return (await agent.post(`${API}/admin/categories`).send(taxonomy(slug, overrides)).expect(201))
      .body as AdminTaxonomy;
  }

  async function upload(agent: request.Agent, path: string, shade: number, status = 201) {
    return agent
      .post(`${API}${path}`)
      .attach('file', await testImage(420, shade), {
        filename: 'picture.png',
        contentType: 'image/png',
      })
      .expect(status);
  }

  describe('product images', () => {
    it('keeps alternative text per language, replaces files in place and refuses duplicates', async () => {
      const admin = await signedIn();
      const tea = await category(admin, 'tea');
      const draft = (await admin.post(`${API}/admin/products`).send(product(tea.id)).expect(201))
        .body as AdminProductDetail;
      const first = (await upload(admin, `/admin/products/${draft.id}/images`, 10))
        .body as AdminProductDetail;
      const second = (await upload(admin, `/admin/products/${draft.id}/images`, 20))
        .body as AdminProductDetail;
      expect(second.images).toHaveLength(2);

      // The same file twice is refused.
      const twice = await upload(admin, `/admin/products/${draft.id}/images`, 20, 409);
      expect(twice.body.details).toEqual({ reason: 'duplicate_image' });

      // Alternative text per language; the storefront reads the visitor's own language.
      const [main] = first.images;
      const withAlt = (
        await admin
          .put(`${API}/admin/products/${draft.id}/images/${main!.id}/alt`)
          .send({ uz: 'TERAN qadogʻi, old tomoni', ru: 'Упаковка TERAN, лицевая сторона' })
          .expect(200)
      ).body as AdminProductDetail;
      expect(withAlt.images[0]?.altTexts).toEqual({
        uz: 'TERAN qadogʻi, old tomoni',
        ru: 'Упаковка TERAN, лицевая сторона',
        en: null,
      });

      // Replacing a file keeps its place and its text; the old renditions are removed.
      const before = await ctx.prisma.productImage.findUniqueOrThrow({ where: { id: main!.id } });
      const replaced = (
        await admin
          .post(`${API}/admin/products/${draft.id}/images/${main!.id}/file`)
          .attach('file', await testImage(500, 30), {
            filename: 'new.png',
            contentType: 'image/png',
          })
          .expect(201)
      ).body as AdminProductDetail;
      expect(replaced.images[0]?.id).toBe(main!.id);
      expect(replaced.images[0]?.altTexts.uz).toBe('TERAN qadogʻi, old tomoni');
      const after = await ctx.prisma.productImage.findUniqueOrThrow({ where: { id: main!.id } });
      expect(after.storageKey).not.toBe(before.storageKey);

      await admin
        .put(`${API}/admin/products/${draft.id}`)
        .send(
          product(tea.id, {
            status: 'ACTIVE',
            variants: [{ ...product(tea.id).variants[0]!, id: draft.variants[0]!.id }],
          }),
        )
        .expect(200);
      const english = productDetailSchema.parse(
        (await anonymous().get(`${API}/catalog/products/pictured-tea?locale=en`).expect(200)).body,
      );
      expect(english.images[0]?.alt).toBe('Rasmli choy');
      const russian = productDetailSchema.parse(
        (await anonymous().get(`${API}/catalog/products/pictured-tea?locale=ru`).expect(200)).body,
      );
      expect(russian.images[0]?.alt).toBe('Упаковка TERAN, лицевая сторона');

      // An active product keeps at least one image.
      await admin
        .delete(`${API}/admin/products/${draft.id}/images/${second.images[1]!.id}`)
        .expect(200);
      const last = await admin
        .delete(`${API}/admin/products/${draft.id}/images/${main!.id}`)
        .expect(409);
      expect(last.body).toMatchObject({
        code: 'PUBLICATION_BLOCKED',
        details: { reason: 'last_image_of_active_product' },
      });
    });

    it('refuses to publish a product without a sellable price', async () => {
      const admin = await signedIn();
      const tea = await category(admin, 'tea');
      const draft = (await admin.post(`${API}/admin/products`).send(product(tea.id)).expect(201))
        .body as AdminProductDetail;
      await upload(admin, `/admin/products/${draft.id}/images`, 40);
      const free = product(tea.id, {
        status: 'ACTIVE',
        variants: [{ ...product(tea.id).variants[0]!, id: draft.variants[0]!.id, price: '0' }],
      });
      const refused = await admin.put(`${API}/admin/products/${draft.id}`).send(free).expect(422);
      expect(refused.body.details.missing).toEqual(['price']);
    });
  });

  describe('category and collection covers', () => {
    it('shows the assigned cover or nothing at all, never another item’s picture', async () => {
      const admin = await signedIn();
      const tea = await category(admin, 'tea');
      const coffee = await category(admin, 'coffee', { position: 1 });
      // Both categories have a visible product with a picture.
      for (const [index, entry] of [tea, coffee].entries()) {
        const draft = (
          await admin
            .post(`${API}/admin/products`)
            .send(
              product(entry.id, {
                slug: `item-${index}`,
                variants: [{ ...product(entry.id).variants[0]!, sku: `ITEM-${index}` }],
              }),
            )
            .expect(201)
        ).body as AdminProductDetail;
        await upload(admin, `/admin/products/${draft.id}/images`, 50 + index);
        await admin
          .put(`${API}/admin/products/${draft.id}`)
          .send(
            product(entry.id, {
              slug: `item-${index}`,
              status: 'ACTIVE',
              variants: [
                {
                  ...product(entry.id).variants[0]!,
                  sku: `ITEM-${index}`,
                  id: draft.variants[0]!.id,
                },
              ],
            }),
          )
          .expect(200);
      }

      const coverSet = (await upload(admin, `/admin/categories/${coffee.id}/image`, 60))
        .body as AdminTaxonomy;
      expect(coverSet.image?.src).toMatch(/^\/uploads\/categories\//);
      await admin
        .put(`${API}/admin/categories/${coffee.id}`)
        .send(
          taxonomy('coffee', {
            position: 1,
            translations: {
              uz: { name: 'Qahva', imageAlt: 'Qovurilgan qahva donlari' },
              ru: null,
              en: null,
            },
          }),
        )
        .expect(200);

      const list = categorySchema
        .array()
        .parse((await anonymous().get(`${API}/catalog/categories?locale=uz`).expect(200)).body);
      const bySlug = new Map(list.map((entry) => [entry.slug, entry]));
      expect(bySlug.get('coffee')?.image).toMatchObject({
        src: coverSet.image!.src,
        alt: 'Qovurilgan qahva donlari',
      });
      // Tea has pictured products but no cover of its own: the storefront shows a neutral visual.
      expect(bySlug.get('tea')?.image).toBeNull();

      const removed = (await admin.delete(`${API}/admin/categories/${coffee.id}/image`).expect(200))
        .body as AdminTaxonomy;
      expect(removed.image).toBeNull();

      const collection = (
        await admin.post(`${API}/admin/collections`).send(taxonomy('evening')).expect(201)
      ).body as AdminTaxonomy;
      expect(collection.readiness.items.find((item) => item.code === 'image')).toMatchObject({
        ok: false,
        required: false,
      });
      await upload(admin, `/admin/collections/${collection.id}/image`, 70);
      const collections = collectionSchema
        .array()
        .parse((await anonymous().get(`${API}/catalog/collections?locale=uz`).expect(200)).body);
      expect(collections[0]?.image?.src).toMatch(/^\/uploads\/collections\//);
    });

    it('hides the products of a hidden category everywhere', async () => {
      const admin = await signedIn();
      const hidden = await category(admin, 'seasonal');
      const draft = (await admin.post(`${API}/admin/products`).send(product(hidden.id)).expect(201))
        .body as AdminProductDetail;
      await upload(admin, `/admin/products/${draft.id}/images`, 80);
      await admin
        .put(`${API}/admin/products/${draft.id}`)
        .send(
          product(hidden.id, {
            status: 'ACTIVE',
            variants: [{ ...product(hidden.id).variants[0]!, id: draft.variants[0]!.id }],
          }),
        )
        .expect(200);
      await anonymous().get(`${API}/catalog/products/pictured-tea?locale=uz`).expect(200);

      await admin
        .put(`${API}/admin/categories/${hidden.id}`)
        .send(taxonomy('seasonal', { isActive: false }))
        .expect(200);
      await anonymous().get(`${API}/catalog/products/pictured-tea?locale=uz`).expect(404);
      const listed = (await anonymous().get(`${API}/catalog/products?locale=uz`).expect(200))
        .body as {
        total: number;
      };
      expect(listed.total).toBe(0);
      const sitemap = (await anonymous().get(`${API}/catalog/sitemap`).expect(200)).body as {
        products: unknown[];
      };
      expect(sitemap.products).toEqual([]);
    });
  });

  describe('journal articles', () => {
    it('publishes only complete articles, with a cover, schedule, featuring and redirects', async () => {
      const admin = await signedIn();
      const draft = (await admin.post(`${API}/admin/articles`).send(article()).expect(201))
        .body as AdminArticle;
      expect(draft.readiness.items.find((item) => item.code === 'cover')).toMatchObject({
        ok: false,
        required: true,
      });
      const blocked = await admin
        .put(`${API}/admin/articles/${draft.id}`)
        .send(article({ status: 'PUBLISHED' }))
        .expect(422);
      expect(blocked.body.details.missing).toEqual(['cover']);

      const withCover = (await upload(admin, `/admin/articles/${draft.id}/cover`, 90))
        .body as AdminArticle;
      expect(withCover.cover?.src).toMatch(/^\/uploads\/articles\//);
      // A journal card shows a slice of its cover: the file is kept at its own width too.
      expect(withCover.cover?.widths).toEqual([320, 420]);
      const published = (
        await admin
          .put(`${API}/admin/articles/${draft.id}`)
          .send(
            article({
              status: 'PUBLISHED',
              isFeatured: true,
              translations: {
                uz: {
                  title: 'Hosil haqida',
                  excerpt: 'Qisqa mazmun.',
                  body: 'Bu maqolaning matni yigirma belgidan uzunroq.',
                  coverAlt: 'Choy bargi yaqindan',
                },
                ru: null,
                en: null,
              },
            }),
          )
          .expect(200)
      ).body as AdminArticle;
      expect(published.readiness.ready).toBe(true);
      expect(published.publishedAt).not.toBeNull();

      // A published article keeps its cover.
      const keep = await admin.delete(`${API}/admin/articles/${draft.id}/cover`).expect(409);
      expect(keep.body.details.reason).toBe('cover_of_published_article');

      // A second, scheduled article stays off the site until its date.
      const later = (
        await admin
          .post(`${API}/admin/articles`)
          .send(article({ slug: 'coming-soon' }))
          .expect(201)
      ).body as AdminArticle;
      await upload(admin, `/admin/articles/${later.id}/cover`, 95);
      await admin
        .put(`${API}/admin/articles/${later.id}`)
        .send(
          article({
            slug: 'coming-soon',
            status: 'PUBLISHED',
            publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
          }),
        )
        .expect(200);

      const list = (
        await anonymous().get(`${API}/content/articles?locale=uz&featuredFirst=true`).expect(200)
      ).body as { items: unknown[] };
      const items = list.items.map((item) => articleSummarySchema.parse(item));
      expect(items.map((item) => [item.slug, item.isFeatured])).toEqual([['harvest-notes', true]]);
      expect(items[0]?.cover).toMatchObject({ alt: 'Choy bargi yaqindan' });

      // Renamed: the old address redirects to the new one.
      await admin
        .put(`${API}/admin/articles/${draft.id}`)
        .send(article({ slug: 'harvest-story', status: 'PUBLISHED', isFeatured: true }))
        .expect(200);
      expect(
        (await anonymous().get(`${API}/content/articles/redirects/harvest-notes`).expect(200)).body,
      ).toEqual({ slug: 'harvest-story' });

      // Archived: off the site, kept in the admin area.
      await admin
        .put(`${API}/admin/articles/${draft.id}`)
        .send(article({ slug: 'harvest-story', status: 'ARCHIVED' }))
        .expect(200);
      await anonymous().get(`${API}/content/articles/harvest-story?locale=uz`).expect(404);
      await anonymous().get(`${API}/content/articles/redirects/harvest-notes`).expect(404);
    });

    it('previews a draft exactly as its page would show it, to staff only', async () => {
      const admin = await signedIn();
      const draft = (await admin.post(`${API}/admin/articles`).send(article()).expect(201))
        .body as AdminArticle;
      await upload(admin, `/admin/articles/${draft.id}/cover`, 70);
      const preview = articleDetailSchema.parse(
        (await admin.get(`${API}/admin/articles/${draft.id}/preview?locale=ru`).expect(200)).body,
      );
      // Russian is empty: the Uzbek text stands in, as on the site, and the article says so.
      expect(preview).toMatchObject({ slug: 'harvest-notes', title: 'Hosil haqida' });
      expect(preview.locales).toEqual(['uz']);
      expect(preview.cover?.src).toMatch(/^\/uploads\/articles\//);
      await anonymous().get(`${API}/content/articles/harvest-notes?locale=uz`).expect(404);
      await anonymous().get(`${API}/admin/articles/${draft.id}/preview`).expect(401);
      const customer = await signedIn('CUSTOMER');
      await customer.get(`${API}/admin/articles/${draft.id}/preview`).expect(403);
    });
  });

  describe('gallery items shown with an article', () => {
    it('reuses chosen photographs and films, in order, showing only published ones', async () => {
      const admin = await signedIn();
      const photo = async (title: string, status: 'DRAFT' | 'PUBLISHED', shade: number) => {
        const item = (
          await admin
            .post(`${API}/admin/media`)
            .send({
              kind: 'PHOTO',
              status: 'DRAFT',
              isFeatured: false,
              videoDurationSeconds: null,
              translations: { uz: { title }, ru: null, en: null },
            })
            .expect(201)
        ).body as AdminMediaItem;
        await upload(admin, `/admin/media/${item.id}/image`, shade);
        if (status === 'PUBLISHED') {
          await admin
            .put(`${API}/admin/media/${item.id}`)
            .send({
              kind: 'PHOTO',
              status,
              isFeatured: false,
              videoDurationSeconds: null,
              translations: { uz: { title }, ru: null, en: null },
            })
            .expect(200);
        }
        return item.id;
      };
      const terraces = await photo('Terrasalar', 'PUBLISHED', 20);
      const sketch = await photo('Qoralama surat', 'DRAFT', 25);
      const draft = (await admin.post(`${API}/admin/articles`).send(article()).expect(201))
        .body as AdminArticle;
      expect(draft.media).toEqual([]);

      const unknown = await admin
        .put(`${API}/admin/articles/${draft.id}`)
        .send(article({ mediaIds: [randomUUID()] }))
        .expect(400);
      expect(unknown.body.details).toEqual({ reason: 'unknown_media' });
      await admin
        .put(`${API}/admin/articles/${draft.id}`)
        .send(article({ mediaIds: [terraces, terraces] }))
        .expect(400);

      await upload(admin, `/admin/articles/${draft.id}/cover`, 30);
      const saved = (
        await admin
          .put(`${API}/admin/articles/${draft.id}`)
          .send(article({ status: 'PUBLISHED', mediaIds: [sketch, terraces] }))
          .expect(200)
      ).body as AdminArticle;
      expect(saved.media.map((item) => [item.title, item.status])).toEqual([
        ['Qoralama surat', 'DRAFT'],
        ['Terrasalar', 'PUBLISHED'],
      ]);
      // Saving without the list keeps it.
      const kept = (
        await admin
          .put(`${API}/admin/articles/${draft.id}`)
          .send(article({ status: 'PUBLISHED' }))
          .expect(200)
      ).body as AdminArticle;
      expect(kept.media).toHaveLength(2);

      const page = articleDetailSchema.parse(
        (await anonymous().get(`${API}/content/articles/harvest-notes?locale=uz`).expect(200)).body,
      );
      expect(page.media.map((item) => item.title)).toEqual(['Terrasalar']);
      expect(page.media[0]?.image.src).toMatch(/^\/uploads\/media\//);

      // Deleting a gallery item removes it from the article as well.
      await admin.delete(`${API}/admin/media/${terraces}`).expect(204);
      const after = (await admin.get(`${API}/admin/articles/${draft.id}`).expect(200))
        .body as AdminArticle;
      expect(after.media.map((item) => item.id)).toEqual([sketch]);
    });
  });

  describe('films uploaded through the API', () => {
    /**
     * An MP4 whose movie box (95 s) follows the media data, as many cameras write it; with `sound`,
     * the movie box also declares a sound track.
     */
    function mp4(seconds: number, sound = false): Buffer {
      const box = (type: string, ...content: Buffer[]) => {
        const body = Buffer.concat(content);
        const header = Buffer.alloc(8);
        header.writeUInt32BE(body.length + 8, 0);
        header.write(type, 4, 'latin1');
        return Buffer.concat([header, body]);
      };
      const mvhd = Buffer.alloc(100);
      mvhd.writeUInt32BE(1000, 12);
      mvhd.writeUInt32BE(seconds * 1000, 16);
      const track = (handler: string) =>
        box('trak', box('mdia', box('hdlr', Buffer.alloc(8), Buffer.from(handler, 'latin1'))));
      return Buffer.concat([
        box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1')),
        box('mdat', Buffer.alloc(256 * 1024)),
        box('moov', box('mvhd', mvhd), track('vide'), ...(sound ? [track('soun')] : [])),
      ]);
    }

    it('takes a film through the API, reads its running time and refuses customers', async () => {
      const admin = await signedIn();
      const film = (
        await admin
          .post(`${API}/admin/media`)
          .send({
            kind: 'VIDEO',
            status: 'DRAFT',
            isFeatured: false,
            videoDurationSeconds: null,
            translations: { uz: { title: 'Bogʻda tong' }, ru: null, en: null },
          })
          .expect(201)
      ).body as AdminMediaItem;

      // Sent in pieces; its index (`moov`) comes after the pictures and is read from disk (ADR-061).
      const real = mp4(95);
      const uploaded = await uploadFilm(admin, film.id, real, { pieceBytes: 64 * 1024 });
      // Handed over at once, then made ready in the background (ADR-062).
      expect(uploaded.status).toBe(202);
      // On its way: waiting its turn, or already taken by the worker.
      expect(['waiting', 'working']).toContain((uploaded.body as AdminMediaItem).videoJob?.state);
      const done = await waitForFilm(admin, film.id);
      expect(done.videoJob).toBeNull();
      expect(done.video).toMatchObject({ type: 'video/mp4', bytes: real.length, hasAudio: false });
      expect(done.video?.src).toMatch(
        new RegExp(`^/uploads/media/${film.id}/[A-Za-z0-9_-]{12}/video\\.mp4$`),
      );
      expect(done.videoDurationSeconds).toBe(95);

      // A film with a sound track says so (the feed then offers its sound, ADR-058).
      expect((await uploadFilm(admin, film.id, mp4(95, true))).status).toBe(202);
      expect((await waitForFilm(admin, film.id)).video?.hasAudio).toBe(true);

      const customer = await signedIn('CUSTOMER');
      await customer
        .post(`${API}/admin/media/${film.id}/video/uploads`)
        .send({ size: 10 })
        .expect(403);
    });

    it('refuses an iPhone film where the server has no ffmpeg to make an MP4 of it', async () => {
      const admin = await signedIn();
      const short = (
        await admin
          .post(`${API}/admin/media`)
          .send({
            kind: 'SHORT',
            status: 'DRAFT',
            isFeatured: true,
            videoDurationSeconds: null,
            translations: { uz: { title: 'iPhone' }, ru: null, en: null },
          })
          .expect(201)
      ).body as AdminMediaItem;
      const quicktime = readFileSync(
        new URL('./fixtures/iphone-h264-upright.mov', import.meta.url),
      );
      expect((await uploadFilm(admin, short.id, quicktime)).status).toBe(202);
      expect((await waitForFilm(admin, short.id)).videoJob).toEqual({
        state: 'failed',
        percent: null,
        reason: 'video_conversion_unavailable',
      });
    });

    it('goes on after a lost piece, refuses pieces out of turn and keeps nothing it was not sent', async () => {
      const admin = await signedIn();
      const film = (
        await admin
          .post(`${API}/admin/media`)
          .send({
            kind: 'SHORT',
            status: 'DRAFT',
            isFeatured: false,
            videoDurationSeconds: null,
            translations: { uz: { title: 'Bugʻ' }, ru: null, en: null },
          })
          .expect(201)
      ).body as AdminMediaItem;
      const file = mp4(12);
      const base = `${API}/admin/media/${film.id}/video/uploads`;
      const piece = (id: string, offset: number, bytes: Buffer) =>
        admin
          .put(`${base}/${id}?offset=${offset}`)
          .set('Content-Type', 'application/octet-stream')
          .send(bytes);

      const session = (await admin.post(base).send({ size: file.length }).expect(201))
        .body as MediaUploadSession;
      expect(session).toMatchObject({ size: file.length, received: 0 });
      const half = Math.floor(file.length / 2);
      await piece(session.id, 0, file.subarray(0, half)).expect(200);

      // A piece sent again, or ahead of what the API has: refused, saying where to go on.
      const twice = await piece(session.id, 0, file.subarray(0, half)).expect(409);
      expect(twice.body.details).toEqual({ reason: 'upload_offset', received: half });
      await piece(session.id, half + 10, file.subarray(half + 10)).expect(409);
      // Not complete yet: nothing is kept.
      const early = await admin.post(`${base}/${session.id}/complete`).expect(409);
      expect(early.body.details).toEqual({ reason: 'upload_incomplete', received: half });

      // After a lost connection the client asks how far it got, and sends the rest.
      const status = (await admin.get(`${base}/${session.id}`).expect(200))
        .body as MediaUploadSession;
      expect(status.received).toBe(half);
      await piece(session.id, half, file.subarray(half)).expect(200);
      await admin.post(`${base}/${session.id}/complete`).expect(202);
      const kept = await waitForFilm(admin, film.id);
      expect(kept.video).toMatchObject({ bytes: file.length, type: 'video/mp4' });
      expect(kept.videoDurationSeconds).toBe(12);
      // A finished upload is gone; so is a cancelled one.
      await admin.get(`${base}/${session.id}`).expect(404);
      const cancelled = (await admin.post(base).send({ size: 100 }).expect(201))
        .body as MediaUploadSession;
      await admin.delete(`${base}/${cancelled.id}`).expect(204);
      await admin.get(`${base}/${cancelled.id}`).expect(404);

      // Pieces are bytes, and only a film has a file.
      await admin
        .put(`${base}/${cancelled.id}?offset=0`)
        .set('Content-Type', 'application/json')
        .send({ not: 'bytes' })
        .expect(400);
      const photo = (
        await admin
          .post(`${API}/admin/media`)
          .send({
            kind: 'PHOTO',
            status: 'DRAFT',
            isFeatured: false,
            videoDurationSeconds: null,
            translations: { uz: { title: 'Choy' }, ru: null, en: null },
          })
          .expect(201)
      ).body as AdminMediaItem;
      await admin
        .post(`${API}/admin/media/${photo.id}/video/uploads`)
        .send({ size: 10 })
        .expect(400);
    });

    it('makes a film ready once when its hand-over is asked for twice', async () => {
      const admin = await signedIn();
      const film = (
        await admin
          .post(`${API}/admin/media`)
          .send({
            kind: 'VIDEO',
            status: 'DRAFT',
            isFeatured: false,
            videoDurationSeconds: null,
            translations: { uz: { title: 'Choy bogʻi' }, ru: null, en: null },
          })
          .expect(201)
      ).body as AdminMediaItem;
      const file = mp4(30, true);
      const base = `${API}/admin/media/${film.id}/video/uploads`;
      const session = (await admin.post(base).send({ size: file.length }).expect(201))
        .body as MediaUploadSession;
      await admin
        .put(`${base}/${session.id}?offset=0`)
        .set('Content-Type', 'application/octet-stream')
        .send(file)
        .expect(200);

      // The browser asks again when an answer is lost: both answers say the film is on its way,
      // and the film is made ready once.
      const answers = await Promise.all([
        admin.post(`${base}/${session.id}/complete`),
        admin.post(`${base}/${session.id}/complete`),
      ]);
      expect(answers.map((answer) => answer.status)).toEqual([202, 202]);
      // Handed over: it can no longer be cancelled.
      const late = await admin.delete(`${base}/${session.id}`);
      expect([404, 409]).toContain(late.status);
      const kept = await waitForFilm(admin, film.id);
      expect(kept.video).toMatchObject({ bytes: file.length, hasAudio: true });
      const audit = await ctx.prisma.auditLog.count({
        where: { action: 'media.video', entityId: film.id },
      });
      expect(audit).toBe(1);
      // Kept: the upload is gone.
      await admin.delete(`${base}/${session.id}`).expect(404);
    });
  });
});
