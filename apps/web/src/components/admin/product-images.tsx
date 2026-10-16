'use client';

import { MAX_PRODUCT_IMAGES, type AdminProductImage } from '@teran/contracts';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Languages,
  Loader2,
  Replace,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, buttonClasses, iconButtonClasses } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { useRouter } from '@/i18n/navigation';
import {
  checkImageFile,
  IMAGE_ACCEPT,
  uploadFile,
  type LocalImageCheck,
} from '@/lib/admin/uploads';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { useAdminErrorMessage, useLocalImageProblem } from './admin-errors';
import { ConfirmDialog } from './confirm-dialog';
import { useAdminAction } from './use-admin-action';

interface Queued {
  key: string;
  file: File;
  url: string;
  check: LocalImageCheck | null;
  status: 'checking' | 'ready' | 'uploading' | 'done' | 'failed';
  error: ApiError | null;
}

/**
 * A product's pictures. Chosen files are previewed and checked in the browser first (type, size,
 * at least 200 × 200 px), then uploaded one by one; the API decodes, validates and re-encodes
 * each (a renamed file or a duplicate is refused with a clear reason). The first picture is the
 * main one shown everywhere in the store. Each picture can be moved, made the main one, replaced
 * in place, described (alternative text per language) or deleted.
 */
export function ProductImages({
  productId,
  images,
  name,
}: {
  productId: string;
  images: AdminProductImage[];
  name: string;
}) {
  const t = useTranslations('Admin');
  const inputId = useId();
  const action = useAdminAction();
  const router = useRouter();
  const explain = useAdminErrorMessage();
  const localProblem = useLocalImageProblem();
  const [queue, setQueue] = useState<Queued[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingAlt, setEditingAlt] = useState<string | null>(null);
  const [replaceError, setReplaceError] = useState<{ id: string; text: string } | null>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const urls = useRef<string[]>([]);
  const base = `/admin/products/${productId}/images`;
  const room = MAX_PRODUCT_IMAGES - images.length;

  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  async function choose(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added: Queued[] = Array.from(files).map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      return {
        key: `${file.name}-${file.size}-${Math.random()}`,
        file,
        url,
        check: null,
        status: 'checking',
        error: null,
      };
    });
    setQueue((current) => [...current.filter((item) => item.status !== 'done'), ...added]);
    for (const item of added) {
      const check = await checkImageFile(item.file);
      setQueue((current) =>
        current.map((entry) =>
          entry.key === item.key
            ? { ...entry, check, status: check.problem ? 'failed' : 'ready' }
            : entry,
        ),
      );
    }
  }

  async function uploadQueued() {
    setUploading(true);
    const ready = queue.filter((item) => item.status === 'ready').slice(0, Math.max(room, 0));
    for (const item of ready) {
      setQueue((current) =>
        current.map((entry) =>
          entry.key === item.key ? { ...entry, status: 'uploading' } : entry,
        ),
      );
      try {
        await uploadFile(base, item.file);
        setQueue((current) =>
          current.map((entry) => (entry.key === item.key ? { ...entry, status: 'done' } : entry)),
        );
      } catch (error) {
        setQueue((current) =>
          current.map((entry) =>
            entry.key === item.key
              ? {
                  ...entry,
                  status: 'failed',
                  error: error instanceof ApiError ? error : new ApiError(0, null),
                }
              : entry,
          ),
        );
      }
    }
    setUploading(false);
    router.refresh();
  }

  async function replace(imageId: string, file: File | undefined) {
    if (!file) return;
    setReplaceError(null);
    const check = await checkImageFile(file);
    if (check.problem) {
      setReplaceError({ id: imageId, text: localProblem(check.problem) });
      return;
    }
    setReplacing(imageId);
    try {
      await uploadFile(`${base}/${imageId}/file`, file);
      router.refresh();
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(0, null);
      setReplaceError({ id: imageId, text: explain(apiError) ?? t('uploads.failed') });
    } finally {
      setReplacing(null);
    }
  }

  async function reorder(order: string[]) {
    await action.run(() =>
      apiRequest(`${base}/order`, { method: 'PUT', body: { imageIds: order } }),
    );
  }

  async function move(index: number, direction: -1 | 1) {
    const order = images.map((image) => image.id);
    const target = index + direction;
    const current = order[index];
    const swap = order[target];
    if (current === undefined || swap === undefined) return;
    order[index] = swap;
    order[target] = current;
    await reorder(order);
  }

  /** The first image is the one the catalogue shows. */
  async function makeMain(index: number) {
    const order = images.map((image) => image.id);
    const [chosen] = order.splice(index, 1);
    if (chosen === undefined) return;
    await reorder([chosen, ...order]);
  }

  const readyCount = queue.filter((item) => item.status === 'ready').length;
  const pendingQueue = queue.filter((item) => item.status !== 'done');

  return (
    <div className="space-y-5">
      {images.length > 0 ? (
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => {
            const hasAlt = Boolean(image.altTexts.uz);
            return (
              <li
                key={image.id}
                className={cn(
                  'relative overflow-hidden rounded-card border bg-surface',
                  index === 0 ? 'border-brand ring-1 ring-brand' : 'border-line',
                )}
              >
                <div className="relative bg-surface-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
                  <img
                    src={`${image.src}/${image.widths.find((width) => width >= 320) ?? image.widths[0]}.webp`}
                    alt={image.altTexts.uz ?? name}
                    width={image.width}
                    height={image.height}
                    // Whole picture, not a crop: tall pack shots keep their top and bottom.
                    className="aspect-square w-full object-contain p-2"
                  />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {index === 0 ? (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-caption font-semibold text-fg-inverse">
                        {t('products.mainImage')}
                      </span>
                    ) : null}
                    {image.transparent ? (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-caption font-semibold text-forest-900 shadow-xs">
                        {t('uploads.cutout')}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2 p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1 text-caption text-fg-subtle">
                      {hasAlt ? (
                        <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Languages aria-hidden className="h-3.5 w-3.5 text-warning" />
                      )}
                      {hasAlt ? t('images.altPresent') : t('images.altMissing')}
                    </span>
                    <span className="text-caption text-fg-subtle">
                      {image.width} × {image.height}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {index !== 0 ? (
                      <button
                        type="button"
                        onClick={() => void makeMain(index)}
                        disabled={action.pending}
                        className="min-h-8 rounded-control px-2 text-xs font-semibold text-forest-900 hover:bg-surface-muted"
                      >
                        {t('products.makeMain')}
                      </button>
                    ) : null}
                    <span className="ml-auto flex">
                      <button
                        type="button"
                        onClick={() => void move(index, -1)}
                        disabled={index === 0 || action.pending}
                        className={iconButtonClasses('ghost', 'sm')}
                        aria-label={t('products.moveUp')}
                      >
                        <ArrowLeft aria-hidden className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void move(index, 1)}
                        disabled={index === images.length - 1 || action.pending}
                        className={iconButtonClasses('ghost', 'sm')}
                        aria-label={t('products.moveDown')}
                      >
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      </button>
                      <label
                        className={cn(
                          iconButtonClasses('ghost', 'sm'),
                          'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus',
                        )}
                        title={t('uploads.replace')}
                      >
                        {replacing === image.id ? (
                          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                        ) : (
                          <Replace aria-hidden className="h-4 w-4" />
                        )}
                        <span className="sr-only">{t('uploads.replace')}</span>
                        <input
                          type="file"
                          accept={IMAGE_ACCEPT}
                          className="sr-only"
                          disabled={replacing !== null}
                          onChange={(event) => {
                            void replace(image.id, event.target.files?.[0]);
                            event.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditingAlt(editingAlt === image.id ? null : image.id)}
                        aria-expanded={editingAlt === image.id}
                        className={iconButtonClasses('ghost', 'sm')}
                        aria-label={t('images.editAlt')}
                      >
                        <Languages aria-hidden className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(image.id)}
                        className={iconButtonClasses('danger', 'sm')}
                        aria-label={t('products.deleteImage')}
                      >
                        <Trash2 aria-hidden className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                  {replaceError?.id === image.id ? (
                    <p role="alert" className="text-caption font-medium text-danger">
                      {replaceError.text}
                    </p>
                  ) : null}
                  {editingAlt === image.id ? (
                    <AltEditor
                      key={image.id}
                      path={`${base}/${image.id}/alt`}
                      image={image}
                      onDone={() => setEditingAlt(null)}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="rounded-control bg-warning-soft px-4 py-3 text-body-sm font-medium text-warning">
          {t('images.noneYet')}
        </p>
      )}

      {pendingQueue.length > 0 ? (
        <div className="space-y-3 rounded-card border border-dashed border-line-strong p-3">
          <p className="text-body-sm font-semibold text-fg">{t('uploads.pendingTitle')}</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {pendingQueue.map((item) => {
              const problem = item.check?.problem ?? null;
              const failure = item.error
                ? (explain(item.error) ?? t('uploads.failed'))
                : problem
                  ? localProblem(problem)
                  : null;
              return (
                <li key={item.key} className="space-y-1">
                  <div className="relative overflow-hidden rounded-control border border-line bg-surface-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                    <img
                      src={item.url}
                      alt={t('uploads.previewAlt', { name: item.file.name })}
                      className={cn('aspect-square w-full object-contain', failure && 'opacity-50')}
                    />
                    {item.status === 'uploading' || item.status === 'checking' ? (
                      <span className="absolute inset-0 grid place-items-center bg-surface/50">
                        <Loader2 aria-hidden className="h-5 w-5 animate-spin text-forest-900" />
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-caption text-fg-subtle" title={item.file.name}>
                    {item.file.name}
                    {item.check?.width ? ` · ${item.check.width}×${item.check.height}` : ''}
                  </p>
                  {failure ? (
                    <p className="text-caption font-medium text-danger">{failure}</p>
                  ) : item.status === 'ready' ? (
                    <p className="text-caption text-success">{t('uploads.ready')}</p>
                  ) : null}
                  {item.status !== 'uploading' ? (
                    <button
                      type="button"
                      onClick={() =>
                        setQueue((current) => current.filter((entry) => entry.key !== item.key))
                      }
                      className="inline-flex items-center gap-1 text-caption font-semibold text-fg-muted hover:text-fg"
                    >
                      <X aria-hidden className="h-3 w-3" />
                      {t('uploads.cancel')}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={() => void uploadQueued()}
              loading={uploading}
              disabled={readyCount === 0 || room <= 0}
            >
              <Upload aria-hidden className="h-4 w-4" />
              {t('uploads.uploadMany', { count: Math.min(readyCount, Math.max(room, 0)) })}
            </Button>
            {readyCount > room ? (
              <p className="text-caption text-warning">{t('uploads.errors.too_many_images')}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div>
        <label
          htmlFor={inputId}
          className={buttonClasses(
            'secondary',
            'sm',
            cn(
              'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
              room <= 0 && 'pointer-events-none opacity-50',
            ),
          )}
        >
          <Upload aria-hidden className="h-4 w-4" />
          {t('uploads.chooseImages')}
          <input
            id={inputId}
            type="file"
            accept={IMAGE_ACCEPT}
            multiple
            disabled={uploading || room <= 0}
            className="sr-only"
            onChange={(event) => {
              void choose(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        <p className="mt-2 text-xs text-fg-subtle">{t('products.imagesHint')}</p>
      </div>
      {action.error ? (
        <p
          role="alert"
          className="rounded-control bg-danger-soft px-4 py-3 text-body-sm font-medium text-danger"
        >
          {action.error}
        </p>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title={t('products.deleteImageConfirm')}
        confirmLabel={t('common.delete')}
        tone="danger"
        pending={action.pending}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          const imageId = deleting;
          if (!imageId) return;
          void action
            .run(() => apiRequest(`${base}/${imageId}`, { method: 'DELETE' }))
            .then((ok) => {
              if (ok) setDeleting(null);
            });
        }}
      />
    </div>
  );
}

/** Alternative text of one picture in each language (empty: the product's name is read). */
function AltEditor({
  path,
  image,
  onDone,
}: {
  path: string;
  image: AdminProductImage;
  onDone: () => void;
}) {
  const t = useTranslations('Admin');
  const action = useAdminAction();
  const [values, setValues] = useState({
    uz: image.altTexts.uz ?? '',
    ru: image.altTexts.ru ?? '',
    en: image.altTexts.en ?? '',
  });
  return (
    <div className="space-y-2 rounded-control bg-surface-muted p-2.5">
      <p className="text-caption text-fg-subtle">{t('images.altHint')}</p>
      {(['uz', 'ru', 'en'] as const).map((locale) => (
        <TextField
          key={locale}
          size="sm"
          label={t(`products.text${locale === 'uz' ? 'Uz' : locale === 'ru' ? 'Ru' : 'En'}`)}
          name={`alt-${locale}`}
          lang={locale === 'uz' ? 'uz-Latn' : locale}
          maxLength={200}
          value={values[locale]}
          onChange={(event) =>
            setValues((current) => ({ ...current, [locale]: event.target.value }))
          }
        />
      ))}
      <div className="flex gap-2">
        <Button
          size="sm"
          loading={action.pending}
          onClick={() =>
            void action
              .run(() =>
                apiRequest(path, {
                  method: 'PUT',
                  body: {
                    uz: values.uz.trim() || undefined,
                    ru: values.ru.trim() || undefined,
                    en: values.en.trim() || undefined,
                  },
                }),
              )
              .then((ok) => {
                if (ok) onDone();
              })
          }
        >
          {t('common.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          {t('uploads.cancel')}
        </Button>
      </div>
      {action.error ? (
        <p role="alert" className="text-caption font-medium text-danger">
          {action.error}
        </p>
      ) : null}
    </div>
  );
}
