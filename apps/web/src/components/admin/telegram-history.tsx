'use client';

import type { AdminTelegramPost } from '@teran/contracts';
import { FileText, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { table } from './table';
import { TelegramStatusPill, TelegramText, useTelegramFailure } from './telegram-panel';
import { useAdminAction } from './use-admin-action';

/** A post's state in the history: the status, and why it failed in words (never raw output). */
export function TelegramPostState({ post }: { post: AdminTelegramPost }) {
  const t = useTranslations('Admin');
  const failure = useTelegramFailure();
  const reason =
    post.status === 'FAILED' || post.status === 'PENDING' ? failure(post.lastError) : null;
  return (
    <span className="flex flex-col items-start gap-1">
      <TelegramStatusPill status={post} />
      {reason ? (
        <span
          className={cn('text-caption', post.status === 'FAILED' ? 'text-danger' : 'text-fg-muted')}
        >
          {reason}
        </span>
      ) : null}
      <span className="text-caption text-fg-subtle">
        {t('telegram.attempts', { count: post.attempts })}
      </span>
    </span>
  );
}

/** The text as sent (or as it would have been in dry-run mode), and a retry for a failed post. */
export function TelegramPostActions({ post }: { post: AdminTelegramPost }) {
  const t = useTranslations('Admin');
  const action = useAdminAction();
  const [open, setOpen] = useState(false);
  return (
    <span className={cn('inline-flex flex-col items-end gap-1', table.above)}>
      <span className="flex flex-wrap justify-end gap-2">
        {post.text ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
            <FileText aria-hidden className="h-4 w-4" />
            {t('telegram.showText')}
          </Button>
        ) : null}
        {post.canRetry ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={action.pending}
            onClick={() =>
              void action.run(() =>
                apiRequest(`/admin/telegram/posts/${post.id}/retry`, { method: 'POST' }),
              )
            }
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            {t('telegram.retry')}
          </Button>
        ) : null}
      </span>
      {action.error ? (
        <span role="alert" className="text-helper text-danger">
          {action.error}
        </span>
      ) : null}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={post.entityTitle ?? t('telegram.deletedItem')}
        closeLabel={t('common.close')}
        size="md"
      >
        {post.text ? (
          <div className="rounded-card border border-line bg-surface p-4">
            <TelegramText html={post.text} />
          </div>
        ) : null}
        {post.dryRun ? (
          <p className="mt-3 text-caption text-fg-subtle">{t('telegram.dryRunNote')}</p>
        ) : null}
      </Modal>
    </span>
  );
}
