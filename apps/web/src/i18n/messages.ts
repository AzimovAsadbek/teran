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

/** Picks the namespaces a client subtree needs, so pages don't ship the whole catalogue. */
export function pickMessages<K extends keyof Messages>(
  messages: Messages,
  namespaces: readonly K[],
): Pick<Messages, K> {
  const picked = {} as Pick<Messages, K>;
  for (const namespace of namespaces) {
    picked[namespace] = messages[namespace];
  }
  return picked;
}
