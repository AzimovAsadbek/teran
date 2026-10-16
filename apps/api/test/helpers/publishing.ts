import sharp from 'sharp';
import type { Agent } from 'supertest';
import type { ProductUpsertInput } from '@teran/contracts';

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
