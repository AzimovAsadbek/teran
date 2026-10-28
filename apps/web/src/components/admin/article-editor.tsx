'use client';

import {
  ARTICLE_STATUSES,
  ILLUSTRATION_KEYS,
  articleUpsertSchema,
  type AdminArticle,
  type AdminMediaItem,
  type ArticleUpsertInput,
  type TelegramMode,
} from '@teran/contracts';
import { ExternalLink, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter as useNextRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { CheckboxField, FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link, useRouter } from '@/i18n/navigation';
import { uploadFile } from '@/lib/admin/uploads';
import { apiRequest } from '@/lib/api/client';
import { slugify } from '@/lib/slugify';
import { useValidationMessage } from '@/lib/use-validation-message';
import { useAdminErrorMessage } from './admin-errors';
import { ArticleMediaPicker } from './article-media-picker';
import { ConfirmDialog } from './confirm-dialog';
import { ImageUploader } from './image-uploader';
import { ReadinessChecklist } from './readiness-checklist';
import { TelegramPanel } from './telegram-panel';
import { fromTranslation, toTranslationPayload, TranslationEditor } from './translation-editor';
import { notify } from './toast';
import { useLeaveGuard } from './use-leave-guard';

const KEYS = ['title', 'excerpt', 'body', 'seoTitle', 'seoDescription', 'coverAlt'] as const;

/** "2026-10-16T14:05" in the editor's own time zone, for a datetime-local field. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** A date-time field's value still ahead (a scheduled publication). */
function isFuture(local: string): boolean {
  return local !== '' && new Date(local).getTime() > Date.now();
}

/**
 * A journal article: cover picture, texts per language (plain text, rendered safely), status and
 * publication date (a future date schedules it), home-page featuring and an optional Telegram
 * announcement. The checklist says what publishing still needs; the preview shows the real page.
 */
export function ArticleEditor({
  article,
  telegram,
  gallery,
}: {
  article: AdminArticle | null;
  telegram: { mode: TelegramMode; channel: string | null };
  /** Gallery items that can be shown with the article. */
  gallery: AdminMediaItem[];
}) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const nextRouter = useNextRouter();
  const message = useValidationMessage();
  const explain = useAdminErrorMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const coverRef = useRef<HTMLElement>(null);
  const form = useFormSubmission(formRef);
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [status, setStatus] = useState<string>(article?.status ?? 'DRAFT');
  const [illustrationKey, setIllustrationKey] = useState<string>(article?.illustrationKey ?? '');
  const [isFeatured, setIsFeatured] = useState(article?.isFeatured ?? false);
  const [announce, setAnnounce] = useState(article?.announceOnTelegram ?? false);
  const [publishedAt, setPublishedAt] = useState(toLocalInput(article?.publishedAt ?? null));
  const [mediaIds, setMediaIds] = useState<string[]>(
    () => article?.media.map((item) => item.id) ?? [],
  );
  const [translations, setTranslations] = useState(() =>
    fromTranslation(article?.translations ?? null, KEYS),
  );
  /** A new article's cover, sent right after it is created (ADR-063). */
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [coverNeeded, setCoverNeeded] = useState(false);
  /** Where staff were going when a new article's unsaved entries made the page ask first. */
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  // A new article's address follows its Uzbek title until staff edit the address themselves.
  const [slugAuto, setSlugAuto] = useState(article === null);
  const payload = {
    slug: slug.trim(),
    status,
    illustrationKey: illustrationKey || null,
    isFeatured,
    announceOnTelegram: announce,
    publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
    mediaIds,
    translations: toTranslationPayload(translations),
  };
  const [initial, setInitial] = useState(() => JSON.stringify(payload));
  const dirty = JSON.stringify(payload) !== initial;
  const visible = form.errorsFor(payload);
  const error = (path: string, value?: string) => message(visible[path], value);

  // Leaving the page (reload, closing the tab) with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  // A new article's entries are not kept when its page is left (ADR-063): a link asks first.
  useLeaveGuard(article === null && (dirty || pendingCover !== null), setLeaveTo);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (article) {
      const saved = await form.submit(articleUpsertSchema, payload, (data) =>
        apiRequest<AdminArticle>(`/admin/articles/${article.id}`, { method: 'PUT', body: data }),
      );
      if (saved) {
        notify(t('common.saved'));
        setInitial(JSON.stringify(payload));
        router.refresh();
      }
      return;
    }
    // Created in one go (ADR-063): saved as a draft first (the API checks the cover before an
    // article is published), its cover uploaded, then saved with the status chosen here. What
    // could not be done is said on the article's page, where the draft waits.
    if (status === 'PUBLISHED' && !pendingCover) {
      setCoverNeeded(true);
      coverRef.current?.scrollIntoView({ block: 'center' });
      return;
    }
    setCoverNeeded(false);
    const outcome = { id: '', coverFailed: false, published: true };
    const saved = await form.submit(articleUpsertSchema, payload, async (valid) => {
      const data = valid as ArticleUpsertInput;
      const created = await apiRequest<AdminArticle>('/admin/articles', {
        method: 'POST',
        body: { ...data, status: 'DRAFT' },
      });
      outcome.id = created.id;
      if (pendingCover) {
        try {
          await uploadFile(`/admin/articles/${created.id}/cover`, pendingCover);
        } catch {
          outcome.coverFailed = true;
        }
      }
      if (data.status === 'DRAFT') return;
      outcome.published = false;
      if (outcome.coverFailed) return;
      try {
        await apiRequest(`/admin/articles/${created.id}`, { method: 'PUT', body: data });
        outcome.published = true;
      } catch {
        // Not ready to publish (the checklist on its page says why): it stays a draft.
      }
    });
    if (!saved || !outcome.id) return;
    if (!outcome.coverFailed && outcome.published) {
      // All done: back to the list, where the newest article comes first (ADR-063).
      notify(status === 'PUBLISHED' ? t('journal.createdPublishedShort') : t('journal.created'));
      router.replace('/admin/journal');
      return;
    }
    // Something is left to finish: the article's page says what, and the draft waits there.
    notify(t('journal.created'));
    const query = new URLSearchParams({ created: '1' });
    if (outcome.coverFailed) query.set('coverFailed', '1');
    if (!outcome.published) query.set('notPublished', '1');
    router.replace(`/admin/journal/${outcome.id}?${query.toString()}`);
  }

  const scheduled = isFuture(publishedAt);

  return (
    <form
      method="post"
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start"
    >
      <div className="space-y-6">
        <section
          id="article-cover"
          ref={coverRef}
          className="scroll-mt-24 space-y-3 rounded-card border border-line bg-surface p-5 sm:p-6"
        >
          <h2 className="text-body-lg font-semibold text-fg">{t('journal.cover')}</h2>
          <ImageUploader
            image={article?.cover ?? null}
            uploadPath={article ? `/admin/articles/${article.id}/cover` : null}
            removePath={
              article && article.status !== 'PUBLISHED'
                ? `/admin/articles/${article.id}/cover`
                : null
            }
            emptyText={t('journal.coverEmpty')}
            hint={t('journal.coverHint')}
            onDefer={article ? undefined : setPendingCover}
          />
          {coverNeeded && !pendingCover ? (
            <p role="alert" className="text-body-sm font-medium text-danger">
              {t('journal.coverNeeded')}
            </p>
          ) : null}
        </section>
        <div
          id="article-texts"
          className="scroll-mt-24 space-y-4 rounded-card border border-line bg-surface p-5 sm:p-6"
        >
          <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />
          <TranslationEditor
            value={translations}
            onChange={(next) => {
              setTranslations(next);
              if (slugAuto) setSlug(slugify(next.uz.title));
            }}
            error={error}
            fields={[
              { key: 'title', label: t('journal.articleTitle'), required: true, maxLength: 150 },
              {
                key: 'excerpt',
                label: t('journal.excerpt'),
                hint: t('journal.excerptHint'),
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
              {
                key: 'coverAlt',
                label: t('journal.coverAlt'),
                hint: t('journal.coverAltHint'),
                maxLength: 200,
              },
              { key: 'seoTitle', label: t('products.seoTitle'), maxLength: 70 },
              {
                key: 'seoDescription',
                label: t('products.seoDescription'),
                hint: t('journal.seoHint'),
                multiline: true,
                rows: 2,
                maxLength: 170,
              },
            ]}
          />
        </div>
        <section
          id="article-media"
          aria-labelledby="article-media-title"
          className="scroll-mt-24 space-y-3 rounded-card border border-line bg-surface p-5 sm:p-6"
        >
          <h2 id="article-media-title" className="text-body-lg font-semibold text-fg">
            {t('journal.media')}
          </h2>
          <ArticleMediaPicker gallery={gallery} value={mediaIds} onChange={setMediaIds} />
        </section>
      </div>
      <div className="space-y-4 xl:sticky xl:top-6">
        <div className="space-y-4 rounded-card border border-line bg-surface p-5">
          <SelectField
            label={t('common.status')}
            name="status"
            required
            options={ARTICLE_STATUSES.map((value) => ({
              value,
              label: t(`articleStatus.${value}`),
            }))}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
          <TextField
            label={t('journal.publishedAt')}
            name="publishedAt"
            type="datetime-local"
            size="sm"
            hint={scheduled ? t('journal.scheduledHint') : t('journal.publishedAtHint')}
            value={publishedAt}
            onChange={(event) => setPublishedAt(event.target.value)}
            error={error('publishedAt')}
          />
          <CheckboxField
            label={t('journal.featured')}
            hint={t('journal.featuredHint')}
            name="isFeatured"
            checked={isFeatured}
            onChange={(event) => setIsFeatured(event.target.checked)}
          />
          <TextField
            label={t('common.slug')}
            name="slug"
            required
            size="sm"
            hint={t('common.slugHint')}
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugAuto(false);
            }}
            error={error('slug', slug)}
          />
          <SelectField
            label={t('common.illustration')}
            name="illustrationKey"
            options={[
              { value: '', label: t('common.noIllustration') },
              ...ILLUSTRATION_KEYS.map((key) => ({ value: key, label: t(`illustrations.${key}`) })),
            ]}
            value={illustrationKey}
            onChange={(event) => setIllustrationKey(event.target.value)}
          />
          <ApiAlert message={explain(form.apiError) ?? form.apiErrorMessage} />
          {dirty ? (
            <p className="flex items-center gap-2 text-body-sm text-fg-muted">
              <span aria-hidden className="h-2 w-2 rounded-full bg-warning" />
              {t('common.unsaved')}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton
              sending={form.status === 'sending'}
              label={
                article
                  ? t('common.save')
                  : status === 'PUBLISHED'
                    ? t('journal.createPublished')
                    : t('common.create')
              }
              sendingLabel={t('common.saving')}
            />
            {article ? (
              <Link
                href={`/admin/journal/${article.id}/preview`}
                target="_blank"
                className="inline-flex min-h-10 items-center gap-1.5 text-body-sm font-semibold text-fg hover:underline"
              >
                <Eye aria-hidden className="h-3.5 w-3.5" />
                {t('preview.open')}
              </Link>
            ) : null}
            {article?.status === 'PUBLISHED' ? (
              <Link
                href={`/journal/${article.slug}`}
                target="_blank"
                className="inline-flex min-h-10 items-center gap-1.5 text-body-sm font-semibold text-fg hover:underline"
              >
                {t('products.openInStore')}
                <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
        {article ? (
          <ReadinessChecklist
            readiness={article.readiness}
            sections={{
              title: 'article-texts',
              body: 'article-texts',
              excerpt: 'article-texts',
              slug: 'article-texts',
              seo: 'article-texts',
              translations: 'article-texts',
              cover: 'article-cover',
            }}
          />
        ) : null}
        <TelegramPanel
          entity="article"
          entityId={article?.id ?? null}
          enabled={announce}
          onEnabledChange={setAnnounce}
          status={article?.telegram ?? null}
          mode={telegram.mode}
          channel={telegram.channel}
        />
      </div>
      <ConfirmDialog
        open={leaveTo !== null}
        title={t('common.leaveTitle')}
        description={t('common.leaveNew')}
        confirmLabel={t('common.leave')}
        cancelLabel={t('common.stay')}
        tone="danger"
        onClose={() => setLeaveTo(null)}
        onConfirm={() => {
          const href = leaveTo;
          setLeaveTo(null);
          if (href) nextRouter.push(href);
        }}
      />
    </form>
  );
}
