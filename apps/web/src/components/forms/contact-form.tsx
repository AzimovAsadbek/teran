'use client';

import { contactInquirySchema, type Locale } from '@teran/contracts';
import { ChevronDown, CircleAlert, Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { FormErrorSummary } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { cn } from '@/lib/cn';
import { useValidationMessage } from '@/lib/use-validation-message';
import { FormSuccess, Honeypot, honeypotValue } from './form-success';

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
 * The reference's fields on the teal panel: 55 px boxes in a pale mint with a dark teal edge and
 * text, 4 px corners; focus turns the edge blue (drawn 2 px wide, so keyboard users see it).
 */
const FIELD =
  'block w-full rounded-[0.25rem] border border-[#0c504e] bg-[#f3fafb] px-3 text-[1rem] leading-5 tracking-[-0.00875rem] text-[#126b69] outline-none transition-[border-color,box-shadow] duration-200 ease-in-out placeholder:text-[#126b69] placeholder:opacity-100 focus:border-[#115cb5] focus:shadow-[0_0_0_1px_#115cb5] aria-invalid:border-[#a32e2e] aria-invalid:shadow-[0_0_0_1px_#a32e2e]';
/** The small line over a field (the reference's hint), in black so it reads on the teal. */
const LINE = 'mb-1 block text-[0.75rem] leading-5 text-[#121212]';

/**
 * The contact form as the reference's: name, phone and e-mail under their small lines, the subject
 * list, the message box and the light "Send message" button whose edge darkens while pointed at
 * (the whole width while the panel is 768 px or narrower; it sits in the contact page's container).
 * One of phone or e-mail is needed (TERAN answers by either); errors are named under each field.
 * Reached from a tea's "Order" (`/contact?tea=…`), it opens on "Place an order" with that tea's
 * name and pack already in the message, and it comes back to that state after a reset.
 */
export function ContactForm({ orderLine }: { orderLine?: string }) {
  const t = useTranslations('Forms');
  const tc = useTranslations('Common');
  const locale = useLocale() as Locale;
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const initial = orderLine
    ? { ...EMPTY, subject: t('subjects.newOrder'), message: `${orderLine}\n` }
    : EMPTY;
  const [values, setValues] = useState(initial);
  const id = useId();

  const set =
    (key: keyof typeof EMPTY) =>
    (event: { target: { value: string } }): void =>
      setValues((current) => ({ ...current, [key]: event.target.value }));
  const error = (key: keyof typeof EMPTY) => message(form.errors[key], values[key]);
  const control = (key: keyof typeof EMPTY, describedBy?: string) => ({
    id: `${id}-${key}`,
    name: key,
    value: values[key],
    onChange: set(key),
    'aria-invalid': error(key) ? true : undefined,
    'aria-describedby':
      [describedBy, error(key) ? `${id}-${key}-error` : undefined].filter(Boolean).join(' ') ||
      undefined,
  });

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
          setValues(initial);
          form.reset();
        }}
      />
    );
  }

  const optional = <> ({tc('optional')})</>;
  return (
    <form
      method="post"
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-6"
    >
      <FormErrorSummary message={form.summary} />
      <div>
        <label htmlFor={`${id}-name`} className={LINE}>
          {t('name')}
        </label>
        <input
          {...control('name')}
          autoComplete="name"
          required
          placeholder={t('namePlaceholder')}
          className={cn(FIELD, 'h-[3.4375rem]')}
        />
        <FieldError id={`${id}-name-error`}>{error('name')}</FieldError>
      </div>
      <div>
        <label htmlFor={`${id}-phone`} className={LINE}>
          {t('phone')}
          {optional}
        </label>
        <input
          {...control('phone', `${id}-reach`)}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          className={cn(FIELD, 'h-[3.4375rem]')}
        />
        <FieldError id={`${id}-phone-error`}>{error('phone')}</FieldError>
      </div>
      <div>
        <label htmlFor={`${id}-email`} className={LINE}>
          {t('email')}
          {optional}
        </label>
        <input
          {...control('email', `${id}-reach`)}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          className={cn(FIELD, 'h-[3.4375rem]')}
        />
        <FieldError id={`${id}-email-error`}>{error('email')}</FieldError>
        <p id={`${id}-reach`} className="pt-2 text-[0.75rem] leading-5 text-[#121212]">
          {t('contactHint')}
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-subject`} className="sr-only">
          {t('subject')}
          {optional}
        </label>
        {/* The reference's subject list: a white box with a light edge that greys while pointed at. */}
        <div className="relative">
          <select
            {...control('subject')}
            className={cn(
              'block h-[2.875rem] w-full min-w-[12.5rem] cursor-pointer appearance-none rounded-[0.25rem] border border-[#ddd] bg-white py-3 pr-10 pl-3 text-[0.875rem] leading-5 tracking-[-0.00875rem] outline-none hover:not-focus:border-[#afafaf] focus:border-[#115cb5] focus:shadow-[0_0_0_1px_#115cb5]',
              values.subject ? 'text-[#161616]' : 'text-[#6a6a6a]',
            )}
          >
            <option value="" disabled>
              {t('subjectPlaceholder')}
            </option>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={t(`subjects.${subject}`)} className="text-[#161616]">
                {t(`subjects.${subject}`)}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[#161616]"
          />
        </div>
        <FieldError id={`${id}-subject-error`}>{error('subject')}</FieldError>
      </div>
      <div>
        <label htmlFor={`${id}-message`} className="sr-only">
          {t('message')}
        </label>
        <textarea
          {...control('message')}
          required
          rows={5}
          maxLength={3000}
          placeholder={t('messagePlaceholder')}
          className={cn(FIELD, 'h-[7.875rem] max-h-[10.625rem] resize-y py-3')}
        />
        <FieldError id={`${id}-message-error`}>{error('message')}</FieldError>
      </div>
      <Honeypot />
      {form.apiErrorMessage ? (
        <Notice tone="danger" role="alert">
          {form.apiErrorMessage}
        </Notice>
      ) : null}
      <button
        type="submit"
        disabled={form.status === 'sending'}
        className="mt-4 inline-flex h-[3.375rem] w-full items-center justify-center gap-3 rounded-[0.25rem] border border-[#f3fafb] bg-[#f3fafb] px-5 text-[1.25rem] leading-6 font-medium text-[#0c504e] transition-[border-color] duration-200 hover:border-[#0c504e] disabled:cursor-wait disabled:opacity-80 @min-[48.0625rem]:w-auto @min-[48.0625rem]:max-w-max"
      >
        {form.status === 'sending' ? t('sending') : t('sendMessage')}
        <Send aria-hidden className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </form>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      id={id}
      className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] leading-5 font-semibold text-[#121212]"
    >
      <CircleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#a32e2e]" />
      <span>{children}</span>
    </p>
  );
}
