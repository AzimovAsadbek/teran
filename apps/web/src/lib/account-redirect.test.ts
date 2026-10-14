// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { accountRedirect } from './account-redirect';

function request(path: string, cookie?: string) {
  return new NextRequest(`https://teran.example${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

describe('account redirect', () => {
  it('sends visitors without a session straight to sign-in, keeping where they wanted to go', () => {
    const response = accountRedirect(request('/ru/account/orders?status=active'));
    expect(response?.status).toBe(307);
    const target = new URL(response!.headers.get('location')!);
    expect(target.pathname).toBe('/ru/account/login');
    expect(target.searchParams.get('next')).toBe('/account/orders?status=active');
    expect(new URL(accountRedirect(request('/account'))!.headers.get('location')!).pathname).toBe(
      '/account/login',
    );
  });

  it('leaves the public account pages, signed-in visitors and other pages alone', () => {
    for (const path of ['/account/login', '/en/account/register', '/account/reset-password']) {
      expect(accountRedirect(request(path))).toBeNull();
    }
    expect(accountRedirect(request('/account', 'teran_session=abc'))).toBeNull();
    expect(accountRedirect(request('/account/orders', '__Host-teran_session=abc'))).toBeNull();
    expect(accountRedirect(request('/accounting'))).toBeNull();
    expect(accountRedirect(request('/orders/TRN-ABCDEFGH?token=x'))).toBeNull();
  });
});
