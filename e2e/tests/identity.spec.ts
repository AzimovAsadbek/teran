import { randomUUID } from 'node:crypto';
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import uz from '../../apps/web/messages/uz.json' with { type: 'json' };
import en from '../../apps/web/messages/en.json' with { type: 'json' };
import ru from '../../apps/web/messages/ru.json' with { type: 'json' };
import { signInAsAdmin } from './support/admin.ts';
import { inboxCode } from './support/verification.ts';

const locales = [
  ['uz', uz, 'desktop'],
  ['ru', ru, 'desktop'],
  ['en', en, '@mobile'],
] as const;

for (const [locale, strings, device] of locales) {
  test(`${device} password sign-in comes first in ${locale} and supports the keyboard`, async ({
    page,
  }) => {
    await page.goto((locale === 'uz' ? '' : '/' + locale) + '/account/login');
    const main = page.getByRole('main');
    const password = main.getByLabel(strings.Account.password, { exact: true });
    await expect(password).toHaveAttribute('type', 'password');
    await password.fill('visibility-check');
    await password.press('Tab');
    const show = main.getByRole('button', { name: strings.Common.showPassword });
    await expect(show).toBeFocused();
    await show.press('Space');
    await expect(password).toHaveAttribute('type', 'text');
    await main.getByRole('button', { name: strings.Common.hidePassword }).press('Enter');
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveValue('visibility-check');

    const features = await (await page.request.get('/api/v1/auth/features')).json();
    const expected = [strings.Account.login];
    if (features.telegram) expected.push(strings.Account.identity.telegramCode);
    if (features.google) expected.push(strings.Account.identity.google);
    if (features.emailOtp) expected.push(strings.Account.identity.emailCode);
    const buttons = (await main.getByRole('button').allTextContents()).map((text) => text.trim());
    expect(buttons.filter((text) => expected.includes(text))).toEqual(expected);
    const scan = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(scan.violations.map((violation) => violation.id)).toEqual([]);
  });
}

test('staff and account security password fields can be revealed separately', async ({ page }) => {
  await signInAsAdmin(page, '/admin/staff');
  await page.getByRole('button', { name: en.Admin.staff.newStaff }).click();
  const sheet = page.getByRole('dialog');
  const temporary = sheet.getByLabel(en.Admin.staff.password, { exact: true });
  await expect(temporary).toHaveAttribute('type', 'password');
  await sheet.getByRole('button', { name: en.Common.showPassword }).click();
  await expect(temporary).toHaveAttribute('type', 'text');
  await sheet.getByRole('button', { name: en.Common.hidePassword }).click();
  await expect(temporary).toHaveAttribute('type', 'password');

  await page.goto('/en/account/security');
  const main = page.getByRole('main');
  const current = main.getByLabel(en.Account.currentPassword, { exact: true });
  const next = main.getByLabel(en.Account.newPassword, { exact: true });
  await main.getByRole('button', { name: en.Common.showPassword }).first().click();
  await expect(current).toHaveAttribute('type', 'text');
  await expect(next).toHaveAttribute('type', 'password');
  await main.getByRole('button', { name: en.Common.showPassword }).click();
  await expect(next).toHaveAttribute('type', 'text');
});

test('reset password fields have independent visibility controls', async ({ page }) => {
  await page.goto('/en/account/reset-password?token=local-visibility-test-token');
  const main = page.getByRole('main');
  const first = main.getByLabel(en.Account.newPassword, { exact: true });
  const confirmation = main.getByLabel(en.Account.confirmPassword, { exact: true });
  const toggle = main.getByRole('button', { name: en.Common.showPassword }).first();
  await expect(toggle).toHaveAccessibleDescription(en.Account.newPassword);
  await first.fill('first-field-only');
  await toggle.click();
  await expect(first).toHaveAttribute('type', 'text');
  await expect(confirmation).toHaveAttribute('type', 'password');
  await expect(first).toHaveValue('first-field-only');
});

for (const [locale, strings, device] of locales) {
  test(device + ' completes verified registration in ' + locale, async ({ page }, info) => {
    const a = strings.Account,
      t = a.identity,
      email = randomUUID() + '@example.test';
    const prefix = locale === 'uz' ? '' : '/' + locale;
    await page.goto(prefix + '/account/register');
    const main = page.getByRole('main');
    await main.locator('input[name=firstName]').fill('Aziza');
    await main.locator('input[name=lastName]').fill('Karimova');
    await main.locator('input[name=email]').fill(email);
    await main.locator('input[name=phone]').fill('90 333 44 55');
    await main.getByRole('button', { name: t.next, exact: true }).click();
    await main.getByRole('button', { name: t.emailCode }).click();
    const field = main.getByLabel(t.code, { exact: true });
    await expect(field).toBeFocused();
    expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
    const code = await inboxCode(page, email);
    await field.fill(code === '000000' ? '111111' : '000000');
    await main.getByRole('button', { name: t.verify, exact: true }).click();
    await expect(main.getByRole('alert')).toContainText(t.invalid);
    await field.fill('');
    await expect(main.getByRole('button', { name: t.verify, exact: true })).toBeDisabled();
    await page.screenshot({
      path: info.outputPath('verification-' + locale + '.png'),
      animations: 'disabled',
    });
    const scan = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(scan.violations.map((v) => v.id)).toEqual([]);
    await field.fill(code);
    await field.press('Enter');
    await expect(page).toHaveURL(new RegExp(prefix + '/account$'));
    const me = await page.request.get('/api/v1/auth/me');
    expect((await me.json()).email).toBe(email);
    await page.goto(prefix + '/account/security');
    await expect(main.getByRole('heading', { name: t.manage })).toBeVisible();
    await expect(main.getByText(t.verified, { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
  });
}
