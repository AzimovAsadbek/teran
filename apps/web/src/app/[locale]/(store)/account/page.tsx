import {
  isStaffRole,
  type CurrentUserDto,
  type Locale,
  type OrderDto,
  type Paginated,
} from '@teran/contracts';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense, type ReactNode } from 'react';
import { ChangePasswordForm, LogoutButton, ProfileForm } from '@/components/account/account-forms';
import { ButtonLink } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, getPathname } from '@/i18n/navigation';
import { apiGetAsVisitor } from '@/lib/api/server';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({ title: t('metaTitle'), href: '/account', locale, noIndex: true });
}

const STATUS_TONE: Record<OrderDto['status'], string> = {
  PENDING: 'bg-gold-100 text-gold-800',
  CONFIRMED: 'bg-leaf-100 text-leaf-600',
  PROCESSING: 'bg-leaf-100 text-leaf-600',
  SHIPPED: 'bg-leaf-100 text-leaf-600',
  DELIVERED: 'bg-forest-900 text-ivory-50',
  CANCELLED: 'bg-sage-200 text-ink-700',
};

function Panel({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-[var(--radius-panel)] bg-white p-6 sm:p-8">
      <h2 className="font-display text-2xl font-semibold text-forest-900">{title}</h2>
      {text ? <p className="mt-1 text-sm text-ink-500">{text}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

async function Dashboard() {
  const locale = (await rootParams.locale()) as Locale;
  const [t, tc] = await Promise.all([getTranslations('Account'), getTranslations('Checkout')]);
  const user = await apiGetAsVisitor<CurrentUserDto>('/auth/me');
  if (!user) redirect(getPathname({ href: '/account/login?next=/account', locale }));
  const orders = await apiGetAsVisitor<Paginated<OrderDto>>('/account/orders?pageSize=20').catch(
    () => null,
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-gold-700">{t('title')}</p>
          <h1 className="text-display-lg mt-2 text-forest-900">
            {t('welcome', { name: user.firstName })}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStaffRole(user.role) ? (
            <ButtonLink href="/admin" variant="secondary">
              <ShieldCheck aria-hidden className="h-4 w-4" />
              {t('staffArea')}
            </ButtonLink>
          ) : null}
          <LogoutButton />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        <Panel title={t('orders')}>
          {!orders || orders.items.length === 0 ? (
            <div>
              <p className="text-ink-700">{t('noOrders')}</p>
              <ButtonLink href="/catalog" variant="secondary" className="mt-5">
                {tc('continueShopping')}
              </ButtonLink>
            </div>
          ) : (
            <ul className="divide-y divide-ivory-200">
              {orders.items.map((order) => (
                <li key={order.number}>
                  <Link
                    href={`/account/orders/${order.number}`}
                    className="group flex items-center gap-4 py-4 transition-colors hover:bg-ivory-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-forest-900">{order.number}</span>
                      <span className="block text-sm text-ink-500">
                        {formatDate(order.createdAt, locale)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        STATUS_TONE[order.status],
                      )}
                    >
                      {tc(`statuses.${order.status}`)}
                    </span>
                    <Price amount={order.total} className="hidden text-sm sm:block" />
                    <ChevronRight
                      aria-hidden
                      className="h-4 w-4 text-ink-500 transition-transform group-hover:translate-x-0.5"
                    />
                    <span className="sr-only">{t('viewOrder')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div className="space-y-6">
          <Panel title={t('profile')} text={t('profileText')}>
            <ProfileForm user={user} />
          </Panel>
          <Panel title={t('changePassword')} text={t('passwordText')}>
            <ChangePasswordForm />
          </Panel>
        </div>
      </div>
    </>
  );
}

export default function AccountPage() {
  return (
    <div className="container-page pt-10 pb-24">
      <Suspense
        fallback={
          <div className="space-y-6" aria-hidden>
            <Skeleton className="h-16 w-2/3" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-80 rounded-[var(--radius-panel)]" />
              <Skeleton className="h-80 rounded-[var(--radius-panel)]" />
            </div>
          </div>
        }
      >
        <Dashboard />
      </Suspense>
    </div>
  );
}
