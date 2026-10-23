import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../../scripts/e2e-env.ts';

export const API = '/api/v1';

/** Real TERAN artwork (distinct files, so a product can take several without duplicates). */
export const PICTURES = {
  terraces: fileURLToPath(
    new URL('../../../apps/web/public/brand/art/terraces.webp', import.meta.url),
  ),
  lake: fileURLToPath(new URL('../../../apps/web/public/brand/art/lake.webp', import.meta.url)),
  sprig: fileURLToPath(new URL('../../../apps/web/public/brand/art/sprig-1.webp', import.meta.url)),
} as const;

/**
 * A 2-second upright film (360 × 640) with a soft tone: a real H.264 + AAC MP4 that the browser
 * plays and the API finds a sound track in (made by e2e/scripts/make-test-reel.swift).
 */
export const REEL = fileURLToPath(new URL('./fixtures/reel.mp4', import.meta.url));

/** A picture as a file payload (to mix with generated files in one selection). */
export function pictureFile(picture: string) {
  return {
    name: picture.split('/').pop() ?? 'picture.webp',
    mimeType: 'image/webp',
    buffer: readFileSync(picture),
  };
}

/** Next.js keeps visited pages mounted but hidden, so assertions target the visible match. */
export function visible(locator: Locator): Locator {
  return locator.filter({ visible: true }).first();
}

export function field(page: Page, label: string | RegExp): Locator {
  return visible(page.getByRole('main').getByLabel(label));
}

export async function signInAsAdmin(page: Page, next = '/admin'): Promise<void> {
  await page.goto(`/en/account/login?next=${next}`);
  await field(page, 'Email').fill(E2E_ADMIN.email);
  await field(page, 'Password').fill(E2E_ADMIN.password);
  await page.getByRole('main').getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(`/en${next.replace(/\?.*$/, '')}$`));
}

/** A staff session for the admin API (the same endpoints the admin area uses). */
export async function staffRequest(page: Page): Promise<APIRequestContext> {
  await signInAsAdmin(page);
  return page.request;
}

export interface VariantInput {
  sku: string;
  weightGrams: number | null;
  unitCount: number | null;
  price: string;
  compareAtPrice: string | null;
  lowStockThreshold: number;
  barcode: string | null;
  isActive: boolean;
  initialStock?: number;
}

export type ProductInput = Record<string, unknown> & { variants: VariantInput[] };

/** Uploads a picture to an admin endpoint (multipart, field "file"). */
export async function uploadPicture(
  request: APIRequestContext,
  path: string,
  picture: string,
): Promise<number> {
  const response = await request.post(`${API}${path}`, {
    multipart: {
      file: { name: 'picture.webp', mimeType: 'image/webp', buffer: readFileSync(picture) },
    },
  });
  return response.status();
}

/**
 * Creates a product the way the admin area does: saved as a draft, given its main picture, then
 * published (a product without a main picture cannot be put on sale). Returns its id.
 */
export async function publishProduct(
  request: APIRequestContext,
  product: ProductInput,
  picture: string = PICTURES.terraces,
): Promise<string> {
  const draft = await request.post(`${API}/admin/products`, {
    data: { ...product, status: 'DRAFT' },
  });
  expect(draft.status()).toBe(201);
  const saved = (await draft.json()) as { id: string; variants: { id: string; sku: string }[] };
  expect(await uploadPicture(request, `/admin/products/${saved.id}/images`, picture)).toBe(201);
  const published = await request.put(`${API}/admin/products/${saved.id}`, {
    data: {
      ...product,
      status: 'ACTIVE',
      variants: product.variants.map((variant) => ({
        ...variant,
        id: saved.variants.find((candidate) => candidate.sku === variant.sku)?.id,
      })),
    },
  });
  expect(published.status()).toBe(200);
  return saved.id;
}
