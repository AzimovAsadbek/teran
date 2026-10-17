'use client';

import { formatUzPhone, type AdminOrderDetail, type OrderStatus } from '@teran/contracts';
import { ArrowRight, Banknote, Phone, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { TextAreaField } from '@/components/ui/field';
import { apiRequest } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { ConfirmDialog } from './confirm-dialog';
import { notify } from './toast';
import { useAdminAction } from './use-admin-action';

/** The steps an order moves forward through (cancelling has its own dialog). */
type Step = Exclude<OrderStatus, 'PENDING' | 'CANCELLED'>;

function isStep(status: OrderStatus): status is Step {
  return status !== 'PENDING' && status !== 'CANCELLED';
}

/**
 * What staff can do with an order. Every step forward is confirmed in a dialog that says what
 * happens (the status cannot be moved back), so a double tap never moves an order twice; the
 * buttons name the action ("Confirm order"), not the status it leads to.
 */
export function OrderActions({ order }: { order: AdminOrderDetail }) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const action = useAdminAction();
  const [dialog, setDialog] = useState<'step' | 'cancel' | 'payment' | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const steps = order.allowedTransitions.filter(isStep);
  const canCancel = order.allowedTransitions.includes('CANCELLED');
  const path = `/admin/orders/${order.number}`;

  function close() {
    setDialog(null);
    action.clearError();
  }

  async function move(status: OrderStatus, statusNote: string) {
    const ok = await action.run(() =>
      apiRequest(`${path}/status`, {
        method: 'POST',
        body: { status, note: statusNote.trim() || undefined },
      }),
    );
    if (ok) {
      setNote('');
      setReason('');
      setDialog(null);
      notify(
        status === 'CANCELLED'
          ? t('orders.cancelledNotice')
          : t('orders.statusChanged', { status: t(`orderStatus.${status}`) }),
      );
    }
  }

  async function recordPayment() {
    const ok = await action.run(() =>
      apiRequest(`${path}/payments`, {
        method: 'POST',
        body: { note: paymentNote.trim() || undefined },
      }),
    );
    if (ok) {
      setPaymentNote('');
      setDialog(null);
      notify(t('orders.paymentRecorded'));
    }
  }

  const nothingToDo = order.allowedTransitions.length === 0 && !order.canRecordPayment;

  return (
    <section
      aria-labelledby="order-actions"
      className="rounded-card border border-line bg-surface p-5 sm:p-6"
    >
      <h2 id="order-actions" className="mb-4 text-body-lg font-semibold text-fg">
        {t('orders.actionsSection')}
      </h2>
      {nothingToDo ? (
        <p className="text-body-sm text-fg-subtle">{t('orders.noTransitions')}</p>
      ) : null}

      {steps.length > 0 ? (
        <div className="space-y-2">
          <p className="text-helper text-fg-subtle">{t('orders.nextStep')}</p>
          {steps.map((target) => (
            <button
              key={target}
              type="button"
              onClick={() => {
                setStep(target);
                setDialog('step');
              }}
              className={buttonClasses('primary', 'md', 'w-full')}
            >
              {t(`orders.transitions.${target}`)}
              <ArrowRight aria-hidden className="h-4 w-4" />
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
        open={dialog === 'step'}
        title={step ? t(`orders.transitionTitles.${step}`) : ''}
        description={step ? t(`orders.transitionTexts.${step}`) : undefined}
        confirmLabel={step ? t(`orders.transitions.${step}`) : ''}
        cancelLabel={t('orders.notNow')}
        pending={action.pending}
        error={dialog === 'step' ? action.error : null}
        onClose={close}
        onConfirm={() => {
          if (step) void move(step, note);
        }}
      >
        {step === 'CONFIRMED' ? (
          <a
            href={`tel:${order.customerPhone}`}
            className={buttonClasses('secondary', 'sm', 'w-full sm:w-auto')}
          >
            <Phone aria-hidden className="h-4 w-4" />
            {t('orders.callCustomer')}: {formatUzPhone(order.customerPhone)}
          </a>
        ) : null}
        <p className="text-body-sm font-medium text-fg">{t('orders.oneWay')}</p>
        <TextAreaField
          label={t('orders.statusNote')}
          hint={t('orders.statusNoteHint')}
          name="note"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'cancel'}
        title={t('orders.cancelTitle')}
        confirmLabel={t('orders.cancelOrder')}
        cancelLabel={t('orders.keepOrder')}
        tone="danger"
        pending={action.pending}
        error={dialog === 'cancel' ? action.error : null}
        onClose={close}
        onConfirm={() => {
          if (reason.trim()) void move('CANCELLED', reason);
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
          data-autofocus
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'payment'}
        title={t('orders.recordPaymentTitle')}
        confirmLabel={t('orders.recordPayment')}
        cancelLabel={t('orders.notNow')}
        pending={action.pending}
        error={dialog === 'payment' ? action.error : null}
        onClose={close}
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
