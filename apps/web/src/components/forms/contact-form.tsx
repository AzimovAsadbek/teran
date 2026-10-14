'use client';

import { contactInquirySchema, type Locale } from '@teran/contracts';
import { Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { FormErrorSummary, TextAreaField, TextField } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useValidationMessage } from '@/lib/use-validation-message';
import { FormSuccess, Honeypot, honeypotValue } from './form-success';

const EMPTY = { name: '', phone: '', email: '', subject: '', message: '' };

export function ContactForm() {
  const t = useTranslations('Forms');
  const locale = useLocale() as Locale;
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [values, setValues] = useState(EMPTY);

  const set = (key: keyof typeof EMPTY) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const error = (key: keyof typeof EMPTY) => message(form.errors[key], values[key]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await form.submit(
      contactInquirySchema,
      { ...values, locale, website: honeypotValue(event.currentTarget) },
      '/inquiries/contact',
    );
  }

  if (form.status === 'sent') {
    return (
      <FormSuccess
        onReset={() => {
          setValues(EMPTY);
          form.reset();
        }}
      />
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      <FormErrorSummary message={form.summary} />
      <TextField
        label={t('name')}
        name="name"
        autoComplete="name"
        required
        value={values.name}
        onChange={set('name')}
        error={error('name')}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('phone')}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          value={values.phone}
          onChange={set('phone')}
          hint={t('contactHint')}
          error={error('phone')}
        />
        <TextField
          label={t('email')}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          error={error('email')}
        />
      </div>
      <TextField
        label={t('subject')}
        name="subject"
        maxLength={150}
        value={values.subject}
        onChange={set('subject')}
        error={error('subject')}
      />
      <TextAreaField
        label={t('message')}
        name="message"
        required
        rows={6}
        maxLength={3000}
        value={values.message}
        onChange={set('message')}
        error={error('message')}
      />
      <Honeypot />
      {form.apiErrorMessage ? (
        <Notice tone="danger" role="alert">
          {form.apiErrorMessage}
        </Notice>
      ) : null}
      <Button type="submit" size="lg" loading={form.status === 'sending'}>
        {form.status === 'sending' ? null : <Send aria-hidden className="h-4 w-4" />}
        {form.status === 'sending' ? t('sending') : t('send')}
      </Button>
    </form>
  );
}
