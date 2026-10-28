import sharp from 'sharp';
import type { Agent, Response } from 'supertest';
import {
  MEDIA_UPLOAD_CHUNK_BYTES,
  type AdminMediaItem,
  type MediaUploadSession,
  type ProductUpsertInput,
} from '@teran/contracts';

const API = '/api/v1';

/** A plain square PNG (distinct colours give distinct files, so duplicates are not refused). */
export async function testImage(size = 400, shade = 50): Promise<Buffer> {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 30, g: 90 + (shade % 100), b: shade % 255 },
    },
  })
    .png()
    .toBuffer();
}

let shade = 0;

/**
 * Creates a product the way the admin area does it: saved as a draft, given its main image, then
 * saved with the requested status (publishing needs an image). Returns the product's id.
 */
export async function createProductViaAdmin(
  admin: Agent,
  payload: ProductUpsertInput,
): Promise<string> {
  const draft = await admin
    .post(`${API}/admin/products`)
    .send({ ...payload, status: 'DRAFT' })
    .expect(201);
  const { id, variants } = draft.body as { id: string; variants: { id: string; sku: string }[] };
  shade += 7;
  await admin
    .post(`${API}/admin/products/${id}/images`)
    .attach('file', await testImage(400, shade), {
      filename: 'product.png',
      contentType: 'image/png',
    })
    .expect(201);
  if (payload.status !== 'DRAFT') {
    // The saved pack sizes are sent back with their ids, as the admin form does.
    await admin
      .put(`${API}/admin/products/${id}`)
      .send({
        ...payload,
        variants: payload.variants.map((variant) => ({
          ...variant,
          id: variants.find((saved) => saved.sku === variant.sku)?.id,
        })),
      })
      .expect(200);
  }
  return id;
}

/**
 * Uploads a film the way the admin area does (ADR-061): an upload started with the file's size,
 * the file sent in pieces, then handed over (ADR-062). Answers the first response that is not a
 * success, or the hand-over's (the item with its `videoJob`, 202).
 */
export async function uploadFilm(
  admin: Agent,
  mediaId: string,
  film: Buffer,
  { pieceBytes = MEDIA_UPLOAD_CHUNK_BYTES, poster }: { pieceBytes?: number; poster?: boolean } = {},
): Promise<Response> {
  const base = `${API}/admin/media/${mediaId}/video/uploads`;
  const started = await admin.post(base).send({ size: film.length });
  if (started.status !== 201) return started;
  const session = started.body as MediaUploadSession;
  for (let offset = 0; offset < film.length; offset += pieceBytes) {
    const piece = await admin
      .put(`${base}/${session.id}?offset=${offset}`)
      .set('Content-Type', 'application/octet-stream')
      .send(film.subarray(offset, offset + pieceBytes));
    if (piece.status !== 200) return piece;
  }
  const complete = admin.post(`${base}/${session.id}/complete`);
  return poster === undefined ? complete : complete.send({ poster });
}

/**
 * The item once the API is done with its uploaded film (ADR-062): kept, or refused (its
 * `videoJob` then says why). Films are made ready in the background, so the test asks again.
 */
export async function waitForFilm(
  admin: Agent,
  mediaId: string,
  timeoutMs = 60_000,
): Promise<AdminMediaItem> {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const item = (await admin.get(`${API}/admin/media/${mediaId}`).expect(200))
      .body as AdminMediaItem;
    if (!item.videoJob || item.videoJob.state === 'failed') return item;
    if (Date.now() > until)
      throw new Error(`The film of ${mediaId} is still ${item.videoJob.state}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
