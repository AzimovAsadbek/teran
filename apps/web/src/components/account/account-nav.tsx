'use client';

import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

const SECTIONS = [
  ['/account', 'overview'],
  ['/account/orders', 'orders'],
  ['/account/purchases', 'purchases'],
  ['/account/addresses', 'addresses'],
  ['/account/profile', 'profile'],
  ['/account/security', 'security'],
] as const;

/**
 * Account sections: a scrollable tab row on phones, a sidebar from 1024 px. The links render in
 * the static shell; which one is current is known once the request's path is (inside Suspense).
 */
export function AccountNav() {
  return (
    <Suspense fallback={<AccountNavLinks pathname={null} />}>
      <CurrentAccountNav />
    </Suspense>
  );
}

function CurrentAccountNav() {
  return <AccountNavLinks pathname={usePathname()} />;
}

function AccountNavLinks({ pathname }: { pathname: string | null }) {
  const t = useTranslations('Account');
  const current = (href: string) =>
    pathname !== null &&
    (href === '/account' ? pathname === '/account' : pathname.startsWith(href));

  return (
    <nav aria-label={t('sections')}>
      <ul className="-mx-gutter flex gap-1.5 overflow-x-auto px-gutter pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
        {SECTIONS.map(([href, key]) => {
          const active = current(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center rounded-control px-3.5 text-body-sm font-medium whitespace-nowrap transition-colors duration-150 lg:px-4',
                  active
                    ? 'bg-brand text-fg-inverse lg:bg-brand-soft lg:text-forest-900 lg:shadow-[inset_3px_0_0_var(--color-brand)]'
                    : 'border border-line bg-surface text-fg hover:border-brand/50 lg:border-transparent lg:bg-transparent lg:hover:bg-surface-muted',
                )}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
