'use client';

import {
  ARTICLE_STATUSES,
  ILLUSTRATION_KEYS,
  articleUpsertSchema,
  type AdminArticle,
} from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useValidationMessage } from '@/lib/use-validation-message';
import { fromTranslation, toTranslationPayload, TranslationEditor } from './translation-editor';

const KEYS = ['title', 'excerpt', 'body', 'seoTitle', 'seoDescription'] as const;

/** Journal article: plain-text body (rendered safely on the storefront), status and translations. */
export function ArticleEditor({ article }: { article: AdminArticle | null }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [status, setStatus] = useState<string>(article?.status ?? 'DRAFT');
  const [illustrationKey, setIllustrationKey] = useState<string>(article?.illustrationKey ?? '');
  const [translations, setTranslations] = useState(() =>
    fromTranslation(article?.translations ?? null, KEYS),
  );
  const error = (path: string, value?: string) => message(form.errors[path], value);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      slug: slug.trim(),
      status,
      illustrationKey: illustrationKey || null,
      translations: toTranslationPayload(translations),
    };
    const created: { id?: string } = {};
    const saved = await form.submit(articleUpsertSchema, payload, async (data) => {
      const result = article
        ? await apiRequest<AdminArticle>(`/admin/articles/${article.id}`, {
            method: 'PUT',
            body: data,
          })
        : await apiRequest<AdminArticle>('/admin/articles', { method: 'POST', body: data });
      created.id = result.id;
    });
    if (saved && created.id) {
      router.replace(`/admin/journal/${created.id}?saved=1`, { scroll: false });
      router.refresh();
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start"
    >
      <div className="space-y-4 rounded-[var(--radius-card)] border border-ivory-200 bg-white p-5 sm:p-6">
        <FormErrorSummary message={form.summary} />
        <TranslationEditor
          value={translations}
          onChange={setTranslations}
          error={error}
          fields={[
            { key: 'title', label: t('journal.articleTitle'), required: true, maxLength: 150 },
            {
              key: 'excerpt',
              label: t('journal.excerpt'),
              multiline: true,
              rows: 2,
              maxLength: 300,
            },
            {
              key: 'body',
              label: t('journal.body'),
              multiline: true,
              rows: 14,
              required: true,
              maxLength: 20000,
              hint: t('journal.bodyHint'),
            },
            { key: 'seoTitle', label: t('products.seoTitle'), maxLength: 70 },
            {
              key: 'seoDescription',
              label: t('products.seoDescription'),
              multiline: true,
              rows: 2,
              maxLength: 170,
            },
          ]}
        />
      </div>
      <div className="space-y-4 rounded-[var(--radius-card)] border border-ivory-200 bg-white p-5 xl:sticky xl:top-6">
        <SelectField
          label={t('common.status')}
          name="status"
          required
          options={ARTICLE_STATUSES.map((value) => ({ value, label: t(`articleStatus.${value}`) }))}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        />
        <TextField
          label={t('common.slug')}
          name="slug"
          required
          hint={t('common.slugHint')}
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          error={error('slug', slug)}
        />
        <SelectField
          label={t('common.illustration')}
          name="illustrationKey"
          options={[
            { value: '', label: t('common.noIllustration') },
            ...ILLUSTRATION_KEYS.map((key) => ({ value: key, label: key })),
          ]}
          value={illustrationKey}
          onChange={(event) => setIllustrationKey(event.target.value)}
        />
        <ApiAlert message={form.apiErrorMessage} />
        <SubmitButton
          sending={form.status === 'sending'}
          label={article ? t('common.save') : t('common.create')}
          sendingLabel={t('common.saving')}
        />
      </div>
    </form>
  );
}
