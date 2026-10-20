'use client';

import {
  ARTICLE_STATUSES,
  MAX_VIDEO_UPLOAD_BYTES,
  mediaUpsertSchema,
  type AdminMediaItem,
  type ArticleStatus,
  type MediaKind,
} from '@teran/contracts';
import { Captions, ExternalLink, Film, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { Button, buttonClasses } from '@/components/ui/button';
import { CheckboxField, FormErrorSummary, SelectField, TextField } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link, useRouter } from '@/i18n/navigation';
import { formatBytes, uploadFile } from '@/lib/admin/uploads';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { useValidationMessage } from '@/lib/use-validation-message';
import { useAdminErrorMessage, useAdminOrApiMessage } from './admin-errors';
import { ConfirmDialog } from './confirm-dialog';
import { ImageUploader } from './image-uploader';
import { ReadinessChecklist } from './readiness-checklist';
import { notify } from './toast';
import { fromTranslation, toTranslationPayload, TranslationEditor } from './translation-editor';

const KEYS = ['title', 'caption', 'altText'] as const;
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const MAX_CAPTIONS_BYTES = 512 * 1024;

/** Required items that only an upload can satisfy (the form itself cannot fix them). */
const FILE_CODES = new Set(['image', 'video', 'poster']);

function duration(seconds: number | null): string | null {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * A photograph ("Rasm") or a film ("Video"); the kind is chosen when it is created and stays
 * fixed, so the two are managed apart. Texts in three languages, status, home-page featuring and,
 * once saved, the files: a photograph, or a film with its poster and optional subtitles. Every
 * file is previewed before it is sent, the checklist says what publishing still needs, and the
 * API checks the same rules.
 */
export function MediaEditor({ item, kind }: { item: AdminMediaItem | null; kind: MediaKind }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const message = useValidationMessage();
  const explain = useAdminErrorMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const [status, setStatus] = useState<ArticleStatus>(item?.status ?? 'DRAFT');
  const [isFeatured, setFeatured] = useState(item?.isFeatured ?? true);
  const [seconds, setSeconds] = useState(item?.videoDurationSeconds?.toString() ?? '');
  const [translations, setTranslations] = useState(() =>
    fromTranslation(item?.translations ?? null, KEYS),
  );
  const payload = {
    kind,
    status,
    isFeatured,
    videoDurationSeconds: kind === 'VIDEO' && seconds.trim() !== '' ? Number(seconds) : null,
    translations: toTranslationPayload(translations),
  };
  const [initial, setInitial] = useState(() => JSON.stringify(payload));
  // The API reads an uploaded film's running time from the file: take it over when it changes
  // (as saved, so the form does not count it as an unsaved edit).
  const [knownSeconds, setKnownSeconds] = useState(item?.videoDurationSeconds ?? null);
  if ((item?.videoDurationSeconds ?? null) !== knownSeconds) {
    const next = item?.videoDurationSeconds ?? null;
    setKnownSeconds(next);
    setSeconds(next?.toString() ?? '');
    setInitial((previous) =>
      JSON.stringify({ ...(JSON.parse(previous) as object), videoDurationSeconds: next }),
    );
  }
  const dirty = JSON.stringify(payload) !== initial;
  const visible = form.errorsFor(payload);
  const error = (path: string, value?: string) => message(visible[path], value);
  const missingFiles = (item?.readiness.items ?? []).filter(
    (entry) => entry.required && !entry.ok && FILE_CODES.has(entry.code),
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created: { id?: string } = {};
    const saved = await form.submit(mediaUpsertSchema, payload, async (data) => {
      const result = item
        ? await apiRequest<AdminMediaItem>(`/admin/media/${item.id}`, { method: 'PUT', body: data })
        : await apiRequest<AdminMediaItem>('/admin/media', { method: 'POST', body: data });
      created.id = result.id;
    });
    if (saved && created.id) {
      notify(t('common.saved'));
      setInitial(JSON.stringify(payload));
      if (item) router.refresh();
      else router.replace(`/admin/media/${created.id}`);
    }
  }

  const video = kind === 'VIDEO';
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
      <div className="space-y-6">
        {item ? (
          <section
            id="media-files"
            aria-labelledby="media-files-title"
            className="scroll-mt-24 space-y-6 rounded-card border border-line bg-surface p-5 sm:p-6"
          >
            <h2 id="media-files-title" className="text-body-lg font-semibold text-fg">
              {t('media.files')}
            </h2>
            {video ? (
              <>
                <VideoSlot item={item} />
                <div className="space-y-2">
                  <h3 className="text-label text-fg">{t('media.poster')}</h3>
                  <ImageUploader
                    image={item.image}
                    uploadPath={`/admin/media/${item.id}/image`}
                    removePath={null}
                    emptyText={t('media.noImage')}
                    hint={t('media.posterHint')}
                  />
                </div>
                <CaptionsSlot item={item} />
              </>
            ) : (
              <div className="space-y-2">
                <h3 className="text-label text-fg">{t('media.image')}</h3>
                <ImageUploader
                  image={item.image}
                  uploadPath={`/admin/media/${item.id}/image`}
                  removePath={null}
                  emptyText={t('media.noImage')}
                  hint={t('media.imageHint')}
                />
              </div>
            )}
          </section>
        ) : null}

        <form
          method="post"
          ref={formRef}
          onSubmit={onSubmit}
          noValidate
          id="media-texts"
          className="scroll-mt-24 space-y-5 rounded-card border border-line bg-surface p-5 sm:p-6"
        >
          <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />
          {item ? null : (
            <Notice tone="info">{video ? t('media.saveFirstVideo') : t('media.saveFirst')}</Notice>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {item ? (
              <SelectField
                label={t('common.status')}
                name="status"
                required
                options={ARTICLE_STATUSES.map((value) => ({
                  value,
                  label: t(`articleStatus.${value}`),
                  // A missing file cannot be fixed here: publishing waits for the upload.
                  disabled:
                    value === 'PUBLISHED' && missingFiles.length > 0 && status !== 'PUBLISHED',
                }))}
                value={status}
                hint={
                  missingFiles.length > 0
                    ? t('readiness.blocked', {
                        items: missingFiles
                          .map((entry) => t(`readiness.codes.${entry.code}`))
                          .join(', '),
                      })
                    : undefined
                }
                onChange={(event) => setStatus(event.target.value as ArticleStatus)}
              />
            ) : null}
            {video ? (
              <div id="media-duration" className="scroll-mt-24">
                <TextField
                  label={t('media.duration')}
                  name="videoDurationSeconds"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={3600}
                  step={1}
                  hint={
                    seconds && duration(Number(seconds))
                      ? `${duration(Number(seconds))} · ${t('media.durationHint')}`
                      : t('media.durationHint')
                  }
                  value={seconds}
                  onChange={(event) => setSeconds(event.target.value)}
                  error={error('videoDurationSeconds', seconds)}
                />
              </div>
            ) : null}
          </div>
          <CheckboxField
            label={t('media.featured')}
            hint={video ? t('media.featuredVideoHint') : t('media.featuredHint')}
            name="isFeatured"
            checked={isFeatured}
            onChange={(event) => setFeatured(event.target.checked)}
          />
          <TranslationEditor
            value={translations}
            onChange={setTranslations}
            error={error}
            fields={[
              { key: 'title', label: t('media.itemTitle'), required: true, maxLength: 120 },
              {
                key: 'caption',
                label: video ? t('media.description') : t('media.caption'),
                multiline: true,
                rows: 3,
                maxLength: 400,
              },
              {
                key: 'altText',
                label: video ? t('media.posterAlt') : t('media.altText'),
                maxLength: 200,
                hint: t('media.altTextHint'),
              },
            ]}
          />
          <ApiAlert message={explain(form.apiError) ?? form.apiErrorMessage} />
          {dirty ? (
            <p className="flex items-center gap-2 text-body-sm text-fg-muted">
              <span aria-hidden className="h-2 w-2 rounded-full bg-warning" />
              {t('common.unsaved')}
            </p>
          ) : null}
          <SubmitButton
            sending={form.status === 'sending'}
            label={item ? t('common.save') : t('common.create')}
            sendingLabel={t('common.saving')}
          />
        </form>
      </div>

      <div className="space-y-4 xl:sticky xl:top-6">
        {item ? (
          <>
            <ReadinessChecklist
              readiness={item.readiness}
              sections={{
                image: 'media-files',
                video: 'media-files',
                captions: 'media-files',
                title: 'media-texts',
                caption: 'media-texts',
                altText: 'media-texts',
                duration: 'media-duration',
              }}
            />
            <ItemActions item={item} />
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Where the item is on the site, and deleting it (with its files) after a confirmation. */
function ItemActions({ item }: { item: AdminMediaItem }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<ApiError | null>(null);
  const deleteMessage = useAdminOrApiMessage(deleteError);
  const list = item.kind === 'VIDEO' ? '/admin/media?kind=videos' : '/admin/media';

  async function remove() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiRequest(`/admin/media/${item.id}`, { method: 'DELETE' });
      notify(t('media.deleted'));
      router.replace(list);
    } catch (caught) {
      setDeleteError(caught instanceof ApiError ? caught : new ApiError(0, null));
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4">
      {item.status === 'PUBLISHED' ? (
        <Link
          href={item.kind === 'VIDEO' ? '/media/videos' : '/media/photos'}
          target="_blank"
          className="inline-flex min-h-10 items-center gap-1.5 text-body-sm font-semibold text-fg hover:underline"
        >
          <ExternalLink aria-hidden className="h-4 w-4" />
          {t('media.viewOnSite')}
        </Link>
      ) : (
        <span className="text-body-sm text-fg-muted">{t('media.notOnSite')}</span>
      )}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={buttonClasses('danger-ghost', 'sm')}
      >
        <Trash2 aria-hidden className="h-4 w-4" />
        {t('media.delete')}
      </button>
      <ConfirmDialog
        open={confirming}
        title={t('media.deleteConfirm')}
        description={t('media.deleteDescription')}
        confirmLabel={t('media.delete')}
        tone="danger"
        pending={deleting}
        error={deleteMessage}
        onClose={() => {
          setConfirming(false);
          setDeleteError(null);
        }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

type VideoProblem = 'unsupported_video' | 'too_large';

/**
 * The film's file: what is there now (playable here, never automatically), a chosen file played
 * locally before it is sent, and the upload through the API, which checks the real content and
 * reads the running time from it.
 */
function VideoSlot({ item }: { item: AdminMediaItem }) {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const router = useRouter();
  const inputId = useId();
  const [chosen, setChosen] = useState<{
    file: File;
    url: string;
    problem: VideoProblem | null;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const failureMessage = useAdminOrApiMessage(failure);
  const limit = formatBytes(MAX_VIDEO_UPLOAD_BYTES, locale);

  useEffect(() => () => (chosen ? URL.revokeObjectURL(chosen.url) : undefined), [chosen]);

  function choose(file: File | undefined) {
    if (!file) return;
    setFailure(null);
    const typeOk = VIDEO_TYPES.has(file.type) || /\.(mp4|webm)$/i.test(file.name);
    const problem: VideoProblem | null = !typeOk
      ? 'unsupported_video'
      : file.size > MAX_VIDEO_UPLOAD_BYTES
        ? 'too_large'
        : null;
    setChosen({ file, url: URL.createObjectURL(file), problem });
  }

  async function upload() {
    if (!chosen || chosen.problem) return;
    setPending(true);
    setFailure(null);
    try {
      await uploadFile(`/admin/media/${item.id}/video`, chosen.file);
      setChosen(null);
      notify(t('common.saved'));
      router.refresh();
    } catch (caught) {
      setFailure(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setPending(false);
    }
  }

  const poster = item.image
    ? `${item.image.src}/${item.image.widths.find((width) => width >= 640) ?? item.image.widths[0]}.webp`
    : undefined;

  return (
    <div className="space-y-2">
      <h3 className="text-label text-fg">{t('media.video')}</h3>
      <div className="relative max-w-xl overflow-hidden rounded-card border border-line bg-black">
        {chosen ? (
          <video
            key={chosen.url}
            src={chosen.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full"
          />
        ) : item.video ? (
          <video
            key={item.video.src}
            controls
            playsInline
            preload="metadata"
            poster={poster}
            className="aspect-video w-full"
          >
            <source src={item.video.src} type={item.video.type} />
            {item.captions ? (
              <track
                kind="captions"
                src={item.captions.src}
                srcLang="uz"
                label={t('media.captions')}
              />
            ) : null}
          </video>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-surface-muted p-4 text-center text-body-sm text-fg-subtle">
            <Film aria-hidden className="h-6 w-6" />
            {t('media.noVideo')}
          </div>
        )}
        {chosen ? (
          <span className="absolute top-2 left-2 rounded-full bg-surface-inverse px-2 py-0.5 text-caption font-semibold text-fg-inverse">
            {t('uploads.notUploaded')}
          </span>
        ) : null}
      </div>
      {item.video && !chosen ? (
        <p className="text-caption text-fg-subtle">
          {formatBytes(item.video.bytes, locale)}
          {item.videoDurationSeconds ? ` · ${duration(item.videoDurationSeconds)}` : ''}
        </p>
      ) : null}
      {chosen ? (
        <div className="space-y-2">
          <p className="text-caption text-fg-subtle">
            {chosen.file.name} · {formatBytes(chosen.file.size, locale)}
          </p>
          {chosen.problem ? (
            <p role="alert" className="text-body-sm font-medium text-danger">
              {chosen.problem === 'too_large'
                ? t('uploads.errors.too_large', { limit })
                : t('uploads.errors.unsupported_video', { limit })}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void upload()}
              loading={pending}
              disabled={chosen.problem !== null}
            >
              <Upload aria-hidden className="h-4 w-4" />
              {t('uploads.uploadOne')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setChosen(null)} disabled={pending}>
              <X aria-hidden className="h-4 w-4" />
              {t('uploads.cancel')}
            </Button>
          </div>
          {pending ? (
            <p className="text-caption text-fg-subtle" aria-live="polite">
              {t('media.uploadingVideo')}
            </p>
          ) : null}
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={buttonClasses(
            'secondary',
            'sm',
            'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
          )}
        >
          <Upload aria-hidden className="h-4 w-4" />
          {item.video ? t('uploads.replace') : t('uploads.choose')}
          <input
            id={inputId}
            type="file"
            accept="video/mp4,video/webm"
            className="sr-only"
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      )}
      <p className="text-caption text-fg-subtle">{t('media.videoHint', { limit })}</p>
      {failureMessage ? (
        <p
          role="alert"
          className="rounded-control bg-danger-soft px-3 py-2 text-body-sm font-medium text-danger"
        >
          {failureMessage}
        </p>
      ) : null}
    </div>
  );
}

/** Optional subtitles for a film (a WebVTT file), uploaded on their own and removable. */
function CaptionsSlot({ item }: { item: AdminMediaItem }) {
  const t = useTranslations('Admin');
  const router = useRouter();
  const inputId = useId();
  const [pending, setPending] = useState(false);
  const [localProblem, setLocalProblem] = useState<string | null>(null);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [confirming, setConfirming] = useState(false);
  const failureMessage = useAdminOrApiMessage(failure);

  async function upload(file: File | undefined) {
    if (!file) return;
    setFailure(null);
    setLocalProblem(null);
    if (!/\.vtt$/i.test(file.name) || file.size > MAX_CAPTIONS_BYTES) {
      setLocalProblem(t('uploads.errors.unsupported_captions'));
      return;
    }
    setPending(true);
    try {
      await uploadFile(`/admin/media/${item.id}/captions`, file);
      notify(t('common.saved'));
      router.refresh();
    } catch (caught) {
      setFailure(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setFailure(null);
    try {
      await apiRequest(`/admin/media/${item.id}/captions`, { method: 'DELETE' });
      setConfirming(false);
      router.refresh();
    } catch (caught) {
      setFailure(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-label text-fg">
        <Captions aria-hidden className="h-4 w-4" />
        {t('media.captions')}
      </h3>
      <p className="text-body-sm text-fg-muted">
        {item.captions ? t('media.captionsPresent') : t('media.captionsNone')}
      </p>
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className={buttonClasses(
            'secondary',
            'sm',
            'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
          )}
        >
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Upload aria-hidden className="h-4 w-4" />
          )}
          {item.captions ? t('uploads.replace') : t('media.uploadCaptions')}
          <input
            id={inputId}
            type="file"
            accept=".vtt,text/vtt"
            disabled={pending}
            className="sr-only"
            onChange={(event) => {
              void upload(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        {item.captions ? (
          <Button size="sm" variant="danger-ghost" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden className="h-4 w-4" />
            {t('uploads.remove')}
          </Button>
        ) : null}
      </div>
      <p className="text-caption text-fg-subtle">{t('media.captionsHint')}</p>
      {localProblem || failureMessage ? (
        <p
          role="alert"
          className="rounded-control bg-danger-soft px-3 py-2 text-body-sm font-medium text-danger"
        >
          {localProblem ?? failureMessage}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirming}
        title={t('media.captionsRemoveConfirm')}
        confirmLabel={t('uploads.remove')}
        tone="danger"
        pending={pending}
        onClose={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
