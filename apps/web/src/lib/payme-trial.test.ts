// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { paymeTrialReceipt, startPaymeTrial } from './payme-trial';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/site', () => ({ siteUrl: 'https://terantrade.uz' }));

const order = 'TRN-00000001';
const nonce = 'cd6decea-f8b7-44ef-82d0-d1d1bf52681b';
const token = 'a'.repeat(42);
const http = vi.fn<typeof fetch>();

function fixture(origin = 'https://test.paycom.uz', amount = '100000') {
  const payload = `m=test;ac.order_id=${order};a=${amount};l=ru;c=https://terantrade.uz/ru/payments/return/${token}`;
  http
    .mockResolvedValueOnce(
      Response.json({
        variants: [
          { sku: 'TERAN-SANDBOX-ONLY', price: '1000.00', currency: 'UZS', id: 'test-pack' },
        ],
      }),
    )
    .mockResolvedValueOnce(
      Response.json(
        {},
        { headers: { 'Set-Cookie': '__Host-teran_cart=' + token + '; Secure; HttpOnly' } },
      ),
    )
    .mockResolvedValueOnce(
      Response.json({
        order: { number: order, currency: 'UZS', total: '1000.00' },
        payment: {
          method: 'PAYME',
          redirectUrl: origin + '/' + Buffer.from(payload).toString('base64'),
        },
      }),
    );
}

beforeEach(() => {
  vi.stubGlobal('fetch', http);
  vi.stubEnv('PAYME_TRIAL_ENABLED', 'true');
  vi.stubEnv('API_INTERNAL_KEY', 'unit-test-server-key');
});
afterEach(() => {
  http.mockReset();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('creates only a synthetic order and returns the browser to the localized trial status', async () => {
  fixture();
  const session = await startPaymeTrial('customer-1', nonce, 'ru');
  const url = new URL(session.checkout);
  expect(url.origin).toBe('https://test.paycom.uz');
  expect(Buffer.from(url.pathname.slice(1), 'base64').toString()).toContain(
    `c=https://terantrade.uz/ru/payme-sinov?receipt=${token}`,
  );
  expect(session.token).toBe(token);
  for (const [path] of http.mock.calls)
    expect(String(path)).toMatch(/^http:\/\/payme-trial-api:4000\/api\/v1\//);
  const opts = http.mock.calls[2]![1]!;
  expect(opts.headers).toHaveProperty('Cookie', '__Host-teran_cart=' + token);
  const body = JSON.parse(String(opts.body));
  expect(body).toMatchObject({
    expectedTotal: '1000.00',
    paymentMethod: 'PAYME',
    delivery: { methodCode: 'sandbox-delivery' },
  });
  expect(opts.body).not.toContain('customer-1');
  fixture();
  await startPaymeTrial('customer-1', nonce, 'ru');
  expect(JSON.parse(String(http.mock.calls[5]![1]!.body)).idempotencyKey).toBe(body.idempotencyKey);
});

it.each([
  ['https://checkout.paycom.uz', '100000'],
  ['https://test.paycom.uz', '1000'],
])('refuses an unexpected cashier or amount before redirecting', async (origin, amount) => {
  fixture(origin, amount);
  await expect(startPaymeTrial('customer-1', nonce, 'uz')).rejects.toThrow();
});

it('reads confirmation from the sandbox and makes no request when the preview is disabled', async () => {
  http.mockResolvedValueOnce(
    Response.json({
      orderNumber: order,
      paymentStatus: 'PAID',
      awaitingPayment: false,
      orderPath: '/unused',
    }),
  );
  expect((await paymeTrialReceipt(token))?.paymentStatus).toBe('PAID');
  expect(await paymeTrialReceipt('invalid')).toBeNull();
  vi.stubEnv('PAYME_TRIAL_ENABLED', 'false');
  await expect(startPaymeTrial('customer-1', nonce, 'uz')).rejects.toThrow();
  expect(http).toHaveBeenCalledTimes(1);
});
