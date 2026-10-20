'use client';

import { contactInquirySchema, type Locale } from '@teran/contracts';
import { Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  FieldError,
  FieldLabel,
  FormErrorSummary,
  inputClasses,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { usePrimaryAction } from '@/lib/floating';
import { useValidationMessage } from '@/lib/use-validation-message';
import { FormSuccess, Honeypot, honeypotValue } from './form-success';
import { useOrderLine } from './order-line';

const EMPTY = { name: '', phone: '', email: '', subject: '', message: '' };

/** The reference's subjects, as TERAN's: what the choice sends is its wording in the language read. */
const SUBJECTS = [
  'newOrder',
  'order',
  'damaged',
  'missing',
  'product',
  'wholesale',
  'feedback',
  'other',
] as const;

/**
 * The contact form — while prices are hidden, the way to order — on the design system's fields
 * (components/ui/field.tsx): name, then how TERAN can answer (a phone or an e-mail, either one,
 * as one group named by the hint), the subject, the message and the send button, which keeps
 * keyboard focus and shows its progress while sending. Errors are named under each field. Reached
 * from a tea's "Order" (`/contact?tea=…`), it takes "Place an order" and the tea's name and pack
 * from the order summary above it (order-line.ts) while those fields are still untouched, and
 * comes back to that state after a reset. While it fills the lower part of a phone's screen the
 * floating contact disc steps aside (lib/floating).
 */
export function ContactForm() {
  const t = useTranslations('Forms');
  const locale = useLocale() as Locale;
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  usePrimaryAction(formRef);
  const orderLine = useOrderLine();
  const ordering = (line: string | null) =>
    line ? { subject: t('subjects.newOrder'), message: `${line}\n` } : null;
  const [values, setValues] = useState(EMPTY);
  const id = useId();

  // The summary streams in after the form: the subject and message are filled once when it arrives,
  // unless the visitor has already chosen or written something there.
  const [appliedLine, setAppliedLine] = useState<string | null>(null);
  if (orderLine && orderLine !== appliedLine) {
    setAppliedLine(orderLine);
    const prefill = ordering(orderLine);
    if (prefill && !values.subject && !values.message) setValues({ ...values, ...prefill });
  }

  const set =
    (key: keyof typeof EMPTY) =>
    (event: { target: { value: string } }): void =>
      setValues((current) => ({ ...current, [key]: event.target.value }));
  // An error leaves as soon as its field changes (form.errorsFor); "a phone or an e-mail", reported
  // on the phone, leaves once either is filled.
  const live = form.errorsFor(values);
  if (live.phone?.message === 'contact_required' && values.email.trim()) delete live.phone;
  const error = (key: keyof typeof EMPTY) => message(live[key], values[key]) ?? undefined;

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
        text={orderLine ? t('orderSuccess', { order: orderLine }) : undefined}
        onReset={() => {
          setValues({ ...EMPTY, ...ordering(orderLine) });
          form.reset();
        }}
      />
    );
  }

  const reach = (key: 'phone' | 'email') => {
    const fieldError = error(key);
    return {
      id: `${id}-${key}`,
      name: key,
      value: values[key],
      onChange: set(key),
      'aria-invalid': fieldError ? true : undefined,
      'aria-describedby': [`${id}-reach`, fieldError ? `${id}-${key}-error` : undefined]
        .filter(Boolean)
        .join(' '),
      className: inputClasses({ invalid: Boolean(fieldError) }),
    };
  };

  return (
    <form
      method="post"
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-6"
    >
      <FormErrorSummary message={form.summary} />
      <TextField
        label={t('name')}
        name="name"
        value={values.name}
        onChange={set('name')}
        error={error('name')}
        required
        autoComplete="name"
        placeholder={t('namePlaceholder')}
      />
      {/* How TERAN can answer: either one is enough, so the pair is one group under the hint. */}
      <fieldset className="grid grid-cols-1 gap-x-4 gap-y-5 @min-[35.5rem]:grid-cols-2">
        <legend id={`${id}-reach`} className="mb-3 text-label text-fg">
          {t('contactHint')}
        </legend>
        <div>
          <FieldLabel htmlFor={`${id}-phone`} required>
            {t('phone')}
          </FieldLabel>
          <input
            {...reach('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+998 90 123 45 67"
          />
          {error('phone') ? (
            <FieldError id={`${id}-phone-error`}>{error('phone')}</FieldError>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor={`${id}-email`} required>
            {t('email')}
          </FieldLabel>
          <input
            {...reach('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
          />
          {error('email') ? (
            <FieldError id={`${id}-email-error`}>{error('email')}</FieldError>
          ) : null}
        </div>
      </fieldset>
      <SelectField
        label={t('subject')}
        name="subject"
        value={values.subject}
        onChange={set('subject')}
        error={error('subject')}
        placeholder={t('subjectPlaceholder')}
        options={SUBJECTS.map((subject) => ({
          value: t(`subjects.${subject}`),
          label: t(`subjects.${subject}`),
        }))}
      />
      <TextAreaField
        label={t('message')}
        name="message"
        value={values.message}
        onChange={set('message')}
        error={error('message')}
        required
        rows={5}
        maxLength={3000}
        placeholder={t('messagePlaceholder')}
      />
      <Honeypot />
      {form.apiErrorMessage ? (
        <Notice tone="danger" role="alert">
          {form.apiErrorMessage}
        </Notice>
      ) : null}
      <Button
        type="submit"
        variant="inverse"
        size="lg"
        loading={form.status === 'sending'}
        className="w-full gap-2.5 @min-[35.5rem]:w-auto @min-[35.5rem]:self-start"
      >
        {form.status === 'sending' ? t('sending') : orderLine ? t('sendOrder') : t('sendMessage')}
        {form.status === 'sending' ? null : <Send aria-hidden className="h-4 w-4" />}
      </Button>
    </form>
  );
}
