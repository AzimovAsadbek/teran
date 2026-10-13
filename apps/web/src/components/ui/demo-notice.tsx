import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';
import { isDemoContent } from '@/lib/site';

/**
 * States that products, prices and images are placeholders. Rendered only while the demonstration
 * catalogue is live (NEXT_PUBLIC_DEMO_CONTENT), wherever shoppers read prices or place orders, so
 * the notice does not depend on the announcement bar being free.
 */
export function DemoNotice({ className }: { className?: string }) {
  const t = useTranslations('Common');
  if (!isDemoContent) return null;
  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2.5 rounded-xl bg-gold-100 px-4 py-3 text-sm text-gold-800',
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{t('demoNotice')}</span>
    </p>
  );
}
