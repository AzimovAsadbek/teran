import type { OrderDto, OrderPaymentDto } from '@teran/contracts';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { OrderStatusView } from './order-view';

vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => key }));
vi.mock('@/lib/data/content', () => ({ getCheckoutOptions: async () => ({ paymentOptions: [] }) }));
vi.mock('./order-details', () => ({
  OrderDetails: () => null,
  OrderTimeline: () => null,
  OrderProgress: () => null,
}));
vi.mock('./order-actions', () => ({
  CheckAgain: () => <button>Check status</button>,
  PayOrder: () => <button>Pay</button>,
  ReorderButton: () => null,
}));

async function show(
  method: 'CLICK' | 'PAYME',
  status: OrderPaymentDto['status'],
  awaitingPayment: boolean,
) {
  const createdAt = '2026-11-26T15:00:00Z';
  const order: OrderDto = {
    number: 'TRN-ABCDEFG1',
    status: 'PENDING',
    paymentMethod: method,
    paymentStatus: status,
    createdAt,
    events: [],
    awaitingPayment,
    paymentDueAt: awaitingPayment ? createdAt : null,
    cancelReason: null,
    payments: [
      {
        method,
        status,
        amount: '1000.00',
        currency: 'UZS',
        demo: false,
        createdAt,
        paidAt: null,
        failureCode: null,
        receipts: [],
      },
    ],
    customerName: 'Test',
    customerPhone: '',
    customerEmail: null,
    deliveryMethodName: null,
    regionCode: null,
    city: null,
    addressLine: null,
    landmark: null,
    note: null,
    items: [],
    subtotal: '1000.00',
    deliveryFee: '0.00',
    discountTotal: '0.00',
    total: '1000.00',
    currency: 'UZS',
  };
  render(await OrderStatusView({ order, locale: 'en', token: null, account: false }));
}

it('offers a status check when the customer returns before the first CLICK callback', async () => {
  await show('CLICK', 'REQUIRES_ACTION', true);
  expect(screen.getByText('checkAfterPayment')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Check status' })).toBeVisible();
  expect(screen.queryByText('paymentReceived')).not.toBeInTheDocument();
});

it('keeps Payme confirmation visible after the storefront payment window closes', async () => {
  await show('PAYME', 'PROCESSING', false);
  expect(screen.getByText('paymentProcessingText')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Check status' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Pay' })).not.toBeInTheDocument();
});

it('shows the receipt confirmation only after the server records the payment', async () => {
  await show('CLICK', 'PAID', false);
  expect(screen.getByText('paymentReceived')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Check status' })).not.toBeInTheDocument();
});
