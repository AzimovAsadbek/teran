'use client';

import {
  announcementSettingSchema,
  contactSettingSchema,
  LOCALES,
  type AnnouncementSetting,
  type ContactSetting,
  type Locale,
} from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton, SuccessMessage } from '@/components/account/auth-forms';
import { CheckboxField, FormErrorSummary, TextAreaField, TextField } from '@/components/ui/field';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useValidationMessage } from '@/lib/use-validation-message';

type LocalizedText = Record<Locale, string>;
const emptyText = (): LocalizedText => ({ uz: '', ru: '', en: '' });
const orNull = (value: string) => (value.trim() === '' ? null : value.trim());
const localizedOrNull = (value: LocalizedText) =>
  LOCALES.every((locale) => value[locale].trim() === '') ? null : value;

export function AnnouncementForm({ value }: { value: AnnouncementSetting | null }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [enabled, setEnabled] = useState(value?.enabled ?? false);
  const [text, setText] = useState<LocalizedText>(value?.text ?? emptyText());
  const [href, setHref] = useState(value?.href ?? '');

  const payload = { enabled, text, href: orNull(href) };
  const visible = form.errorsFor(payload);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await form.submit(announcementSettingSchema, payload, (data) =>
      apiRequest('/admin/settings/announcement', { method: 'PUT', body: data }),
    );
    if (saved) router.refresh();
  }

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />
      <CheckboxField
        label={t('settings.announcementEnabled')}
        name="enabled"
        checked={enabled}
        onChange={(event) => setEnabled(event.target.checked)}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {LOCALES.map((locale) => (
          <TextField
            key={locale}
            label={`${t('settings.announcementText')} · ${t(`common.locales.${locale}`)}`}
            name={`text-${locale}`}
            required={locale === 'uz'}
            maxLength={160}
            lang={locale === 'uz' ? 'uz-Latn' : locale}
            value={text[locale]}
            onChange={(event) =>
              setText((current) => ({ ...current, [locale]: event.target.value }))
            }
            error={message(visible[`text.${locale}`], text[locale])}
          />
        ))}
      </div>
      <TextField
        label={t('settings.announcementLink')}
        name="href"
        hint={t('settings.announcementLinkHint')}
        value={href}
        onChange={(event) => setHref(event.target.value)}
        error={message(visible.href, href)}
      />
      <ApiAlert message={form.apiErrorMessage} />
      {form.status === 'sent' ? <SuccessMessage>{t('common.saved')}</SuccessMessage> : null}
      <SubmitButton
        sending={form.status === 'sending'}
        label={t('common.save')}
        sendingLabel={t('common.saving')}
        className=""
      />
    </form>
  );
}

export function ContactForm({ value }: { value: ContactSetting }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [fields, setFields] = useState({
    phone: value.phone ?? '',
    phone2: value.phone2 ?? '',
    email: value.email ?? '',
    email2: value.email2 ?? '',
    telegram: value.telegram ?? '',
    instagram: value.instagram ?? '',
    whatsapp: value.whatsapp ?? '',
    youtube: value.youtube ?? '',
  });
  const [address, setAddress] = useState<LocalizedText>(value.address ?? emptyText());
  const [hours, setHours] = useState<LocalizedText>(value.workingHours ?? emptyText());
  const set = (key: keyof typeof fields) => (event: { target: { value: string } }) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  const payload = {
    phone: orNull(fields.phone),
    phone2: orNull(fields.phone2),
    email: orNull(fields.email),
    email2: orNull(fields.email2),
    telegram: orNull(fields.telegram.replace(/^@/, '')),
    instagram: orNull(fields.instagram.replace(/^@/, '')),
    whatsapp: orNull(fields.whatsapp),
    youtube: orNull(fields.youtube),
    address: localizedOrNull(address),
    workingHours: localizedOrNull(hours),
  };
  const visible = form.errorsFor(payload);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await form.submit(contactSettingSchema, payload, (data) =>
      apiRequest('/admin/settings/contact', { method: 'PUT', body: data }),
    );
    if (saved) router.refresh();
  }

  return (
    <form method="post" ref={formRef} onSubmit={onSubmit} noValidate className="space-y-4">
      <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          label={t('settings.phone')}
          name="phone"
          type="tel"
          value={fields.phone}
          onChange={set('phone')}
          error={message(visible.phone, fields.phone)}
        />
        <TextField
          label={t('settings.phone2')}
          name="phone2"
          type="tel"
          value={fields.phone2}
          onChange={set('phone2')}
          error={message(visible.phone2, fields.phone2)}
        />
        <TextField
          label={t('settings.email')}
          name="email"
          type="email"
          value={fields.email}
          onChange={set('email')}
          error={message(visible.email, fields.email)}
        />
        <TextField
          label={t('settings.email2')}
          name="email2"
          type="email"
          value={fields.email2}
          onChange={set('email2')}
          error={message(visible.email2, fields.email2)}
        />
        <TextField
          label={t('settings.telegram')}
          name="telegram"
          value={fields.telegram}
          onChange={set('telegram')}
          error={message(visible.telegram, fields.telegram)}
        />
        <TextField
          label={t('settings.instagram')}
          name="instagram"
          value={fields.instagram}
          onChange={set('instagram')}
          error={message(visible.instagram, fields.instagram)}
        />
        <TextField
          label={t('settings.whatsapp')}
          name="whatsapp"
          value={fields.whatsapp}
          onChange={set('whatsapp')}
          error={message(visible.whatsapp, fields.whatsapp)}
          hint={t('settings.whatsappHint')}
        />
        <TextField
          label={t('settings.youtube')}
          name="youtube"
          value={fields.youtube}
          onChange={set('youtube')}
          error={message(visible.youtube, fields.youtube)}
          hint={t('settings.youtubeHint')}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {LOCALES.map((locale) => (
          <TextAreaField
            key={locale}
            label={`${t('settings.address')} · ${t(`common.locales.${locale}`)}`}
            name={`address-${locale}`}
            rows={2}
            maxLength={300}
            lang={locale === 'uz' ? 'uz-Latn' : locale}
            value={address[locale]}
            onChange={(event) =>
              setAddress((current) => ({ ...current, [locale]: event.target.value }))
            }
          />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {LOCALES.map((locale) => (
          <TextField
            key={locale}
            label={`${t('settings.workingHours')} · ${t(`common.locales.${locale}`)}`}
            name={`hours-${locale}`}
            maxLength={160}
            lang={locale === 'uz' ? 'uz-Latn' : locale}
            value={hours[locale]}
            onChange={(event) =>
              setHours((current) => ({ ...current, [locale]: event.target.value }))
            }
          />
        ))}
      </div>
      <ApiAlert message={form.apiErrorMessage} />
      {form.status === 'sent' ? <SuccessMessage>{t('common.saved')}</SuccessMessage> : null}
      <SubmitButton
        sending={form.status === 'sending'}
        label={t('common.save')}
        sendingLabel={t('common.saving')}
        className=""
      />
    </form>
  );
}
