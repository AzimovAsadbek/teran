'use client';

import type { AdminOrderDetail } from '@teran/contracts';
import { Undo2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { TextAreaField } from '@/components/ui/field';
import { apiRequest } from '@/lib/api/client';
import { formatMoney } from '@/lib/format';
import { ConfirmDialog } from './confirm-dialog';
import { notify } from './toast';
import { useAdminAction } from './use-admin-action';

/**
 * Records that a paid order was refunded (the money is returned in cash or in the provider's
 * cabinet first). Payme refunds made in the Payme cabinet arrive automatically and are not
 * offered here.
 */
export function RecordRefund({ order }: { order: AdminOrderDetail }) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const action = useAdminAction();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  if (!order.canRecordRefund) return null;

  async function record() {
    const ok = await action.run(() =>
      apiRequest(`/admin/orders/${order.number}/refunds`, { method: 'POST', body: { note } }),
    );
    if (ok) {
      setNote('');
      setOpen(false);
      notify(t('orders.refundRecorded'));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClasses('secondary', 'sm', 'mt-4')}
      >
        <Undo2 aria-hidden className="h-4 w-4" />
        {t('payments.recordRefund')}
      </button>
      <ConfirmDialog
        open={open}
        title={t('payments.recordRefund')}
        description={t('payments.refundConfirm', {
          amount: formatMoney(order.total, locale as 'uz', tc('currency.UZS')),
        })}
        confirmLabel={t('payments.recordRefund')}
        cancelLabel={t('orders.notNow')}
        tone="danger"
        pending={action.pending}
        error={action.error}
        onConfirm={() => {
          if (note.trim().length >= 3) void record();
        }}
        onClose={() => setOpen(false)}
      >
        <p className="text-body-sm text-fg-muted">{t('payments.refundHint')}</p>
        <TextAreaField
          label={t('payments.refundNote')}
          name="refundNote"
          required
          minLength={3}
          maxLength={300}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          data-autofocus
        />
      </ConfirmDialog>
    </>
  );
}
