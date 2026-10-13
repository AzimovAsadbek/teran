'use client';

import { newsletterUnsubscribeSchema } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { ApiAlert, SubmitButton, SuccessMessage } from '@/components/account/auth-forms';
import { useFormSubmission } from '@/features/forms/use-form-submission';

/**
 * One explicit click unsubscribes. Opening the link alone changes nothing, because e-mail security
 * scanners prefetch links and would otherwise unsubscribe people by accident.
 */
export function UnsubscribeForm({ id, token }: { id: string; token: string }) {
  const t = useTranslations('Newsletter');
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);

  if (form.status === 'sent') return <SuccessMessage>{t('unsubscribeDone')}</SuccessMessage>;

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit(newsletterUnsubscribeSchema, { id, token }, '/newsletter/unsubscribe');
      }}
      className="space-y-5"
    >
      <ApiAlert message={form.apiErrorMessage ?? (form.summary ? t('unsubscribeInvalid') : null)} />
      <SubmitButton sending={form.status === 'sending'} label={t('unsubscribeButton')} />
    </form>
  );
}
