/** A way to reach TERAN offered in the chat (a network, or a phone number). */
export interface ChatChannel {
  href: string;
  label: string;
  /** Opens in a new tab (a network's site). */
  external: boolean;
}

/** Dispatched on `window` to open the chat from elsewhere on the page (the contact page's card). */
export const OPEN_CHAT_EVENT = 'teran:open-chat';
