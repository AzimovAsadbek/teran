import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { cartActions, useCart } from './cart-store';
import { apiRequest } from '@/lib/api/client';
vi.mock('@/lib/api/client', () => ({ apiRequest: vi.fn() }));

it('orders responses from this tab and discards a pre-checkout refresh after clearing the cart', async () => {
  const call = vi.mocked(apiRequest);
  let finish: (cart: unknown) => void = () => {};
  call
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce({ itemCount: 2 })
    .mockResolvedValueOnce({ itemCount: 3 });
  const { result } = renderHook(useCart);
  let operations: Promise<unknown>;
  act(() => {
    operations = Promise.all([
      cartActions.load('uz', true),
      cartActions.add('tea', 1, 'uz'),
      cartActions.add('tea', 1, 'uz'),
    ]);
  });
  await waitFor(() => expect(call).toHaveBeenCalledTimes(1));
  await act(async () => {
    finish({ itemCount: 1 });
    await operations;
  });
  expect(result.current.cart?.itemCount).toBe(3);
  call.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let reading: Promise<void>;
  act(() => {
    reading = cartActions.load('uz', true);
  });
  await waitFor(() => expect(call).toHaveBeenCalledTimes(4));
  await act(async () => {
    cartActions.clear();
    finish({ itemCount: 3 });
    await reading;
  });
  expect(result.current.cart?.itemCount).toBe(0);
});
