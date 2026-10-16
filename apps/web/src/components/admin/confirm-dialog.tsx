'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';

/** A second tap that lands on the dialog right after the first opened it must not confirm. */
const ARMING_MS = 400;

/**
 * Confirmation before irreversible actions (cancelling an order, recording a payment, deleting),
 * and small forms such as stock adjustments. Enter submits; Esc and the backdrop cancel unless a
 * request is running. The confirm button takes focus unless a field inside is marked
 * `data-autofocus`. Both buttons say what they do ("Cancel order" / "No, keep it"), never a bare
 * "Cancel" next to a cancellation.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  pending = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const formId = useId();
  // The confirm button wakes up a moment after the dialog opens (announced as unavailable until
  // then), so the second tap of a double tap cannot confirm.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setArmed(true), ARMING_MS);
    return () => {
      window.clearTimeout(timer);
      setArmed(false);
    };
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      closeLabel={tc('close')}
      dismissible={!pending}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {cancelLabel ?? t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={pending}
            aria-disabled={pending || !armed || undefined}
            // A field marked data-autofocus comes first in the document and wins.
            data-autofocus
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form
        method="post"
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          // React passes events up through the portal: a form around the opener must not submit.
          event.stopPropagation();
          if (armed && !pending) onConfirm();
        }}
        className="space-y-4"
      >
        {children}
        {error ? (
          <Notice tone="danger" role="alert">
            {error}
          </Notice>
        ) : null}
      </form>
    </Modal>
  );
}
