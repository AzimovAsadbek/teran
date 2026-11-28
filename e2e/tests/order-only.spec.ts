import { settleFixture } from './support/verification.ts';
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
    const method = main.getByRole('radio', { name: provider, exact: true });
    await expect(method).toHaveAccessibleDescription(/Demo · no money is charged/);
    await method.check();
    await main.getByRole('checkbox', { name: /terms of use/ }).check();
    const placed = page.waitForResponse(
      (r) => r.url().includes('/checkout/orders') && r.request().method() === 'POST',
    );
    let orderRequests = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().endsWith('/checkout/orders')) orderRequests++;
    });
    await main.getByRole('button', { name: 'Review order · 98,000 UZS' }).dblclick();

    const orderResponse = await placed;
    expect(orderResponse.status()).toBe(201);
    expect(orderResponse.request().postDataJSON()).not.toHaveProperty('delivery');
    await expect(page).toHaveURL(/\/en\/checkout\/confirm\/TRN-/);
    await expect(main.getByRole('heading', { name: 'Confirm your payment' })).toBeVisible();
    const { order: placedOrder } = await orderResponse.json();
    await expect(main.getByText(placedOrder.number)).toBeVisible();
    await page.reload();
    await main.getByRole('button', { name: `Pay with ${provider} · 98,000 UZS` }).click();
    await settleFixture(page, 'success');
    await expect(main.getByRole('heading', { name: 'Payment received' })).toBeVisible();
    await main.getByRole('link', { name: 'Order details' }).click();
    await expect(page).toHaveURL(/\/en\/account\/orders\/TRN-[A-Z0-9]{8}$/);
    const orderNumber = new URL(page.url()).pathname.split('/').pop();
    const order = await (await page.request.get('/api/v1/account/orders/' + orderNumber)).json();
    expect(orderRequests).toBe(1);
    expect(order.payments).toHaveLength(1);
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
