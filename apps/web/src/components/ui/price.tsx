import type { Money } from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';

interface PriceProps {
  amount: Money;
  compareAt?: Money | null;
  /** Shows "from 45 000 soʻm" when a product has several pack sizes. */
  from?: boolean;
  className?: string;
}

/**
 * Price with an optional struck-through previous price, in lining figures (proportional: tabular
 * spacing leaves visible gaps around the 1 in Onest; columns align on the right edge instead).
 * The size comes from the caller (`className`); works in server and client components.
 */
export function Price({ amount, compareAt, from = false, className }: PriceProps) {
  const locale = useLocale();
  const t = useTranslations('Common');
  const currency = t('currency.UZS');
  const current = formatMoney(amount, locale, currency);

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2 lining-nums', className)}>
      <span className={cn('font-semibold', compareAt ? 'text-danger' : 'text-fg')}>
        {from ? t('priceFrom', { price: current }) : current}
      </span>
      {compareAt ? (
        <span className="text-[0.875em] font-normal text-fg-subtle line-through">
          <span className="sr-only">{t('compareAtLabel')} </span>
          {formatMoney(compareAt, locale, currency)}
        </span>
      ) : null}
    </span>
  );
}
