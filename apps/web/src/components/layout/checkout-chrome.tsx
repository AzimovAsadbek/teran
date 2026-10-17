import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Wordmark } from '@/components/brand/logo';
import { Link } from '@/i18n/navigation';
import { CurrentYear } from './site-footer';

/** Checkout header: back to the bag on the left, the wordmark in the centre, nothing else. */
export async function CheckoutHeader() {
  const t = await getTranslations('Checkout');
  const tc = await getTranslations('Common');
  return (
    <header className="border-b border-line-subtle bg-canvas">
      <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 xl:h-[4.75rem]">
        <Link
          href="/cart"
          className="-ml-2 inline-flex h-11 items-center gap-2 justify-self-start rounded-control px-2 text-body-sm font-semibold text-brand transition-colors hover:bg-brand/[0.06]"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          <span className="hidden sm:inline">{t('editCart')}</span>
          <span className="sr-only sm:hidden">{t('editCart')}</span>
        </Link>
        <Link
          href="/"
          aria-label={`TERAN — ${tc('home')}`}
          className="flex justify-center rounded-control py-1"
        >
          <Wordmark eager />
        </Link>
        <span aria-hidden />
      </div>
    </header>
  );
}

/** Checkout footer: the policies a customer may want to read before ordering. */
export async function CheckoutFooter() {
  const t = await getTranslations('Footer');
  const tn = await getTranslations('Nav');
  const links = [
    { href: '/delivery', label: tn('delivery') },
    { href: '/returns', label: t('returns') },
    { href: '/terms', label: t('terms') },
    { href: '/privacy', label: t('privacy') },
  ] as const;
  return (
    <footer className="border-t border-line-subtle">
      <div className="container-page flex flex-col gap-3 py-6 text-helper text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>
          © <CurrentYear /> TERAN. {t('rights')}
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="underline-offset-4 hover:text-fg hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
