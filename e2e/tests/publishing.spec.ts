import { expect, test, type Page } from '@playwright/test';
import {
  API,
  PICTURES,
  field,
  pictureFile,
  publishProduct,
  signInAsAdmin,
  staffRequest,
  uploadPicture,
  visible,
} from './support/admin.ts';

/** A 1 × 1 PNG: a real picture, far below the 200 × 200 px minimum. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/** An MP4 whose movie box (95 s) follows the media data; enough for the API's checks. */
function mp4(seconds: number): Buffer {
  const box = (type: string, content: Buffer) => {
    const header = Buffer.alloc(8);
    header.writeUInt32BE(content.length + 8, 0);
    header.write(type, 4, 'latin1');
    return Buffer.concat([header, content]);
  };
  const mvhd = Buffer.alloc(100);
  mvhd.writeUInt32BE(1000, 12);
  mvhd.writeUInt32BE(seconds * 1000, 16);
  return Buffer.concat([
    box('ftyp', Buffer.from('isom\0\0\x02\0isomiso2', 'latin1')),
    box('mdat', Buffer.alloc(64 * 1024)),
    box('moov', box('mvhd', mvhd)),
  ]);
}

const VTT = Buffer.from('WEBVTT\n\n00:00.000 --> 00:03.000\nTongda choy bogʻi\n', 'utf8');

/** A draft product with one pack (published by the tests themselves when they need to). */
function draftProduct(slug: string, categoryId: string) {
  return {
    slug,
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
    translations: {
      uz: { name: `Rasmli choy ${slug}` },
      ru: null,
      en: { name: `Pictured tea ${slug}` },
    },
    variants: [
      {
        sku: `${slug.toUpperCase()}-100`,
        weightGrams: 100,
        unitCount: null,
        price: '47000',
        compareAtPrice: null,
        lowStockThreshold: 2,
        barcode: null,
        isActive: true,
        initialStock: 5,
      },
    ],
  };
}

async function firstCategoryId(page: Page): Promise<string> {
  const categories = (await (await page.request.get(`${API}/admin/categories`)).json()) as {
    id: string;
    slug: string;
  }[];
  return categories.find((category) => category.slug === 'green-tea')?.id ?? categories[0]!.id;
}

test.describe('publishing workflow', () => {
  test('a product’s pictures: chosen, checked, ordered, described and replaced', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsAdmin(page);
    const slug = `e2e-pictures-${Date.now().toString(36)}`;
    const created = await page.request.post(`${API}/admin/products`, {
      data: draftProduct(slug, await firstCategoryId(page)),
    });
    expect(created.status()).toBe(201);
    const { id } = (await created.json()) as { id: string };
    await page.goto(`/en/admin/products/${id}`);

    // Nothing yet: the checklist and the images section say why it cannot go on sale.
    await expect(
      visible(page.getByText('A product can’t go on sale without a main image.', { exact: false })),
    ).toBeVisible();

    // Four files at once: two good pictures, one too small, one that is not a picture.
    await page
      .locator('input[type="file"][multiple]')
      .setInputFiles([
        pictureFile(PICTURES.terraces),
        pictureFile(PICTURES.lake),
        { name: 'tiny.png', mimeType: 'image/png', buffer: TINY_PNG },
        { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a picture at all') },
      ]);
    await expect(
      visible(page.getByText('The picture is too small: it must be at least 200 × 200 px.')),
    ).toBeVisible();
    await expect(
      visible(page.getByText('The file couldn’t be read: it is damaged or not an image.')),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Upload 2 images' }).click();
    const gallery = page
      .getByRole('main')
      .locator('ol')
      .filter({ has: page.locator('img[src*="/uploads/products/"]') });
    await expect(gallery.locator('li')).toHaveCount(2);

    // The same picture again is refused by the server, with the reason.
    await page.locator('input[type="file"][multiple]').setInputFiles(PICTURES.terraces);
    await page.getByRole('button', { name: 'Upload 1 image' }).click();
    await expect(
      visible(page.getByText('This picture is already uploaded for this product.')),
    ).toBeVisible();
    await expect(gallery.locator('li')).toHaveCount(2);

    // The second picture gets an English description and becomes the main one.
    const second = gallery.locator('li').nth(1);
    await second.getByRole('button', { name: 'Edit description' }).click();
    await second.getByLabel('Uzbek').fill('Tong chogʻida koʻl boʻyidagi choy terrasalari');
    await second.getByLabel('English').fill('Tea terraces above a lake at dawn');
    await second.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(second.getByText('Description added')).toBeVisible();
    await second.getByRole('button', { name: 'Make main image' }).click();
    const first = gallery.locator('li').first();
    await expect(first.getByText('Main image', { exact: true })).toBeVisible();
    await expect(first.getByText('Description added')).toBeVisible();

    // Replaced in place: same position, new file.
    const before = await first.locator('img').getAttribute('src');
    await first.locator('input[type="file"]').setInputFiles(PICTURES.sprig);
    await expect(first.locator('img')).not.toHaveAttribute('src', before ?? '');
    await expect(first.getByText('Main image', { exact: true })).toBeVisible();

    // Published, it shows the main picture first, with its description, in the store.
    await field(page, 'Status').selectOption('ACTIVE');
    await visible(page.getByRole('button', { name: 'Save', exact: true })).click();
    await expect(visible(page.getByText('Saved', { exact: true }))).toBeVisible();
    await page.goto(`/en/products/${slug}`);
    const main = page.getByRole('main');
    await expect(
      visible(main.getByRole('img', { name: 'Tea terraces above a lake at dawn' })),
    ).toBeVisible();
    await expect(visible(main.getByRole('heading', { level: 1 }))).toHaveText(
      `Pictured tea ${slug}`,
    );
  });

  test('a category’s own cover appears in the menu and on its page; others keep the TERAN mark', async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto('/en/admin/categories');
    await page.getByRole('button', { name: /^Edit: (Green tea|Yashil choy)$/ }).click();
    const sheet = page.getByRole('dialog');
    await sheet.locator('input[type="file"][accept^="image/"]').setInputFiles(PICTURES.lake);
    await expect(sheet.getByText('Not uploaded yet')).toBeVisible();
    await sheet.getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(sheet.locator('img[src*="/uploads/categories/"]')).toBeVisible();
    await sheet
      .getByLabel(/Picture description/)
      .first()
      .fill('Green tea leaves by a lake');
    await sheet.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // The store's menu shows the cover for this category only.
    await expect(async () => {
      await page.goto('/en/tea/green-tea');
      await expect(
        visible(page.getByRole('main').locator('header img[src*="/uploads/categories/"]')),
      ).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
      'content',
      /\/uploads\/categories\//,
    );
    await page.goto('/en');
    await page.getByRole('button', { name: 'Shop', exact: true }).click();
    const shop = page.locator('[id$="-shop"]');
    await shop.getByRole('link', { name: /Tea/ }).first().hover();
    await expect(shop.locator('img[src*="/uploads/categories/"]').first()).toBeVisible();
    // A category without a cover keeps the neutral mark: no product picture is borrowed.
    await page.goto('/en/tea/black-tea');
    await expect(page.getByRole('main').locator('header img')).toHaveCount(0);
  });

  test('an article goes from draft to published, with a preview and a Telegram dry run', async ({
    page,
    context,
  }) => {
    test.setTimeout(120_000);
    await signInAsAdmin(page);
    await page.goto('/en/admin/journal/new');
    const slug = `e2e-news-${Date.now().toString(36)}`;
    const title = `E2E harvest news ${slug}`;
    await page.locator('[name="uz-title"]').fill(title);
    await page.locator('[name="uz-excerpt"]').fill('A short summary of the spring harvest.');
    await page
      .locator('[name="uz-body"]')
      .fill('The first spring leaves were picked this week.\n\nThey are being dried now.');
    await field(page, 'URL slug').fill(slug);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/journal\/[0-9a-f-]{36}$/);

    // A draft without a cover cannot be published: the editor says what is missing.
    await field(page, 'Status').selectOption('PUBLISHED');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(visible(page.getByText(/Can’t publish yet — missing: Cover image/))).toBeVisible();
    await field(page, 'Status').selectOption('DRAFT');

    await page.locator('#article-cover input[type="file"]').setInputFiles(PICTURES.terraces);
    await page
      .locator('#article-cover')
      .getByRole('button', { name: 'Upload', exact: true })
      .click();
    await expect(page.locator('#article-cover img[src*="/uploads/articles/"]')).toBeVisible();

    // The preview shows the real page while it is still a draft.
    const previewPromise = context.waitForEvent('page');
    await page.getByRole('link', { name: 'Preview', exact: true }).click();
    const preview = await previewPromise;
    await expect(visible(preview.getByRole('heading', { level: 1, name: title }))).toBeVisible();
    await expect(visible(preview.getByText('Not on the site yet'))).toBeVisible();
    await expect(preview.locator('main img[src*="/uploads/articles/"]').first()).toBeVisible();
    await preview.close();
    const reader = await context.newPage();
    await reader.goto(`/en/journal/${slug}`);
    await expect(visible(reader.getByRole('heading', { name: 'Page not found' }))).toBeVisible();

    // A photograph already in the gallery goes with the article (chosen, not uploaded again).
    await page.getByRole('button', { name: 'Choose from the gallery' }).click();
    const chooser = page.getByRole('dialog', { name: 'Choose from the gallery' });
    await chooser.getByRole('group', { name: 'Photos' }).getByRole('checkbox').first().check();
    await chooser.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('#article-media ol > li')).toHaveCount(1);

    // Published with a Telegram announcement: a dry run in this stack, recorded once.
    await field(page, 'Status').selectOption('PUBLISHED');
    await page
      .getByRole('checkbox', { name: 'Send to the Telegram channel when published' })
      .check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(visible(page.getByText('Saved', { exact: true }))).toBeVisible();
    await expect(async () => {
      await page.reload();
      await expect(visible(page.getByText('Test: not sent'))).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 20_000 });

    // Saving again sends nothing more.
    await page
      .locator('[name="uz-excerpt"]')
      .fill('A short summary of the spring harvest, edited.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(visible(page.getByText('Saved', { exact: true }))).toBeVisible();
    await page.goto('/en/admin/telegram');
    await expect(
      visible(page.getByText(/Test mode: posts are composed and recorded/)),
    ).toBeVisible();
    const rows = page.getByRole('row').filter({ hasText: title });
    await expect(rows).toHaveCount(1);
    await rows.getByRole('button', { name: 'Show text' }).click();
    const post = page.getByRole('dialog', { name: title });
    await expect(post.getByText(title).first()).toBeVisible();
    await expect(post.getByRole('link')).toHaveAttribute('href', new RegExp(`/journal/${slug}$`));
    await expect(post.getByText('Composed in test mode: not sent to the channel.')).toBeVisible();

    // On the site: its page with the cover, shared with its cover.
    await expect(async () => {
      await reader.goto(`/en/journal/${slug}`);
      await expect(visible(reader.getByRole('heading', { level: 1, name: title }))).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });
    await expect(reader.locator('main img[src*="/uploads/articles/"]').first()).toBeVisible();
    const band = reader.getByRole('region', { name: 'Photos and videos with this article' });
    await expect(band.getByRole('button', { name: / — enlarge$/ })).toHaveCount(1);
    await expect(reader.locator('meta[property="og:image"]').first()).toHaveAttribute(
      'content',
      /\/uploads\/articles\//,
    );
    await reader.close();
  });

  test('photos and videos have separate pages; a video gets its poster, length and subtitles', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsAdmin(page);
    await page.goto('/en/admin/media?kind=videos');
    await page.getByRole('link', { name: 'New video' }).click();
    const title = `E2E garden film ${Date.now().toString(36)}`;
    await field(page, 'Title').fill(title);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/media\/[0-9a-f-]{36}$/);
    const status = field(page, 'Status');
    await expect(status.locator('option[value="PUBLISHED"]')).toBeDisabled();

    // The video is played here before it is sent; its length is read from the file.
    await page.locator('input[type="file"][accept^="video/"]').setInputFiles({
      name: 'garden.mp4',
      mimeType: 'video/mp4',
      buffer: mp4(95),
    });
    await expect(visible(page.getByText('Not uploaded yet'))).toBeVisible();
    await expect(page.locator('#media-files video[src^="blob:"]')).toHaveCount(1);
    await visible(page.getByRole('button', { name: 'Upload', exact: true })).click();
    await expect(field(page, /^Length/)).toHaveValue('95');
    await expect(page.locator('#media-files video source[src*="/uploads/media/"]')).toHaveCount(1);

    // Poster and subtitles.
    await page
      .locator('#media-files input[type="file"][accept^="image/"]')
      .setInputFiles(PICTURES.lake);
    await page.locator('#media-files').getByRole('button', { name: 'Upload', exact: true }).click();
    await expect(page.locator('#media-files img[src*="/uploads/media/"]')).toBeVisible();
    await page.locator('#media-files input[type="file"][accept*=".vtt"]').setInputFiles({
      name: 'garden.vtt',
      mimeType: 'text/vtt',
      buffer: VTT,
    });
    await expect(visible(page.getByText('Subtitles uploaded (Uzbek).'))).toBeVisible();

    await expect(status.locator('option[value="PUBLISHED"]')).toBeEnabled();
    await status.selectOption('PUBLISHED');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(visible(page.getByText('Saved', { exact: true }))).toBeVisible();

    // The videos page has it (with its length); the photos page does not.
    const tile = () => page.getByRole('button', { name: `Watch the video: ${title}` });
    await expect(async () => {
      await page.goto('/en/media/videos');
      await expect(tile()).toHaveCount(1, { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await expect(tile()).toContainText('1:35');
    await expect(
      page.getByRole('navigation', { name: 'Kind of media' }).getByRole('link', { name: /Videos/ }),
    ).toHaveAttribute('aria-current', 'page');
    await tile().click();
    const viewer = page.getByRole('dialog', { name: title });
    const video = viewer.locator('video');
    await expect(video).toHaveAttribute('controls', '');
    await expect(video).not.toHaveAttribute('autoplay');
    await expect(video.locator('track[kind="captions"]')).toHaveAttribute('src', /captions\.vtt$/);
    expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    await page.keyboard.press('Escape');

    await page.goto('/en/media/photos');
    await expect(visible(page.getByRole('heading', { level: 1, name: 'Photos' }))).toBeVisible();
    await expect(page.getByRole('button', { name: `Watch the video: ${title}` })).toHaveCount(0);
    await page.goto('/en/media');
    await expect(visible(page.getByRole('heading', { level: 2, name: 'Photos' }))).toBeVisible();
    await expect(visible(page.getByRole('heading', { level: 2, name: 'Videos' }))).toBeVisible();

    // The old filtered address leads to the videos page.
    const old = await page.request.get('/en/media?kind=video', { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(old.headers().location).toMatch(/\/en\/media\/videos$/);

    // Clean up: the stack's other journeys expect no films.
    await page.goto('/en/admin/media?kind=videos');
    await page.getByRole('link', { name: title }).click();
    await page.getByRole('button', { name: 'Delete item' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete item' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/media\?kind=videos$/);
  });

  test('publishing needs a staff session and a complete product', async ({ page }) => {
    const anonymous = await page.request.post(`${API}/admin/media`, { data: {} });
    expect(anonymous.status()).toBe(401);
    const request = await staffRequest(page);
    const categoryId = await firstCategoryId(page);
    const blocked = await request.post(`${API}/admin/products`, {
      data: {
        ...draftProduct(`e2e-blocked-${Date.now().toString(36)}`, categoryId),
        status: 'ACTIVE',
      },
    });
    expect(blocked.status()).toBe(422);
    expect(
      ((await blocked.json()) as { details: { missing: string[] } }).details.missing,
    ).toContain('mainImage');
    // With its picture it publishes (the shared helper does exactly what the editor does).
    const slug = `e2e-complete-${Date.now().toString(36)}`;
    const id = await publishProduct(request, draftProduct(slug, categoryId), PICTURES.lake);
    expect(await uploadPicture(request, `/admin/products/${id}/images`, PICTURES.lake)).toBe(409);
    expect((await page.request.get(`/en/products/${slug}`)).status()).toBe(200);
  });
});
