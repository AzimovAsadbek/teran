'use client';

import type { Locale } from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/cn';

/**
 * Plain links (not a script-driven select): crawlable, works without JavaScript, and each link
 * declares the language it leads to.
 */
export function LanguageSwitcher({
  tone = 'dark',
  className,
}: {
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const t = useTranslations('Language');
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t('change')} className={cn('flex items-center', className)}>
      <ul className="flex items-center gap-0.5">
        {routing.locales.map((locale: Locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? 'true' : undefined}
                title={t(`names.${locale}`)}
                className={cn(
                  'inline-flex min-h-8 min-w-9 items-center justify-center rounded-full px-2 text-xs font-bold tracking-[0.12em] transition-colors',
                  tone === 'dark'
                    ? active
                      ? 'bg-ivory-50/15 text-gold-300'
                      : 'text-ivory-100/85 hover:text-ivory-50'
                    : active
                      ? 'bg-forest-900 text-ivory-50'
                      : 'text-forest-900 hover:bg-forest-900/[0.06]',
                )}
              >
                <span className="sr-only">{t(`names.${locale}`)}</span>
                <span aria-hidden>{t(`short.${locale}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
