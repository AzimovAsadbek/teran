'use client';

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type Locale,
} from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { FormErrorSummary, TextField } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { cartActions } from '@/features/cart/cart-store';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link, useRouter } from '@/i18n/navigation';
import type { FieldErrors } from '@/lib/forms';
import { useValidationMessage } from '@/lib/use-validation-message';
import { usePrimaryAction } from '@/lib/floating';

export function ApiAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Notice tone="danger" role="alert">
      {message}
    </Notice>
  );
}

export function SubmitButton({
  sending,
  label,
  sendingLabel = label,
  className = 'w-full',
  variant,
}: {
  sending: boolean;
  label: string;
  sendingLabel?: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Button type="submit" size="lg" variant={variant} className={className} loading={sending}>
      {sending ? sendingLabel : label}
    </Button>
  );
}

export function SuccessMessage({ children }: { children: ReactNode }) {
  return (
    <Notice tone="success" role="status">
      {children}
    </Notice>
  );
}

function mismatch(password: string, confirmation: string): FieldErrors {
  return password === confirmation
    ? {}
    : { confirmPassword: { code: 'custom', message: 'passwords_mismatch' } };
}

/** After signing in or registering: show the bag the API merged into the account, then continue. */
function useSignedIn(next: string) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  return () => {
    void cartActions.load(locale, true);
    router.replace(next);
    router.refresh();
  };
}

/**
 * Sign-in: e-mail and password, the way to a new password right under the password (when TERAN
 * sends e-mail, `forgotPasswordHref`), then the button.
 */
export function LoginForm({
  next,
  forgotPasswordHref = null,
}: {
  next: string;
  forgotPasswordHref?: string | null;
}) {
  const t = useTranslations('Account');
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  usePrimaryAction(formRef);
  const form = useFormSubmission(formRef);
  const signedIn = useSignedIn(next);
  const [values, setValues] = useState({ email: '', password: '' });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await form.submit(loginSchema, values, '/auth/login')) signedIn();
  }

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormErrorSummary message={form.summary} />
      <TextField
        label={t('email')}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="username"
        required
        value={values.email}
        onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
        error={message(form.errors.email, values.email)}
      />
      <div>
        <TextField
          label={t('password')}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={values.password}
          onChange={(event) =>
            setValues((current) => ({ ...current, password: event.target.value }))
          }
          error={message(form.errors.password, values.password)}
        />
        {forgotPasswordHref ? (
          <p className="mt-2.5 text-right text-body-sm">
            <Link
              href={forgotPasswordHref}
              className="font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
            >
              {t('forgotPassword')}
            </Link>
          </p>
        ) : null}
      </div>
      <ApiAlert message={form.apiErrorMessage} />
      <SubmitButton
        sending={form.status === 'sending'}
        label={t('login')}
        sendingLabel={t('loggingIn')}
      />
    </form>
  );
}

const EMPTY_REGISTRATION = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export function RegisterForm({ next }: { next: string }) {
  const t = useTranslations('Account');
  const locale = useLocale() as Locale;
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  usePrimaryAction(formRef);
  const form = useFormSubmission(formRef);
  const signedIn = useSignedIn(next);
  const [values, setValues] = useState(EMPTY_REGISTRATION);
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  // An error leaves as soon as its field changes (form.errorsFor, on the submitted shape); the
  // confirmation's, once the two passwords match.
  const live = form.errorsFor({ ...values, confirmPassword: undefined, locale });
  const error = (key: keyof typeof values) =>
    key === 'confirmPassword'
      ? values.password === values.confirmPassword
        ? undefined
        : message(form.errors.confirmPassword, values.confirmPassword)
      : message(live[key], values[key]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { confirmPassword, ...input } = values;
    const ok = await form.submit(
      registerSchema,
      { ...input, locale },
      '/auth/register',
      mismatch(values.password, confirmPassword),
    );
    if (ok) signedIn();
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
      </div>
      <TextField
        label={t('email')}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={values.email}
        onChange={set('email')}
        error={error('email')}
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
      <TextField
        label={t('password')}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={t('passwordHint')}
        value={values.password}
        onChange={set('password')}
        error={error('password')}
      />
      <TextField
        label={t('confirmPassword')}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        value={values.confirmPassword}
        onChange={set('confirmPassword')}
        error={error('confirmPassword')}
      />
      <ApiAlert message={form.apiErrorMessage} />
      <SubmitButton
        sending={form.status === 'sending'}
        label={t('register')}
        sendingLabel={t('registering')}
      />
    </form>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations('Account');
  const locale = useLocale() as Locale;
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  usePrimaryAction(formRef);
  const form = useFormSubmission(formRef);
  const [email, setEmail] = useState('');

  // The same answer whether or not the address has an account, so accounts cannot be discovered.
  if (form.status === 'sent') return <SuccessMessage>{t('forgotSent')}</SuccessMessage>;

  return (
    <form
      method="post"
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit(forgotPasswordSchema, { email, locale }, '/auth/password/forgot');
      }}
      noValidate
      className="space-y-5"
    >
      <FormErrorSummary message={form.summary} />
      <TextField
        label={t('email')}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={message(form.errors.email, email)}
      />
      <ApiAlert message={form.apiErrorMessage} />
      <SubmitButton sending={form.status === 'sending'} label={t('forgotSubmit')} />
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations('Account');
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  usePrimaryAction(formRef);
  const form = useFormSubmission(formRef);
  const [values, setValues] = useState({ password: '', confirmPassword: '' });

  if (form.status === 'sent') {
    return (
      <div className="space-y-5">
        <SuccessMessage>{t('resetDone')}</SuccessMessage>
        <Link
          href="/account/login"
          className="inline-block font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
        >
          {t('login')}
        </Link>
      </div>
    );
  }

  return (
    <form
      method="post"
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit(
          resetPasswordSchema,
          { token, password: values.password },
          '/auth/password/reset',
          mismatch(values.password, values.confirmPassword),
        );
      }}
      noValidate
      className="space-y-5"
    >
      <FormErrorSummary message={form.summary} />
      <TextField
        label={t('newPassword')}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint={t('passwordHint')}
        value={values.password}
        onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
        error={message(form.errors.password, values.password)}
      />
      <TextField
        label={t('confirmPassword')}
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        value={values.confirmPassword}
        onChange={(event) =>
          setValues((current) => ({ ...current, confirmPassword: event.target.value }))
        }
        error={message(form.errors.confirmPassword, values.confirmPassword)}
      />
      <ApiAlert message={form.apiErrorMessage} />
      <SubmitButton sending={form.status === 'sending'} label={t('resetSubmit')} />
    </form>
  );
}
