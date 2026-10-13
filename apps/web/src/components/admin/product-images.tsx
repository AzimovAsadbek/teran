'use client';

import type { AdminProductDetail } from '@teran/contracts';
import { ArrowDown, ArrowUp, Loader2, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError, readErrorBody } from '@/lib/api/errors';
import { useApiErrorMessage } from '@/lib/use-api-error-message';
import { ConfirmDialog } from './confirm-dialog';
import { useAdminAction } from './use-admin-action';

type ProductImage = AdminProductDetail['images'][number];

/** Upload (validated and re-encoded by the API), reorder and delete product photos. */
export function ProductImages({
  productId,
  images,
  name,
}: {
  productId: string;
  images: ProductImage[];
  name: string;
}) {
  const t = useTranslations('Admin');
  const inputId = useId();
  const action = useAdminAction();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<ApiError | null>(null);
  const uploadMessage = useApiErrorMessage(uploadError);
  const [deleting, setDeleting] = useState<string | null>(null);
  const base = `/admin/products/${productId}/images`;

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append('file', file);
        // Same-origin multipart request; the session cookie authenticates it.
        const response = await fetch(`/api/v1${base}`, {
          method: 'POST',
          body,
          credentials: 'same-origin',
        });
        if (!response.ok) throw new ApiError(response.status, await readErrorBody(response));
      }
    } catch (error) {
      setUploadError(error instanceof ApiError ? error : new ApiError(0, null));
    } finally {
      setUploading(false);
      router.refresh();
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const order = images.map((image) => image.id);
    const target = index + direction;
    const current = order[index];
    const swap = order[target];
    if (current === undefined || swap === undefined) return;
    order[index] = swap;
    order[target] = current;
    await action.run(() =>
      apiRequest(`${base}/order`, { method: 'PUT', body: { imageIds: order } }),
    );
  }

  return (
    <div className="space-y-4">
      {images.length > 0 ? (
        <ol className="grid grid-cols-2 gap-3">
          {images.map((image, index) => (
            <li key={image.id} className="overflow-hidden rounded-2xl border border-ivory-200">
              {/* API images come in fixed widths; the smallest is enough for the editor. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- see docs/architecture/decisions.md (ADR-009) */}
              <img
                src={`${image.src}/${image.widths[0]}.webp`}
                alt={name}
                className="aspect-square w-full bg-ivory-100 object-cover"
              />
              <div className="flex items-center justify-between gap-1 p-1.5">
                <span className="pl-1 text-xs text-ink-500">{index + 1}</span>
                <span className="flex">
                  <button
                    type="button"
                    onClick={() => void move(index, -1)}
                    disabled={index === 0 || action.pending}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-ivory-100 disabled:opacity-30"
                    aria-label={t('products.moveUp')}
                  >
                    <ArrowUp aria-hidden className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(index, 1)}
                    disabled={index === images.length - 1 || action.pending}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-ivory-100 disabled:opacity-30"
                    aria-label={t('products.moveDown')}
                  >
                    <ArrowDown aria-hidden className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(image.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-danger-700 hover:bg-danger-100"
                    aria-label={t('products.deleteImage')}
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      <div>
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-forest-900/25 px-4 py-2 text-sm font-semibold text-forest-900 hover:bg-forest-900/[0.04] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest-700"
        >
          {uploading ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Upload aria-hidden className="h-4 w-4" />
          )}
          {uploading ? t('products.uploading') : t('products.upload')}
          <input
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              void upload(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
        <p className="mt-2 text-xs text-ink-500">{t('products.imagesHint')}</p>
      </div>
      {uploadMessage || action.error ? (
        <p
          role="alert"
          className="rounded-xl bg-danger-100 px-4 py-3 text-sm font-medium text-danger-700"
        >
          {uploadMessage ?? action.error}
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
