'use client';

import type { Locale } from '@teran/contracts';
import { Square } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import type { FilmUploadProgress } from '@/lib/admin/film-upload';
import { formatFileSize } from '@/lib/format';

/**
 * A film going up (ADR-061): how much of how much, how fast, about how long is left, and a button
 * to stop it. The bar is for the eye; the words say the same to everyone. Once every byte is
 * there the server takes the film over (and makes it ready afterwards, ADR-062): the stop button
 * goes and a note says so.
 */
export function FilmTransfer({
  transfer,
  active = true,
  onStop,
}: {
  transfer: FilmUploadProgress;
  /** False once the upload has stopped: the bar and the stop button go, the numbers stay. */
  active?: boolean;
  onStop?: () => void;
}) {
  const t = useTranslations('Admin');
  const locale = useLocale() as Locale;
  const percent = Math.floor((transfer.sent / Math.max(1, transfer.total)) * 100);
  const storing = active && transfer.sent >= transfer.total;
  const speed = active && !storing ? transfer.bytesPerSecond : null;
  const seconds = speed && speed >= 1 ? (transfer.total - transfer.sent) / speed : null;
  const left =
    seconds === null
      ? null
      : seconds < 60
        ? t('compose.etaSeconds', { count: Math.max(5, Math.ceil(seconds / 5) * 5) })
        : t('compose.etaMinutes', { count: Math.ceil(seconds / 60) });
  return (
    <div className="space-y-1.5">
      {active ? (
        <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </span>
      ) : null}
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-caption text-fg-muted tabular-nums">
        <span>
          {formatFileSize(transfer.sent, locale)} / {formatFileSize(transfer.total, locale)}
          {active ? ` · ${percent}%` : ''}
          {speed ? ` · ${formatFileSize(speed, locale)}/s` : ''}
          {left ? ` · ${left}` : ''}
        </span>
        {active && !storing && onStop ? (
          <Button size="sm" variant="ghost" onClick={onStop}>
            <Square aria-hidden className="h-3.5 w-3.5" />
            {t('compose.stop')}
          </Button>
        ) : null}
      </span>
      {storing ? <p className="text-caption text-fg-muted">{t('compose.storing')}</p> : null}
    </div>
  );
}
