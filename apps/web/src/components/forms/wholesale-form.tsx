'use client';

import { BUSINESS_TYPES, REGIONS, wholesaleInquirySchema, type Locale } from '@teran/contracts';
import { Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { FormErrorSummary, SelectField, TextAreaField, TextField } from '@/components/ui/field';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useValidationMessage } from '@/lib/use-validation-message';
import { FormSuccess, Honeypot, honeypotValue } from './form-success';

const EMPTY = {
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  businessType: '',
  regionCode: '',
  city: '',
  monthlyVolume: '',
  message: '',
};

export function WholesaleForm() {
  const t = useTranslations('Forms');
  const tw = useTranslations('Wholesale');
  const tco = useTranslations('Checkout');
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
      wholesaleInquirySchema,
      { ...values, locale, website: honeypotValue(event.currentTarget) },
      '/inquiries/wholesale',
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
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={t('companyName')}
          name="companyName"
          autoComplete="organization"
          required
          value={values.companyName}
          onChange={set('companyName')}
          error={error('companyName')}
        />
        <SelectField
          label={t('businessType')}
          name="businessType"
          required
          placeholder={t('businessTypePlaceholder')}
          options={BUSINESS_TYPES.map((type) => ({ value: type, label: tw(`segments.${type}`) }))}
          value={values.businessType}
          onChange={set('businessType')}
          error={error('businessType')}
        />
        <TextField
          label={t('contactName')}
          name="contactName"
          autoComplete="name"
          required
          value={values.contactName}
          onChange={set('contactName')}
          error={error('contactName')}
        />
        <TextField
          label={t('phone')}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998 90 123 45 67"
          required
          value={values.phone}
          onChange={set('phone')}
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
        <SelectField
          label={t('region')}
          name="regionCode"
          placeholder={tco('regionPlaceholder')}
          options={REGIONS.map((region) => ({ value: region.code, label: region.name[locale] }))}
          value={values.regionCode}
          onChange={set('regionCode')}
          error={error('regionCode')}
        />
        <TextField
          label={t('city')}
          name="city"
          autoComplete="address-level2"
          value={values.city}
          onChange={set('city')}
          error={error('city')}
        />
        <TextField
          label={t('monthlyVolume')}
          name="monthlyVolume"
          hint={t('monthlyVolumeHint')}
          value={values.monthlyVolume}
          onChange={set('monthlyVolume')}
          error={error('monthlyVolume')}
        />
      </div>
      <TextAreaField
        label={t('message')}
        name="message"
        rows={5}
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
