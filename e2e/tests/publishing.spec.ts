import { expect, test, type Page } from '@playwright/test';
import {
  API,
  IPHONE,
  PICTURES,
  REEL,
  VIDEO_TOOLS,
  field,
  hydrated,
  pictureFile,
  plays,
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
    // A category without a cover borrows no picture, neither a product's nor another category's
    // cover; a kind of tea shows its own dry leaf instead (ADR-051).
    await page.goto('/en/tea/black-tea');
    const header = page.getByRole('main').locator('header');
    await expect(
      visible(header.getByRole('heading', { level: 1, name: 'Black tea' })),
    ).toBeVisible();
    await expect(header.locator('img[src*="uploads"]')).toHaveCount(0);
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
    // Saved as a draft, then back to the list, where it comes first; it is opened from there.
    await expect(page).toHaveURL(/\/en\/admin\/journal$/);
    await expect(visible(page.getByText('Article created.', { exact: true }))).toBeVisible();
    await visible(page.getByRole('link', { name: title })).click();
    await expect(page).toHaveURL(/\/en\/admin\/journal\/[0-9a-f-]{36}$/);

    // A draft without a cover cannot be published: the editor says what is missing.
    await field(page, 'Status').selectOption('PUBLISHED');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(visible(page.getByText(/Can’t publish yet — missing: Cover image/))).toBeVisible();
    await field(page, 'Status').selectOption('DRAFT');

    // (The new article's form, visited before, stays in the document, hidden: only what is on
    // screen counts.)
    await visible(page.locator('#article-cover input[type="file"]')).setInputFiles(
      PICTURES.terraces,
    );
    await visible(
      page.locator('#article-cover').getByRole('button', { name: 'Upload', exact: true }),
    ).click();
    await expect(
      visible(page.locator('#article-cover img[src*="/uploads/articles/"]')),
    ).toBeVisible();

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

  test('an article is created with its cover and published in one go', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/en/admin/journal/new');
    const slug = `e2e-one-go-${Date.now().toString(36)}`;
    const title = `E2E first flush ${slug}`;
    await page.locator('[name="uz-title"]').fill(title);
    await page
      .locator('[name="uz-body"]')
      .fill('Picked, dried and packed in the same week of the spring.');
    await field(page, 'URL slug').fill(slug);
    await field(page, 'Status').selectOption('PUBLISHED');

    // Publishing needs a cover: the editor says so before anything is created.
    await page.getByRole('button', { name: 'Create and publish' }).click();
    await expect(visible(page.getByText(/^To publish the article, choose a cover/))).toBeVisible();
    await page.locator('#article-cover input[type="file"]').setInputFiles(PICTURES.terraces);
    await expect(
      visible(page.locator('#article-cover').getByText('Uploads when saved', { exact: true })),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Create and publish' }).click();
    // Then back to the list, where it comes first, published with its cover.
    await expect(page).toHaveURL(/\/en\/admin\/journal$/);
    await expect(visible(page.getByText('Article created and published.'))).toBeVisible();
    await expect(visible(page.locator('main tbody tr'))).toContainText(title);

    const reader = await page.context().newPage();
    await expect(async () => {
      await reader.goto(`/en/journal/${slug}`);
      await expect(visible(reader.getByRole('heading', { level: 1, name: title }))).toBeVisible({
        timeout: 1_000,
      });
    }).toPass({ timeout: 20_000 });
    await reader.close();
  });

  test('photos and videos have separate pages; a video gets its poster, length and subtitles', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signInAsAdmin(page);
    // New films are posted with their files in one go (ADR-063); the editor takes a film's file,
    // poster and subtitles one by one, to replace them later. A draft made through the API stands
    // in for a film posted earlier.
    const title = `E2E garden film ${Date.now().toString(36)}`;
    const created = await page.request.post(`${API}/admin/media`, {
      data: {
        kind: 'VIDEO',
        status: 'DRAFT',
        isFeatured: false,
        videoDurationSeconds: null,
        translations: { uz: { title }, ru: null, en: null },
      },
    });
    expect(created.status()).toBe(201);
    await page.goto(`/en/admin/media/${((await created.json()) as { id: string }).id}`);
    const status = field(page, 'Status');
    await expect(status.locator('option[value="PUBLISHED"]')).toBeDisabled();

    // The video is played here before it is sent; once the API has it ready (ADR-062), its length
    // is read from the file.
    await page.locator('input[type="file"][accept^="video/"]').setInputFiles(REEL);
    await expect(visible(page.getByText('Not uploaded yet'))).toBeVisible();
    await expect(page.locator('#media-files video[src^="blob:"]')).toHaveCount(1);
    await visible(page.getByRole('button', { name: 'Upload', exact: true })).click();
    await expect(field(page, /^Length/)).toHaveValue('2', { timeout: 30_000 });
    await expect(page.locator('#media-files video source[src*="/uploads/media/"]')).toHaveAttribute(
      'src',
      /\/video\.mp4$/,
    );

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
    await expect(tile()).toContainText('0:02');
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

  test('a short posted from the admin area plays first in the home page feed; photos post the same way', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    type Listed = {
      items: {
        id: string;
        title: string;
        video: { hasAudio: boolean; captions: { src: string } | null } | null;
      }[];
    };
    const listed = async (kind: 'PHOTO' | 'VIDEO' | 'SHORT') =>
      (await (
        await page.request.get(`${API}/content/media?locale=en&kind=${kind}`)
      ).json()) as Listed;
    await signInAsAdmin(page);
    await page.goto('/en/admin/media?kind=shorts');
    await visible(page.getByRole('link', { name: 'New short' })).click();
    await expect(page).toHaveURL(/\/en\/admin\/media\/post\?kind=shorts$/);
    const main = page.getByRole('main');
    await expect(visible(main.getByRole('radio', { name: 'Shorts' }))).toBeChecked();

    // A short: played here with its sound, its cover one of its frames, its texts and subtitles,
    // then posted in one go (ADR-063).
    await main.locator('input[type="file"]').first().setInputFiles(REEL);
    await expect(visible(main.locator('video[controls][src^="blob:"]'))).toBeVisible();
    await expect(visible(main.getByText(/^Short: shown in the home page/))).toBeVisible();
    await expect(
      visible(main.getByRole('slider', { name: 'Time of the cover frame' })),
    ).toBeVisible();
    const film = `E2E short ${Date.now().toString(36)}`;
    await field(page, 'Title').fill(film);
    await field(page, 'Poster description').fill('Steam over a cup at dawn');
    await main.locator('input[type="file"][accept*=".vtt"]').setInputFiles({
      name: 'dawn.vtt',
      mimeType: 'text/vtt',
      buffer: VTT,
    });
    await expect(visible(main.getByText('dawn.vtt', { exact: true }))).toBeVisible();
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    // Then back to the shorts, where it comes first; the site has it once the API has read it.
    await expect(page).toHaveURL(/\/en\/admin\/media\?kind=shorts$/);
    await expect(visible(page.locator('main tbody tr'))).toContainText(film);
    await expect
      .poll(async () => (await listed('SHORT')).items[0]?.title, { timeout: 30_000 })
      .toBe(film);
    const shorts = await listed('SHORT');
    expect(shorts.items[0]).toMatchObject({
      title: film,
      video: {
        hasAudio: true,
        captions: { src: expect.stringMatching(/captions\.vtt$/) as unknown },
      },
    });
    expect((await listed('VIDEO')).items.map((item) => item.title)).not.toContain(film);

    // On the home page it is first in the feed, and opens with its sound offered.
    const card = () =>
      page
        .getByRole('region', { name: 'Sip & scroll' })
        .getByRole('button', { name: `Watch the video: ${film}` });
    await expect(async () => {
      await page.goto('/en');
      await expect(card()).toHaveCount(1, { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await card().click();
    const feed = page.getByRole('dialog', { name: film });
    await expect(feed.getByRole('button', { name: /^(Mute|Unmute)$/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(feed).toBeHidden();

    // An upright film is not a "Video": the composer offers to post it as a short instead.
    await page.goto('/en/admin/media/post?kind=videos');
    await expect(visible(main.getByRole('radio', { name: 'Video' }))).toBeChecked();
    await main.locator('input[type="file"]').first().setInputFiles(REEL);
    await expect(visible(main.getByText(/^This is an upright video/))).toBeVisible();
    await visible(main.getByRole('button', { name: 'Post as “Shorts”' })).click();
    await expect(visible(main.getByRole('radio', { name: 'Shorts' }))).toBeChecked();
    await expect(visible(main.locator('video[controls][src^="blob:"]'))).toBeVisible();

    // A photograph posts the same way; opened again, the page is empty, nothing of the last post.
    await page.goto('/en/admin/media/post?kind=photos');
    await main.locator('input[type="file"]').first().setInputFiles(PICTURES.lake);
    await expect(visible(main.getByRole('img', { name: /lake\.webp/ }))).toBeVisible();
    const photo = `E2E photo ${Date.now().toString(36)}`;
    await field(page, 'Title').fill(photo);
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/admin\/media$/);
    await expect(visible(page.locator('main tbody tr'))).toContainText(photo);
    const photos = await listed('PHOTO');
    expect(photos.items[0]).toMatchObject({ title: photo, video: null });
    await visible(page.getByRole('link', { name: 'New photo' })).click();
    await expect(visible(main.getByText('Drop a photo here'))).toBeVisible();
    await expect(field(page, 'Title')).toHaveValue('');

    // Clean up: the stack's other journeys expect no films.
    for (const id of [shorts.items[0]!.id, photos.items[0]!.id]) {
      expect((await page.request.delete(`${API}/admin/media/${id}`)).status()).toBe(204);
    }
  });

  test('iPhone films post to the gallery as MP4s with their sound, HEVC and H.264 alike', async ({
    page,
  }) => {
    test.skip(!VIDEO_TOOLS && !process.env.CI, 'The stack needs ffmpeg to make iPhone films MP4s');
    test.setTimeout(180_000);
    type Listed = {
      items: { id: string; title: string; video: { src: string; hasAudio: boolean } | null }[];
    };
    await signInAsAdmin(page);
    const main = page.getByRole('main');
    const posted: string[] = [];
    for (const [file, played] of [
      [IPHONE.hevcLandscape, false],
      [IPHONE.h264Landscape, true],
    ] as const) {
      await page.goto('/en/admin/media/post?kind=videos');
      await expect(visible(main.getByRole('radio', { name: 'Video' }))).toBeChecked();
      await main.locator('input[type="file"]').first().setInputFiles(file);
      if (played) {
        // H.264 in a QuickTime film: played here, its cover a frame picked here.
        await expect(visible(main.locator('video[controls][src^="blob:"]'))).toBeVisible();
      } else {
        // HEVC, which this browser cannot play: its shape is read from the file, and the film is
        // posted all the same; the server converts it and takes its cover (ADR-062).
        await expect(visible(main.getByText(/^This browser can’t play this video/))).toBeVisible();
        await expect(main.locator('video[controls]')).toHaveCount(0);
      }
      await expect(visible(main.getByText('640 × 360', { exact: true }))).toBeVisible();
      const title = `E2E iPhone film ${Date.now().toString(36)}`;
      await field(page, 'Title').fill(title);
      await page.getByRole('button', { name: 'Post', exact: true }).click();
      // Back on the list at once, first; the film is made ready behind it (ADR-062), and the list
      // says so until it is, looking again by itself.
      await expect(page).toHaveURL(/\/en\/admin\/media\?kind=videos$/);
      await expect(visible(page.locator('main tbody tr'))).toContainText(title);
      await expect(visible(page.locator('main tbody tr'))).toContainText('Ready', {
        timeout: 60_000,
      });
      posted.push(title);
    }

    // Both are MP4s with their sound once made ready, and this browser plays them (it could not
    // play the HEVC).
    const listedFilms = async () =>
      (await (
        await page.request.get(`${API}/content/media?locale=en&kind=VIDEO`)
      ).json()) as Listed;
    await expect
      .poll(
        async () => {
          const listed = await listedFilms();
          return posted.filter((title) =>
            /\/video\.mp4$/.test(
              listed.items.find((entry) => entry.title === title)?.video?.src ?? '',
            ),
          ).length;
        },
        { timeout: 120_000, intervals: [1000] },
      )
      .toBe(posted.length);
    const films = await listedFilms();
    for (const title of posted) {
      const film = films.items.find((entry) => entry.title === title);
      expect(film?.video).toMatchObject({
        src: expect.stringMatching(/\/video\.mp4$/),
        hasAudio: true,
      });
      expect(await plays(page, film!.video!.src)).toMatchObject({ width: 640, height: 360 });
    }
    const tile = (title: string) => page.getByRole('button', { name: `Watch the video: ${title}` });
    await expect(async () => {
      await page.goto('/en/media/videos');
      await expect(tile(posted[0]!)).toHaveCount(1, { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await hydrated(page);
    await tile(posted[0]!).click();
    await expect(
      page.getByRole('dialog', { name: posted[0] }).locator('video source[type="video/mp4"]'),
    ).toHaveAttribute('src', /\/video\.mp4$/);
    await page.keyboard.press('Escape');

    // The editor takes an iPhone film too: it replaces the first one once the API has it ready.
    const first = films.items.find((entry) => entry.title === posted[0])!;
    await page.goto(`/en/admin/media/${first.id}`);
    const source = page.locator('#media-files video source[src*="/uploads/media/"]');
    await expect(source).toHaveAttribute('src', first.video!.src);
    await hydrated(page);
    await page.locator('input[type="file"][accept^="video/"]').setInputFiles(IPHONE.h264Landscape);
    await expect(visible(page.getByText('Not uploaded yet'))).toBeVisible();
    await visible(page.getByRole('button', { name: 'Upload', exact: true })).click();
    await expect(source).not.toHaveAttribute('src', first.video!.src, { timeout: 30_000 });
    await expect(source).toHaveAttribute('src', /\/video\.mp4$/);

    // Clean up: the stack's other journeys expect no films.
    for (const title of posted) {
      const id = films.items.find((entry) => entry.title === title)!.id;
      expect((await page.request.delete(`${API}/admin/media/${id}`)).status()).toBe(204);
    }
  });

  test('leaving the composer asks first, and an unfinished post is deleted', async ({ page }) => {
    test.setTimeout(120_000);
    await signInAsAdmin(page);
    const main = page.getByRole('main');
    const menu = page.getByRole('navigation', { name: 'Administration' });
    await page.goto('/en/admin/media/post?kind=shorts');
    await main.locator('input[type="file"]').first().setInputFiles(REEL);
    await expect(visible(main.locator('video[controls][src^="blob:"]'))).toBeVisible();
    const title = `E2E unfinished short ${Date.now().toString(36)}`;
    await field(page, 'Title').fill(title);

    // Entries only: a link asks first, and staying keeps them.
    await menu.getByRole('link', { name: 'Dashboard' }).click();
    const ask = page.getByRole('dialog', { name: 'Leave this page?' });
    await expect(ask).toBeVisible();
    await ask.getByRole('button', { name: 'Stay' }).click();
    await expect(page).toHaveURL(/\/en\/admin\/media\/post\?kind=shorts$/);
    await expect(field(page, 'Title')).toHaveValue(title);

    // A post stopped half way (the film's pieces never arrive): leaving says the unfinished item
    // goes, and deletes it.
    await page.route('**/video/uploads/**', (route) =>
      route.request().method() === 'PUT' ? route.abort() : route.continue(),
    );
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(visible(main.getByRole('button', { name: 'Continue' }))).toBeVisible({
      timeout: 60_000,
    });
    await menu.getByRole('link', { name: 'Dashboard' }).click();
    const drop = page.getByRole('dialog', { name: 'Delete the unfinished post?' });
    await expect(drop).toBeVisible();
    await drop.getByRole('button', { name: 'Leave' }).click();
    await expect(page).toHaveURL(/\/en\/admin$/);
    const shorts = (await (await page.request.get(`${API}/admin/media?kind=SHORT`)).json()) as {
      translations: { uz: { title: string } };
    }[];
    expect(shorts.map((item) => item.translations.uz.title)).not.toContain(title);
  });

  test('iPhone shorts reach the home page feed as MP4s with their sound', async ({ page }) => {
    test.skip(!VIDEO_TOOLS && !process.env.CI, 'The stack needs ffmpeg to make iPhone films MP4s');
    test.setTimeout(180_000);
    type Listed = { items: { id: string; title: string; video: { src: string } | null }[] };
    await signInAsAdmin(page);
    const main = page.getByRole('main');

    // An upright HEVC film offered as a "Video": its shape is read from the file even though this
    // browser cannot play it, and it is offered as a short instead.
    await page.goto('/en/admin/media/post?kind=videos');
    await main.locator('input[type="file"]').first().setInputFiles(IPHONE.hevcUpright);
    await expect(visible(main.getByText(/^This is an upright video/))).toBeVisible();
    await visible(main.getByRole('button', { name: 'Post as “Shorts”' })).click();
    await expect(visible(main.getByRole('radio', { name: 'Shorts' }))).toBeChecked();
    await expect(visible(main.getByText(/^This browser can’t play this video/))).toBeVisible();
    const hevc = `E2E iPhone short ${Date.now().toString(36)}`;
    await field(page, 'Title').fill(hevc);
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/admin\/media\?kind=shorts$/);
    await expect(visible(page.locator('main tbody tr'))).toContainText(hevc);

    // What Safari hands over from an iPhone's photo picker: H.264 in a QuickTime film.
    await visible(page.getByRole('link', { name: 'New short' })).click();
    // (The first post's page, visited before, stays in the document, hidden.)
    await visible(main.locator('input[type="file"]')).setInputFiles(IPHONE.safariUpright);
    await expect(visible(main.locator('video[controls][src^="blob:"]'))).toBeVisible();
    await expect(
      visible(main.getByRole('slider', { name: 'Time of the cover frame' })),
    ).toBeVisible();
    const safari = `E2E Safari short ${Date.now().toString(36)}`;
    await field(page, 'Title').fill(safari);
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(page).toHaveURL(/\/en\/admin\/media\?kind=shorts$/);
    await expect(visible(page.locator('main tbody tr'))).toContainText(safari);

    // Both are made ready behind the list (ADR-062): the home page's feed has them, newest first.
    const featured = async () =>
      (await (
        await page.request.get(`${API}/content/media?locale=en&kind=SHORT&featured=true`)
      ).json()) as Listed;
    await expect
      .poll(
        async () =>
          (await featured()).items
            .slice(0, 2)
            .filter((item) => /\/video\.mp4$/.test(item.video?.src ?? ''))
            .map((item) => item.title),
        { timeout: 120_000, intervals: [1000] },
      )
      .toEqual([safari, hevc]);
    const shorts = await featured();
    expect(shorts.items.slice(0, 2).map((item) => item.title)).toEqual([safari, hevc]);
    for (const item of shorts.items.slice(0, 2)) {
      expect(await plays(page, item.video!.src)).toMatchObject({ width: 360, height: 640 });
    }
    // In the feed, each opens with its sound offered.
    const card = (title: string) =>
      page
        .getByRole('region', { name: 'Sip & scroll' })
        .getByRole('button', { name: `Watch the video: ${title}` });
    await expect(async () => {
      await page.goto('/en');
      await expect(card(hevc)).toHaveCount(1, { timeout: 1_000 });
    }).toPass({ timeout: 20_000 });
    await hydrated(page);
    await card(hevc).click();
    const feed = page.getByRole('dialog', { name: hevc });
    await expect(feed.getByRole('button', { name: /^(Mute|Unmute)$/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(feed).toBeHidden();

    // Clean up: the stack's other journeys expect no films.
    for (const item of shorts.items.slice(0, 2)) {
      expect((await page.request.delete(`${API}/admin/media/${item.id}`)).status()).toBe(204);
    }
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
