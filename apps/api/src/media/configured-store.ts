import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { imageStore, r2ConfigFrom, type ImageStore } from './image-processing.js';

/** The store the environment names: R2, else Vercel Blob, else the uploads directory. */
export function configuredImageStore(config: ConfigService<Env, true>): ImageStore {
  return imageStore({
    uploadsDir: config.get('UPLOADS_DIR', { infer: true }),
    blobToken: config.get('BLOB_READ_WRITE_TOKEN', { infer: true }),
    r2: r2ConfigFrom({
      R2_ENDPOINT: config.get('R2_ENDPOINT', { infer: true }),
      R2_ACCESS_KEY_ID: config.get('R2_ACCESS_KEY_ID', { infer: true }),
      R2_SECRET_ACCESS_KEY: config.get('R2_SECRET_ACCESS_KEY', { infer: true }),
      R2_BUCKET: config.get('R2_BUCKET', { infer: true }),
    }),
  });
}
