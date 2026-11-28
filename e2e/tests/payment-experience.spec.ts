import { registerUsingApi, settleFixture } from './support/verification.ts';
import { randomUUID } from 'node:crypto';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import en from '../../apps/web/messages/en.json' with { type: 'json' };
import ru from '../../apps/web/messages/ru.json' with { type: 'json' };
import uz from '../../apps/web/messages/uz.json' with { type: 'json' };

const messages = { uz, ru, en };
const widths = [360, 390, 430, 768, 1024, 1440, 1920];
type Language = keyof typeof messages;

async function startBag(page: Page, locale: Language) {
  const options = await (
    await page.request.get('/api/v1/checkout/options?locale=' + locale)
  ).json();
  expect(options).toMatchObject({
    deliveryEnabled: false,
    paymentOptions: expect.arrayContaining([
      { method: 'CLICK', availability: 'demo' },
      { method: 'PAYME', availability: 'demo' },
    ]),
  });
  await registerUsingApi(page, locale);
  const product = await (
    await page.request.get('/api/v1/catalog/products/classic-black-tea?locale=' + locale)
  ).json();
  const variant = product.variants.find(
    (v: { weightGrams: number | null }) => v.weightGrams === 250,
  );
  const added = await page.request.post('/api/v1/cart/items', {
    data: { variantId: variant.id, quantity: 1 },
  });
  expect(added.ok()).toBeTruthy();
}

async function checkLayout(page: Page, stage: string, locale: Language, info: TestInfo) {
  const routeMain = page.getByRole('main');
  await routeMain.getByRole('heading', { level: 1 }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        { message: stage + ' ' + locale + ' ' + width },
      )
      .toBeLessThanOrEqual(1);
    const title = routeMain.getByRole('heading', { level: 1 });
    expect(
      await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      'brand stylesheet must load',
    ).toBeGreaterThanOrEqual(24);
    if (stage === 'checkout') {
      const desktopSummary = routeMain.getByRole('complementary');
      if (width >= 1024) await expect(desktopSummary).toBeVisible();
      else await expect(desktopSummary).toHaveCount(0);
    }
    if (stage === 'checkout' && width < 768) {
      const summary = routeMain
        .locator('summary')
        .filter({ hasText: messages[locale].Checkout.summary });
      await summary.click();
      await expect(summary.locator('..')).toHaveAttribute('open', '');
      await summary.click();
    }
    if (stage === 'review' && width < 1024) {
      const summary = routeMain.locator('summary');
      await summary.click();
      await expect(summary.locator('..')).toHaveAttribute('open', '');
      await expect(
        summary.locator('..').getByText(messages[locale].Checkout.subtotal),
      ).toBeVisible();
      await summary.click();
    }
    if (locale === 'uz' && (width === 390 || width === 1440)) {
      const scan = await new AxeBuilder({ page })
        .include('main')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(scan.violations.map((v) => [v.id, v.nodes.map((n) => n.target)])).toEqual([]);
      await page.screenshot({
        path: info.outputPath(stage + '-' + width + '.png'),
        fullPage: true,
        animations: 'disabled',
      });
    }
  }
}

for (const locale of ['uz', 'ru', 'en'] as const) {
  test(
    'checkout, review and verified return at seven widths in ' + locale,
    async ({ page }, info) => {
      test.setTimeout(150_000);
      await startBag(page, locale);
      const prefix = locale === 'uz' ? '' : '/' + locale;
      const t = messages[locale].Checkout;
      await page.goto(prefix + '/checkout');
      const main = page.getByRole('main');
      const click = main.getByRole('radio', { name: t.paymentMethods.CLICK, exact: true });
      await expect(click).toBeVisible();
      await click.focus();
      await page.keyboard.press('Space');
      await expect(click).toBeChecked();
      await page.keyboard.press('ArrowDown');
      const payme = main.getByRole('radio', { name: t.paymentMethods.PAYME, exact: true });
      await expect(payme).toBeChecked();
      await checkLayout(page, 'checkout', locale, info);
      await main.getByRole('checkbox').check();
      const placedResponse = page.waitForResponse(
        (r) => r.request().method() === 'POST' && r.url().endsWith('/checkout/orders'),
      );
      await main.getByRole('button', { name: new RegExp('^' + t.reviewOrder) }).click();
      const { order, payment } = await (await placedResponse).json();
      await expect(page).toHaveURL(new RegExp('/checkout/confirm/' + order.number));
      await expect(main.getByRole('heading', { name: t.reviewTitle })).toBeVisible();
      await checkLayout(page, 'review', locale, info);
      // The test provider supplies a token in its own return path, just as the live provider receives it.
      await main.getByRole('button', { name: new RegExp('Payme') }).click();
      await expect(page).toHaveURL(/\/payments\/return\//);
      expect(payment.demo).toBe(true);
      const resultPath = new URL(page.url()).pathname;
      const token = new URL(payment.redirectUrl, page.url()).pathname.split('/').pop();
      await page.goto(resultPath + '?status=success&error=0');
      await expect(
        main.getByRole('heading', { name: t.outcomeTitles.REQUIRES_ACTION }),
      ).toBeVisible();
      await page.reload();
      await expect(
        main.getByRole('heading', { name: t.outcomeTitles.REQUIRES_ACTION }),
      ).toBeVisible();
      const demo = async (outcome: string) => {
        const response = await page.request.post('/api/v1/payments/demo', {
          data: { token, outcome },
        });
        expect(response.ok()).toBeTruthy();
      };
      await checkLayout(page, 'awaiting', locale, info);
      await demo('pending');
      // The English journey waits for the next scheduled refresh instead of pressing the button.
      if (locale !== 'en') await main.getByRole('button', { name: t.checkAgain }).click();
      await expect(main.getByRole('heading', { name: t.outcomeTitles.PROCESSING })).toBeVisible();
      await checkLayout(page, 'processing', locale, info);
      await demo('cancel');
      await page.reload();
      await expect(main.getByRole('heading', { name: t.outcomeTitles.CANCELLED })).toBeVisible();
      await expect(main.getByRole('link', { name: t.retryPayment })).toBeVisible();
      await checkLayout(page, 'cancelled', locale, info);
      await main.getByRole('link', { name: t.retryPayment }).click();
      await main.getByRole('button', { name: /Payme/ }).click();
      await settleFixture(page, 'failure');
      await expect(main.getByRole('heading', { name: t.outcomeTitles.FAILED })).toBeVisible();
      await checkLayout(page, 'failed', locale, info);
      await main.getByRole('link', { name: t.retryPayment }).click();
      await main.getByRole('button', { name: /Payme/ }).click();
      await settleFixture(page, 'success');
      await expect(main.getByRole('heading', { name: t.outcomeTitles.PAID })).toBeVisible();
      // An older attempt link still reports the current, verified order state.
      await page.goto(resultPath + '?status=cancelled');
      await expect(main.getByRole('heading', { name: t.outcomeTitles.PAID })).toBeVisible();
      await checkLayout(page, 'paid', locale, info);
      await expect(main.getByRole('link', { name: t.retryPayment })).toHaveCount(0);
      await page.goto(prefix + '/payments/return/invalid');
      await expect(main.getByRole('heading', { name: t.invalidPaymentLink })).toBeVisible();
      await page.goto(prefix + '/payments/return/' + randomUUID() + '?status=paid');
      await expect(main.getByRole('heading', { name: t.invalidPaymentLink })).toBeVisible();
      await checkLayout(page, 'unknown-link', locale, info);
    },
  );
}

test('browser Back from a provider reopens the verified order', async ({
  page,
  browser,
  baseURL,
}) => {
  await startBag(page, 'en');
  await page.goto('/en/checkout');
  const main = page.getByRole('main');
  await main.getByRole('radio', { name: 'Click', exact: true }).check();
  await main.getByRole('checkbox').check();
  await main.getByRole('button', { name: /^Review order/ }).click();
  await expect(page).toHaveURL(/\/checkout\/confirm\/TRN-/);
  const number = new URL(page.url()).pathname.split('/').pop();
  await main.getByRole('button', { name: /^Pay with Click/ }).click();
  await expect(page).toHaveURL(/\/payments\/return\//);
  const returnPath = new URL(page.url()).pathname;
  await page.goBack();
  await expect(page).toHaveURL(new RegExp('/account/orders/' + number + '$'));
  await expect(
    main.getByRole('heading', { name: en.Checkout.outcomeTitles.REQUIRES_ACTION }),
  ).toBeVisible();
  const anonymous = await browser.newPage({ baseURL });
  try {
    await anonymous.goto(returnPath!);
    await expect(anonymous).toHaveURL(/\/account\/login/);
    await expect(anonymous.getByText('Tea buyer', { exact: true })).toHaveCount(0);
  } finally {
    await anonymous.close();
  }
});

test('a lost checkout response offers the saved order without placing it twice', async ({
  page,
}) => {
  await startBag(page, 'en');
  await page.goto('/en/checkout');
  const main = page.getByRole('main');
  await main.getByRole('radio', { name: 'Payme', exact: true }).check();
  await main.getByRole('checkbox').check();
  let number: string | undefined;
  await page.route('**/api/v1/checkout/orders', async (route) => {
    const placed = await route.fetch();
    expect(placed.ok()).toBeTruthy();
    number = (await placed.json()).order.number;
    await route.abort('failed');
  });
  await main.getByRole('button', { name: /^Review order/ }).click();
  const recovery = main.getByRole('alert').getByRole('link', { name: en.Checkout.myOrders });
  await expect(recovery).toBeVisible();
  await recovery.click();
  await expect(main.getByRole('link', { name: new RegExp(number!) })).toHaveCount(1);
});
