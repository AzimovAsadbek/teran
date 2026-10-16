'use client';

import type { ImageDto } from '@teran/contracts';
import { ImageIcon, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Button, buttonClasses } from '@/components/ui/button';
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
import { useAdminOrApiMessage, useLocalImageProblem } from './admin-errors';
import { ConfirmDialog } from './confirm-dialog';

/** The largest rendition at most `max` px wide (renditions are WebP at fixed widths). */
export function renditionSrc(image: ImageDto, max = 640): string {
  const width = image.widths.filter((candidate) => candidate <= max).at(-1) ?? image.widths[0];
  return `${image.src}/${width}.webp`;
}

/**
 * One picture of an item (a category's or collection's cover, an article's cover): shows the
 * current one, previews a chosen file before it is sent, uploads it (the API validates and
 * re-encodes it) and removes it after a confirmation.
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
  const router = useRouter();
  const inputId = useId();
  const localProblem = useLocalImageProblem();
  const [chosen, setChosen] = useState<{ file: File; url: string; check: LocalImageCheck } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [confirming, setConfirming] = useState(false);
  const message = useAdminOrApiMessage(error);

  useEffect(() => () => (chosen ? URL.revokeObjectURL(chosen.url) : undefined), [chosen]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    setChosen({ file, url: URL.createObjectURL(file), check: await checkImageFile(file) });
  }

  async function upload() {
    if (!chosen || !uploadPath) return;
    setPending(true);
    setError(null);
    try {
      await uploadFile(uploadPath, chosen.file);
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
  const problem = chosen?.check.problem ?? null;

  return (
    <div className="space-y-3">
      <div className={frame}>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview or API rendition (ADR-009)
          <img
            src={shown}
            alt={chosen ? t('uploads.previewAlt', { name: chosen.file.name }) : (image?.alt ?? '')}
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
            {chosen.file.name}
            {chosen.check.width ? ` · ${chosen.check.width} × ${chosen.check.height} px` : ''}
          </p>
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
            {pending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Upload aria-hidden className="h-4 w-4" />
            )}
            {image ? t('uploads.replace') : t('uploads.choose')}
            <input
              id={inputId}
              type="file"
              accept={IMAGE_ACCEPT}
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
