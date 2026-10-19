'use client';

import type { ReviewStatus } from '@teran/contracts';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api/client';
import { ConfirmDialog } from './confirm-dialog';
import { notify } from './toast';
import { useAdminAction } from './use-admin-action';

/**
 * A review's moderation (ADR-042): hide it from the site or show it again (its stars leave or
 * rejoin the product's average at once), or delete it for good after a confirmation.
 */
export function ReviewActions({ id, status }: { id: string; status: ReviewStatus }) {
  const t = useTranslations('Admin');
  const toggle = useAdminAction();
  const removal = useAdminAction();
  const [confirming, setConfirming] = useState(false);
  const hidden = status === 'HIDDEN';

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        loading={toggle.pending}
        onClick={async () => {
          const done = await toggle.run(() =>
            apiRequest(`/admin/reviews/${id}`, {
              method: 'PATCH',
              body: { status: hidden ? 'PUBLISHED' : 'HIDDEN' },
            }),
          );
          if (done) notify(hidden ? t('reviews.shown') : t('reviews.hiddenDone'));
        }}
      >
        {hidden ? (
          <Eye aria-hidden className="h-4 w-4" />
        ) : (
          <EyeOff aria-hidden className="h-4 w-4" />
        )}
        {hidden ? t('reviews.show') : t('reviews.hide')}
      </Button>
      <Button variant="danger-ghost" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden className="h-4 w-4" />
        {t('reviews.delete')}
      </Button>
      {toggle.error ? (
        <p role="alert" className="text-body-sm text-danger">
          {toggle.error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={t('reviews.deleteTitle')}
        description={t('reviews.deleteText')}
        confirmLabel={t('reviews.deleteConfirm')}
        cancelLabel={t('reviews.keep')}
        tone="danger"
        pending={removal.pending}
        error={removal.error}
        onConfirm={async () => {
          const done = await removal.run(() =>
            apiRequest(`/admin/reviews/${id}`, { method: 'DELETE' }),
          );
          if (done) {
            setConfirming(false);
            notify(t('reviews.deleted'));
          }
        }}
        onClose={() => {
          removal.clearError();
          setConfirming(false);
        }}
      />
    </div>
  );
}
