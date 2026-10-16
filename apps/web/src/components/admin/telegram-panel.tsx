'use client';

import type { AdminTelegramStatus, TelegramMode, TelegramPreview } from '@teran/contracts';
import { Eye, Loader2, RotateCcw, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { apiRequest } from '@/lib/api/client';
import { Pill } from './pill';
import { useAdminAction } from './use-admin-action';

/** Telegram's HTML subset as the composer writes it: bold text and links, entities escaped. */
export function TelegramText({ html }: { html: string }) {
  const decode = (text: string) =>
    text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
  const parts: ReactNode[] = [];
  const pattern = /<b>([\s\S]*?)<\/b>|<a href="([^"]*)">([\s\S]*?)<\/a>/g;
  let last = 0;
  let key = 0;
  for (const match of html.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(decode(html.slice(last, index)));
    if (match[1] !== undefined) {
      parts.push(<strong key={key++}>{decode(match[1])}</strong>);
    } else {
      parts.push(
        <a
          key={key++}
          href={decode(match[2] ?? '')}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-info underline underline-offset-2"
        >
          {decode(match[3] ?? '')}
        </a>,
      );
    }
    last = index + match[0].length;
  }
  parts.push(decode(html.slice(last)));
  return <div className="text-body-sm whitespace-pre-line text-fg">{parts}</div>;
}

const FAILURES = [
  'unknown_outcome',
  'not_published',
  'not_enabled',
  'item_deleted',
  'image_unavailable',
  'internal_error',
  'telegram_error',
] as const;
type Failure = (typeof FAILURES)[number];

/** The reason stored with a failed post (`code` or `code: detail`), in words. */
export function useTelegramFailure(): (lastError: string | null) => string | null {
  const t = useTranslations('Admin');
  return (lastError) => {
    if (!lastError) return null;
    const [code = '', ...rest] = lastError.split(': ');
    const detail = rest.join(': ');
    return (FAILURES as readonly string[]).includes(code)
      ? t(`telegram.failures.${code as Failure}`, { detail })
      : t('telegram.failures.telegram_error', { detail: lastError });
  };
}

export function TelegramStatusPill({ status }: { status: AdminTelegramStatus | null }) {
  const t = useTranslations('Admin');
  if (!status) return <Pill tone="muted">{t('telegram.status.none')}</Pill>;
  if (status.status === 'SENT') {
    return (
      <Pill tone={status.dryRun ? 'blue' : 'leaf'}>
        {status.dryRun ? t('telegram.status.SENT_DRY') : t('telegram.status.SENT')}
      </Pill>
    );
  }
  return (
    <Pill tone={status.status === 'FAILED' ? 'danger' : 'gold'}>
      {t(`telegram.status.${status.status}`)}
    </Pill>
  );
}

/**
 * The item's Telegram announcement: the switch (part of the item's form), where things stand,
 * a retry for a failed post and a preview of exactly what would be posted.
 */
export function TelegramPanel({
  entity,
  entityId,
  enabled,
  onEnabledChange,
  status,
  mode,
  channel,
}: {
  entity: 'product' | 'article';
  /** Null while the item is not saved yet (no preview or status). */
  entityId: string | null;
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  status: AdminTelegramStatus | null;
  mode: TelegramMode;
  channel: string | null;
}) {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const action = useAdminAction();
  const failure = useTelegramFailure();
  const [preview, setPreview] = useState<TelegramPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  async function openPreview() {
    if (!entityId) return;
    setLoading(true);
    setPreviewError(false);
    try {
      setPreview(
        await apiRequest<TelegramPreview>(`/admin/telegram/preview/${entity}/${entityId}`),
      );
    } catch {
      setPreviewError(true);
    } finally {
      setLoading(false);
    }
  }

  const when = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(iso),
        )
      : null;

  return (
    <section
      id={`section-telegram`}
      aria-labelledby="telegram-title"
      className="space-y-3 rounded-card border border-line bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="telegram-title"
          className="flex items-center gap-2 text-body-lg font-semibold text-forest-900"
        >
          <Send aria-hidden className="h-4 w-4" />
          {t('telegram.panelTitle')}
        </h2>
        <TelegramStatusPill status={status} />
      </div>
      <p className="text-caption text-fg-subtle">
        {mode === 'live'
          ? t('telegram.modes.live', { channel: channel ?? '—' })
          : t(`telegram.modes.${mode}`)}
      </p>
      <CheckboxField
        label={entity === 'product' ? t('telegram.announceProduct') : t('telegram.announceArticle')}
        hint={t('telegram.announceHint')}
        name="announceOnTelegram"
        checked={enabled}
        disabled={mode === 'disabled' || status?.status === 'SENT'}
        onChange={(event) => onEnabledChange(event.target.checked)}
      />
      {status ? (
        <div className="space-y-1 text-body-sm text-fg-muted">
          {status.sentAt ? (
            <p>{t('telegram.sentAt', { date: when(status.sentAt) ?? '' })}</p>
          ) : null}
          {status.status === 'FAILED' || status.status === 'PENDING' ? (
            <p className={status.status === 'FAILED' ? 'font-medium text-danger' : undefined}>
              {failure(status.lastError) ?? t('telegram.status.PENDING')}
            </p>
          ) : null}
          <p className="text-caption">{t('telegram.attempts', { count: status.attempts })}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void openPreview()}
          disabled={!entityId || loading}
        >
          {loading ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Eye aria-hidden className="h-4 w-4" />
          )}
          {t('telegram.preview')}
        </Button>
        {status?.canRetry ? (
          <Button
            type="button"
            size="sm"
            loading={action.pending}
            onClick={() =>
              void action.run(() =>
                apiRequest(`/admin/telegram/posts/${status.id}/retry`, { method: 'POST' }),
              )
            }
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            {t('telegram.retry')}
          </Button>
        ) : null}
      </div>
      {!entityId ? (
        <p className="text-caption text-fg-subtle">{t('telegram.previewAfterSave')}</p>
      ) : null}
      {action.error || previewError ? (
        <p role="alert" className="text-body-sm font-medium text-danger">
          {action.error ?? t('telegram.previewFailed')}
        </p>
      ) : null}

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={t('telegram.previewTitle')}
        closeLabel={t('common.close')}
        size="md"
      >
        {preview ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-card border border-line bg-[#eef3f7]">
              {preview.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- API renditions, see ADR-009
                <img
                  src={`${preview.image.src}/${preview.image.widths.filter((width) => width <= 960).at(-1) ?? preview.image.widths[0]}.webp`}
                  alt={preview.image.alt}
                  className={
                    preview.image.transparent
                      ? 'aspect-square w-full bg-ivory-50 object-contain p-6'
                      : 'max-h-80 w-full object-cover'
                  }
                />
              ) : null}
              <div className="bg-surface p-4">
                <TelegramText html={preview.text} />
              </div>
            </div>
            {preview.parts === 2 ? (
              <p className="text-caption text-fg-subtle">{t('telegram.previewParts')}</p>
            ) : null}
            {preview.blockers.length > 0 ? (
              <ul className="space-y-1 text-body-sm text-warning">
                {preview.blockers.map((blocker) => (
                  <li key={blocker}>• {t(`telegram.blockers.${blocker}`)}</li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-success">{t('telegram.eligible')}</p>
            )}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
