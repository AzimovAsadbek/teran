import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../common/errors/api-exception.js';
import {
  CaptionsRejectedError,
  ImageRejectedError,
  MAX_CAPTIONS_BYTES,
  VideoRejectedError,
} from '../media/image-processing.js';

/** Smallest side an uploaded picture may have, in pixels (see image-processing.ts). */
const MIN_IMAGE_SIDE = 200;

/**
 * Turns a refused upload into the API's error, with a `reason` the admin area explains:
 * too_small (400), unreadable / unsupported_format / unsupported_video / unsupported_captions
 * (415). Anything else is rethrown unchanged.
 */
export function uploadError(error: unknown): never {
  if (error instanceof ImageRejectedError) {
    if (error.reason === 'too_small') {
      throw ApiException.badRequest('BAD_REQUEST', 'The image is too small', {
        reason: 'too_small',
        minSide: MIN_IMAGE_SIDE,
      });
    }
    throw new ApiException(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      'UNSUPPORTED_MEDIA_TYPE',
      'Upload a JPEG, PNG, WebP or AVIF image',
      { details: { reason: error.reason } },
    );
  }
  if (error instanceof VideoRejectedError) {
    throw new ApiException(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      'UNSUPPORTED_MEDIA_TYPE',
      'Upload an MP4 or WebM video',
      { details: { reason: 'unsupported_video' } },
    );
  }
  if (error instanceof CaptionsRejectedError) {
    throw new ApiException(
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      'UNSUPPORTED_MEDIA_TYPE',
      'Upload a WebVTT (.vtt) subtitles file',
      { details: { reason: 'unsupported_captions', maxBytes: MAX_CAPTIONS_BYTES } },
    );
  }
  throw error;
}

/** The same file was already uploaded for this item. */
export function duplicateImage(): ApiException {
  return ApiException.conflict('CONFLICT', 'This image is already uploaded for this product', {
    reason: 'duplicate_image',
  });
}
