import 'server-only';
import { createHmac } from 'node:crypto';
import {
  paymentReturnSchema,
  type Locale,
  type PlacedOrderDto,
  type ProductDetailDto,
} from '@teran/contracts';
import { getPathname } from '@/i18n/navigation';
import { siteUrl } from '@/lib/site';

// This hostname exists only on the network shared with the disposable Payme test API.
// Never forward a customer's TERAN session, contact details or real cart to this API.
const API = 'http://payme-trial-api:4000/api/v1';
const TOKEN = /^[A-Za-z0-9_-]{20,200}$/;
export const PAYME_TRIAL_PATH = '/payme-sinov';

export function paymeTrialEnabled() {
  return process.env.PAYME_TRIAL_ENABLED === 'true';
}

async function request(path: string, init?: RequestInit) {
  if (!paymeTrialEnabled()) throw new Error('Trial disabled');
  const response = await fetch(API + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Origin: siteUrl, ...init?.headers },
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error('Sandbox unavailable');
  return response;
}

function attemptKey(userId: string, nonce: string) {
  const secret = process.env.API_INTERNAL_KEY;
  if (!secret) throw new Error('Trial unavailable');
  const bytes = createHmac('sha256', secret).update(`payme-trial:\0${userId}\0${nonce}`).digest();
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const hex = bytes.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

/** One synthetic order on the sandbox's own stock and delivery method. */
export async function startPaymeTrial(userId: string, nonce: string, locale: Locale) {
  const product: ProductDetailDto = await (
    await request('/catalog/products/teran-payment-sandbox')
  ).json();
  const variant = product.variants.find(
    (v) => v.sku === 'TERAN-SANDBOX-ONLY' && v.price === '1000.00' && v.currency === 'UZS',
  );
  if (!variant) throw new Error('Sandbox product unavailable');
  const added = await request('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
  });
  const cookie = added.headers
    .getSetCookie()
    .map((v) => v.split(';')[0]!)
    .find((v) => /^(?:__Host-)?teran_cart=[A-Za-z0-9_-]{20,200}$/.test(v));
  if (!cookie) throw new Error('Sandbox cart unavailable');
  const placed: PlacedOrderDto = await (
    await request('/checkout/orders', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: JSON.stringify({
        idempotencyKey: attemptKey(userId, nonce),
        locale,
        customer: { name: 'TERAN Sandbox', phone: '+998200000000' },
        delivery: {
          methodCode: 'sandbox-delivery',
          regionCode: 'UZ-TK',
          city: 'Toshkent',
          addressLine: 'Sinov',
        },
        paymentMethod: 'PAYME',
        expectedTotal: '1000.00',
        acceptTerms: true,
      }),
    })
  ).json();
  if (
    placed.order.total !== '1000.00' ||
    placed.order.currency !== 'UZS' ||
    placed.payment?.method !== 'PAYME' ||
    !placed.payment.redirectUrl
  ) {
    throw new Error('Sandbox checkout unavailable');
  }
  const url = new URL(placed.payment.redirectUrl);
  if (
    url.origin !== 'https://test.paycom.uz' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('Unexpected test cashier');
  }
  const values = Buffer.from(decodeURIComponent(url.pathname.slice(1)), 'base64')
    .toString('utf8')
    .split(';');
  const get = (name: string) =>
    values.find((v) => v.startsWith(name + '='))?.slice(name.length + 1);
  if (get('a') !== '100000' || get('ac.order_id') !== placed.order.number)
    throw new Error('Unexpected sandbox amount or account');
  const back = new URL(get('c') ?? '');
  const token = back.pathname.split('/').pop() ?? '';
  if (
    back.origin !== new URL(siteUrl).origin ||
    !/\/payments\/return\//.test(back.pathname) ||
    !TOKEN.test(token)
  ) {
    throw new Error('Unexpected sandbox return');
  }
  const path = getPathname({ href: PAYME_TRIAL_PATH, locale });
  const trialReturn = new URL(path, siteUrl);
  trialReturn.searchParams.set('receipt', token);
  const pairs = values.map((v) => (v.startsWith('c=') ? 'c=' + trialReturn.href : v));
  url.pathname = '/' + Buffer.from(pairs.join(';'), 'utf8').toString('base64');
  return { checkout: url.href, token };
}

export async function paymeTrialReceipt(token: string) {
  if (!TOKEN.test(token)) return null;
  return paymentReturnSchema.parse(await (await request('/payments/return?token=' + token)).json());
}
