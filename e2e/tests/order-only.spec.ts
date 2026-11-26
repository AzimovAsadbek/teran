import { expect, test } from '@playwright/test';
import { registerAtCheckout } from './support/checkout.ts';

for (const [provider, device] of [
  ['Payme', 'desktop'],
  ['Click', '@mobile'],
] as const) {
  test(`${device} buyer pays only for the items using ${provider}`, async ({ page }) => {
    await page.goto('/en/products/classic-black-tea');
    await page.locator('label').filter({ hasText: '250 g' }).first().click();
    await page.getByRole('button', { name: /^Add to bag · / }).click();
    const drawer = page.getByRole('dialog', { name: 'Your bag' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(/delivery/i)).toHaveCount(0);
    const cart = await (await page.request.get('/api/v1/cart')).json();
    expect(cart).toMatchObject({
      itemCount: 1,
      subtotal: '98000.00',
      deliveryHint: null,
      deliveryEnabled: false,
    });
    await drawer.getByRole('link', { name: 'Checkout' }).click();
    await registerAtCheckout(page);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Delivery', exact: true })).toHaveCount(0);
    await expect(main.getByLabel(/^(Region|City or district|Address)$/)).toHaveCount(0);
    await expect(main.getByRole('radio', { name: /cash on delivery/i })).toHaveCount(0);
    await expect(main.getByRole('radio', { name: /Payme/ })).toBeVisible();
    await expect(main.getByRole('radio', { name: /Click/ })).toBeVisible();
    await main.getByLabel('Phone number').fill('90 555 44 33');
    await main.getByRole('radio', { name: new RegExp('^' + provider + ' ') }).check();
    await main.getByRole('checkbox', { name: /terms of use/ }).check();
    const placed = page.waitForResponse(
      (r) => r.url().includes('/checkout/orders') && r.request().method() === 'POST',
    );
    await main.getByRole('button', { name: `Pay with ${provider} · 98,000 UZS` }).click();
    const orderResponse = await placed;
    expect(orderResponse.status()).toBe(201);
    expect(orderResponse.request().postDataJSON()).not.toHaveProperty('delivery');
    await expect(page).toHaveURL(/\/en\/payments\/demo\//);
    await page.getByRole('button', { name: 'Simulate a successful payment' }).click();
    await page.getByRole('link', { name: 'Continue to the order' }).click();
    await expect(page).toHaveURL(/\/en\/account\/orders\/TRN-[A-Z0-9]{8}$/);
    const orderNumber = new URL(page.url()).pathname.split('/').pop();
    const order = await (await page.request.get('/api/v1/account/orders/' + orderNumber)).json();
    expect(order).toMatchObject({
      total: cart.subtotal,
      deliveryFee: '0.00',
      deliveryMethodName: null,
      addressLine: null,
    });
    await expect(main.getByText('Payment received')).toBeVisible();
    await expect(main.getByText('Delivery address', { exact: true })).toHaveCount(0);
    await expect(main.getByText('Shipped', { exact: true })).toHaveCount(0);
    await expect(main.getByText('Completed', { exact: true })).toBeVisible();
    expect((await (await page.request.get('/api/v1/cart')).json()).itemCount).toBe(0);
  });
}
