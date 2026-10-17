import { Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { QUICK_ACTION } from './quick-action';

/**
 * In the quick-add's place while the shop shows no prices (lib/site `showPrices`): the same pill
 * (a round phone button on touch screens), leading to the product page's ordering block, where its
 * phones and messengers are.
 */
export function OrderAction({ href, productName }: { href: string; productName: string }) {
  const t = useTranslations('Product');
  return (
    <Link
      href={`${href}#order`}
      aria-label={t('orderAction', { name: productName })}
      className={QUICK_ACTION}
    >
      <Phone
        aria-hidden
        className="h-[1.125rem] w-[1.125rem] pointer-fine:hidden"
        strokeWidth={2}
      />
      <span
        aria-hidden
        className="hidden truncate text-[1rem] leading-6 font-medium pointer-fine:inline"
      >
        {t('orderNow')}
      </span>
    </Link>
  );
}
