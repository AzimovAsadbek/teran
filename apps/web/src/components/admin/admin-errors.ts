'use client';

import type { ReadinessCode } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import type { ImageProblem } from '@/lib/admin/media-files';
import type { ApiError } from '@/lib/api/errors';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

const REASONS = [
  'too_small',
  'disk_full',
  'unsupported_format',
  'unreadable',
  'unsupported_video',
  'unsupported_captions',
  'duplicate_image',
  'too_many_images',
  'last_image_of_active_product',
  'cover_of_published_article',
  'kind_fixed',
  'unknown_media',
] as const;
type Reason = (typeof REASONS)[number];

/**
 * Explains an admin request that failed: what is missing before publishing, why an upload was
 * refused, or the general message. Never shows the server's raw text.
 */
export function useAdminErrorMessage(): (error: ApiError | null) => string | null {
  const t = useTranslations('Admin');
  return (error) => {
    if (!error) return null;
    const details = (error.body?.details ?? {}) as { reason?: string; missing?: unknown };
    const reason = details.reason;
    if (reason && (REASONS as readonly string[]).includes(reason)) {
      return t(`uploads.errors.${reason as Reason}`);
    }
    // Nothing the admin area sends is this large (ADR-061): a proxy refused the request.
    if (error.status === 413) return t('uploads.errors.too_large');
    if (error.code === 'PUBLICATION_BLOCKED' && Array.isArray(details.missing)) {
      const items = (details.missing as ReadinessCode[]).map((code) =>
        t(`readiness.codes.${code}`),
      );
      return t('readiness.blocked', { items: items.join(', ') });
    }
    return null;
  };
}

/** The same explanation for a problem found in the browser before uploading. */
export function useLocalImageProblem(): (problem: ImageProblem) => string {
  const t = useTranslations('Admin');
  return (problem) => t(`uploads.errors.${problem}`);
}

/** The admin explanation when there is one, otherwise the general message for the error. */
export function useAdminOrApiMessage(error: ApiError | null): string | null {
  const admin = useAdminErrorMessage();
  const general = useApiErrorMessage(error);
  return admin(error) ?? general;
}
