'use client';

import {
  MAX_VIDEO_UPLOAD_BYTES,
  mediaUpsertSchema,
  type AdminMediaItem,
  type MediaKind,
} from '@teran/contracts';
import { Check, ImagePlus, Loader2, RefreshCw, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type RefObject,
} from 'react';
import { ApiAlert, SubmitButton } from '@/components/account/auth-forms';
import { Button, ButtonLink, buttonClasses } from '@/components/ui/button';
import { CheckboxField, FormErrorSummary } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { useFormSubmission } from '@/features/forms/use-form-submission';
import { Link } from '@/i18n/navigation';
import {
  captureCover,
  drawFrame,
  preparePhoto,
  readVideo,
  seekTo,
  type PreparedPhoto,
  type VideoFacts,
} from '@/lib/admin/media-files';
import { formatBytes, uploadFile, uploadFileWithProgress } from '@/lib/admin/uploads';
import { apiRequest } from '@/lib/api/client';
import { cn } from '@/lib/cn';
import { useValidationMessage } from '@/lib/use-validation-message';
import { useAdminErrorMessage, useLocalImageProblem } from './admin-errors';
import { renditionSrc } from './image-uploader';
import { notify } from './toast';
import { fromTranslation, toTranslationPayload, TranslationEditor } from './translation-editor';

const KEYS = ['title', 'caption'] as const;
const ACCEPT = 'image/*,video/mp4,video/webm';

type Picked =
  | { kind: 'PHOTO'; url: string; photo: PreparedPhoto }
  | { kind: 'VIDEO'; url: string; file: File; facts: VideoFacts };

type Problem =
  'unsupported' | 'mov' | 'tooLargeVideo' | 'unreadableVideo' | 'heic' | 'too_small' | 'unreadable';

type Step = 'create' | 'file' | 'cover' | 'publish' | 'order';

interface Run {
  steps: Step[];
  current: Step | null;
  failed: Step | null;
  /** The file's upload, 0 to 100. */
  percent: number | null;
}

/** What a post has already done on the server, so pressing "Post" again only does the rest. */
interface Made {
  id: string | null;
  file: boolean;
  cover: boolean;
  published: boolean;
  ordered: boolean;
}
const NOTHING_MADE: Made = {
  id: null,
  file: false,
  cover: false,
  published: false,
  ordered: false,
};

function clock(seconds: number): string {
  const whole = Math.max(0, seconds);
  return `${Math.floor(whole / 60)}:${(whole % 60).toFixed(1).padStart(4, '0')}`;
}

/**
 * "Joylash": a photograph or a film posted in one go, as on Instagram (ADR-058). The file comes
 * first, chosen or dropped, and decides the kind. A film is previewed with its sound and its cover
 * is a frame picked with a slider; a photograph too heavy or too large for the site is scaled down
 * in the browser. Then the title (other languages optional), the home page mark for films, and
 * "Post": the item is created, its files uploaded (the film with its progress), it is published
 * and put first in its list. A step that fails leaves a draft; pressing "Post" again finishes it.
 */
export function MediaComposer() {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const message = useValidationMessage();
  const explain = useAdminErrorMessage();
  const photoProblem = useLocalImageProblem();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useFormSubmission(formRef);
  const inputId = useId();
  const captureRef = useRef<HTMLVideoElement>(null);
  const coverRef = useRef<HTMLCanvasElement>(null);
  const made = useRef<Made>({ ...NOTHING_MADE });
  const [picked, setPicked] = useState<Picked | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [coverAt, setCoverAt] = useState(0);
  const [coverFailed, setCoverFailed] = useState(false);
  const [translations, setTranslations] = useState(() => fromTranslation(null, KEYS));
  const [isFeatured, setFeatured] = useState(true);
  const [publish, setPublish] = useState(true);
  const [run, setRun] = useState<Run | null>(null);
  const [posted, setPosted] = useState<AdminMediaItem | null>(null);
  /** The draft a failed post left, to finish in the editor (also in `made`, for the steps). */
  const [draftId, setDraftId] = useState<string | null>(null);
  const videoLimit = formatBytes(MAX_VIDEO_UPLOAD_BYTES, locale);
  const kind: MediaKind = picked?.kind ?? 'PHOTO';
  const payload = {
    kind,
    status: 'DRAFT' as const,
    isFeatured: kind === 'VIDEO' && isFeatured,
    videoDurationSeconds: null,
    translations: toTranslationPayload(translations),
  };
  const visible = form.errorsFor(payload);
  const error = (path: string, value?: string) => message(visible[path], value);
  const sending = form.status === 'sending';

  // A chosen file's address is let go when another is chosen or the page closes.
  useEffect(() => () => (picked ? URL.revokeObjectURL(picked.url) : undefined), [picked]);

  // The cover follows the slider, drawn from a hidden copy of the film (the preview stays free).
  useEffect(() => {
    if (picked?.kind !== 'VIDEO') return;
    const video = captureRef.current;
    const canvas = coverRef.current;
    if (!video || !canvas) return;
    let cancelled = false;
    void (async () => {
      if (video.readyState < 1) {
        await new Promise((resolve) =>
          video.addEventListener('loadedmetadata', resolve, { once: true }),
        );
      }
      await seekTo(video, coverAt);
      if (!cancelled) drawFrame(video, canvas, 360);
    })();
    return () => {
      cancelled = true;
    };
  }, [picked, coverAt]);

  function reset() {
    setPicked(null);
    setProblem(null);
    setRun(null);
    setPosted(null);
    setCoverFailed(false);
    setTranslations(fromTranslation(null, KEYS));
    setFeatured(true);
    setPublish(true);
    made.current = { ...NOTHING_MADE };
    setDraftId(null);
    form.reset();
  }

  async function choose(file: File | undefined) {
    if (!file || reading || sending) return;
    form.reset();
    setRun(null);
    setCoverFailed(false);
    made.current = { ...NOTHING_MADE };
    const name = file.name.toLowerCase();
    const refuse = (next: Problem) => {
      setPicked(null);
      setProblem(next);
    };
    setProblem(null);
    if (file.type.startsWith('video/') || /\.(mp4|m4v|webm|mov)$/.test(name)) {
      if (file.type === 'video/quicktime' || name.endsWith('.mov')) return refuse('mov');
      if (!/^video\/(mp4|webm)$/.test(file.type) && !/\.(mp4|m4v|webm)$/.test(name)) {
        return refuse('unsupported');
      }
      if (file.size > MAX_VIDEO_UPLOAD_BYTES) return refuse('tooLargeVideo');
      const url = URL.createObjectURL(file);
      setReading(true);
      const facts = await readVideo(url);
      setReading(false);
      if (!facts) {
        URL.revokeObjectURL(url);
        return refuse('unreadableVideo');
      }
      setCoverAt(Math.min(1, facts.duration / 3));
      setPicked({ kind: 'VIDEO', url, file, facts });
      return;
    }
    if (!file.type.startsWith('image/') && !/\.(jpe?g|png|webp|avif|heic|heif)$/.test(name)) {
      return refuse('unsupported');
    }
    setReading(true);
    const photo = await preparePhoto(file);
    setReading(false);
    if (photo === 'unreadable' && /\.(heic|heif)$/.test(name)) return refuse('heic');
    if (typeof photo === 'string') return refuse(photo);
    setPicked({ kind: 'PHOTO', url: URL.createObjectURL(photo.file), photo });
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void choose(event.dataTransfer.files[0]);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!picked) return;
    setCoverFailed(false);
    const steps: Step[] = [
      'create',
      'file',
      ...(picked.kind === 'VIDEO' ? (['cover'] as const) : []),
      ...(publish ? (['publish'] as const) : []),
      'order',
    ];
    const result: { item: AdminMediaItem | null } = { item: null };
    const ok = await form.submit(mediaUpsertSchema, payload, async (data) => {
      const at = (current: Step, percent: number | null = null) =>
        setRun({ steps, current, failed: null, percent });
      try {
        if (!made.current.id) {
          at('create');
          const created = await apiRequest<AdminMediaItem>('/admin/media', {
            method: 'POST',
            body: data,
          });
          result.item = created;
          made.current.id = created.id;
          setDraftId(created.id);
        }
        const id = made.current.id;
        if (!made.current.file) {
          at('file', 0);
          result.item = await uploadFileWithProgress<AdminMediaItem>(
            `/admin/media/${id}/${picked.kind === 'VIDEO' ? 'video' : 'image'}`,
            picked.kind === 'VIDEO' ? picked.file : picked.photo.file,
            (sent) => at('file', Math.round(sent * 100)),
          );
          made.current.file = true;
        }
        if (picked.kind === 'VIDEO' && !made.current.cover) {
          at('cover');
          const video = captureRef.current;
          const cover = video ? await captureCover(video, coverAt) : null;
          if (!cover) {
            setCoverFailed(true);
            throw new Error('The cover frame could not be taken');
          }
          result.item = await uploadFile<AdminMediaItem>(`/admin/media/${id}/image`, cover);
          made.current.cover = true;
        }
        if (publish && !made.current.published) {
          at('publish');
          result.item = await apiRequest<AdminMediaItem>(`/admin/media/${id}`, {
            method: 'PUT',
            body: { ...(data as object), status: 'PUBLISHED' },
          });
          made.current.published = true;
        }
        if (!made.current.ordered) {
          at('order');
          const list = await apiRequest<AdminMediaItem[]>(`/admin/media?kind=${picked.kind}`);
          const ordered = await apiRequest<AdminMediaItem[]>('/admin/media/order', {
            method: 'PUT',
            body: {
              kind: picked.kind,
              ids: [id, ...list.map((entry) => entry.id).filter((other) => other !== id)],
            },
          });
          result.item = ordered.find((entry) => entry.id === id) ?? result.item;
          made.current.ordered = true;
        }
      } catch (caught) {
        setRun((previous) => previous && { ...previous, failed: previous.current });
        throw caught;
      }
    });
    if (ok && result.item) {
      setRun(null);
      setPosted(result.item);
      notify(publish ? t('compose.done') : t('compose.doneDraft'));
    }
  }

  if (posted) {
    const title = posted.translations.uz.title;
    const live = posted.status === 'PUBLISHED';
    return (
      <section
        aria-labelledby="compose-done"
        className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-card border border-line bg-surface px-6 py-10 text-center"
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
          <Check aria-hidden className="h-7 w-7" />
        </span>
        <h2 id="compose-done" className="text-display-sm text-fg">
          {live ? t('compose.done') : t('compose.doneDraft')}
        </h2>
        {posted.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009)
          <img
            src={renditionSrc(posted.image, 480)}
            alt=""
            width={posted.image.width}
            height={posted.image.height}
            className="max-h-72 w-auto rounded-control border border-line object-contain"
          />
        ) : null}
        <p className="max-w-md text-body text-fg-muted">
          {live ? t('compose.doneText', { title }) : t('compose.doneDraftText', { title })}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {live ? (
            <ButtonLink
              href={posted.kind === 'VIDEO' ? '/media/videos' : '/media/photos'}
              target="_blank"
              variant="secondary"
            >
              {t('media.viewOnSite')}
            </ButtonLink>
          ) : null}
          <ButtonLink href={`/admin/media/${posted.id}`} variant="secondary">
            {t('compose.edit')}
          </ButtonLink>
          <Button onClick={reset}>{t('compose.again')}</Button>
        </div>
      </section>
    );
  }

  const failure =
    form.apiError?.status === 413
      ? t('compose.serverLimit')
      : coverFailed
        ? t('compose.coverFailed')
        : (explain(form.apiError) ?? form.apiErrorMessage);
  const problemText =
    problem === null
      ? null
      : problem === 'too_small' || problem === 'unreadable'
        ? photoProblem(problem)
        : t(`compose.problems.${problem}`, { limit: videoLimit });

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
      <section aria-label={t('compose.file')} className="space-y-4">
        {picked ? (
          <ChosenFile
            picked={picked}
            coverAt={coverAt}
            coverRef={coverRef}
            captureRef={captureRef}
            disabled={sending}
            onCover={setCoverAt}
            onChange={() => {
              setPicked(null);
              setRun(null);
              made.current = { ...NOTHING_MADE };
            }}
          />
        ) : (
          <label
            htmlFor={inputId}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex min-h-[24rem] cursor-pointer flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
              dragging
                ? 'border-brand bg-brand-soft'
                : 'border-line-strong bg-surface hover:bg-surface-muted',
            )}
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-brand">
              {reading ? (
                <Loader2 aria-hidden className="h-7 w-7 animate-spin" />
              ) : (
                <ImagePlus aria-hidden className="h-7 w-7" />
              )}
            </span>
            <span className="text-title-lg text-fg">
              {reading ? t('compose.reading') : t('compose.drop')}
            </span>
            <span className={buttonClasses('primary', 'md')}>{t('compose.choose')}</span>
            <span className="max-w-md text-body-sm text-fg-muted">
              {t('compose.dropHint', { limit: videoLimit })}
            </span>
            <input
              id={inputId}
              type="file"
              accept={ACCEPT}
              disabled={reading}
              className="sr-only"
              onChange={(event) => {
                void choose(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        )}
        {problemText ? (
          <p
            role="alert"
            className="rounded-control bg-danger-soft px-3 py-2 text-body-sm font-medium text-danger"
          >
            {problemText}
          </p>
        ) : null}
      </section>

      <form
        method="post"
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        className="space-y-5 rounded-card border border-line bg-surface p-5 sm:p-6 xl:sticky xl:top-6"
      >
        <FormErrorSummary message={Object.keys(visible).length > 0 ? form.summary : null} />
        <TranslationEditor
          value={translations}
          onChange={setTranslations}
          error={error}
          fields={[
            { key: 'title', label: t('media.itemTitle'), required: true, maxLength: 120 },
            {
              key: 'caption',
              label: kind === 'VIDEO' ? t('media.description') : t('media.caption'),
              multiline: true,
              rows: 3,
              maxLength: 400,
            },
          ]}
        />
        {kind === 'VIDEO' ? (
          <CheckboxField
            label={t('media.featured')}
            hint={t('media.featuredVideoHint')}
            name="isFeatured"
            checked={isFeatured}
            onChange={(event) => setFeatured(event.target.checked)}
          />
        ) : null}
        <CheckboxField
          label={t('compose.publishNow')}
          hint={t('compose.publishNowHint')}
          name="publish"
          checked={publish}
          onChange={(event) => setPublish(event.target.checked)}
        />
        <p className="text-caption text-fg-subtle">{t('compose.first')}</p>
        {run ? <Progress run={run} kind={kind} /> : null}
        <ApiAlert message={failure} />
        {run?.failed && draftId ? (
          <Notice tone="info">
            {t('compose.retryHint')}{' '}
            <Link
              href={`/admin/media/${draftId}`}
              className="font-semibold underline underline-offset-2"
            >
              {t('compose.openDraft')}
            </Link>
          </Notice>
        ) : null}
        {picked ? (
          <SubmitButton
            sending={sending}
            label={t('compose.post')}
            sendingLabel={t('compose.posting')}
          />
        ) : (
          <Button className="w-full" disabled>
            {t('compose.post')}
          </Button>
        )}
      </form>
    </div>
  );
}

/** The chosen file: a photograph, or a film with its cover picked from its own frames. */
function ChosenFile({
  picked,
  coverAt,
  coverRef,
  captureRef,
  disabled,
  onCover,
  onChange,
}: {
  picked: Picked;
  coverAt: number;
  coverRef: RefObject<HTMLCanvasElement | null>;
  captureRef: RefObject<HTMLVideoElement | null>;
  disabled: boolean;
  onCover: (seconds: number) => void;
  onChange: () => void;
}) {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const sliderId = useId();
  const change = (
    <Button size="sm" variant="ghost" onClick={onChange} disabled={disabled}>
      <RefreshCw aria-hidden className="h-4 w-4" />
      {t('compose.change')}
    </Button>
  );

  if (picked.kind === 'PHOTO') {
    const { photo } = picked;
    return (
      <div className="space-y-3 rounded-card border border-line bg-surface p-4 sm:p-5">
        <div className="grid place-items-center overflow-hidden rounded-control bg-surface-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local preview (blob:) */}
          <img
            src={picked.url}
            alt={t('uploads.previewAlt', { name: photo.file.name })}
            width={photo.width}
            height={photo.height}
            className="max-h-[65vh] w-auto object-contain"
          />
        </div>
        <p className="text-caption text-fg-subtle">
          {photo.file.name} · {photo.width} × {photo.height} px ·{' '}
          {formatBytes(photo.file.size, locale)}
        </p>
        {photo.converted ? (
          <Notice tone="info">
            {t('compose.converted', { width: photo.width, height: photo.height })}
          </Notice>
        ) : null}
        <p className="text-body-sm text-fg-muted">{t('compose.photo')}</p>
        {change}
      </div>
    );
  }

  const { facts } = picked;
  const upright = facts.height > facts.width;
  return (
    <div className="space-y-4 rounded-card border border-line bg-surface p-4 sm:p-5">
      <div
        className={cn(
          'grid gap-4',
          upright ? 'sm:grid-cols-[minmax(0,1fr)_11rem]' : 'lg:grid-cols-[minmax(0,1fr)_14rem]',
        )}
      >
        <video
          src={picked.url}
          controls
          playsInline
          preload="metadata"
          className={cn(
            'w-full rounded-control bg-black',
            upright ? 'mx-auto max-h-[65vh] w-auto max-w-full' : 'aspect-video',
          )}
        />
        <div className="space-y-2">
          <h3 className="text-label text-fg">{t('compose.cover')}</h3>
          <canvas
            ref={coverRef}
            aria-hidden
            className="w-full rounded-control border border-line bg-black"
            style={{ aspectRatio: `${facts.width} / ${facts.height}` }}
          />
          {facts.duration > 0 ? (
            <>
              <label htmlFor={sliderId} className="sr-only">
                {t('compose.coverAt')}
              </label>
              <input
                id={sliderId}
                type="range"
                min={0}
                max={Math.max(0, facts.duration - 0.05)}
                step={0.1}
                value={coverAt}
                disabled={disabled}
                onChange={(event) => onCover(Number(event.target.value))}
                className="w-full accent-brand"
              />
              <p className="text-caption text-fg-subtle tabular-nums">{clock(coverAt)}</p>
            </>
          ) : null}
          <p className="text-caption text-fg-subtle">{t('compose.coverHint')}</p>
        </div>
      </div>
      {/* A hidden copy of the film, where the cover's frames are taken from. */}
      <video
        ref={captureRef}
        src={picked.url}
        muted
        playsInline
        preload="auto"
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0"
      />
      <p className="text-caption text-fg-subtle">
        {picked.file.name} · {facts.width} × {facts.height} ·{' '}
        {facts.duration > 0 ? `${clock(facts.duration).replace(/\.\d$/, '')} · ` : ''}
        {formatBytes(picked.file.size, locale)}
      </p>
      <p className="text-body-sm text-fg-muted">
        {upright ? t('compose.upright') : t('compose.landscape')}
      </p>
      {change}
    </div>
  );
}

const STEP_LABELS = {
  create: 'compose.steps.create',
  cover: 'compose.steps.cover',
  publish: 'compose.steps.publish',
  order: 'compose.steps.order',
} as const;

/** The post's steps as they go, the file's upload with its share sent. */
function Progress({ run, kind }: { run: Run; kind: MediaKind }) {
  const t = useTranslations('Admin');
  const index = run.current ? run.steps.indexOf(run.current) : run.steps.length;
  return (
    <ol aria-live="polite" className="space-y-2 rounded-control bg-surface-muted px-4 py-3">
      {run.steps.map((step, position) => {
        const failed = run.failed === step;
        const done = position < index;
        const active = position === index && !failed;
        const label =
          step === 'file'
            ? t(kind === 'VIDEO' ? 'compose.steps.video' : 'compose.steps.photo')
            : t(STEP_LABELS[step]);
        return (
          <li key={step} className="space-y-1.5">
            <span
              className={cn(
                'flex items-center gap-2 text-body-sm',
                done ? 'text-fg-muted' : failed ? 'font-semibold text-danger' : 'text-fg',
                !done && !active && !failed && 'text-fg-subtle',
              )}
            >
              {done ? (
                <Check aria-hidden className="h-4 w-4 text-success" />
              ) : failed ? (
                <X aria-hidden className="h-4 w-4" />
              ) : active ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <span aria-hidden className="h-4 w-4 rounded-full border border-line-strong" />
              )}
              {label}
              {step === 'file' && active && run.percent !== null ? (
                <span className="ml-auto tabular-nums">{run.percent}%</span>
              ) : null}
            </span>
            {step === 'file' && active && run.percent !== null ? (
              <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-brand transition-[width] duration-200"
                  style={{ width: `${run.percent}%` }}
                />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
