'use client';

import {
  ARTICLE_STATUSES,
  mediaUpsertSchema,
  type AdminMediaItem,
  type AdminMediaVideoJob,
  type ArticleStatus,
  type Locale,
  type MediaKind,
  type MediaUploadSession,
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
import {
  cancelFilmUpload,
  FilmRefused,
  FilmUploadInterrupted,
  uploadFilm,
  waitForFilm,
  type FilmUploadProgress,
} from '@/lib/admin/film-upload';
import { FILM_ACCEPT, isFilmFile, uploadFile } from '@/lib/admin/uploads';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { formatFileSize } from '@/lib/format';
import { useValidationMessage } from '@/lib/use-validation-message';
import { useAdminErrorMessage, useAdminOrApiMessage } from './admin-errors';
import { ConfirmDialog } from './confirm-dialog';
import { FilmTransfer } from './film-transfer';
import { ImageUploader } from './image-uploader';
import { ReadinessChecklist } from './readiness-checklist';
import { notify } from './toast';
import { fromTranslation, toTranslationPayload, TranslationEditor } from './translation-editor';

const KEYS = ['title', 'caption', 'altText'] as const;
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
    videoDurationSeconds: kind !== 'PHOTO' && seconds.trim() !== '' ? Number(seconds) : null,
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

  const video = kind !== 'PHOTO';
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
          {kind === 'SHORT' ? (
            <CheckboxField
              label={t('media.featured')}
              hint={t('media.featuredVideoHint')}
              name="isFeatured"
              checked={isFeatured}
              onChange={(event) => setFeatured(event.target.checked)}
            />
          ) : null}
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
  const list = `/admin/media${{ PHOTO: '', VIDEO: '?kind=videos', SHORT: '?kind=shorts' }[item.kind]}`;

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
          href={
            { PHOTO: '/media/photos', VIDEO: '/media/videos', SHORT: '/media/shorts' }[item.kind]
          }
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

/**
 * The film's file: what is there now (playable here, never automatically), a chosen file played
 * locally before it is sent, and the upload in pieces through the API (any size, ADR-061), which
 * checks the real content, reads the running time from it and makes it ready for the site
 * (ADR-062: an iPhone's .MOV becomes an MP4), shown here as it goes. A lost connection leaves the
 * upload to go on with; leaving the page while it goes up asks first.
 */
function VideoSlot({ item }: { item: AdminMediaItem }) {
  const t = useTranslations('Admin');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const inputId = useId();
  const [chosen, setChosen] = useState<{ file: File; url: string; playable: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [transfer, setTransfer] = useState<FilmUploadProgress | null>(null);
  const [interrupted, setInterrupted] = useState(false);
  /** The uploaded film being made ready, as the API last said (followed while it lasts). */
  const [job, setJob] = useState<AdminMediaVideoJob | null>(item.videoJob);
  const [jobOf, setJobOf] = useState(item.videoJob);
  if (jobOf !== item.videoJob) {
    // The item was refreshed: its own word on the film is where following starts again.
    setJobOf(item.videoJob);
    setJob(item.videoJob);
  }
  const session = useRef<MediaUploadSession | null>(null);
  const stop = useRef<AbortController | null>(null);
  const refused = item.videoJob?.state === 'failed' && !chosen ? new FilmRefused(item) : null;
  const failureMessage = useAdminOrApiMessage(interrupted ? null : (failure ?? refused));
  const active = item.videoJob !== null && item.videoJob.state !== 'failed';

  // A film being made ready (ADR-062) is followed until it is; then the page shows it.
  useEffect(() => {
    if (!active) return;
    const following = new AbortController();
    void waitForFilm(item.id, { onProgress: setJob, signal: following.signal }).then(
      () => {
        notify(t('media.filmReady'));
        router.refresh();
      },
      (caught: unknown) => {
        if (caught instanceof FilmRefused) router.refresh();
      },
    );
    return () => following.abort();
    // The item's job is followed from its start; the answers themselves update `job`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, active]);

  useEffect(() => () => (chosen ? URL.revokeObjectURL(chosen.url) : undefined), [chosen]);

  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending]);

  /** Drops an upload that will not go on; what was sent of it is removed. */
  function forget() {
    if (session.current) void cancelFilmUpload(item.id, session.current.id);
    session.current = null;
    setTransfer(null);
    setInterrupted(false);
  }

  function choose(file: File | undefined) {
    if (!file) return;
    forget();
    setFailure(null);
    const playable = isFilmFile(file);
    setChosen({ file, url: URL.createObjectURL(file), playable });
  }

  async function upload() {
    if (!chosen?.playable) return;
    setPending(true);
    setFailure(null);
    setInterrupted(false);
    const controller = new AbortController();
    stop.current = controller;
    try {
      await uploadFilm(item.id, chosen.file, {
        session: session.current,
        // Without a cover yet, the API takes one from the film (ADR-062).
        poster: item.image === null,
        onStart: (started) => {
          session.current = started;
        },
        onProgress: setTransfer,
        signal: controller.signal,
      });
      session.current = null;
      setTransfer(null);
      setChosen(null);
      // The API makes it ready now; the refreshed item says how that goes.
      router.refresh();
    } catch (caught) {
      if (caught instanceof FilmUploadInterrupted) {
        session.current = caught.session;
        setInterrupted(true);
        setFailure(caught.reason);
      } else if (!(caught instanceof DOMException && caught.name === 'AbortError')) {
        session.current = null;
        setFailure(caught instanceof ApiError ? caught : new ApiError(0, null));
      }
    } finally {
      stop.current = null;
      setPending(false);
    }
  }

  function cancel() {
    stop.current?.abort();
    forget();
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
          {formatFileSize(item.video.bytes, locale)}
          {item.videoDurationSeconds ? ` · ${duration(item.videoDurationSeconds)}` : ''}
          {` · ${item.video.hasAudio ? t('media.withSound') : t('media.silent')}`}
        </p>
      ) : null}
      {active && job && job.state !== 'failed' ? (
        <div
          aria-live="polite"
          className="max-w-xl space-y-1.5 rounded-control bg-surface-muted px-4 py-3"
        >
          <p className="flex items-center gap-2 text-body-sm text-fg">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            {job.state === 'waiting' ? t('media.filmWaiting') : t('media.filmPreparing')}
            {job.percent !== null ? (
              <span className="ml-auto tabular-nums">{job.percent}%</span>
            ) : null}
          </p>
          {job.percent !== null ? (
            <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-line">
              <span
                className="block h-full rounded-full bg-brand transition-[width] duration-200"
                style={{ width: `${job.percent}%` }}
              />
            </span>
          ) : null}
          <p className="text-caption text-fg-subtle">{t('compose.preparing')}</p>
        </div>
      ) : null}
      {chosen ? (
        <div className="space-y-2">
          <p className="text-caption text-fg-subtle">
            {chosen.file.name} · {formatFileSize(chosen.file.size, locale)}
          </p>
          {!chosen.playable ? (
            <p role="alert" className="text-body-sm font-medium text-danger">
              {t('uploads.errors.unsupported_video')}
            </p>
          ) : null}
          {transfer && (pending || interrupted) ? (
            <div aria-live="polite">
              <FilmTransfer transfer={transfer} active={pending} onStop={cancel} />
            </div>
          ) : null}
          {interrupted && transfer ? (
            <Notice tone="warning">
              {t('compose.interrupted', {
                sent: formatFileSize(transfer.sent, locale),
                total: formatFileSize(transfer.total, locale),
              })}
            </Notice>
          ) : null}
          {pending ? null : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void upload()} disabled={!chosen.playable}>
                <Upload aria-hidden className="h-4 w-4" />
                {interrupted ? t('compose.resume') : t('uploads.uploadOne')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  forget();
                  setChosen(null);
                }}
              >
                <X aria-hidden className="h-4 w-4" />
                {t('uploads.cancel')}
              </Button>
            </div>
          )}
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
            accept={FILM_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              choose(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
      )}
      <p className="text-caption text-fg-subtle">{t('media.videoHint')}</p>
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
