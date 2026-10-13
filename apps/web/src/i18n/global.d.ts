import type { Locale } from '@teran/contracts';
import type { Messages } from './messages';

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
