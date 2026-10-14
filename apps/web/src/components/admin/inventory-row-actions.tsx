'use client';

import {
  inventoryAdjustmentSchema,
  MANUAL_INVENTORY_REASONS,
  type AdminInventoryMovement,
  type AdminInventoryRow,
  type Paginated,
} from '@teran/contracts';
import { History, SlidersHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { SelectField, TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link, useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { formatDateTime } from '@/lib/format';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ConfirmDialog } from './confirm-dialog';
import { buttonClasses, iconButtonClasses } from '@/components/ui/button';

/** Adjust stock (ledgered, never below zero) and show a variant's movement history. */
export function InventoryRowActions({ row }: { row: AdminInventoryRow }) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const message = useValidationMessage();
  const fieldsRef = useRef<HTMLDivElement>(null);
  const form = useFormSubmission(fieldsRef);
  const [adjusting, setAdjusting] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState<string>('RESTOCK');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<Paginated<AdminInventoryMovement> | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  async function submit() {
    const saved = await form.submit(
      inventoryAdjustmentSchema,
      { delta: Number(delta), reason, note },
      `/admin/inventory/${row.variantId}/adjustments`,
    );
    if (saved) {
      setAdjusting(false);
      setDelta('');
      setNote('');
      router.refresh();
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    setHistory(
      await apiRequest<Paginated<AdminInventoryMovement>>(
        `/admin/inventory/${row.variantId}/movements?pageSize=50`,
      ).catch(() => null),
    );
  }

  const apiError = form.apiErrorMessage;

  return (
    <span className="inline-flex gap-1">
      <button
        type="button"
        onClick={() => setAdjusting(true)}
        className={buttonClasses('ghost', 'sm')}
      >
        <SlidersHorizontal aria-hidden className="h-4 w-4" />
        {t('inventory.adjust')}
      </button>
      <button
        type="button"
        onClick={() => void openHistory()}
        className={iconButtonClasses('ghost', 'sm')}
        aria-label={`${t('inventory.history')}: ${row.sku}`}
      >
        <History aria-hidden className="h-4 w-4" />
      </button>

      <ConfirmDialog
        open={adjusting}
        title={t('inventory.adjustTitle', { sku: row.sku })}
        confirmLabel={t('common.save')}
        pending={form.status === 'sending'}
        error={apiError}
        onClose={() => setAdjusting(false)}
        onConfirm={() => void submit()}
      >
        <p className="text-body-sm text-fg-muted">
          {row.productName} · {t('inventory.stock')}: <strong>{row.stockQuantity}</strong>
        </p>
        <div ref={fieldsRef} className="space-y-4">
          <TextField
            label={t('inventory.delta')}
            name="delta"
            required
            inputMode="numeric"
            hint={t('inventory.deltaHint')}
            value={delta}
            onChange={(event) => setDelta(event.target.value)}
            error={message(form.errors.delta, delta)}
          />
          <SelectField
            label={t('inventory.reason')}
            name="reason"
            required
            options={MANUAL_INVENTORY_REASONS.map((value) => ({
              value,
              label: t(`inventoryReasons.${value}`),
            }))}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <TextField
            label={t('inventory.note')}
            name="note"
            maxLength={300}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={message(form.errors.note, note)}
          />
        </div>
      </ConfirmDialog>

      <Sheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        side="right"
        title={`${t('inventory.history')}: ${row.sku}`}
        closeLabel={tc('close')}
      >
        <div className="px-5 py-4">
          {history === null ? (
            <p className="text-fg-subtle">{tc('loading')}</p>
          ) : history.items.length === 0 ? (
            <p className="text-fg-subtle">{t('common.empty')}</p>
          ) : (
            <ol className="divide-y divide-line">
              {history.items.map((movement) => (
                <li key={movement.id} className="py-3 text-body-sm">
                  <p className="flex justify-between gap-4">
                    <span className="font-semibold text-forest-900">
                      {t(`inventoryReasons.${movement.reason as 'RESTOCK'}`)}
                    </span>
                    <span
                      className={
                        movement.delta > 0
                          ? 'font-semibold text-success'
                          : 'font-semibold text-danger'
                      }
                    >
                      {movement.delta > 0 ? `+${movement.delta}` : movement.delta}
                    </span>
                  </p>
                  <p className="text-fg-muted">
                    {t('inventory.quantityAfter')}: {movement.quantityAfter}
                    {movement.orderNumber ? (
                      <>
                        {' · '}
                        <Link
                          href={`/admin/orders/${movement.orderNumber}`}
                          className="font-semibold underline-offset-4 hover:underline"
                        >
                          {movement.orderNumber}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {movement.note ? <p className="text-fg-muted">{movement.note}</p> : null}
                  <p className="text-xs text-fg-subtle">
                    {formatDateTime(movement.createdAt, locale as 'uz')} ·{' '}
                    {movement.actorName ?? t('orders.system')}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </Sheet>
    </span>
  );
}
