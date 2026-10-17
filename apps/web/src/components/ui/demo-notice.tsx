import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { isDemoContent, showPrices } from '@/lib/site';
import { Notice } from './notice';

/**
 * States that products, prices and images are placeholders. Rendered only while the demonstration
 * catalogue is live (NEXT_PUBLIC_DEMO_CONTENT) and the shop shows prices (it speaks of prices and
 * online payment), wherever shoppers read prices or place orders, so the notice does not depend on
 * the announcement bar being free. Deliberately quiet: it informs without competing with the
 * purchase actions. `inline` is a single line of small text (listings and product pages); `box` is
 * a bordered note (checkout).
 */
export function DemoNotice({
  className,
  variant = 'box',
}: {
  className?: string;
  variant?: 'box' | 'inline';
}) {
  const t = useTranslations('Common');
  if (!isDemoContent || !showPrices) return null;
  if (variant === 'inline') {
    return (
      <p role="note" className={cn('flex items-start gap-2 text-helper text-fg-subtle', className)}>
        <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{t('demoNotice')}</span>
      </p>
    );
  }
  return (
    <Notice tone="neutral" role="note" compact className={className}>
      {t('demoNotice')}
    </Notice>
  );
}
