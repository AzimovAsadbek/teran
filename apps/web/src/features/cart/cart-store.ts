'use client';

import type { CartDto, Locale } from '@teran/contracts';
import { useSyncExternalStore } from 'react';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

/**
 * The one piece of shared client state: the visitor's cart. Every mutation is sent to the API,
 * which re-prices and re-validates the cart and returns it; the UI never computes totals itself.
 */
export interface CartState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  cart: CartDto | null;
  /** Variant currently being added or line being changed (for per-button pending states). */
  pendingKey: string | null;
  error: ApiError | null;
  drawerOpen: boolean;
}

const INITIAL: CartState = {
  status: 'idle',
  cart: null,
  pendingKey: null,
  error: null,
  drawerOpen: false,
};

let state: CartState = INITIAL;
const listeners = new Set<() => void>();

function setState(patch: Partial<CartState>): void {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart(): CartState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
}

async function run(pendingKey: string, request: () => Promise<CartDto>): Promise<CartDto | null> {
  setState({ pendingKey, error: null });
  try {
    const cart = await request();
    setState({ cart, status: 'ready', pendingKey: null });
    return cart;
  } catch (error) {
    setState({
      pendingKey: null,
      error: error instanceof ApiError ? error : new ApiError(0, null),
    });
    return null;
  }
}

export const cartActions = {
  /** Loads the cart once per page session (and again if the locale changes). */
  async load(locale: Locale, force = false): Promise<void> {
    if (!force && (state.status === 'loading' || state.status === 'ready')) return;
    setState({ status: 'loading' });
    try {
      const cart = await apiRequest<CartDto>(`/cart?locale=${locale}`);
      setState({ cart, status: 'ready' });
    } catch (error) {
      setState({
        status: 'error',
        error: error instanceof ApiError ? error : new ApiError(0, null),
      });
    }
  },

  async add(variantId: string, quantity: number, locale: Locale): Promise<boolean> {
    const cart = await run(`add:${variantId}`, () =>
      apiRequest<CartDto>(`/cart/items?locale=${locale}`, {
        method: 'POST',
        body: { variantId, quantity },
      }),
    );
    if (cart) setState({ drawerOpen: true });
    return cart !== null;
  },

  async update(itemId: string, quantity: number, locale: Locale): Promise<void> {
    await run(`line:${itemId}`, () =>
      apiRequest<CartDto>(`/cart/items/${itemId}?locale=${locale}`, {
        method: 'PATCH',
        body: { quantity },
      }),
    );
  },

  async remove(itemId: string, locale: Locale): Promise<void> {
    await run(`line:${itemId}`, () =>
      apiRequest<CartDto>(`/cart/items/${itemId}?locale=${locale}`, { method: 'DELETE' }),
    );
  },

  /** After checkout the server has emptied the cart; reflect it without another request. */
  clear(): void {
    setState({
      cart: state.cart
        ? {
            ...state.cart,
            lines: [],
            itemCount: 0,
            subtotal: '0.00',
            isCheckoutReady: false,
            deliveryHint: null,
          }
        : null,
    });
  },

  openDrawer(): void {
    setState({ drawerOpen: true });
  },

  closeDrawer(): void {
    setState({ drawerOpen: false });
  },

  dismissError(): void {
    setState({ error: null });
  },
};
