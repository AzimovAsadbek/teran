'use client';

import { changeEmailSchema, type AccountSessionDto, type Locale } from '@teran/contracts';
import { Laptop, LogOut } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { FormErrorSummary, TextField } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import { useApiErrorMessage } from '@/lib/use-api-error-message';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ApiAlert, SubmitButton, SuccessMessage } from './auth-forms';

/** Changing the sign-in e-mail needs the current password (re-authentication on the server). */
export function ChangeEmailForm({ email }: { email: string }) {
  const t = useTranslations('Account');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [values, setValues] = useState({ newEmail: '', currentPassword: '' });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await form.submit(changeEmailSchema, values, '/account/email')) {
      setValues({ newEmail: '', currentPassword: '' });
      router.refresh();
    }
  }

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormErrorSummary message={form.summary} />
      <p className="text-body-sm text-fg-subtle">
        {t('email')}: <span className="font-semibold break-all text-fg">{email}</span>
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('newEmail')}
          name="newEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={values.newEmail}
          onChange={(event) =>
            setValues((current) => ({ ...current, newEmail: event.target.value }))
          }
          error={message(form.errors.newEmail, values.newEmail)}
        />
        <TextField
          label={t('currentPassword')}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={values.currentPassword}
          onChange={(event) =>
            setValues((current) => ({ ...current, currentPassword: event.target.value }))
          }
          error={message(form.errors.currentPassword, values.currentPassword)}
        />
      </div>
      <ApiAlert message={form.apiErrorMessage} />
      {form.status === 'sent' ? <SuccessMessage>{t('emailChanged')}</SuccessMessage> : null}
      <SubmitButton
        sending={form.status === 'sending'}
        label={t('changeEmail')}
        variant="secondary"
        className=""
      />
    </form>
  );
}

/** Devices where the customer is signed in, and signing out of all the others. */
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
