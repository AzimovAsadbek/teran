'use client';

import { useTranslations } from 'next-intl';
import { useId, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Notice } from '@/components/ui/notice';

/**
 * Confirmation before irreversible actions (cancelling an order, recording a payment, deleting),
 * and small forms such as stock adjustments. Enter submits; Esc and the backdrop cancel unless a
 * request is running.
 */
export function ConfirmDialog({
  open,
  title,
  description,
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
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const formId = useId();

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
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={pending}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
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
