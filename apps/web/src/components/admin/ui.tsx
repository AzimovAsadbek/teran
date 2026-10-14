import type {
  ArticleStatus,
  InquiryStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from '@teran/contracts';
import { Search } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { getPathname } from '@/i18n/navigation';
import type { ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { inputClasses, SelectChevron, selectClasses } from '@/components/ui/controls';
import { Notice } from '@/components/ui/notice';
import { cn } from '@/lib/cn';

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
        {description ? <div className="mt-1.5 text-body text-fg-muted">{description}</div> : null}
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

/** Table styling shared by every admin list (tables scroll horizontally on small screens). */
export const table = {
  wrapper: 'overflow-x-auto rounded-card border border-line bg-surface',
  table:
    'w-full min-w-[40rem] text-left text-body-sm text-fg [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-surface-muted/50',
  th: 'border-b border-line bg-surface-muted/60 px-4 py-3 text-caption font-semibold tracking-[0.06em] whitespace-nowrap text-fg-subtle uppercase',
  td: 'border-b border-line-subtle px-4 py-3 align-middle',
  link: 'font-semibold text-brand underline-offset-4 hover:underline',
};

type Tone = 'gold' | 'leaf' | 'dark' | 'muted' | 'danger' | 'blue';

const TONES: Record<Tone, string> = {
  gold: 'bg-warning-soft text-warning',
  leaf: 'bg-success-soft text-success',
  dark: 'bg-surface-inverse text-fg-inverse',
  muted: 'bg-surface-sunken text-fg-muted',
  danger: 'bg-danger-soft text-danger',
  blue: 'bg-info-soft text-info',
};

/** Status label: a dot and text (the colour supports the word, never replaces it). */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap',
        TONES[tone],
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}

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
  PAID: 'leaf',
  FAILED: 'danger',
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
const ARTICLE_TONES: Record<ArticleStatus, Tone> = { DRAFT: 'gold', PUBLISHED: 'leaf' };

export async function OrderStatusPill({ status }: { status: OrderStatus }) {
  const t = await getTranslations('Checkout');
  return <Pill tone={ORDER_TONES[status]}>{t(`statuses.${status}`)}</Pill>;
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
    <p className="rounded-card border border-dashed border-line-strong/50 bg-surface px-6 py-12 text-center text-body text-fg-subtle">
      {children ?? t('common.empty')}
    </p>
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
 * Filters as a plain GET form: every filter is part of the URL, so lists can be bookmarked and
 * shared, and the browser's back button works.
 */
export async function FilterForm({
  action,
  q,
  placeholder,
  children,
}: {
  action: string;
  q?: string;
  placeholder?: string;
  children?: ReactNode;
}) {
  const [t, locale] = await Promise.all([getTranslations('Admin'), getLocale()]);
  return (
    <form
      action={getPathname({ href: action, locale })}
      method="get"
      className="mb-5 flex flex-wrap items-end gap-3"
      role="search"
    >
      <label className="relative min-w-[16rem] flex-1">
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
    </form>
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
