'use client';

import type { Locale } from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/cn';

type Tone = 'dark' | 'light';

/**
 * Plain links (not a script-driven select): crawlable, works without JavaScript, and each link
 * declares the language it leads to.
 */
function LocaleLinks({ pathname, tone, className }: { pathname: string; tone: Tone; className?: string }) {
  const t = useTranslations('Language');
  const current = useLocale();

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

function CurrentPageLocaleLinks({ tone, className }: { tone: Tone; className?: string }) {
  const pathname = usePathname();
  return <LocaleLinks pathname={pathname} tone={tone} className={className} />;
}

/**
 * Switches language while staying on the same page. The current path is URL data, so on dynamic
 * routes it streams in; until then the links point to each language's home page.
 */
export function LanguageSwitcherSlot({ tone = 'dark', className }: { tone?: Tone; className?: string }) {
  return (
    <Suspense fallback={<LocaleLinks pathname="/" tone={tone} className={className} />}>
      <CurrentPageLocaleLinks tone={tone} className={className} />
    </Suspense>
  );
}
