'use client';

import {
  changePasswordSchema,
  formatUzPhone,
  LOCALES,
  updateProfileSchema,
  type CurrentUserDto,
} from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useValidationMessage } from '@/lib/use-validation-message';
import { ApiAlert, SubmitButton, SuccessMessage } from './auth-forms';

export function ProfileForm({ user }: { user: CurrentUserDto }) {
  const t = useTranslations('Account');
  const tl = useTranslations('Language');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [values, setValues] = useState({
    firstName: user.firstName,
    lastName: user.lastName ?? '',
    phone: user.phone ? formatUzPhone(user.phone) : '',
    locale: user.locale as string,
  });
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const error = (key: keyof typeof values) => message(form.errors[key], values[key]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await form.submit(updateProfileSchema, values, (data) =>
      apiRequest('/auth/me', { method: 'PATCH', body: data }),
    );
    if (saved) router.refresh();
  }

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormErrorSummary message={form.summary} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('firstName')}
          name="firstName"
          autoComplete="given-name"
          required
          value={values.firstName}
          onChange={set('firstName')}
          error={error('firstName')}
        />
        <TextField
          label={t('lastName')}
          name="lastName"
          autoComplete="family-name"
          value={values.lastName}
          onChange={set('lastName')}
          error={error('lastName')}
        />
        <TextField
          label={t('phone')}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          value={values.phone}
          onChange={set('phone')}
          error={error('phone')}
        />
        <SelectField
          label={t('language')}
          name="locale"
          required
          options={LOCALES.map((locale) => ({ value: locale, label: tl(`names.${locale}`) }))}
          value={values.locale}
          onChange={set('locale')}
          error={error('locale')}
        />
      </div>
      <p className="text-body-sm text-fg-subtle">
        {t('email')}: <span className="font-semibold text-fg">{user.email}</span>
      </p>
      <ApiAlert message={form.apiErrorMessage} />
      {form.status === 'sent' ? <SuccessMessage>{t('saved')}</SuccessMessage> : null}
      <SubmitButton sending={form.status === 'sending'} label={t('saveProfile')} className="" />
    </form>
  );
}

export function ChangePasswordForm() {
  const t = useTranslations('Account');
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [values, setValues] = useState({ currentPassword: '', newPassword: '' });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const changed = await form.submit(changePasswordSchema, values, '/auth/password/change');
    if (changed) setValues({ currentPassword: '', newPassword: '' });
  }

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormErrorSummary message={form.summary} />
      <div className="grid gap-5 sm:grid-cols-2">
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
        <TextField
          label={t('newPassword')}
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          hint={t('passwordHint')}
          value={values.newPassword}
          onChange={(event) =>
            setValues((current) => ({ ...current, newPassword: event.target.value }))
          }
          error={message(form.errors.newPassword, values.newPassword)}
        />
      </div>
      <ApiAlert message={form.apiErrorMessage} />
      {form.status === 'sent' ? <SuccessMessage>{t('passwordChanged')}</SuccessMessage> : null}
      <SubmitButton
        sending={form.status === 'sending'}
        label={t('changePassword')}
        variant="secondary"
        className=""
      />
    </form>
  );
}
