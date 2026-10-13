'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Modal confirmation on the native <dialog>: focus is trapped and Esc cancels. Used before
 * irreversible actions (cancelling an order, recording a payment, deleting).
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = 'primary',
  pending = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('Admin');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className="m-auto w-[min(30rem,calc(100%-2rem))] rounded-[var(--radius-panel)] bg-white p-0 shadow-lift backdrop:bg-forest-950/40"
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
        className="space-y-4 p-6"
      >
        <h2 id={titleId} className="font-display text-2xl font-semibold text-forest-900">
          {title}
        </h2>
        {children}
        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-medium text-danger-700"
          >
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-11 rounded-full px-5 text-sm font-semibold text-forest-900 hover:bg-ivory-100"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={pending}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-ivory-50 disabled:opacity-60',
              tone === 'danger'
                ? 'bg-danger-700 hover:bg-danger-700/90'
                : 'bg-forest-900 hover:bg-forest-800',
            )}
          >
            {pending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
