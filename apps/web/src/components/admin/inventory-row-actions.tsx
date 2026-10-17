'use client';

import {
  inventoryAdjustmentSchema,
  type AdminInventoryMovement,
  type AdminInventoryRow,
  type Paginated,
} from '@teran/contracts';
import { History, Minus, Plus, SlidersHorizontal } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type ReactNode } from 'react';
import { buttonClasses, iconButtonClasses } from '@/components/ui/button';
import { SelectField, TextField } from '@/components/ui/field';
import { Sheet } from '@/components/ui/sheet';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link, useRouter } from '@/i18n/navigation';
import { packLabel } from '@/lib/admin/pack';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { formatDateTime } from '@/lib/format';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ConfirmDialog } from './confirm-dialog';
import { notify } from './toast';

type Direction = 'in' | 'out';

/** Reasons staff can give: stock comes in for these… */
const IN_REASONS = ['RESTOCK', 'RETURN', 'MANUAL_ADJUSTMENT'] as const;
/** …and goes out only as a write-off. */
const OUT_REASON = 'MANUAL_ADJUSTMENT';

/**
 * Stock in or out for one pack (ledgered, never below zero) and its movement history. Staff pick
 * the direction and type a positive quantity, so a phone keypad without a minus sign works and a
 * "−2" can never be saved as a delivery.
 */
export function InventoryRowActions({ row }: { row: AdminInventoryRow }) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const locale = useLocale();
  const router = useRouter();
  const message = useValidationMessage();
  const fieldsRef = useRef<HTMLDivElement>(null);
  const form = useFormSubmission(fieldsRef);
  const [adjusting, setAdjusting] = useState(false);
  const [direction, setDirection] = useState<Direction>('in');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<string>('RESTOCK');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<Paginated<AdminInventoryMovement> | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const quantity = amount.trim() === '' ? Number.NaN : Math.abs(Number(amount.replace(',', '.')));
  const delta = direction === 'in' ? quantity : -quantity;
  const after = Number.isFinite(delta) ? row.stockQuantity + delta : null;
  const short = after !== null && after < 0;
  const input = { delta, reason: direction === 'in' ? reason : OUT_REASON, note };
  const visible = form.errorsFor(input);

  function open() {
    form.reset();
    setDirection('in');
    setAmount('');
    setReason('RESTOCK');
    setNote('');
    setAdjusting(true);
  }

  async function submit() {
    if (short) return;
    const saved = await form.submit(
      inventoryAdjustmentSchema,
      input,
      `/admin/inventory/${row.variantId}/adjustments`,
    );
    if (saved) {
      setAdjusting(false);
      notify(t('inventory.saved', { name: row.productName, after: after ?? row.stockQuantity }));
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

  const choice = (value: Direction, icon: ReactNode, label: string) => (
    <label
      className={cn(
        'flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-control border px-3 text-body-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
        direction === value
          ? value === 'in'
            ? 'border-success bg-success-soft text-success'
            : 'border-danger bg-danger-soft text-danger'
          : 'border-line-strong bg-surface text-fg-muted hover:bg-surface-muted',
      )}
    >
      <input
        type="radio"
        name={`direction-${row.variantId}`}
        value={value}
        checked={direction === value}
        onChange={() => setDirection(value)}
        className="sr-only"
      />
      {icon}
      {label}
    </label>
  );

  return (
    <span className="inline-flex gap-1">
      <button type="button" onClick={open} className={buttonClasses('secondary', 'sm')}>
        <SlidersHorizontal aria-hidden className="h-4 w-4" />
        {t('inventory.adjust')}
      </button>
      <button
        type="button"
        onClick={() => void openHistory()}
        className={iconButtonClasses('ghost', 'sm')}
        aria-label={t('inventory.historyTitle', { name: `${row.productName} ${packLabel(row)}` })}
      >
        <History aria-hidden className="h-4 w-4" />
      </button>

      <ConfirmDialog
        open={adjusting}
        title={t('inventory.adjustTitle', { name: row.productName })}
        description={[packLabel(row), row.sku].filter(Boolean).join(' · ')}
        confirmLabel={direction === 'in' ? t('inventory.saveIn') : t('inventory.saveOut')}
        tone={direction === 'in' ? 'primary' : 'danger'}
        pending={form.status === 'sending'}
        error={form.apiErrorMessage}
        onClose={() => setAdjusting(false)}
        onConfirm={() => void submit()}
      >
        <div ref={fieldsRef} className="space-y-4 text-left">
          <fieldset>
            <legend className="mb-2 text-label text-fg">{t('inventory.direction')}</legend>
            <div className="flex gap-2">
              {choice('in', <Plus aria-hidden className="h-4 w-4" />, t('inventory.stockIn'))}
              {choice('out', <Minus aria-hidden className="h-4 w-4" />, t('inventory.stockOut'))}
            </div>
          </fieldset>
          <TextField
            label={t('inventory.amount')}
            name="amount"
            required
            inputMode="numeric"
            autoComplete="off"
            hint={t('inventory.amountHint')}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={message(visible.delta, amount)}
            data-autofocus
          />
          <p
            className={cn(
              'rounded-control px-3 py-2 text-body-sm font-semibold tabular-nums',
              short ? 'bg-danger-soft text-danger' : 'bg-surface-muted text-fg',
            )}
            aria-live="polite"
          >
            {t('inventory.preview', {
              before: row.stockQuantity,
              after: after ?? row.stockQuantity,
            })}
            {short ? (
              <span className="mt-0.5 block font-medium">{t('inventory.insufficient')}</span>
            ) : null}
          </p>
          {direction === 'in' ? (
            <SelectField
              label={t('inventory.reason')}
              name="reason"
              required
              options={IN_REASONS.map((value) => ({
                value,
                label: t(`inventory.reasonsIn.${value}`),
              }))}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          ) : (
            <p className="text-body-sm text-fg-muted">
              <span className="font-semibold text-fg">{t('inventory.reason')}:</span>{' '}
              {t(`inventory.reasonsOut.${OUT_REASON}`)}
            </p>
          )}
          <TextField
            label={t('inventory.note')}
            name="note"
            maxLength={300}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={message(visible.note, note)}
          />
        </div>
      </ConfirmDialog>

      <Sheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        side="right"
        title={t('inventory.historyTitle', { name: row.productName })}
        closeLabel={tc('close')}
      >
        <div className="px-5 py-4">
          <p className="mb-3 text-body-sm text-fg-subtle">
            {[packLabel(row), row.sku].filter(Boolean).join(' · ')}
          </p>
          {history === null ? (
            <p className="text-fg-subtle">{tc('loading')}</p>
          ) : history.items.length === 0 ? (
            <p className="text-fg-subtle">{t('common.empty')}</p>
          ) : (
            <ol className="divide-y divide-line">
              {history.items.map((movement) => (
                <li key={movement.id} className="py-3 text-body-sm">
                  <p className="flex justify-between gap-4">
                    <span className="font-semibold text-fg">
                      {t(`inventoryReasons.${movement.reason as 'RESTOCK'}`)}
                    </span>
                    <span
                      className={
                        movement.delta > 0
                          ? 'font-semibold text-success tabular-nums'
                          : 'font-semibold text-danger tabular-nums'
                      }
                    >
                      {movement.delta > 0 ? `+${movement.delta}` : `−${Math.abs(movement.delta)}`}
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
