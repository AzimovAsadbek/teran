'use client';

import type { AdminOrderDetail, OrderStatus } from '@teran/contracts';
import { Banknote, Loader2, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { TextAreaField } from '@/components/ui/field';
import { apiRequest } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { ConfirmDialog } from './confirm-dialog';
import { useAdminAction } from './use-admin-action';
import { buttonClasses } from '@/components/ui/button';

/** Next-status buttons, cancellation (with reason) and recording the cash payment. */
export function OrderActions({ order }: { order: AdminOrderDetail }) {
  const t = useTranslations('Admin');
  const tco = useTranslations('Checkout');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const action = useAdminAction();
  const [note, setNote] = useState('');
  const [dialog, setDialog] = useState<'cancel' | 'payment' | null>(null);
  const [reason, setReason] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const forward = order.allowedTransitions.filter((status) => status !== 'CANCELLED');
  const canCancel = order.allowedTransitions.includes('CANCELLED');
  const path = `/admin/orders/${order.number}`;

  async function move(status: OrderStatus, statusNote?: string) {
    const ok = await action.run(() =>
      apiRequest(`${path}/status`, {
        method: 'POST',
        body: { status, note: statusNote || undefined },
      }),
    );
    if (ok) {
      setNote('');
      setReason('');
      setDialog(null);
    }
  }

  async function recordPayment() {
    const ok = await action.run(() =>
      apiRequest(`${path}/payments`, { method: 'POST', body: { note: paymentNote || undefined } }),
    );
    if (ok) {
      setPaymentNote('');
      setDialog(null);
    }
  }

  const nothingToDo = order.allowedTransitions.length === 0 && !order.canRecordPayment;

  return (
    <section
      aria-labelledby="order-actions"
      className="rounded-card border border-line bg-surface p-5 sm:p-6"
    >
      <h2 id="order-actions" className="mb-4 text-body-lg font-semibold text-forest-900">
        {t('orders.actionsSection')}
      </h2>
      {nothingToDo ? (
        <p className="text-body-sm text-fg-subtle">{t('orders.noTransitions')}</p>
      ) : null}

      {forward.length > 0 ? (
        <div className="space-y-3">
          <TextAreaField
            label={t('orders.statusNote')}
            name="note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          {forward.map((status) => (
            <button
              key={status}
              type="button"
              disabled={action.pending}
              onClick={() => void move(status, note)}
              className={buttonClasses('primary', 'md', 'w-full')}
            >
              {action.pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
              {t('orders.moveTo', { status: tco(`statuses.${status}`) })}
            </button>
          ))}
        </div>
      ) : null}

      {order.canRecordPayment ? (
        <button
          type="button"
          onClick={() => setDialog('payment')}
          className={buttonClasses('secondary', 'md', 'mt-3 w-full')}
        >
          <Banknote aria-hidden className="h-4 w-4" />
          {t('orders.recordPayment')}
        </button>
      ) : null}

      {canCancel ? (
        <button
          type="button"
          onClick={() => setDialog('cancel')}
          className={buttonClasses('danger-ghost', 'md', 'mt-3 w-full')}
        >
          <XCircle aria-hidden className="h-4 w-4" />
          {t('orders.cancelOrder')}
        </button>
      ) : null}

      {action.error && dialog === null ? (
        <p
          role="alert"
          className="mt-3 rounded-control bg-danger-soft px-4 py-3 text-body-sm font-medium text-danger"
        >
          {action.error}
        </p>
      ) : null}

      <ConfirmDialog
        open={dialog === 'cancel'}
        title={t('orders.cancelTitle')}
        confirmLabel={t('orders.cancelOrder')}
        tone="danger"
        pending={action.pending}
        error={dialog === 'cancel' ? action.error : null}
        onClose={() => {
          setDialog(null);
          action.clearError();
        }}
        onConfirm={() => {
          if (reason.trim()) void move('CANCELLED', reason.trim());
        }}
      >
        <p className="text-body-sm text-fg-muted">{t('orders.cancelText')}</p>
        <TextAreaField
          label={t('orders.cancelReasonLabel')}
          name="reason"
          required
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'payment'}
        title={t('orders.recordPaymentTitle')}
        confirmLabel={t('orders.recordPayment')}
        pending={action.pending}
        error={dialog === 'payment' ? action.error : null}
        onClose={() => {
          setDialog(null);
          action.clearError();
        }}
        onConfirm={() => void recordPayment()}
      >
        <p className="text-body-sm text-fg-muted">
          {t('orders.recordPaymentText', {
            amount: formatMoney(order.total, locale, tc('currency.UZS')),
          })}
        </p>
        <TextAreaField
          label={t('orders.paymentNote')}
          name="paymentNote"
          rows={2}
          maxLength={300}
          value={paymentNote}
          onChange={(event) => setPaymentNote(event.target.value)}
        />
      </ConfirmDialog>
    </section>
  );
}
