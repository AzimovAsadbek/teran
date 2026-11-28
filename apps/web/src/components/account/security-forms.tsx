'use client';

import { type AccountSessionDto, type Locale } from '@teran/contracts';
import { Laptop, LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

export function SessionsPanel({ sessions }: { sessions: AccountSessionDto[] }) {
  const t = useTranslations('Account');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [revoked, setRevoked] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const errorMessage = useApiErrorMessage(error);

  async function signOutOthers() {
    setPending(true);
    setError(null);
    try {
      const result = await apiRequest<{ revoked: number }>('/account/sessions/revoke-others', {
        method: 'POST',
      });
      setRevoked(result.revoked);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line">
        {sessions.map((session, index) => (
          <li key={`${session.createdAt}-${index}`} className="flex items-center gap-3 py-3">
            <Laptop aria-hidden className="h-5 w-5 shrink-0 text-fg-subtle" />
            <span className="min-w-0 flex-1">
              <span className="block text-title-sm text-fg">
                {session.device ?? t('unknownDevice')}
                {session.current ? (
                  <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-caption font-semibold text-fg">
                    {t('thisDevice')}
                  </span>
                ) : null}
              </span>
              <span className="block text-body-sm text-fg-subtle">
                {t('lastActive', { date: formatDateTime(session.lastSeenAt, locale) })}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {errorMessage ? (
        <Notice tone="danger" role="alert">
          {errorMessage}
        </Notice>
      ) : null}
      {revoked !== null ? (
        <Notice tone="success" role="status">
          {t('signedOutOthers', { count: revoked })}
        </Notice>
      ) : null}
      <Button
        variant="secondary"
        onClick={() => void signOutOthers()}
        loading={pending}
        disabled={sessions.length <= 1 && revoked === null}
      >
        {pending ? null : <LogOut aria-hidden className="h-4 w-4" />}
        {t('signOutOthers')}
      </Button>
    </div>
  );
}
