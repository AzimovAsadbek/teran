import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
const seen = new Map<string, string>();
const inbox = 'http://127.0.0.1:8025/api/v1';
export async function inboxCode(page: Page, email: string) {
  if (!email.endsWith('@example.test')) throw new Error('Expected a fixture mailbox');
  let id = '';
  await expect
    .poll(async () => {
      const found = await page.request.get(inbox + '/search', { params: { query: 'to:' + email } });
      if (!found.ok()) return false;
      const rows = (await found.json()).messages as { ID: string; To: { Address: string }[] }[];
      id = rows.find((m) => m.To.some((to) => to.Address === email))?.ID ?? '';
      return !!id && id !== seen.get(email);
    })
    .toBe(true);
  seen.set(email, id);
  const content = await (await page.request.get(inbox + '/message/' + id)).json();
  const code = (content.Text as string).match(/^\d{6}\s*$/m)?.[0]?.trim();
  if (!code) throw new Error('Verification email did not contain six digits');
  return code;
}
export async function registerForm(
  page: Page,
  firstName = 'Buyer',
  email = randomUUID() + '@example.test',
) {
  const main = page.getByRole('main');
  await main.getByLabel(/^First name/).fill(firstName);
  await main.getByLabel(/^Last name/).fill('Karimova');
  await main.locator('input[name="email"]').fill(email);
  await main.locator('input[name="phone"]').fill('+998905554433');
  await main.getByRole('button', { name: 'Continue', exact: true }).click();
  await main.getByRole('button', { name: 'Get a code by email' }).click();
  await main.getByLabel('Six-digit code').fill(await inboxCode(page, email));
  await main.getByRole('button', { name: 'Verify', exact: true }).click();
  return email;
}
export async function loginByEmail(page: Page, email: string) {
  const main = page.getByRole('main');
  await main.getByRole('button', { name: 'Get a code by email' }).click();
  await main.locator('input[name="email"]').fill(email);
  await main.getByRole('button', { name: 'Send code', exact: true }).click();
  await main.getByLabel('Six-digit code').fill(await inboxCode(page, email));
  await main.getByRole('button', { name: 'Verify', exact: true }).click();
}
export async function registerUsingApi(page: Page, locale: string) {
  const email = randomUUID() + '@example.test';
  const response = await page.request.post('/api/v1/auth/verification/start', {
    data: {
      purpose: 'REGISTER',
      channel: 'EMAIL',
      locale,
      profile: { firstName: 'Tea buyer', lastName: 'Karimova', phone: '+998905554433', email },
    },
  });
  expect(response.status()).toBe(202);
  const finish = await page.request.post('/api/v1/auth/verification/confirm', {
    data: { id: (await response.json()).id, code: await inboxCode(page, email) },
  });
  expect(finish.status()).toBe(200);
}
export async function settleFixture(
  page: Page,
  outcome: 'success' | 'failure' | 'cancel' | 'pending',
) {
  await expect(page).toHaveURL(/\/payments\/return\/[\w-]+$/);
  const url = new URL(page.url());
  if (!['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Test outcomes require a local test stack');
  const token = url.pathname.split('/').pop()!;
  const state = await page.request.get('/api/v1/payments/demo', { params: { token } });
  expect(state.status()).toBe(200);
  const result = await page.request.post('/api/v1/payments/demo', { data: { token, outcome } });
  expect(result.status()).toBe(200);
  await page.reload();
}
