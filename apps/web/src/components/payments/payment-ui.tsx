import type { PaymentMethod, PaymentStatus } from '@teran/contracts';
import { Check, ChevronRight, CreditCard, Wallet } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const steps = ['details', 'confirm', 'result'] as const;

export function CheckoutSteps({ current }: { current: (typeof steps)[number] }) {
  const t = useTranslations('Checkout');
  return (
    <ol
      aria-label={t('paymentSteps.label')}
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-helper sm:gap-x-3"
    >
      {steps.map((step, index) => (
        <li
          key={step}
          aria-current={step === current ? 'step' : undefined}
          className={cn(
            'inline-flex items-center gap-1.5',
            step === current ? 'font-bold text-brand' : 'text-fg-subtle',
          )}
        >
          {index > 0 && <ChevronRight aria-hidden className="mr-0.5 size-3.5 text-fg-subtle" />}
          {index < steps.indexOf(current) && <Check aria-hidden className="size-3.5 text-brand" />}
          {t(`paymentSteps.${step}`)}
        </li>
      ))}
    </ol>
  );
}

export function PaymentShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[76rem] px-4 pt-6 pb-[max(3rem,env(safe-area-inset-bottom))] min-[390px]:px-5 sm:px-8 sm:pt-10 lg:px-12 lg:pb-20">
      {children}
    </div>
  );
}

/** Original merchant wordmarks, served locally. CLICK provides a light wordmark for dark surfaces. */
export function ProviderMark({ method, name }: { method: PaymentMethod; name: string }) {
  if (method !== 'CLICK' && method !== 'PAYME') {
    const Icon = method === 'CASH_ON_DELIVERY' ? Wallet : CreditCard;
    return (
      <span className="inline-flex items-center gap-2 font-semibold">
        <Icon aria-hidden className="size-5 text-brand" />
        {name}
      </span>
    );
  }
  const click = method === 'CLICK';
  return (
    <span
      className={cn(
        'inline-flex h-9 w-[6.25rem] items-center justify-center rounded-control',
        click ? 'bg-ink-900' : 'border border-line bg-white',
      )}
    >
      <Image
        src={click ? '/brand/payments/click.svg' : '/brand/payments/payme.svg'}
        alt={name}
        width={click ? 71 : 62}
        height={click ? 18 : 22}
        unoptimized
      />
    </span>
  );
}

export const paymentStatusColors = {
  PENDING: 'bg-warning-soft text-warning',
  REQUIRES_ACTION: 'bg-warning-soft text-warning',
  PROCESSING: 'bg-info-soft text-info',
  PAID: 'bg-success-soft text-success',
  FAILED: 'bg-danger-soft text-danger',
  CANCELLED: 'bg-surface-muted text-fg-muted',
  EXPIRED: 'bg-surface-muted text-fg-muted',
  REFUNDED: 'bg-surface-muted text-fg-muted',
  REFUND_PENDING: 'bg-info-soft text-info',
  PARTIALLY_REFUNDED: 'bg-surface-muted text-fg-muted',
} satisfies Record<PaymentStatus, string>;

export function PaymentBadge({ status, label }: { status: PaymentStatus; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit max-w-full items-center gap-2 rounded-full px-2.5 py-1 text-caption leading-snug font-semibold',
        paymentStatusColors[status],
      )}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
