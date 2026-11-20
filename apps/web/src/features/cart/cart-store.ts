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
  /** The pack most recently added, so the bag can point it out; cleared when the bag closes. */
  lastAdded: { variantId: string; at: number } | null;
}

const INITIAL: CartState = {
  status: 'idle',
  cart: null,
  pendingKey: null,
  error: null,
  drawerOpen: false,
  lastAdded: null,
};

let state: CartState = INITIAL;
const listeners = new Set<() => void>();

// All reads and mutations from this tab share a queue, including refreshes from another tab.
let queue = Promise.resolve();
let generation = 0;
let currentLocale: Locale | undefined;
let channel: BroadcastChannel | undefined;
function enqueue<T>(action: () => Promise<T>): Promise<T> {
  const result = queue.then(action);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
function syncTabs(locale: Locale) {
  currentLocale = locale;
  if (!channel && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('teran-cart');
    channel.onmessage = () => {
      if (currentLocale) void cartActions.load(currentLocale, true);
    };
  }
}

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

async function run(
  locale: Locale,
  pendingKey: string,
  request: () => Promise<CartDto>,
): Promise<CartDto | null> {
  syncTabs(locale);
  const started = generation;
  const write = async () => {
    if (started !== generation) return null;
    setState({ pendingKey, error: null });
    try {
      const cart = await request();
      if (started !== generation) return null;
      setState({ cart, status: 'ready', pendingKey: null });
      channel?.postMessage('changed');
      return cart;
    } catch (error) {
      if (started !== generation) return null;
      setState({
        pendingKey: null,
        error: error instanceof ApiError ? error : new ApiError(0, null),
      });
      return null;
    }
  };
  // Two new tabs share a cookie jar before either has a cart cookie. Wait for the first
  // response to install that cookie before the next tab sends its first add.
  return enqueue(() => navigator.locks?.request('teran-cart-write', write) ?? write());
}

export const cartActions = {
  /** Loads the cart once per page session (and again if the locale changes). */
  async load(locale: Locale, force = false): Promise<void> {
    syncTabs(locale);
    if (!force && (state.status === 'loading' || state.status === 'ready')) return;
    const started = generation;
    setState({ status: 'loading' });
    await enqueue(async () => {
      try {
        const cart = await apiRequest<CartDto>(`/cart?locale=${locale}`);
        if (generation === started) setState({ cart, status: 'ready' });
      } catch (error) {
        if (generation !== started) return;
        setState({
          status: 'error',
          error: error instanceof ApiError ? error : new ApiError(0, null),
        });
      }
    });
  },

  async add(variantId: string, quantity: number, locale: Locale): Promise<boolean> {
    const cart = await run(locale, `add:${variantId}`, () =>
      apiRequest<CartDto>(`/cart/items?locale=${locale}`, {
        method: 'POST',
        body: { variantId, quantity },
      }),
    );
    if (cart) setState({ drawerOpen: true, lastAdded: { variantId, at: Date.now() } });
    return cart !== null;
  },

  async update(itemId: string, quantity: number, locale: Locale): Promise<void> {
    await run(locale, `line:${itemId}`, () =>
      apiRequest<CartDto>(`/cart/items/${itemId}?locale=${locale}`, {
        method: 'PATCH',
        body: { quantity },
      }),
    );
  },

  async remove(itemId: string, locale: Locale): Promise<void> {
    await run(locale, `line:${itemId}`, () =>
      apiRequest<CartDto>(`/cart/items/${itemId}?locale=${locale}`, { method: 'DELETE' }),
    );
  },

  /** After checkout the server has emptied the cart; reflect it without another request. */
  clear(): void {
    generation++;
    channel?.postMessage('changed');
    setState({
      status: state.cart ? 'ready' : 'idle',
      pendingKey: null,
      error: null,
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
    setState({ drawerOpen: false, lastAdded: null });
  },

  dismissError(): void {
    setState({ error: null });
  },
};
