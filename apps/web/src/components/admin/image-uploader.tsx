'use client';

import type { ImageDto, Locale } from '@teran/contracts';
import { ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Button, buttonClasses } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { prepareImageFile, type ImageProblem, type PreparedImage } from '@/lib/admin/media-files';
import { IMAGE_PICK, uploadFile } from '@/lib/admin/uploads';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { formatFileSize } from '@/lib/format';
import { useAdminOrApiMessage, useLocalImageProblem } from './admin-errors';
import { ConfirmDialog } from './confirm-dialog';

/** The largest rendition at most `max` px wide (renditions are WebP at fixed widths). */
export function renditionSrc(image: ImageDto, max = 640): string {
  const width = image.widths.filter((candidate) => candidate <= max).at(-1) ?? image.widths[0];
  return `${image.src}/${width}.webp`;
}

/** A chosen picture, made ready to send (or the reason it cannot be). */
type Chosen = {
  url: string;
  name: string;
  prepared: PreparedImage | null;
  problem: ImageProblem | null;
};

/**
 * One picture of an item (a category's or collection's cover, an article's cover, a page picture):
 * shows the current one, previews a chosen file of any size (made light enough in the browser,
 * ADR-061), uploads it (the API validates and re-encodes it) and removes it after a confirmation.
 */
export function ImageUploader({
  image,
  uploadPath,
  removePath,
  emptyText,
  hint,
  shape = 'wide',
  disabledText,
}: {
  image: ImageDto | null;
  /** POST target (multipart, field "file"); null while the item is not saved yet. */
  uploadPath: string | null;
  /** DELETE target, or null when the picture cannot be removed. */
  removePath: string | null;
  /** Shown instead of a picture when there is none (what the storefront shows meanwhile). */
  emptyText: string;
  hint?: string;
  shape?: 'wide' | 'square';
  /** Why uploading is not possible yet (e.g. "save first"). */
  disabledText?: string;
}) {
  const t = useTranslations('Admin');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const inputId = useId();
  const localProblem = useLocalImageProblem();
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [confirming, setConfirming] = useState(false);
  const message = useAdminOrApiMessage(error);

  useEffect(() => () => (chosen ? URL.revokeObjectURL(chosen.url) : undefined), [chosen]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparing(true);
    const prepared = await prepareImageFile(file);
    setPreparing(false);
    setChosen(
      typeof prepared === 'string'
        ? { url: URL.createObjectURL(file), name: file.name, prepared: null, problem: prepared }
        : {
            url: URL.createObjectURL(prepared.file),
            name: file.name,
            prepared,
            problem: null,
          },
    );
  }

  async function upload() {
    if (!chosen?.prepared || !uploadPath) return;
    setPending(true);
    setError(null);
    try {
      await uploadFile(uploadPath, chosen.prepared.file);
      setChosen(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!removePath) return;
    setPending(true);
    setError(null);
    try {
      await apiRequest(removePath, { method: 'DELETE' });
      setConfirming(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError(0, null));
    } finally {
      setPending(false);
    }
  }

  const frame = cn(
    'relative overflow-hidden rounded-card border border-line bg-surface-muted',
    shape === 'square' ? 'aspect-square w-40' : 'aspect-[16/9] w-full max-w-md',
  );
  const shown = chosen?.url ?? (image ? renditionSrc(image) : null);
  const problem = chosen?.problem ?? null;
  const original = chosen?.prepared?.original ?? null;

  return (
    <div className="space-y-3">
      <div className={frame}>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview or API rendition (ADR-009)
          <img
            src={shown}
            alt={chosen ? t('uploads.previewAlt', { name: chosen.name }) : (image?.alt ?? '')}
            className={cn(
              'h-full w-full',
              image?.transparent && !chosen ? 'object-contain p-3' : 'object-cover',
            )}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-body-sm text-fg-subtle">
            <ImageIcon aria-hidden className="h-6 w-6" />
            {emptyText}
          </div>
        )}
        {chosen ? (
          <span className="absolute top-2 left-2 rounded-full bg-surface-inverse px-2 py-0.5 text-caption font-semibold text-fg-inverse">
            {t('uploads.notUploaded')}
          </span>
        ) : null}
      </div>

      {chosen ? (
        <div className="space-y-2">
          <p className="text-caption text-fg-subtle">
            {chosen.name}
            {chosen.prepared
              ? ` · ${chosen.prepared.width} × ${chosen.prepared.height} px · ${formatFileSize(chosen.prepared.file.size, locale)}`
              : ''}
          </p>
          {chosen.prepared && original ? (
            <p className="text-caption text-fg-muted">
              {t('uploads.resized', {
                from: `${original.width} × ${original.height} px, ${formatFileSize(original.bytes, locale)}`,
                width: chosen.prepared.width,
                height: chosen.prepared.height,
              })}
            </p>
          ) : null}
          {problem ? (
            <p role="alert" className="text-body-sm font-medium text-danger">
              {localProblem(problem)}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => void upload()}
              loading={pending}
              disabled={problem !== null}
            >
              <Upload aria-hidden className="h-4 w-4" />
              {t('uploads.uploadOne')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setChosen(null)} disabled={pending}>
              <X aria-hidden className="h-4 w-4" />
              {t('uploads.cancel')}
            </Button>
          </div>
        </div>
      ) : uploadPath ? (
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={inputId}
            className={buttonClasses(
              'secondary',
              'sm',
              'cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
            )}
          >
            {pending || preparing ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Upload aria-hidden className="h-4 w-4" />
            )}
            {image ? t('uploads.replace') : t('uploads.choose')}
            <input
              id={inputId}
              type="file"
              accept={IMAGE_PICK}
              disabled={preparing}
              className="sr-only"
              onChange={(event) => {
                void choose(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
          {image && removePath ? (
            <Button size="sm" variant="danger-ghost" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden className="h-4 w-4" />
              {t('uploads.remove')}
            </Button>
          ) : null}
        </div>
      ) : disabledText ? (
        <p className="text-body-sm text-fg-muted">{disabledText}</p>
      ) : null}
      {hint ? <p className="text-caption text-fg-subtle">{hint}</p> : null}
      {message ? (
        <p
          role="alert"
          className="rounded-control bg-danger-soft px-3 py-2 text-body-sm font-medium text-danger"
        >
          {message}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title={t('uploads.removeConfirm')}
        confirmLabel={t('uploads.remove')}
        tone="danger"
        pending={pending}
        onClose={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
