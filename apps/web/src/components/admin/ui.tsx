import type {
  ArticleStatus,
  InquiryStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from '@teran/contracts';
import { Search, X } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { inputClasses, SelectChevron, selectClasses } from '@/components/ui/controls';
import { Notice } from '@/components/ui/notice';
import { getPathname, Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { FilterFormShell } from './filter-form';
import { Pill, type Tone } from './pill';

export { Cell, table } from './table';

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        <h1 className="text-display-md text-forest-900">{title}</h1>
        {description ? (
          <div className="mt-1.5 max-w-3xl text-body text-fg-muted">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-card border border-line bg-surface p-5 sm:p-6', className)}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="text-title-lg text-fg">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export { Pill } from './pill';

const ORDER_TONES: Record<OrderStatus, Tone> = {
  PENDING: 'gold',
  CONFIRMED: 'blue',
  PROCESSING: 'blue',
  SHIPPED: 'leaf',
  DELIVERED: 'dark',
  CANCELLED: 'muted',
};
const PAYMENT_TONES: Record<PaymentStatus, Tone> = {
  PENDING: 'gold',
  REQUIRES_ACTION: 'gold',
  PROCESSING: 'blue',
  PAID: 'leaf',
  FAILED: 'danger',
  EXPIRED: 'danger',
  REFUND_PENDING: 'blue',
  PARTIALLY_REFUNDED: 'muted',
  REFUNDED: 'muted',
  CANCELLED: 'muted',
};
const PRODUCT_TONES: Record<ProductStatus, Tone> = {
  DRAFT: 'gold',
  ACTIVE: 'leaf',
  ARCHIVED: 'muted',
};
const INQUIRY_TONES: Record<InquiryStatus, Tone> = {
  NEW: 'gold',
  IN_PROGRESS: 'blue',
  RESOLVED: 'leaf',
  SPAM: 'muted',
};
const ARTICLE_TONES: Record<ArticleStatus, Tone> = {
  DRAFT: 'gold',
  PUBLISHED: 'leaf',
  ARCHIVED: 'muted',
};

/** Order status in the words staff use ("New", "Being packed"), not the customer's wording. */
export async function OrderStatusPill({ status }: { status: OrderStatus }) {
  const t = await getTranslations('Admin');
  return <Pill tone={ORDER_TONES[status]}>{t(`orderStatus.${status}`)}</Pill>;
}

export async function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  const t = await getTranslations('Checkout');
  return <Pill tone={PAYMENT_TONES[status]}>{t(`paymentStatuses.${status}`)}</Pill>;
}

export async function ProductStatusPill({ status }: { status: ProductStatus }) {
  const t = await getTranslations('Admin');
  return <Pill tone={PRODUCT_TONES[status]}>{t(`productStatus.${status}`)}</Pill>;
}

export async function InquiryStatusPill({ status }: { status: InquiryStatus }) {
  const t = await getTranslations('Admin');
  return <Pill tone={INQUIRY_TONES[status]}>{t(`inquiryStatus.${status}`)}</Pill>;
}

export async function ArticleStatusPill({ status }: { status: ArticleStatus }) {
  const t = await getTranslations('Admin');
  return <Pill tone={ARTICLE_TONES[status]}>{t(`articleStatus.${status}`)}</Pill>;
}

export async function EmptyState({ children }: { children?: ReactNode }) {
  const t = await getTranslations('Admin');
  return (
    <div className="rounded-card border border-dashed border-line-strong/50 bg-surface px-6 py-12 text-center text-body text-fg-subtle">
      {children ?? t('common.empty')}
    </div>
  );
}

export async function AccessDenied({ adminOnly = false }: { adminOnly?: boolean }) {
  const t = await getTranslations('Admin');
  return (
    <Notice tone="warning" role="alert">
      {adminOnly ? t('access.adminOnly') : t('access.loadError')}
    </Notice>
  );
}

/**
 * A list's search box and filters (see FilterFormShell: options apply at once). `active` shows a
 * link that clears every filter.
 */
export async function FilterForm({
  action,
  q,
  placeholder,
  active = false,
  children,
}: {
  action: string;
  q?: string;
  placeholder?: string;
  active?: boolean;
  children?: ReactNode;
}) {
  const [t, locale] = await Promise.all([getTranslations('Admin'), getLocale()]);
  return (
    <FilterFormShell
      action={getPathname({ href: action, locale })}
      className="mb-5 flex flex-wrap items-end gap-3"
    >
      <label className="relative min-w-[min(16rem,100%)] flex-1">
        <span className="sr-only">{t('common.search')}</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-fg-subtle"
        />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder ?? t('common.searchPlaceholder')}
          className={inputClasses({ size: 'sm', className: 'pl-10' })}
        />
      </label>
      {children}
      <button type="submit" className={buttonClasses('primary', 'md')}>
        {t('common.search')}
      </button>
      {active ? (
        <Link href={action} className={buttonClasses('ghost', 'md')}>
          <X aria-hidden className="h-4 w-4" />
          {t('common.clearFilters')}
        </Link>
      ) : null}
    </FilterFormShell>
  );
}

export function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-label text-fg-muted">
      {label}
      <span className="relative">
        <select
          name={name}
          defaultValue={value ?? ''}
          className={selectClasses({
            size: 'sm',
            fullWidth: false,
            className: 'min-w-36 font-normal',
          })}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <SelectChevron />
      </span>
    </label>
  );
}

/**
 * Status tabs above a list: one link per status with the number of items waiting in it, so the
 * work queue is visible at a glance (and a status is one tap away).
 */
export function StatusTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: readonly { href: string; label: string; count?: number; current: boolean }[];
}) {
  return (
    <nav aria-label={label} className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-full border border-line bg-surface p-1">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={tab.current ? 'page' : undefined}
              className={cn(
                'inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 text-body-sm font-semibold whitespace-nowrap transition-colors',
                tab.current ? 'bg-brand text-fg-inverse' : 'text-forest-900 hover:bg-surface-muted',
              )}
            >
              {tab.label}
              {tab.count ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-caption tabular-nums',
                    tab.current ? 'bg-fg-inverse/20' : 'bg-gold-100 text-gold-800',
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
