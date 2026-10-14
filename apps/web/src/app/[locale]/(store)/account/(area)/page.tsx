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
  PENDING: 'bg-warning-soft text-warning',
  CONFIRMED: 'bg-success-soft text-success',
  PROCESSING: 'bg-success-soft text-success',
  SHIPPED: 'bg-success-soft text-success',
  DELIVERED: 'bg-surface-inverse text-fg-inverse',
  CANCELLED: 'bg-surface-sunken text-fg-muted',
};

function Panel({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-panel border border-line bg-surface p-6 sm:p-8">
      <h2 className="text-display-sm text-forest-900">{title}</h2>
      {text ? <p className="mt-1 text-body-sm text-fg-subtle">{text}</p> : null}
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
          <p className="text-eyebrow text-accent-fg">{t('title')}</p>
          <h1 className="mt-2 text-display-lg text-forest-900">
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
              <p className="text-body text-fg-muted">{t('noOrders')}</p>
              <ButtonLink href="/catalog" variant="secondary" className="mt-5">
                {tc('continueShopping')}
              </ButtonLink>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {orders.items.map((order) => (
                <li key={order.number}>
                  <Link
                    href={`/account/orders/${order.number}`}
                    className="group -mx-3 flex items-center gap-4 rounded-control px-3 py-4 transition-colors hover:bg-surface-muted/70"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-title-sm text-fg">{order.number}</span>
                      <span className="block text-body-sm text-fg-subtle">
                        {formatDate(order.createdAt, locale)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-caption font-semibold',
                        STATUS_TONE[order.status],
                      )}
                    >
                      {tc(`statuses.${order.status}`)}
                    </span>
                    <Price amount={order.total} className="hidden text-body-sm sm:block" />
                    <ChevronRight
                      aria-hidden
                      className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5"
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
    <div className="container-page pt-8 pb-section sm:pt-10">
      <Suspense
        fallback={
          <div className="space-y-6" aria-hidden>
            <Skeleton className="h-16 w-2/3" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-80 rounded-panel" />
              <Skeleton className="h-80 rounded-panel" />
            </div>
          </div>
        }
      >
        <Dashboard />
      </Suspense>
    </div>
  );
}
