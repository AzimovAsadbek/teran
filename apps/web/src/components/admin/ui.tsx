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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-4xl font-semibold text-forest-900">{title}</h1>
        {description ? <div className="mt-1 text-ink-700">{description}</div> : null}
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
    <section
      className={cn(
        'rounded-[var(--radius-card)] border border-ivory-200 bg-white p-5 sm:p-6',
        className,
      )}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="text-lg font-semibold text-forest-900">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Table styling shared by every admin list (tables scroll horizontally on small screens). */
export const table = {
  wrapper: 'overflow-x-auto rounded-[var(--radius-card)] border border-ivory-200 bg-white',
  table: 'w-full min-w-[40rem] text-left text-sm',
  th: 'border-b border-ivory-200 bg-ivory-50 px-4 py-3 text-xs font-semibold tracking-wide text-ink-500 uppercase',
  td: 'border-b border-ivory-100 px-4 py-3 align-middle text-ink-900',
  link: 'font-semibold text-forest-900 underline-offset-4 hover:underline',
};

type Tone = 'gold' | 'leaf' | 'dark' | 'muted' | 'danger' | 'blue';

const TONES: Record<Tone, string> = {
  gold: 'bg-gold-100 text-gold-800',
  leaf: 'bg-leaf-100 text-leaf-600',
  dark: 'bg-forest-900 text-ivory-50',
  muted: 'bg-sage-200 text-ink-700',
  danger: 'bg-danger-100 text-danger-700',
  blue: 'bg-ivory-200 text-forest-900',
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        TONES[tone],
      )}
    >
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
    <p className="rounded-[var(--radius-card)] border border-dashed border-ivory-300 bg-white px-6 py-12 text-center text-ink-500">
      {children ?? t('common.empty')}
    </p>
  );
}

export async function AccessDenied({ adminOnly = false }: { adminOnly?: boolean }) {
  const t = await getTranslations('Admin');
  return (
    <p role="alert" className="rounded-[var(--radius-card)] bg-gold-100 px-6 py-5 text-gold-800">
      {adminOnly ? t('access.adminOnly') : t('access.loadError')}
    </p>
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
          className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink-500"
        />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder ?? t('common.searchPlaceholder')}
          className="h-11 w-full rounded-full border border-sage-500 bg-white pr-4 pl-11 text-sm outline-none focus:border-forest-700 focus:ring-2 focus:ring-forest-700/15"
        />
      </label>
      {children}
      <button
        type="submit"
        className="h-11 rounded-full bg-forest-900 px-5 text-sm font-semibold text-ivory-50 hover:bg-forest-800"
      >
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
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink-500">
      {label}
      <select
        name={name}
        defaultValue={value ?? ''}
        className="h-11 rounded-full border border-sage-500 bg-white px-4 text-sm font-normal text-ink-900 outline-none focus:border-forest-700"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
