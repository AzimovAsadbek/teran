'use client';

import type { Locale } from '@teran/contracts/constants';
import { Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useRef, useState, type FormEvent } from 'react';
import { QuantityStepper } from '@/components/cart/quantity-stepper';
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
import { prepareContract, useFormSubmission } from '@/features/forms/use-form-submission';
import { usePrimaryAction } from '@/lib/floating';
import { useValidationMessage } from '@/lib/use-validation-message';
import { FormSuccess, Honeypot, honeypotValue } from './form-success';
import { useOrderLine } from './order-line';

/**
 * The form's contract, loaded once the form is used (or on the first submission), not with the
 * page: Zod stays out of its first bundle (ADR-067).
 */
const contactContract = () =>
  import('@teran/contracts').then((contracts) => contracts.contactInquirySchema);

const EMPTY = { name: '', phone: '', email: '', subject: '', message: '' };

/** The most packs one request names; more is a business enquiry (the wholesale page). */
const MAX_PACKS = 99;

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
 * keyboard focus and shows its progress while sending. Errors are named under each field.
 *
 * Reached from a tea's "Order" (`/contact?tea=…`), it is an order: the tea comes from the order
 * summary beside it (order-line.ts), the subject is "Place an order", a stepper counts the packs
 * and the message becomes an optional note; what is sent is the tea, its pack and the count, then
 * the note ("TERAN 8830 · 400 g × 2"). While it fills the lower part of a phone's screen the
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
  const [values, setValues] = useState(EMPTY);
  const [packs, setPacks] = useState(1);
  const id = useId();

  const order = orderLine ? `${orderLine} × ${packs}` : null;
  const note = values.message.trim();
  // What is checked and sent: an order fixes the subject and leads the message with the tea.
  const payload = order
    ? { ...values, subject: t('subjects.newOrder'), message: note ? `${order}\n\n${note}` : order }
    : values;

  const set =
    (key: keyof typeof EMPTY) =>
    (event: { target: { value: string } }): void =>
      setValues((current) => ({ ...current, [key]: event.target.value }));
  // An error leaves as soon as its field changes (form.errorsFor); "a phone or an e-mail", reported
  // on the phone, leaves once either is filled.
  const live = form.errorsFor(payload);
  if (live.phone?.message === 'contact_required' && values.email.trim()) delete live.phone;
  const error = (key: keyof typeof EMPTY) => message(live[key], values[key]) ?? undefined;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await form.submit(
      contactContract,
      { ...payload, locale, website: honeypotValue(event.currentTarget) },
      '/inquiries/contact',
    );
  }

  if (form.status === 'sent') {
    return (
      <FormSuccess
        text={order ? t('orderSuccess', { order }) : undefined}
        onReset={() => {
          setValues(EMPTY);
          setPacks(1);
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
      // Its contract starts loading as soon as the form is used, so sending validates at once.
      onFocus={() => void prepareContract(contactContract).catch(() => {})}
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
      {order ? (
        <div>
          <p className="mb-2 text-label text-fg" aria-hidden>
            {t('quantity')}
          </p>
          <QuantityStepper
            value={packs}
            max={MAX_PACKS}
            onChange={setPacks}
            label={t('quantity')}
          />
        </div>
      ) : (
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
      )}
      <TextAreaField
        label={order ? t('orderNote') : t('message')}
        name="message"
        value={values.message}
        onChange={set('message')}
        error={error('message')}
        required={!order}
        rows={order ? 4 : 5}
        maxLength={3000}
        placeholder={order ? t('orderNotePlaceholder') : t('messagePlaceholder')}
      />
      <Honeypot />
      {form.apiErrorMessage ? (
        <Notice tone="danger" role="alert">
          {form.apiErrorMessage}
        </Notice>
      ) : null}
      <Button
        type="submit"
        size="lg"
        loading={form.status === 'sending'}
        className="w-full gap-2.5 @min-[35.5rem]:w-auto @min-[35.5rem]:self-start"
      >
        {form.status === 'sending' ? t('sending') : order ? t('sendOrder') : t('sendMessage')}
        {form.status === 'sending' ? null : <Send aria-hidden className="h-4 w-4" />}
      </Button>
    </form>
  );
}
