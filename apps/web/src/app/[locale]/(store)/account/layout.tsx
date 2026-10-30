import { ClientMessages } from '@/i18n/client-messages';

/** Sign-in pages and the customer's area: their menu and forms read Account, the forms Validation. */
export default function AccountLayout({ children }: LayoutProps<'/[locale]/account'>) {
  return <ClientMessages pick={['Account', 'Validation']}>{children}</ClientMessages>;
}
