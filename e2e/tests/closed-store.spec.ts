import { expect, test } from '@playwright/test';
import { signInAsAdmin } from './support/admin.ts';

test('a tea inquiry reaches staff when online checkout is closed', async ({ page }) => {
  const name = 'Tea inquiry ' + Date.now();
  await page.goto('/products/classic-black-tea');
  await page.getByRole('link', { name: 'Buyurtma berish' }).first().click();
  await expect(page).toHaveURL(/contact\?tea=classic-black-tea/);
  const form = page.locator('main form').filter({ has: page.locator('input[name="phone"]') });
  await form.locator('[name="name"]').fill(name);
  await form.locator('[name="phone"]').fill('901234567');
  await form.locator('[type="submit"]').click();
  const tea = 'Klassik qora choy · 100 g × 1';
  await expect(page.getByText(tea, { exact: false }).last()).toBeVisible();
  await expect(form).toHaveCount(0);
  const disabled = await page.request.post('/api/v1/checkout/orders', { data: {} });
  expect(disabled.status()).toBe(503);
  expect(await disabled.json()).toMatchObject({ code: 'FEATURE_DISABLED' });
  await signInAsAdmin(page);
  const rows = await page.request.get('/api/v1/admin/inquiries/contact', { params: { q: name } });
  expect(rows.ok()).toBe(true);
  const stored = (await rows.json()).items.filter((row: { name: string }) => row.name === name);
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ message: tea, locale: 'uz' });
});
