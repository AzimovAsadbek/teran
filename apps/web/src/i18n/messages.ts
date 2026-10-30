import type { Locale } from '@teran/contracts';
import type uz from '../../messages/uz.json';

export type Messages = typeof uz;

/** Uzbek is the source catalogue; the other locales must provide the same keys. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  switch (locale) {
    case 'ru':
      return (await import('../../messages/ru.json')).default;
    case 'en':
      return (await import('../../messages/en.json')).default;
    default:
      return (await import('../../messages/uz.json')).default;
  }
}

type Namespace = keyof Messages;

/**
 * A whole namespace ("Checkout"), or one entry of it ("Checkout.regionPlaceholder") for a client
 * component that needs a single message from a large namespace.
 */
export type MessagePick = {
  [N in Namespace]: N | `${N}.${Extract<keyof Messages[N], string>}`;
}[Namespace];

export type PickedMessages = { [N in Namespace]?: Partial<Messages[N]> };

/** Picks the messages a client subtree needs, so pages don't ship the whole catalogue. */
export function pickMessages(messages: Messages, picks: readonly MessagePick[]): PickedMessages {
  const picked: Record<string, Record<string, unknown>> = {};
  for (const pick of picks) {
    const [namespace, key] = pick.split('.') as [Namespace, string?];
    const entries: Record<string, unknown> = messages[namespace];
    picked[namespace] = key === undefined ? entries : { ...picked[namespace], [key]: entries[key] };
  }
  return picked as PickedMessages;
}

/**
 * Messages read by the client components of every storefront page: the header, the footer, the
 * bag drawer, the chat and the promotion. Pages add what their own client components read with
 * <ClientMessages> (checked by scripts/check-client-messages.mjs, ADR-020); long-form page copy
 * stays on the server.
 */
export const STORE_CLIENT_MESSAGES = [
  'Common',
  'Nav',
  'Language',
  'Cart',
  'Product',
  'Search',
  'Errors',
  'Newsletter',
  'Social',
  'Chat',
  // The footer's newsletter form only reports an invalid address; form pages add the rest.
  'Validation.invalid_email',
  // A product card's brewing line, on every page that shows cards.
  'Brewing.celsius',
  'Brewing.celsiusRange',
  'Brewing.minutes',
  'Brewing.minutesSingle',
] as const satisfies readonly MessagePick[];

/** The checkout group's own set: its header and footer are server-rendered. */
export const CHECKOUT_CLIENT_MESSAGES = [
  'Common',
  'Errors',
  'Cart',
  'Checkout',
  'Product',
  'Validation',
] as const satisfies readonly MessagePick[];
